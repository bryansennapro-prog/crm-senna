-- =============================================================================
-- CRM MVP — Agência Senna
-- Schema completo: tabelas, índices, RLS, funções e triggers.
-- Execute este arquivo PRIMEIRO no SQL Editor do Supabase. Depois rode seed.sql.
-- =============================================================================

-- Necessário para gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- TABELAS
-- -----------------------------------------------------------------------------

-- tenants -------------------------------------------------------------------
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  criado_em   timestamptz not null default now()
);

-- users ---------------------------------------------------------------------
-- id = auth.users.id (1:1 com o usuário de autenticação)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  nome        text,
  email       text,
  papel       text not null default 'vendedor' check (papel in ('admin','vendedor')),
  criado_em   timestamptz not null default now()
);
create index if not exists users_tenant_idx on public.users(tenant_id);

-- companies -----------------------------------------------------------------
create table if not exists public.companies (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  nome            text not null,
  nicho           text,
  telefone        text,
  instagram       text,
  cidade          text,
  origem          text,
  lifecycle_stage text not null default 'lead'
                  check (lifecycle_stage in ('lead','oportunidade','cliente','inativo')),
  criado_em       timestamptz not null default now()
);
create index if not exists companies_tenant_idx on public.companies(tenant_id);
create index if not exists companies_lifecycle_idx on public.companies(tenant_id, lifecycle_stage);

-- contacts ------------------------------------------------------------------
create table if not exists public.contacts (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  nome              text not null,
  telefone_whatsapp text,
  email             text,
  cargo             text,
  e_decisor         boolean not null default false,
  criado_em         timestamptz not null default now()
);
create index if not exists contacts_tenant_idx on public.contacts(tenant_id);
create index if not exists contacts_company_idx on public.contacts(company_id);

-- pipeline_stages -----------------------------------------------------------
-- Configurável por tenant.
create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  nome        text not null,
  ordem       integer not null default 0
);
create index if not exists pipeline_stages_tenant_idx on public.pipeline_stages(tenant_id, ordem);

-- deals ---------------------------------------------------------------------
create table if not exists public.deals (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references public.tenants(id) on delete cascade,
  company_id                uuid not null references public.companies(id) on delete cascade,
  contact_id                uuid references public.contacts(id) on delete set null,
  titulo                    text,
  servico                   text,
  valor                     numeric(14,2),
  stage_id                  uuid references public.pipeline_stages(id) on delete set null,
  status                    text not null default 'aberto'
                            check (status in ('aberto','ganho','perdido')),
  data_prevista_fechamento  date,
  motivo_perda              text,
  criado_em                 timestamptz not null default now()
);
create index if not exists deals_tenant_idx on public.deals(tenant_id);
create index if not exists deals_company_idx on public.deals(company_id);
create index if not exists deals_stage_idx on public.deals(stage_id);

-- contracts -----------------------------------------------------------------
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  deal_id_origem  uuid references public.deals(id) on delete set null,
  servico         text,
  valor           numeric(14,2),
  recorrente      boolean not null default false,
  data_inicio     date,
  data_renovacao  date,
  status          text not null default 'ativo'
                  check (status in ('ativo','pausado','cancelado')),
  criado_em       timestamptz not null default now()
);
create index if not exists contracts_tenant_idx on public.contracts(tenant_id);
create index if not exists contracts_company_idx on public.contracts(company_id);
create index if not exists contracts_renovacao_idx on public.contracts(tenant_id, data_renovacao);

-- activities ----------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  deal_id     uuid references public.deals(id) on delete set null,
  contact_id  uuid references public.contacts(id) on delete set null,
  tipo        text not null default 'nota'
              check (tipo in ('ligacao','reuniao','whatsapp','nota','follow_up')),
  descricao   text,
  data        timestamptz not null default now(),
  concluida   boolean not null default false,
  criado_em   timestamptz not null default now()
);
create index if not exists activities_tenant_idx on public.activities(tenant_id);
create index if not exists activities_company_idx on public.activities(company_id);
create index if not exists activities_data_idx on public.activities(tenant_id, data);

-- -----------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES
-- -----------------------------------------------------------------------------

-- Retorna o tenant_id do usuário autenticado atual.
-- SECURITY DEFINER evita recursão de RLS ao consultar public.users.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid();
$$;

