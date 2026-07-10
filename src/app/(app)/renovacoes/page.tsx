"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { ContractStatusBadge } from "@/components/status-badges";
import { ContractFormDialog } from "@/components/forms/contract-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/use-async";
import { RENEWAL_WINDOW_DAYS } from "@/lib/constants";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import type { Contract, ContractWithCompany } from "@/lib/types";
import { listRenewals } from "@/services/contracts";

function RenewalBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days <= 7) return <Badge variant="destructive">{days} dia(s)</Badge>;
  if (days <= 15) return <Badge variant="warning">{days} dias</Badge>;
  return <Badge variant="secondary">{days} dias</Badge>;
}

export default function RenovacoesPage() {
  const { data, loading, error, refetch } = useAsync<ContractWithCompany[]>(
    () => listRenewals(),
    []
  );
  const [editing, setEditing] = useState<Contract | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Renovações"
        description={`Contratos com renovação nos próximos ${RENEWAL_WINDOW_DAYS} dias.`}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma renovação à vista"
          description={`Nenhum contrato vence nos próximos ${RENEWAL_WINDOW_DAYS} dias.`}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Renovação</TableHead>
                <TableHead>Faltam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.company ? (
                      <Link
                        href={`/empresas/${c.company.id}`}
                        className="hover:underline"
                      >
                        {c.company.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.servico || "—"}</TableCell>
                  <TableCell>{formatCurrency(c.valor)}</TableCell>
                  <TableCell>{formatDate(c.data_renovacao)}</TableCell>
                  <TableCell>
                    <RenewalBadge days={daysUntil(c.data_renovacao)} />
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge value={c.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContractFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contract={editing}
        onSaved={refetch}
      />
    </div>
  );
}
