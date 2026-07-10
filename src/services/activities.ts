import { db, unwrap } from "./_db";
import type { Activity, ActivityType, ActivityWithRelations } from "@/lib/types";
import { localDayBoundsISO } from "@/lib/format";

const RELATIONS =
  "*, company:companies(id,nome), contact:contacts(id,nome), deal:deals(id,titulo)";

export interface ActivityInput {
  company_id?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  tipo: ActivityType;
  descricao?: string | null;
  data: string;
  concluida: boolean;
}

export async function listActivities(): Promise<ActivityWithRelations[]> {
  return unwrap<ActivityWithRelations[]>(
    await db()
      .from("activities")
      .select(RELATIONS)
      .order("data", { ascending: false })
  );
}

export async function listActivitiesByCompany(
  companyId: string
): Promise<ActivityWithRelations[]> {
  return unwrap<ActivityWithRelations[]>(
    await db()
      .from("activities")
      .select(RELATIONS)
      .eq("company_id", companyId)
      .order("data", { ascending: false })
  );
}

/** Atividades pendentes com data dentro do dia atual (Follow-ups de hoje). */
export async function listTodayPending(): Promise<ActivityWithRelations[]> {
  const { start, end } = localDayBoundsISO();
  return unwrap<ActivityWithRelations[]>(
    await db()
      .from("activities")
      .select(RELATIONS)
      .eq("concluida", false)
      .gte("data", start)
      .lt("data", end)
      .order("data", { ascending: true })
  );
}

export async function createActivity(input: ActivityInput): Promise<Activity> {
  return unwrap<Activity>(
    await db().from("activities").insert(input).select().single()
  );
}

export async function updateActivity(
  id: string,
  input: Partial<ActivityInput>
): Promise<Activity> {
  return unwrap<Activity>(
    await db().from("activities").update(input).eq("id", id).select().single()
  );
}

export async function setActivityConcluida(
  id: string,
  concluida: boolean
): Promise<void> {
  const { error } = await db()
    .from("activities")
    .update({ concluida })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await db().from("activities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
