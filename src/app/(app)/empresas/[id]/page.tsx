"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import {
  LifecycleBadge,
  DealStatusBadge,
  ContractStatusBadge,
} from "@/components/status-badges";
import { CompanyFormDialog } from "@/components/forms/company-form-dialog";
import { ContactFormDialog } from "@/components/forms/contact-form-dialog";
import { DealFormDialog } from "@/components/forms/deal-form-dialog";
import { ActivityFormDialog } from "@/components/forms/activity-form-dialog";
import { ContractFormDialog } from "@/components/forms/contract-form-dialog";
import { WinDealDialog } from "@/components/forms/win-deal-dialog";
import { LoseDealDialog } from "@/components/forms/lose-deal-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ACTIVITY_TYPE_LABELS, LOST_STAGE_NAME } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type {
  Activity,
  ActivityWithRelations,
  Company,
  Contact,
  Contract,
  Deal,
  DealWithRelations,
  PipelineStage,
} from "@/lib/types";
import { getCompany } from "@/services/companies";
import {
  deleteContact,
  listContactsByCompany,
} from "@/services/contacts";
import {
  deleteDeal,
  listDealsByCompany,
} from "@/services/deals";
import { listStages } from "@/services/pipeline-stages";
import {
  deleteActivity,
  listActivitiesByCompany,
  setActivityConcluida,
} from "@/services/activities";
import {
  deleteContract,
  listContractsByCompany,
} from "@/services/contracts";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: company, loading, error, refetch } = useAsync<Company>(
    () => getCompany(id),
    [id]
  );
  const [editOpen, setEditOpen] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!company) return <ErrorState message="Empresa não encontrada." />;

  return (
    <div>
      <Link
        href="/empresas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Empresas
      </Link>

      <PageHeader title={company.nome}>
        <LifecycleBadge value={company.lifecycle_stage} />
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </PageHeader>

      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="negocios">Negócios</TabsTrigger>
          <TabsTrigger value="atividades">Atividades</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosTab company={company} />
        </TabsContent>
        <TabsContent value="contatos">
          <ContatosTab companyId={id} />
        </TabsContent>
        <TabsContent value="negocios">
          <NegociosTab companyId={id} onChanged={refetch} />
        </TabsContent>
        <TabsContent value="atividades">
          <AtividadesTab companyId={id} />
        </TabsContent>
        <TabsContent value="contratos">
          <ContratosTab companyId={id} />
        </TabsContent>
      </Tabs>

      <CompanyFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        company={company}
        onSaved={refetch}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function DadosTab({ company }: { company: Company }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nicho" value={company.nicho} />
        <Field label="Telefone" value={company.telefone} />
        <Field label="Instagram" value={company.instagram} />
        <Field label="Cidade" value={company.cidade} />
        <Field label="Origem" value={company.origem} />
        <Field label="Criado em" value={formatDate(company.criado_em)} />
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Adicionar
      </Button>
    </div>
  );
}

// ---- Contatos -------------------------------------------------------------
function ContatosTab({ companyId }: { companyId: string }) {
  const { data, loading, refetch } = useAsync<Contact[]>(
    () => listContactsByCompany(companyId),
    [companyId]
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [toDelete, setToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteContact(toDelete.id);
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
      <SectionHeader
        title="Contatos"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum contato" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Decisor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.telefone_whatsapp || "—"}</TableCell>
                  <TableCell>{c.cargo || "—"}</TableCell>
                  <TableCell>
                    {c.e_decisor ? (
                      <Badge variant="success">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      onEdit={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                      onDelete={() => setToDelete(c)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactFormDialog
        open={open}
        onOpenChange={setOpen}
        contact={editing}
        fixedCompanyId={companyId}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir contato"
        description={`Excluir "${toDelete?.nome}"?`}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---- Negócios -------------------------------------------------------------
function NegociosTab({
  companyId,
  onChanged,
}: {
  companyId: string;
  onChanged: () => void;
}) {
  const { data, loading, refetch } = useAsync<DealWithRelations[]>(
    () => listDealsByCompany(companyId),
    [companyId]
  );
  const { data: stages } = useAsync<PipelineStage[]>(() => listStages(), []);
  const lostStageId =
    stages?.find((s) => s.nome.toLowerCase() === LOST_STAGE_NAME.toLowerCase())
      ?.id ?? null;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [winTarget, setWinTarget] = useState<Deal | null>(null);
  const [loseTarget, setLoseTarget] = useState<Deal | null>(null);
  const [toDelete, setToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    refetch();
    onChanged();
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDeal(toDelete.id);
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
      <SectionHeader
        title="Negócios"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum negócio" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.titulo || d.servico || "—"}
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
                            setOpen(true);
                          }}
                        >
                          Editar
                        </DropdownMenuItem>
                        {d.status === "aberto" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setWinTarget(d)}>
                              Marcar como ganho
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLoseTarget(d)}>
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
        open={open}
        onOpenChange={setOpen}
        deal={editing}
        fixedCompanyId={companyId}
        onSaved={refetch}
      />
      <WinDealDialog
        open={!!winTarget}
        onOpenChange={(o) => !o && setWinTarget(null)}
        deal={winTarget}
        onDone={reload}
      />
      <LoseDealDialog
        open={!!loseTarget}
        onOpenChange={(o) => !o && setLoseTarget(null)}
        deal={loseTarget}
        lostStageId={lostStageId}
        onDone={reload}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir negócio"
        description="Excluir este negócio?"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---- Atividades -----------------------------------------------------------
function AtividadesTab({ companyId }: { companyId: string }) {
  const { data, loading, refetch } = useAsync<ActivityWithRelations[]>(
    () => listActivitiesByCompany(companyId),
    [companyId]
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityWithRelations | null>(null);
  const [toDelete, setToDelete] = useState<Activity | null>(null);
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
      <SectionHeader
        title="Atividades"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhuma atividade" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">OK</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
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
                  <TableCell className="max-w-xs truncate">
                    {a.descricao || "—"}
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      onEdit={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                      onDelete={() => setToDelete(a)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ActivityFormDialog
        open={open}
        onOpenChange={setOpen}
        activity={editing}
        fixedCompanyId={companyId}
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

// ---- Contratos ------------------------------------------------------------
function ContratosTab({ companyId }: { companyId: string }) {
  const { data, loading, refetch } = useAsync<Contract[]>(
    () => listContractsByCompany(companyId),
    [companyId]
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [toDelete, setToDelete] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteContract(toDelete.id);
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
      <SectionHeader
        title="Contratos"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum contrato" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recorrente</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Renovação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.servico || "—"}
                  </TableCell>
                  <TableCell>{formatCurrency(c.valor)}</TableCell>
                  <TableCell>{c.recorrente ? "Sim" : "Não"}</TableCell>
                  <TableCell>{formatDate(c.data_inicio)}</TableCell>
                  <TableCell>{formatDate(c.data_renovacao)}</TableCell>
                  <TableCell>
                    <ContractStatusBadge value={c.status} />
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      onEdit={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                      onDelete={() => setToDelete(c)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContractFormDialog
        open={open}
        onOpenChange={setOpen}
        contract={editing}
        fixedCompanyId={companyId}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir contrato"
        description="Excluir este contrato?"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RowMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
