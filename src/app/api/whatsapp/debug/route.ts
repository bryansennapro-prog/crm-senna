/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Endpoint TEMPORÁRIO de diagnóstico. Protegido pelo WHATSAPP_VERIFY_TOKEN.
// Não retorna tokens nem conteúdo de mensagens. Remover após depurar.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();

  // Probe inline: grava passo a passo como service_role e reporta cada erro.
  if (req.nextUrl.searchParams.get("probe") === "1") {
    const steps: any = {};
    const wa = "PROBE_" + Date.now();

    const ch = await admin
      .from("whatsapp_channels")
      .select("id, tenant_id")
      .eq("phone_number_id", "1151825144687605")
      .maybeSingle();
    steps.channel_error = ch.error?.message ?? null;
    steps.channel_found = !!ch.data;
    const tenantId = (ch.data as any)?.tenant_id ?? null;
    steps.tenant_id = tenantId;

    if (tenantId) {
      const c = await admin
        .from("contacts")
        .insert({
          tenant_id: tenantId,
          wa_id: wa,
          telefone_whatsapp: "+000",
          nome: "PROBE",
        })
        .select("id, company_id")
        .single();
      steps.contact_error = c.error?.message ?? null;
      const contactId = (c.data as any)?.id ?? null;
      steps.contact_id = contactId;

      if (contactId) {
        const comp = await admin
          .from("companies")
          .insert({ tenant_id: tenantId, nome: "PROBE", lifecycle_stage: "lead" })
          .select("id")
          .single();
        steps.company_error = comp.error?.message ?? null;
        const companyId = (comp.data as any)?.id ?? null;

        const conv = await admin
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            channel_id: (ch.data as any).id,
            contact_id: contactId,
            company_id: companyId,
            status: "aberta",
          })
          .select("id")
          .single();
        steps.conversation_error = conv.error?.message ?? null;
        const convId = (conv.data as any)?.id ?? null;

        const deal = await admin
          .from("deals")
          .insert({
            tenant_id: tenantId,
            company_id: companyId,
            contact_id: contactId,
            titulo: "PROBE",
            status: "aberto",
            conversation_id: convId,
          })
          .select("id")
          .single();
        steps.deal_error = deal.error?.message ?? null;

        const msg = await admin
          .from("messages")
          .insert({
            tenant_id: tenantId,
            conversation_id: convId,
            contact_id: contactId,
            direction: "inbound",
            wa_message_id: wa,
            tipo: "text",
            conteudo: "probe",
            status: "received",
            timestamp: new Date().toISOString(),
          })
          .select("id")
          .single();
        steps.message_error = msg.error?.message ?? null;
      }
    }

    return NextResponse.json({ probe: true, steps });
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_VERIFY_TOKEN_set: !!process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET_set: !!process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION ?? null,
  };

  let db: any = { ok: false };
  try {
    const [channels, conversations, contacts, messages] = await Promise.all([
      admin
        .from("whatsapp_channels")
        .select("id, phone_number_id, display_number, status, access_token"),
      admin.from("conversations").select("id", { count: "exact", head: true }),
      admin.from("contacts").select("id", { count: "exact", head: true }),
      admin
        .from("messages")
        .select("direction, tipo, status, timestamp")
        .order("timestamp", { ascending: false })
        .limit(5),
    ]);

    db = {
      ok: true,
      channels:
        channels.data?.map((c: any) => ({
          phone_number_id: c.phone_number_id,
          display_number: c.display_number,
          status: c.status,
          has_token: !!c.access_token,
        })) ?? channels.error?.message,
      conversations_count: conversations.count ?? conversations.error?.message,
      contacts_count: contacts.count ?? contacts.error?.message,
      recent_messages: messages.data ?? messages.error?.message,
    };
  } catch (e) {
    db = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ env, db });
}
