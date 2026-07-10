import { db, unwrap } from "./_db";
import type { PipelineStage } from "@/lib/types";

export async function listStages(): Promise<PipelineStage[]> {
  return unwrap<PipelineStage[]>(
    await db()
      .from("pipeline_stages")
      .select("*")
      .order("ordem", { ascending: true })
  );
}
