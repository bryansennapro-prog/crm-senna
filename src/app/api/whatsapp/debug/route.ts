/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processChange } from "@/lib/whatsapp/ingest";

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

  // Modo probe: roda a ingestão de teste e devolve o erro exato, se houver.
  if (req.nextUrl.searchParams.get("probe") === "1") {
    let probeError: string | null = null;
    try {
      await processChange(admin, {
        phoneNumberId: "1151825144687605",
        contacts: [{ waId: "5511900000001", name: "Probe Diagnostico" }],
        messages: [
          {
            waMessageId: "wamid.PROBE_" + Date.now(),
            from: "5511900000001",
            timestamp: new Date().toISOString(),
            type: "text",
            text: "probe de diagnostico",
          },
        ],
        statuses: [],
      });
    } catch (e) {
      probeError = e instanceof Error ? e.message : String(e);
    }
    return NextResponse.json({ probe: true, probeError });
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
