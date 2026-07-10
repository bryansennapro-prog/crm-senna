-- =============================================================================
-- CRM MVP — Agência Senna
-- Seed inicial. Execute DEPOIS de schema.sql e ANTES de criar o primeiro usuário.
-- Cria o tenant único (Agência Senna) e os estágios do pipeline.
-- Idempotente: pode ser rodado mais de uma vez sem duplicar.
-- =============================================================================

-- Tenant único do MVP -------------------------------------------------------
insert into public.tenants (nome)
select 'Agência Senna'
where not exists (select 1 from public.tenants where nome = 'Agência Senna');

-- Estágios do pipeline (Seção 3 da spec) ------------------------------------
insert into public.pipeline_stages (tenant_id, nome, ordem)
select t.id, s.nome, s.ordem
from public.tenants t
cross join (values
  ('Novo Lead', 1),
  ('Contato Feito / Qualificação', 2),
  ('Proposta Enviada', 3),
  ('Negociação', 4),
  ('Fechado Ganho', 5),
  ('Fechado Perdido', 6)
) as s(nome, ordem)
where t.nome = 'Agência Senna'
  and not exists (
    select 1 from public.pipeline_stages ps
    where ps.tenant_id = t.id and ps.nome = s.nome
  );
