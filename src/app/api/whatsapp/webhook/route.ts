import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWebhook, verifySignature } from "@/lib/whatsapp/meta";
import { processChange } from "@/lib/whatsapp/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verificação do webhook (configuração na Meta).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Recebimento de mensagens e status.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(raw, signature, process.env.WHATSAPP_APP_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const changes = parseWebhook(body);
    for (const change of changes) {
      await processChange(admin, change);
    }
  } catch (e) {
    // Loga mas responde 200 para a Meta não reenviar em loop.
    console.error("[whatsapp webhook]", e);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
