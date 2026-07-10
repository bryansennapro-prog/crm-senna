import { db, unwrap } from "./_db";
import type { Deal, DealWithRelations } from "@/lib/types";

const RELATIONS =
  "*, company:companies(id,nome), contact:contacts(id,nome), stage:pipeline_stages(id,nome,ordem)";

export interface DealInput {
  company_id: string;
  contact_id?: string | null;
  titulo?: string | null;
  servico?: string | null;
  valor?: number | null;
  stage_id?: string | null;
  status?: "aberto" | "ganho" | "perdido";
  data_prevista_fechamento?: string | null;
  motivo_perda?: string | null;
}

export async function listDeals(): Promise<DealWithRelations[]> {
  return unwrap<DealWithRelations[]>(
    await db()
      .from("deals")
      .select(RELATIONS)
      .order("criado_em", { ascending: false })
  );
}

export async function listDealsByCompany(
  companyId: string
): Promise<DealWithRelations[]> {
  return unwrap<DealWithRelations[]>(
    await db()
      .from("deals")
      .select(RELATIONS)
      .eq("company_id", companyId)
      .order("criado_em", { ascending: false })
  );
}

export async function getDeal(id: string): Promise<DealWithRelations> {
  return unwrap<DealWithRelations>(
    await db().from("deals").select(RELATIONS).eq("id", id).single()
  );
}

export async function createDeal(input: DealInput): Promise<Deal> {
  return unwrap<Deal>(
    await db().from("deals").insert(input).select().single()
  );
}

export async function updateDeal(
  id: string,
  input: Partial<DealInput>
): Promise<Deal> {
  return unwrap<Deal>(
    await db().from("deals").update(input).eq("id", id).select().single()
  );
}

/** Move o negócio de estágio (usado no Kanban e na lista agrupada). */
export async function updateDealStage(
  id: string,
  stageId: string
): Promise<void> {
  const { error } = await db()
    .from("deals")
    .update({ stage_id: stageId })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Marca como perdido: status + motivo + move para o estágio de perda. */
export async function loseDeal(
  id: string,
  motivoPerda: string,
  lostStageId?: string | null
): Promise<void> {
  const patch: Partial<DealInput> = {
    status: "perdido",
    motivo_perda: motivoPerda,
  };
  if (lostStageId) patch.stage_id = lostStageId;
  const { error } = await db().from("deals").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export interface WinDealInput {
  servico: string | null;
  valor: number | null;
  recorrente: boolean;
  data_inicio: string | null;
  data_renovacao: string | null;
}

/**
 * Fecha o negócio como ganho via RPC atômica `win_deal`:
 * cria o contrato, move o deal p/ "Fechado Ganho" e empresa vira cliente.
 * Retorna o id do contrato criado.
 */
export async function winDeal(
  dealId: string,
  input: WinDealInput
): Promise<string> {
  return unwrap<string>(
    await db().rpc("win_deal", {
      p_deal_id: dealId,
      p_servico: input.servico,
      p_valor: input.valor,
      p_recorrente: input.recorrente,
      p_data_inicio: input.data_inicio,
      p_data_renovacao: input.data_renovacao,
    })
  );
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await db().from("deals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
