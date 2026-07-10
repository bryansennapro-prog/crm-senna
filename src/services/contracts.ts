import { db, unwrap } from "./_db";
import type { Contract, ContractWithCompany } from "@/lib/types";
import { addDaysISODate, todayISODate } from "@/lib/format";
import { RENEWAL_WINDOW_DAYS } from "@/lib/constants";

export interface ContractInput {
  company_id: string;
  deal_id_origem?: string | null;
  servico?: string | null;
  valor?: number | null;
  recorrente: boolean;
  data_inicio?: string | null;
  data_renovacao?: string | null;
  status: "ativo" | "pausado" | "cancelado";
}

export async function listContracts(): Promise<ContractWithCompany[]> {
  return unwrap<ContractWithCompany[]>(
    await db()
      .from("contracts")
      .select("*, company:companies(id,nome)")
      .order("criado_em", { ascending: false })
  );
}

export async function listContractsByCompany(
  companyId: string
): Promise<Contract[]> {
  return unwrap<Contract[]>(
    await db()
      .from("contracts")
      .select("*")
      .eq("company_id", companyId)
      .order("criado_em", { ascending: false })
  );
}

/** Contratos com data_renovacao nos próximos 30 dias (Seção 4 — Renovação). */
export async function listRenewals(): Promise<ContractWithCompany[]> {
  const start = todayISODate();
  const end = addDaysISODate(RENEWAL_WINDOW_DAYS);
  return unwrap<ContractWithCompany[]>(
    await db()
      .from("contracts")
      .select("*, company:companies(id,nome)")
      .not("data_renovacao", "is", null)
      .gte("data_renovacao", start)
      .lte("data_renovacao", end)
      .order("data_renovacao", { ascending: true })
  );
}

export async function createContract(input: ContractInput): Promise<Contract> {
  return unwrap<Contract>(
    await db().from("contracts").insert(input).select().single()
  );
}

export async function updateContract(
  id: string,
  input: Partial<ContractInput>
): Promise<Contract> {
  return unwrap<Contract>(
    await db().from("contracts").update(input).eq("id", id).select().single()
  );
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await db().from("contracts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
