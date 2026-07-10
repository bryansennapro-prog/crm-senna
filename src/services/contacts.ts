import { db, unwrap } from "./_db";
import type { Contact } from "@/lib/types";

export interface ContactWithCompany extends Contact {
  company: { id: string; nome: string } | null;
}

export interface ContactInput {
  company_id: string;
  nome: string;
  telefone_whatsapp?: string | null;
  email?: string | null;
  cargo?: string | null;
  e_decisor: boolean;
}

/** Todos os contatos do tenant, com o nome da empresa (tela Contatos). */
export async function listContacts(): Promise<ContactWithCompany[]> {
  return unwrap<ContactWithCompany[]>(
    await db()
      .from("contacts")
      .select("*, company:companies(id,nome)")
      .order("nome", { ascending: true })
  );
}

export async function listContactsByCompany(
  companyId: string
): Promise<Contact[]> {
  return unwrap<Contact[]>(
    await db()
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("nome", { ascending: true })
  );
}

export async function createContact(input: ContactInput): Promise<Contact> {
  return unwrap<Contact>(
    await db().from("contacts").insert(input).select().single()
  );
}

export async function updateContact(
  id: string,
  input: Partial<ContactInput>
): Promise<Contact> {
  return unwrap<Contact>(
    await db().from("contacts").update(input).eq("id", id).select().single()
  );
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await db().from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