-- Default automático de tenant_id no insert (padrão canônico do Supabase,
-- análogo a `default auth.uid()`). O client NUNCA envia tenant_id; o default é
-- avaliado antes do WITH CHECK do RLS, garantindo o escopo correto.
alter table public.companies       alter column tenant_id set default public.current_tenant_id();
alter table public.contacts        alter column tenant_id set default public.current_tenant_id();
alter table public.pipeline_stages alter column tenant_id set default public.current_tenant_id();
alter table public.deals           alter column tenant_id set default public.current_tenant_id();
alter table public.contracts       alter column tenant_id set default public.current_tenant_id();
alter table public.activities      alter column tenant_id set default public.current_tenant_id();

-- Provisiona automaticamente todo novo usuário de auth no tenant existente
-- (MVP single-tenant: Agência Senna) como admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select id into v_tenant from public.tenants order by criado_em asc limit 1;
  if v_tenant is null then
    raise exception 'Nenhum tenant encontrado. Rode seed.sql antes de criar usuários.';
  end if;

  insert into public.users (id, tenant_id, nome, email, papel)
  values (
    new.id,
    v_tenant,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'admin'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- REGRA DE NEGÓCIO: fechar deal como GANHO (Seção 4 da spec)
-- Atômico: cria contrato + move deal p/ "Fechado Ganho" + empresa vira cliente.
-- -----------------------------------------------------------------------------
create or replace function public.win_deal(
  p_deal_id        uuid,
  p_servico        text,
  p_valor          numeric,
  p_recorrente     boolean,
  p_data_inicio    date,
  p_data_renovacao date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant    uuid;
  v_company   uuid;
  v_won_stage uuid;
  v_contract  uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception 'Usuário sem tenant.';
  end if;

  -- Garante que o deal pertence ao tenant do usuário e obtém a empresa.
  select company_id into v_company
  from public.deals
  where id = p_deal_id and tenant_id = v_tenant;

  if v_company is null then
    raise exception 'Negócio não encontrado neste tenant.';
  end if;

  -- Localiza o estágio "Fechado Ganho" (opcional — se renomeado, mantém o atual).
  select id into v_won_stage
  from public.pipeline_stages
  where tenant_id = v_tenant and lower(nome) = lower('Fechado Ganho')
  limit 1;

  update public.deals
  set status   = 'ganho',
      stage_id = coalesce(v_won_stage, stage_id)
  where id = p_deal_id and tenant_id = v_tenant;

  insert into public.contracts
    (tenant_id, company_id, deal_id_origem, servico, valor, recorrente, data_inicio, data_renovacao, status)
  values
    (v_tenant, v_company, p_deal_id, p_servico, p_valor,
     coalesce(p_recorrente, false), coalesce(p_data_inicio, current_date), p_data_renovacao, 'ativo')
  returning id into v_contract;

  update public.companies
  set lifecycle_stage = 'cliente'
  where id = v_company and tenant_id = v_tenant;

  return v_contract;
end;
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Todo acesso é escopado por tenant_id = current_tenant_id().
-- -----------------------------------------------------------------------------
alter table public.tenants         enable row level security;
alter table public.users           enable row level security;
alter table public.companies       enable row level security;
alter table public.contacts        enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals           enable row level security;
alter table public.contracts       enable row level security;
alter table public.activities      enable row level security;

-- tenants: usuário enxerga apenas o próprio tenant.
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- users: enxerga colegas do mesmo tenant; só edita a própria linha.
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Macro p/ as demais tabelas: acesso total dentro do tenant.
drop policy if exists companies_all on public.companies;
create policy companies_all on public.companies
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists contacts_all on public.contacts;
create policy contacts_all on public.contacts
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists pipeline_stages_all on public.pipeline_stages;
create policy pipeline_stages_all on public.pipeline_stages
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists deals_all on public.deals;
create policy deals_all on public.deals
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists contracts_all on public.contracts;
create policy contracts_all on public.contracts
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists activities_all on public.activities;
create policy activities_all on public.activities
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- -----------------------------------------------------------------------------
-- GRANTS
-- -----------------------------------------------------------------------------
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.win_deal(uuid, text, numeric, boolean, date, date) to authenticated;
