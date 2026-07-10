import { db, unwrap } from "./_db";
import type { Company, LifecycleStage } from "@/lib/types";

export interface CompanyFilters {
  search?: string;
  nicho?: string;
  lifecycle_stage?: LifecycleStage | "";
}

export interface CompanyInput {
  nome: string;
  nicho?: string | null;
  telefone?: string | null;
  instagram?: string | null;
  cidade?: string | null;
  origem?: string | null;
  lifecycle_stage: LifecycleStage;
}

export async function listCompanies(
  filters: CompanyFilters = {}
): Promise<Company[]> {
  let q = db().from("companies").select("*").order("nome", { ascending: true });
  if (filters.nicho) q = q.eq("nicho", filters.nicho);
  if (filters.lifecycle_stage) {
    q = q.eq("lifecycle_stage", filters.lifecycle_stage);
  }
  if (filters.search) q = q.ilike("nome", `%${filters.search}%`);
  return unwrap<Company[]>(await q);
}

/** Lista distinta de nichos cadastrados (para o filtro). */
export async function listNichos(): Promise<string[]> {
  const rows = unwrap<{ nicho: string | null }[]>(
    await db().from("companies").select("nicho")
  );
  const set = new Set<string>();
  rows.forEach((r) => {
    if (r.nicho && r.nicho.trim()) set.add(r.nicho.trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getCompany(id: string): Promise<Company> {
  return unwrap<Company>(
    await db().from("companies").select("*").eq("id", id).single()
  );
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  return unwrap<Company>(
    await db().from("companies").insert(input).select().single()
  );
}

export async function updateCompany(
  id: string,
  input: Partial<CompanyInput>
): Promise<Company> {
  return unwrap<Company>(
    await db().from("companies").update(input).eq("id", id).select().single()
  );
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await db().from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
