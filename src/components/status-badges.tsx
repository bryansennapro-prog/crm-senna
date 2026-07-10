import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABELS,
  DEAL_STATUS_LABELS,
  LIFECYCLE_LABELS,
} from "@/lib/constants";
import type {
  ContractStatus,
  DealStatus,
  LifecycleStage,
} from "@/lib/types";

export function LifecycleBadge({ value }: { value: LifecycleStage }) {
  const variant = {
    lead: "secondary",
    oportunidade: "warning",
    cliente: "success",
    inativo: "outline",
  }[value] as "secondary" | "warning" | "success" | "outline";
  return <Badge variant={variant}>{LIFECYCLE_LABELS[value]}</Badge>;
}

export function DealStatusBadge({ value }: { value: DealStatus }) {
  const variant = {
    aberto: "secondary",
    ganho: "success",
    perdido: "destructive",
  }[value] as "secondary" | "success" | "destructive";
  return <Badge variant={variant}>{DEAL_STATUS_LABELS[value]}</Badge>;
}

export function ContractStatusBadge({ value }: { value: ContractStatus }) {
  const variant = {
    ativo: "success",
    pausado: "warning",
    cancelado: "destructive",
  }[value] as "success" | "warning" | "destructive";
  return <Badge variant={variant}>{CONTRACT_STATUS_LABELS[value]}</Badge>;
}
