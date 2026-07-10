"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { LifecycleBadge } from "@/components/status-badges";
import { CompanyFormDialog } from "@/components/forms/company-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { LIFECYCLE_OPTIONS } from "@/lib/constants";
import type { Company, LifecycleStage } from "@/lib/types";
import {
  deleteCompany,
  listCompanies,
  listNichos,
} from "@/services/companies";

const ALL = "__all__";

export default function EmpresasPage() {
  const [search, setSearch] = useState("");
  const [nicho, setNicho] = useState(ALL);
  const [lifecycle, setLifecycle] = useState(ALL);

  const { data: companies, loading, error, refetch } = useAsync<Company[]>(
    () =>
      listCompanies({
        search: search.trim() || undefined,
        nicho: nicho === ALL ? undefined : nicho,
        lifecycle_stage:
          lifecycle === ALL ? undefined : (lifecycle as LifecycleStage),
      }),
    [search, nicho, lifecycle]
  );

  const { data: nichos, refetch: refetchNichos } = useAsync<string[]>(
    () => listNichos(),
    []
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [toDelete, setToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: Company) {
    setEditing(c);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCompany(toDelete.id);
      toast.success("Empresa excluída");
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  function afterSave() {
    refetch();
    refetchNichos();
  }

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Cadastro central do funil. Filtre por nicho ou estágio."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova empresa
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={nicho} onValueChange={setNicho}>
          <SelectTrigger>
            <SelectValue placeholder="Nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os nichos</SelectItem>
            {(nichos ?? []).map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lifecycle} onValueChange={setLifecycle}>
          <SelectTrigger>
            <SelectValue placeholder="Estágio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os estágios</SelectItem>
            {LIFECYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !companies || companies.length === 0 ? (
        <EmptyState
          title="Nenhuma empresa encontrada"
          description="Cadastre a primeira empresa para começar o funil."
        >
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova empresa
          </Button>
        </EmptyState>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/empresas/${c.id}`}
                      className="hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{c.nicho || "—"}</TableCell>
                  <TableCell>{c.cidade || "—"}</TableCell>
                  <TableCell>
                    <LifecycleBadge value={c.lifecycle_stage} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/empresas/${c.id}`}>Abrir</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setToDelete(c)}
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

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editing}
        onSaved={afterSave}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir empresa"
        description={`Excluir "${toDelete?.nome}"? Contatos, negócios, atividades e contratos vinculados também serão removidos.`}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
