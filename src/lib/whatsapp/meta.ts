/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";

// Graph API da Meta. Confirme a versão atual na documentação oficial.
const GRAPH = "https://graph.facebook.com";
function version(): string {
  return process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
}

// ---------------------------------------------------------------------------
// Assinatura do webhook (X-Hub-Signature-256 = sha256=<hmac>)
// ---------------------------------------------------------------------------
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------
export interface SendResult {
  wa_message_id: string | null;
  raw: unknown;
}

export async function sendText(opts: {
  phoneNumberId: string;
  token: string;
  to: string;
  body: string;
}): Promise<SendResult> {
  const res = await fetch(
    `${GRAPH}/${version()}/${opts.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: opts.to,
        type: "text",
        text: { preview_url: false, body: opts.body },
      }),
    }
  );
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Falha no envio (HTTP ${res.status})`);
  }
  return { wa_message_id: json?.messages?.[0]?.id ?? null, raw: json };
}

export async function sendTemplate(opts: {
  phoneNumberId: string;
  token: string;
  to: string;
  templateName: string;
  language: string;
  components?: unknown[];
}): Promise<SendResult> {
  const res = await fetch(
    `${GRAPH}/${version()}/${opts.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "template",
        template: {
          name: opts.templateName,
          language: { code: opts.language },
          components: opts.components ?? [],
        },
      }),
    }
  );
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.error?.message || `Falha no template (HTTP ${res.status})`
    );
  }
  return { wa_message_id: json?.messages?.[0]?.id ?? null, raw: json };
}

// ---------------------------------------------------------------------------
// Parsing do payload do webhook
// ---------------------------------------------------------------------------
export interface InboundMessage {
  waMessageId: string;
  from: string; // wa_id (somente dígitos)
  timestamp: string; // ISO
  type: string;
  text?: string;
  mediaId?: string;
  mediaMime?: string;
}
export interface InboundContactProfile {
  waId: string;
  name?: string;
}
export interface InboundStatus {
  waMessageId: string;
  status: string;
}
export interface InboundChange {
  phoneNumberId: string;
  contacts: InboundContactProfile[];
  messages: InboundMessage[];
  statuses: InboundStatus[];
}

export function parseWebhook(body: any): InboundChange[] {
  const out: InboundChange[] = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      if (!value || value.messaging_product !== "whatsapp") continue;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      out.push({
        phoneNumberId,
        contacts: (value.contacts ?? []).map((c: any) => ({
          waId: c?.wa_id,
          name: c?.profile?.name,
        })),
        messages: (value.messages ?? []).map((m: any) => normalizeMessage(m)),
        statuses: (value.statuses ?? []).map((s: any) => ({
          waMessageId: s?.id,
          status: s?.status,
        })),
      });
    }
  }
  return out;
}

function normalizeMessage(m: any): InboundMessage {
  const base: InboundMessage = {
    waMessageId: m?.id,
    from: m?.from,
    timestamp: m?.timestamp
      ? new Date(Number(m.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
    type: m?.type ?? "unknown",
  };
  switch (m?.type) {
    case "text":
      base.text = m?.text?.body;
      break;
    case "button":
      base.text = m?.button?.text;
      break;
    case "interactive":
      base.text =
        m?.interactive?.button_reply?.title ??
        m?.interactive?.list_reply?.title;
      break;
    case "image":
      base.mediaId = m?.image?.id;
      base.mediaMime = m?.image?.mime_type;
      base.text = m?.image?.caption;
      break;
    case "audio":
      base.mediaId = m?.audio?.id;
      base.mediaMime = m?.audio?.mime_type;
      break;
    case "video":
      base.mediaId = m?.video?.id;
      base.mediaMime = m?.video?.mime_type;
      base.text = m?.video?.caption;
      break;
    case "document":
      base.mediaId = m?.document?.id;
      base.mediaMime = m?.document?.mime_type;
      base.text = m?.document?.filename;
      break;
    default:
      break;
  }
  return base;
}

const TIPOS = new Set([
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "template",
  "interactive",
  "button",
  "unknown",
]);

export function normalizeTipo(type: string): string {
  return TIPOS.has(type) ? type : "unknown";
}

export function mapStatus(status: string): string | null {
  return ["sent", "delivered", "read", "failed"].includes(status)
    ? status
    : null;
}
