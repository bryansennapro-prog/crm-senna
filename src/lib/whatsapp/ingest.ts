/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapStatus,
  normalizeTipo,
  type InboundChange,
} from "./meta";

/**
 * Processa um "change" do webhook do WhatsApp usando o cliente admin
 * (service-role). Cria/associa contato, empresa, conversa e negócio, e grava
 * as mensagens de forma idempotente.
 */
export async function processChange(
  admin: SupabaseClient,
  change: InboundChange
): Promise<void> {
  const { data: channel } = await admin
    .from("whatsapp_channels")
    .select("id, tenant_id")
    .eq("phone_number_id", change.phoneNumberId)
    .maybeSingle();

  if (!channel) return; // canal desconhecido — ignora
  const tenantId: string = channel.tenant_id;
  const channelId: string = channel.id;

  // Atualiza status de mensagens enviadas (entregue/lido/falhou).
  for (const s of change.statuses) {
    const mapped = s.status ? mapStatus(s.status) : null;
    if (!s.waMessageId || !mapped) continue;
    await admin
      .from("messages")
      .update({ status: mapped })
      .eq("tenant_id", tenantId)
      .eq("wa_message_id", s.waMessageId);
  }

  const nameByWa = new Map<string, string | undefined>();
  for (const c of change.contacts) nameByWa.set(c.waId, c.name);

  for (const m of change.messages) {
    if (!m.from) continue;
    const waId = m.from;
    const phone = `+${waId}`;
    const name = nameByWa.get(waId) || phone;

    const contact = await findOrCreateContact(admin, tenantId, waId, phone, name);
    const companyId = await ensureCompany(admin, tenantId, contact, name);
    const conv = await findOrCreateConversation(
      admin,
      tenantId,
      channelId,
      contact.id,
      companyId
    );
    const dealId = await ensureDeal(
      admin,
      tenantId,
      conv,
      companyId,
      contact.id,
      name
    );

    // Mensagem (idempotente por wa_message_id).
    await admin.from("messages").upsert(
      {
        tenant_id: tenantId,
        conversation_id: conv.id,
        contact_id: contact.id,
        direction: "inbound",
        wa_message_id: m.waMessageId,
        tipo: normalizeTipo(m.type),
        conteudo: m.text ?? null,
        media_mime: m.mediaMime ?? null,
        status: "received",
        timestamp: m.timestamp,
        raw: m as any,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true }
    );

    await admin
      .from("conversations")
      .update({
        last_inbound_at: m.timestamp,
        last_message_at: m.timestamp,
        company_id: companyId,
        deal_id: dealId,
        unread_count: (conv.unread_count ?? 0) + 1,
      })
      .eq("id", conv.id);
  }
}

async function findOrCreateContact(
  admin: SupabaseClient,
  tenantId: string,
  waId: string,
  phone: string,
  name: string
): Promise<any> {
  const { data: existing } = await admin
    .from("contacts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("wa_id", waId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      wa_id: waId,
      telefone_whatsapp: phone,
      nome: name,
    })
    .select("*")
    .single();

  if (error) {
    // Possível corrida: tenta ler de novo.
    const { data: again } = await admin
      .from("contacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("wa_id", waId)
      .maybeSingle();
    if (again) return again;
    throw new Error(error.message);
  }
  return created;
}

async function ensureCompany(
  admin: SupabaseClient,
  tenantId: string,
  contact: any,
  name: string
): Promise<string> {
  if (contact.company_id) return contact.company_id;
  const { data: company, error } = await admin
    .from("companies")
    .insert({
      tenant_id: tenantId,
      nome: name,
      origem: "WhatsApp",
      lifecycle_stage: "lead",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await admin
    .from("contacts")
    .update({ company_id: company.id })
    .eq("id", contact.id);
  contact.company_id = company.id;
  return company.id;
}

async function findOrCreateConversation(
  admin: SupabaseClient,
  tenantId: string,
  channelId: string,
  contactId: string,
  companyId: string
): Promise<any> {
  const { data: existing } = await admin
    .from("conversations")
    .select("*")
    .eq("channel_id", channelId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      channel_id: channelId,
      contact_id: contactId,
      company_id: companyId,
      status: "aberta",
      unread_count: 0,
    })
    .select("*")
    .single();

  if (error) {
    const { data: again } = await admin
      .from("conversations")
      .select("*")
      .eq("channel_id", channelId)
      .eq("contact_id", contactId)
      .maybeSingle();
    if (again) return again;
    throw new Error(error.message);
  }
  return created;
}

async function ensureDeal(
  admin: SupabaseClient,
  tenantId: string,
  conv: any,
  companyId: string,
  contactId: string,
  name: string
): Promise<string> {
  if (conv.deal_id) return conv.deal_id;

  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("nome", "Novo Lead")
    .maybeSingle();

  const { data: deal, error } = await admin
    .from("deals")
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      contact_id: contactId,
      titulo: `WhatsApp — ${name}`,
      stage_id: stage?.id ?? null,
      status: "aberto",
      conversation_id: conv.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  conv.deal_id = deal.id;
  return deal.id;
}
