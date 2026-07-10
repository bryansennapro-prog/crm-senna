// =============================================================================
// Tipos do domínio — espelham as tabelas do schema.sql
// =============================================================================

export type UserRole = "admin" | "vendedor";
export type LifecycleStage = "lead" | "oportunidade" | "cliente" | "inativo";
export type DealStatus = "aberto" | "ganho" | "perdido";
export type ContractStatus = "ativo" | "pausado" | "cancelado";
export type ActivityType =
  | "ligacao"
  | "reuniao"
  | "whatsapp"
  | "nota"
  | "follow_up";

export interface Tenant {
  id: string;
  nome: string;
  criado_em: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  nome: string | null;
  email: string | null;
  papel: UserRole;
  criado_em: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  nome: string;
  nicho: string | null;
  telefone: string | null;
  instagram: string | null;
  cidade: string | null;
  origem: string | null;
  lifecycle_stage: LifecycleStage;
  criado_em: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  company_id: string | null;
  wa_id: string | null;
  nome: string;
  telefone_whatsapp: string | null;
  email: string | null;
  cargo: string | null;
  e_decisor: boolean;
  criado_em: string;
}

export interface PipelineStage {
  id: string;
  tenant_id: string;
  nome: string;
  ordem: number;
}

export interface Deal {
  id: string;
  tenant_id: string;
  company_id: string;
  contact_id: string | null;
  titulo: string | null;
  servico: string | null;
  valor: number | null;
  stage_id: string | null;
  status: DealStatus;
  data_prevista_fechamento: string | null;
  motivo_perda: string | null;
  criado_em: string;
}

export interface Contract {
  id: string;
  tenant_id: string;
  company_id: string;
  deal_id_origem: string | null;
  servico: string | null;
  valor: number | null;
  recorrente: boolean;
  data_inicio: string | null;
  data_renovacao: string | null;
  status: ContractStatus;
  criado_em: string;
}

export interface Activity {
  id: string;
  tenant_id: string;
  company_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  tipo: ActivityType;
  descricao: string | null;
  data: string;
  concluida: boolean;
  criado_em: string;
}

// ---- Tipos com relações (usados em listas/joins) --------------------------

export interface DealWithRelations extends Deal {
  company: Pick<Company, "id" | "nome"> | null;
  contact: Pick<Contact, "id" | "nome"> | null;
  stage: Pick<PipelineStage, "id" | "nome" | "ordem"> | null;
}

export interface ContractWithCompany extends Contract {
  company: Pick<Company, "id" | "nome"> | null;
}

export interface ActivityWithRelations extends Activity {
  company: Pick<Company, "id" | "nome"> | null;
  contact: Pick<Contact, "id" | "nome"> | null;
  deal: Pick<Deal, "id" | "titulo"> | null;
}

// ---- WhatsApp / Inbox -----------------------------------------------------

export type ConversationStatus = "aberta" | "pendente" | "resolvida";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "received"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Conversation {
  id: string;
  tenant_id: string;
  channel_id: string;
  contact_id: string;
  company_id: string | null;
  deal_id: string | null;
  status: ConversationStatus;
  assigned_user_id: string | null;
  last_inbound_at: string | null;
  last_message_at: string | null;
  unread_count: number;
  criado_em: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  contact_id: string | null;
  direction: MessageDirection;
  wa_message_id: string | null;
  tipo: string;
  conteudo: string | null;
  media_url: string | null;
  media_mime: string | null;
  status: MessageStatus;
  erro: string | null;
  timestamp: string;
  criado_em: string;
}

export interface ConversationListItem extends Conversation {
  contact: Pick<Contact, "id" | "nome" | "wa_id" | "telefone_whatsapp"> | null;
  company: Pick<Company, "id" | "nome"> | null;
}
