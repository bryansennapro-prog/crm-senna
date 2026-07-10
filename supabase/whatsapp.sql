-- =============================================================================
-- CRM MVP — Agência Senna · Reformulação WhatsApp-first (Fase 1)
-- Execute DEPOIS de schema.sql e seed.sql.
-- Cria as tabelas de WhatsApp e ajusta contacts/deals.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- whatsapp_channels — um número/canal de WhatsApp por tenant
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_channels (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade
                  default public.current_tenant_id(),
  provider        text not null default 'meta_cloud' check (provider in ('meta_cloud')),
  display_number  text,
  phone_number_id text not null unique,          -- usado pelo webhook p/ achar o tenant
  waba_id         text,
  access_token    text,                          -- token de envio (server-only)
  status          text not null default 'ativo' check (status in ('ativo','inativo')),
  criado_em       timestamptz not null default now()
);
create index if not exists whatsapp_channels_phone_idx
  on public.whatsapp_channels(phone_number_id);

-- -----------------------------------------------------------------------------
-- conversations — uma thread por (canal, contato)
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade
                   default public.current_tenant_id(),
  channel_id       uuid not null references public.whatsapp_channels(id) on delete cascade,
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  company_id       uuid references public.companies(id) on delete set null,
  deal_id          uuid references public.deals(id) on delete set null,
  status           text not null default 'aberta'
                   check (status in ('aberta','pendente','resolvida')),
  assigned_user_id uuid references public.users(id) on delete set null,
  last_inbound_at  timestamptz,                  -- base da janela de 24h
  last_message_at  timestamptz,
  unread_count     integer not null default 0,
  criado_em        timestamptz not null default now(),
  unique (channel_id, contact_id)
);
create index if not exists conversations_tenant_idx
  on public.conversations(tenant_id, last_message_at desc);

-- -----------------------------------------------------------------------------
-- messages — histórico de mensagens (entrada e saída)
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade
                  default public.current_tenant_id(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id      uuid references public.contacts(id) on delete set null,
  direction       text not null check (direction in ('inbound','outbound')),
  wa_message_id   text unique,                   -- idempotência
  tipo            text not null default 'text'
                  check (tipo in ('text','image','audio','video','document','sticker',
                                  'location','contacts','template','interactive','button','unknown')),
  conteudo        text,
  media_url       text,
  media_mime      text,
  status          text not null default 'received'
                  check (status in ('received','sent','delivered','read','failed')),
  erro            text,
  "timestamp"     timestamptz not null default now(),
  raw             jsonb,
  criado_em       timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on public.messages(conversation_id, "timestamp");

-- -----------------------------------------------------------------------------
-- message_templates — templates aprovados pela Meta (envio fora da janela 24h)
-- -----------------------------------------------------------------------------
create table if not exists public.message_templates (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade
                       default public.current_tenant_id(),
  nome                 text not null,
  idioma               text not null default 'pt_BR',
  categoria            text,
  corpo                text,
  status               text not null default 'pendente'
                       check (status in ('aprovado','pendente','rejeitado')),
  provider_template_id text,
  criado_em            timestamptz not null default now()
);
create index if not exists message_templates_tenant_idx
  on public.message_templates(tenant_id);

-- -----------------------------------------------------------------------------
-- Ajustes nas tabelas existentes
-- -----------------------------------------------------------------------------
-- Contato passa a poder existir sem empresa e ganha wa_id (chave do WhatsApp).
alter table public.contacts add column if not exists wa_id text;
alter table public.contacts alter column company_id drop not null;
create unique index if not exists contacts_tenant_wa_idx
  on public.contacts(tenant_id, wa_id) where wa_id is not null;

-- Liga o negócio à conversa de origem (FK circular permitida: ambos nullable).
alter table public.deals
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (mesmo padrão por tenant). O webhook escreve via service-role.
-- -----------------------------------------------------------------------------
alter table public.whatsapp_channels enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.message_templates enable row level security;

drop policy if exists whatsapp_channels_all on public.whatsapp_channels;
create policy whatsapp_channels_all on public.whatsapp_channels
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists conversations_all on public.conversations;
create policy conversations_all on public.conversations
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists message_templates_all on public.message_templates;
create policy message_templates_all on public.message_templates
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- -----------------------------------------------------------------------------
-- Realtime: habilita a publicação para as tabelas da inbox.
-- (Ignore erros de "already member" se rodar mais de uma vez.)
-- -----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end $$;

-- =============================================================================
-- COMO CONECTAR O NÚMERO (rode após criar o app na Meta):
--
--   insert into public.whatsapp_channels
--     (tenant_id, display_number, phone_number_id, waba_id, access_token)
--   select t.id, '+55XXXXXXXXXXX', 'SEU_PHONE_NUMBER_ID', 'SEU_WABA_ID', 'SEU_TOKEN'
--   from public.tenants t where t.nome = 'Agência Senna';
--
-- O webhook usa phone_number_id para descobrir o tenant; o access_token é lido
-- apenas no servidor (rota de envio). Nunca exponha o token no frontend.
-- =============================================================================
