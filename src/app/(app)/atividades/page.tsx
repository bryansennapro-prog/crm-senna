"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ActivityFormDialog } from "@/components/forms/activity-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsync } from "@/hooks/use-async";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityWithRelations } from "@/lib/types";
import {
  deleteActivity,
  listActivities,
  setActivityConcluida,
} from "@/services/activities";

export default function AtividadesPage() {
  const { data, loading, error, refetch } = useAsync<ActivityWithRelations[]>(
    () => listActivities(),
    []
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityWithRelations | null>(null);
  const [toDelete, setToDelete] = useState<ActivityWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function toggle(a: ActivityWithRelations) {
    try {
      await setActivityConcluida(a.id, !a.concluida);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteActivity(toDelete.id);
      toast.success("Atividade excluída");
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
        title="Atividades"
        description="Histórico de relacionamento: ligações, reuniões, notas e follow-ups."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova atividade
        </Button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhuma atividade registrada" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">OK</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Checkbox
                      checked={a.concluida}
                      onCheckedChange={() => toggle(a)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(a.data)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACTIVITY_TYPE_LABELS[a.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.company ? (
                      <Link
                        href={`/empresas/${a.company.id}`}
                        className="hover:underline"
                      >
                        {a.company.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {a.descricao || "—"}
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
                            setEditing(a);
                            setFormOpen(true);
                          }}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setToDelete(a)}
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

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editing}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir atividade"
        description="Excluir esta atividade?"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
