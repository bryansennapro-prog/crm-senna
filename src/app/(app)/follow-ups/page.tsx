"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/use-async";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityWithRelations } from "@/lib/types";
import { listTodayPending, setActivityConcluida } from "@/services/activities";

export default function FollowUpsPage() {
  const { data, loading, error, refetch } = useAsync<ActivityWithRelations[]>(
    () => listTodayPending(),
    []
  );

  async function complete(a: ActivityWithRelations) {
    try {
      await setActivityConcluida(a.id, true);
      toast.success("Marcada como concluída");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  return (
    <div>
      <PageHeader
        title="Follow-ups de hoje"
        description="Atividades pendentes com data marcada para hoje."
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nada pendente para hoje"
          description="Você está em dia com os follow-ups."
        />
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {ACTIVITY_TYPE_LABELS[a.tipo]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(a.data)}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium">
                    {a.descricao || "(sem descrição)"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.company ? (
                      <Link
                        href={`/empresas/${a.company.id}`}
                        className="hover:underline"
                      >
                        {a.company.nome}
                      </Link>
                    ) : (
                      "Sem empresa"
                    )}
                    {a.contact ? ` · ${a.contact.nome}` : ""}
                  </p>
                </div>
                <Button size="sm" onClick={() => complete(a)}>
                  Concluir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
