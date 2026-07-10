"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { DealStatusBadge } from "@/components/status-badges";
import { DealFormDialog } from "@/components/forms/deal-form-dialog";
import { WinDealDialog } from "@/components/forms/win-deal-dialog";
import { LoseDealDialog } from "@/components/forms/lose-deal-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsync } from "@/hooks/use-async";
import { formatCurrency } from "@/lib/format";
import { LOST_STAGE_NAME } from "@/lib/constants";
import type { DealWithRelations, PipelineStage } from "@/lib/types";
import { deleteDeal, listDeals } from "@/services/deals";
import { listStages } from "@/services/pipeline-stages";

export default function NegociosPage() {
  const { data: deals, loading, error, refetch } = useAsync<
    DealWithRelations[]
  >(() => listDeals(), []);
  const { data: stages } = useAsync<PipelineStage[]>(() => listStages(), []);
  const lostStageId =
    stages?.find((s) => s.nome.toLowerCase() === LOST_STAGE_NAME.toLowerCase())
      ?.id ?? null;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DealWithRelations | null>(null);
  const [winTarget, setWinTarget] = useState<DealWithRelations | null>(null);
  const [loseTarget, setLoseTarget] = useState<DealWithRelations | null>(null);
  const [toDelete, setToDelete] = useState<DealWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDeal(toDelete.id);
      toast.success("Negócio excluído");
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Negócios"
        description="Todos os negócios do funil. Use o Pipeline para a visão por estágio."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo negócio
        </Button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !deals || deals.length === 0 ? (
        <EmptyState
          title="Nenhum negócio"
          description="Crie um negócio para acompanhar a oportunidade."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.titulo || d.servico || "—"}
                  </TableCell>
                  <TableCell>
                    {d.company ? (
                      <Link
                        href={`/empresas/${d.company.id}`}
                        className="hover:underline"
                      >
                        {d.company.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{d.stage?.nome || "—"}</TableCell>
                  <TableCell>{formatCurrency(d.valor)}</TableCell>
                  <TableCell>
                    <DealStatusBadge value={d.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(d);
                            setFormOpen(true);
                          }}
                        >
                          Editar
                        </DropdownMenuItem>
                        {d.status === "aberto" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setWinTarget(d)}
                            >
                              Marcar como ganho
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setLoseTarget(d)}
                            >
                              Marcar como perdido
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setToDelete(d)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir negócio"
        description={`Excluir "${toDelete?.titulo || toDelete?.servico || "negócio"}"?`}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
