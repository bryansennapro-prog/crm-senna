import { db, unwrap } from "./_db";
import type { Message } from "@/lib/types";

export async function listMessages(conversationId: string): Promise<Message[]> {
  return unwrap<Message[]>(
    await db()
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true })
  );
}

/**
 * Envia uma mensagem de texto pela rota de servidor (que fala com a Graph API
 * usando o token do canal, sem expô-lo ao browser).
 */
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<void> {
  const res = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, body }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao enviar (HTTP ${res.status})`);
  }
}
