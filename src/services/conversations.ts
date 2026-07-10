import { db, unwrap } from "./_db";
import type { ConversationListItem } from "@/lib/types";

export async function listConversations(): Promise<ConversationListItem[]> {
  return unwrap<ConversationListItem[]>(
    await db()
      .from("conversations")
      .select(
        "*, contact:contacts(id,nome,wa_id,telefone_whatsapp), company:companies(id,nome)"
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
  );
}

export async function markConversationRead(id: string): Promise<void> {
  const { error } = await db()
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
