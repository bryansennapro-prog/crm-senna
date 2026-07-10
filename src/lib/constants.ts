import type {
  ActivityType,
  ContractStatus,
  DealStatus,
  LifecycleStage,
} from "@/lib/types";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

// ---- Lifecycle (empresas) -------------------------------------------------
export const LIFECYCLE_OPTIONS: Option<LifecycleStage>[] = [
  { value: "lead", label: "Lead" },
  { value: "oportunidade", label: "Oportunidade" },
  { value: "cliente", label: "Cliente" },
  { value: "inativo", label: "Inativo" },
];

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  oportunidade: "Oportunidade",
  cliente: "Cliente",
  inativo: "Inativo",
};

// ---- Status de negócios ---------------------------------------------------
export const DEAL_STATUS_OPTIONS: Option<DealStatus>[] = [
  { value: "aberto", label: "Aberto" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  aberto: "Aberto",
  ganho: "Ganho",
  perdido: "Perdido",
};

// ---- Status de contratos --------------------------------------------------
export const CONTRACT_STATUS_OPTIONS: Option<ContractStatus>[] = [
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "cancelado", label: "Cancelado" },
];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

// ---- Tipos de atividade ---------------------------------------------------
export const ACTIVITY_TYPE_OPTIONS: Option<ActivityType>[] = [
  { value: "ligacao", label: "Ligação" },
  { value: "reuniao", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp (manual)" },
  { value: "nota", label: "Nota" },
  { value: "follow_up", label: "Follow-up" },
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  whatsapp: "WhatsApp (manual)",
  nota: "Nota",
  follow_up: "Follow-up",
};

// Estágio considerado "perda" — usado ao marcar um negócio como perdido.
export const LOST_STAGE_NAME = "Fechado Perdido";
export const WON_STAGE_NAME = "Fechado Ganho";

// Janela de renovação (Seção 4): contratos vencendo nos próximos N dias.
export const RENEWAL_WINDOW_DAYS = 30;
