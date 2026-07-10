import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendText } from "@/lib/whatsapp/meta";

export const runtime = "nodejs";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Autenticação do usuário (evita relay aberto).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Usuário sem tenant" }, { status: 403 });
  }

  let payload: { conversationId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { conversationId, body } = payload;
  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Conversa precisa pertencer ao tenant do usuário.
  const { data: conv } = await admin
    .from("conversations")
    .select("id, tenant_id, channel_id, contact_id, last_inbound_at")
    .eq("id", conversationId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();
  if (!conv) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 }
    );
  }

  // Janela de 24h (fora dela só template aprovado).
  const within =
    !!conv.last_inbound_at &&
    Date.now() - new Date(conv.last_inbound_at).getTime() < WINDOW_MS;
  if (!within) {
    return NextResponse.json(
      { error: "Fora da janela de 24h — use um template aprovado." },
      { status: 422 }
    );
  }

  const { data: channel } = await admin
    .from("whatsapp_channels")
    .select("phone_number_id, access_token")
    .eq("id", conv.channel_id)
    .single();
  const { data: contact } = await admin
    .from("contacts")
    .select("wa_id")
    .eq("id", conv.contact_id)
    .single();

  if (!channel?.access_token || !channel?.phone_number_id || !contact?.wa_id) {
    return NextResponse.json(
      { error: "Canal ou contato sem dados de envio" },
      { status: 400 }
    );
  }

  try {
    const result = await sendText({
      phoneNumberId: channel.phone_number_id,
      token: channel.access_token,
      to: contact.wa_id,
      body,
    });

    const nowIso = new Date().toISOString();
    const { data: msg } = await admin
      .from("messages")
      .insert({
        tenant_id: profile.tenant_id,
        conversation_id: conv.id,
        contact_id: conv.contact_id,
        direction: "outbound",
        wa_message_id: result.wa_message_id,
        tipo: "text",
        conteudo: body,
        status: "sent",
        timestamp: nowIso,
      })
      .select("*")
      .single();

    await admin
      .from("conversations")
      .update({ last_message_at: nowIso })
      .eq("id", conv.id);

    return NextResponse.json({ message: msg });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao enviar" },
      { status: 502 }
    );
  }
}
