"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Columns3, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { DealFormDialog } from "@/components/forms/deal-form-dialog";
import { WinDealDialog } from "@/components/forms/win-deal-dialog";
import { LoseDealDialog } from "@/components/forms/lose-deal-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAsync } from "@/hooks/use-async";
import { cn } from "@/lib/utils";
import { LOST_STAGE_NAME } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { DealWithRelations, PipelineStage } from "@/lib/types";
import { listDeals, updateDealStage } from "@/services/deals";
import { listStages } from "@/services/pipeline-stages";

type View = "kanban" | "list";

export default function PipelinePage() {
  const [view, setView] = useState<View>("kanban");
  const { data: stages, loading: loadingStages } = useAsync<PipelineStage[]>(
    () => listStages(),
    []
  );
  const {
    data: deals,
    loading,
    error,
    refetch,
  } = useAsync<DealWithRelations[]>(() => listDeals(), []);

  const lostStageId =
    stages?.find((s) => s.nome.toLowerCase() === LOST_STAGE_NAME.toLowerCase())
      ?.id ?? null;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DealWithRelations | null>(null);
  const [winTarget, setWinTarget] = useState<DealWithRelations | null>(null);
  const [loseTarget, setLoseTarget] = useState<DealWithRelations | null>(null);

  async function handleMove(dealId: string, stageId: string) {
    try {
      await updateDealStage(dealId, stageId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover");
      refetch();
    }
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Arraste os negócios entre os estágios."
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-4 w-4" /> Kanban
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" /> Lista
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo negócio
          </Button>
        </div>
      </PageHeader>

      {loading || loadingStages ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !stages || stages.length === 0 ? (
        <ErrorState message="Nenhum estágio configurado. Rode o seed.sql." />
      ) : !deals || deals.length === 0 ? (
        <EmptyState
          title="Nenhum negócio no funil"
          description="Crie um negócio para vê-lo no pipeline."
        >
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo negócio
          </Button>
        </EmptyState>
      ) : view === "kanban" ? (
        <KanbanBoard
          stages={stages}
          deals={deals}
          onMove={handleMove}
          onEdit={(d) => {
            setEditing(d);
            setFormOpen(true);
          }}
          onWin={setWinTarget}
          onLose={setLoseTarget}
        />
      ) : (
        <GroupedList
          stages={stages}
          deals={deals}
          onEdit={(d) => {
            setEditing(d);
            setFormOpen(true);
          }}
        />
      )}

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editing}
        onSaved={refetch}
      />
      <WinDealDialog
        open={!!winTarget}
        onOpenChange={(o) => !o && setWinTarget(null)}
        deal={winTarget}
        onDone={refetch}
      />
      <LoseDealDialog
        open={!!loseTarget}
        onOpenChange={(o) => !o && setLoseTarget(null)}
        deal={loseTarget}
        lostStageId={lostStageId}
        onDone={refetch}
      />
    </div>
  );
}

function GroupedList({
  stages,
  deals,
  onEdit,
}: {
  stages: PipelineStage[];
  deals: DealWithRelations[];
  onEdit: (d: DealWithRelations) => void;
}) {
  return (
    <div className="space-y-6">
      {stages.map((stage) => {
        const group = deals.filter((d) => d.stage_id === stage.id);
        return (
          <section key={stage.id}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-semibold">{stage.nome}</h3>
              <Badge variant="secondary">{group.length}</Badge>
            </div>
            {group.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nenhum negócio neste estágio.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {group.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onEdit(d)}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 p-3 text-left hover:bg-muted/50"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {d.titulo || d.servico || "Negócio"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.company?.nome ?? "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm">
                      {formatCurrency(d.valor)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
