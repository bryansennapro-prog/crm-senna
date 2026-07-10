"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { DealWithRelations, PipelineStage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NO_STAGE = "__no_stage__";

interface KanbanProps {
  stages: PipelineStage[];
  deals: DealWithRelations[];
  onMove: (dealId: string, stageId: string) => void;
  onEdit: (deal: DealWithRelations) => void;
  onWin: (deal: DealWithRelations) => void;
  onLose: (deal: DealWithRelations) => void;
}

function DealCard({
  deal,
  onEdit,
  onWin,
  onLose,
}: {
  deal: DealWithRelations;
  onEdit: (d: DealWithRelations) => void;
  onWin: (d: DealWithRelations) => void;
  onLose: (d: DealWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...listeners}
          {...attributes}
          className="min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
        >
          <p className="truncate text-sm font-medium">
            {deal.titulo || deal.servico || "Negócio"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {deal.company?.nome ?? "—"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(deal)}>
              Editar
            </DropdownMenuItem>
            {deal.status === "aberto" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onWin(deal)}>
                  Marcar como ganho
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLose(deal)}>
                  Marcar como perdido
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium">
          {formatCurrency(deal.valor)}
        </span>
        {deal.status !== "aberto" && (
          <Badge
            variant={deal.status === "ganho" ? "success" : "destructive"}
            className="text-[10px]"
          >
            {deal.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

function Column({
  stage,
  deals,
  droppable,
  children,
}: {
  stage: { id: string; nome: string };
  deals: DealWithRelations[];
  droppable: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    disabled: !droppable,
  });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{stage.nome}</h3>
        <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-colors",
          isOver && droppable && "ring-2 ring-primary"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({
  stages,
  deals,
  onMove,
  onEdit,
  onWin,
  onLose,
}: KanbanProps) {
  const [local, setLocal] = useState<DealWithRelations[]>(deals);

  useEffect(() => {
    setLocal(deals);
  }, [deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stageIds = new Set(stages.map((s) => s.id));
  const hasOrphans = local.some(
    (d) => !d.stage_id || !stageIds.has(d.stage_id)
  );

  function dealsForStage(stageId: string) {
    return local.filter((d) => d.stage_id === stageId);
  }
  function orphanDeals() {
    return local.filter((d) => !d.stage_id || !stageIds.has(d.stage_id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const newStageId = String(over.id);
    if (newStageId === NO_STAGE) return;

    const deal = local.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    setLocal((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d))
    );
    onMove(dealId, newStageId);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column key={stage.id} stage={stage} deals={dealsForStage(stage.id)} droppable>
            {dealsForStage(stage.id).map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                onEdit={onEdit}
                onWin={onWin}
                onLose={onLose}
              />
            ))}
          </Column>
        ))}
        {hasOrphans && (
          <Column
            stage={{ id: NO_STAGE, nome: "Sem estágio" }}
            deals={orphanDeals()}
            droppable={false}
          >
            {orphanDeals().map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                onEdit={onEdit}
                onWin={onWin}
                onLose={onLose}
              />
            ))}
          </Column>
        )}
      </div>
    </DndContext>
  );
}
