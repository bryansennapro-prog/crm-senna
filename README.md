# CRM — Agência Senna (MVP)

CRM interno para gestão de leads e clientes, com o funil
**Lead → Oportunidade → Cliente → Pós-venda/Renovação**.

Construído com **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui** no
frontend e **Supabase (PostgreSQL + Auth + RLS)** no backend. A arquitetura já
nasce **multi-tenant** (coluna `tenant_id` + RLS), operando hoje com um único
tenant: **Agência Senna**.

> MVP **sem IA, sem automações externas (WhatsApp/n8n/Make), sem integrações de
> terceiros**. Tudo é CRUD manual.

---

## 1. O que está incluso

- **Conversas (Inbox WhatsApp)** — caixa de entrada em tempo real; cada contato novo abre conversa + lead automaticamente (ver seção WhatsApp).
- **Empresas** — CRUD + filtros por nicho e por estágio (lifecycle).
- **Detalhe da empresa** — abas: Dados, Contatos, Negócios, Atividades, Contratos.
- **Pipeline** — Kanban arrastável (dnd-kit) **com fallback de lista** agrupada por estágio.
- **Negócios** — CRUD + fechar como **ganho** (cria contrato, empresa vira cliente) ou **perdido** (com motivo).
- **Contatos / Atividades / Contratos** — CRUD completo.
- **Follow-ups de hoje** — atividades pendentes com data no dia atual.
- **Renovações** — contratos com `data_renovacao` nos próximos 30 dias.
- **Login** via Supabase Auth (e-mail/senha) protegido por middleware + RLS.

---

## 2. Pré-requisitos

- **Node.js 18.18+** (recomendado 20+)
- Conta gratuita no **[Supabase](https://supabase.com)**
- (Opcional) Conta na **[Vercel](https://vercel.com)** para o deploy

---

## 3. Configurar o Supabase

1. Crie um projeto novo em **app.supabase.com** (guarde a senha do banco).
2. No menu lateral, vá em **SQL Editor → New query**.
3. Cole **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
4. Abra outra query, cole **todo** o conteúdo de [`supabase/seed.sql`](supabase/seed.sql) e clique em **Run**.
   - Isso cria o tenant **Agência Senna** e os 6 estágios do pipeline.
   - ⚠️ Rode o seed **antes** de criar o primeiro usuário (o trigger de
     cadastro vincula novos usuários ao tenant existente).
4b. Abra outra query e rode [`supabase/whatsapp.sql`](supabase/whatsapp.sql)
   (tabelas de conversas/mensagens e ajustes). Ordem: **schema → seed → whatsapp**.
5. (Para testar rápido) Em **Authentication → Providers → Email**, **desative
   "Confirm email"**. Assim o cadastro já entra logado, sem confirmação por
   e-mail. Em produção, mantenha a confirmação ativada.
6. Em **Project Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 4. Rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Crie o .env.local a partir do exemplo e preencha as chaves do passo 3.6
cp .env.local.example .env.local

# 3. Suba o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**. Você será redirecionado para **/login**.

> No Windows (PowerShell), troque `cp` por `Copy-Item .env.local.example .env.local`.

### Criar o primeiro usuário

Na tela de login, clique em **"Não tem conta? Criar conta"**, informe nome,
e-mail e senha. O trigger `handle_new_user` cria automaticamente a linha em
`public.users` vinculada ao tenant **Agência Senna** com papel `admin`.

---

## 5. Deploy na Vercel

1. Suba este projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Na Vercel, **New Project → Import** o repositório (framework detectado: Next.js).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. A Vercel roda `next build` automaticamente.
5. No Supabase, em **Authentication → URL Configuration**, adicione a URL de
   produção da Vercel em **Site URL** / **Redirect URLs**.

> O banco/seed do Supabase é o mesmo de produção e desenvolvimento, a menos que
> você crie projetos Supabase separados por ambiente.

---

## WhatsApp (Cloud API da Meta) — reformulação

O CRM virou **WhatsApp-first**: uma mensagem recebida cria/associa contato →
empresa → conversa → negócio em "Novo Lead", e você responde pela tela
**Conversas**. Detalhes e roadmap em [`docs/REFORMULACAO-WHATSAPP.md`](docs/REFORMULACAO-WHATSAPP.md).

**Para ativar (depende de credenciais da Meta):**

1. Rode `supabase/whatsapp.sql` (passo 4b acima).
2. Crie um app na **Meta for Developers** com o produto **WhatsApp** (Cloud API);
   obtenha `phone_number_id`, `waba_id` e um **token de acesso**.
3. Preencha as envs **server-only** (ver `.env.local.example`):
   `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_GRAPH_VERSION`.
4. Configure o **Webhook** na Meta apontando para
   `https://SEU-DOMINIO/api/whatsapp/webhook`, com o mesmo `WHATSAPP_VERIFY_TOKEN`,
   e assine o campo **messages**.
5. Cadastre o número rodando o `insert into public.whatsapp_channels (...)` que
   está comentado no fim de `supabase/whatsapp.sql`.

> O webhook escreve via **service role** (ignora RLS) e descobre o tenant pelo
> `phone_number_id`. O **envio** respeita a **janela de 24h** da Meta (fora dela,
> só com template aprovado — gestão de templates fica para uma fase futura).
> Em desenvolvimento local, exponha o webhook com um túnel (ex.: `ngrok`) para a
> Meta alcançar `localhost`.

## 6. Estrutura do projeto

```
supabase/
  schema.sql            # tabelas, índices, RLS, funções, triggers, RPC win_deal
  seed.sql              # tenant Agência Senna + estágios do pipeline
src/
  middleware.ts         # protege rotas / refresca a sessão
  app/
    layout.tsx          # layout raiz + Toaster
    login/page.tsx      # login / cadastro
    (app)/
      layout.tsx        # guarda de auth + AppShell
      empresas/         # lista + detalhe ([id])
      pipeline/         # kanban + lista
      negocios/
      contatos/
      atividades/
      follow-ups/
      renovacoes/
  components/
    ui/                 # componentes shadcn/ui
    forms/              # diálogos de CRUD (empresa, contato, negócio, etc.)
    pipeline/           # kanban-board (dnd-kit)
    app-shell.tsx       # navegação lateral
  hooks/                # use-async, use-profile
  services/             # camada de acesso ao Supabase (CRUD por entidade)
  lib/
    supabase/           # clients browser/server/middleware
    types.ts            # tipos do domínio
    constants.ts        # enums/labels (lifecycle, status, tipos de atividade)
    format.ts           # moeda BRL e datas
```

---

## 7. Regras de negócio implementadas

- **Fechar negócio como ganho** (`win_deal` — RPC atômica no Postgres):
  cria um registro em `contracts`, move o deal para o estágio **"Fechado Ganho"**
  e atualiza o `lifecycle_stage` da empresa para **`cliente`**.
- **Fechar como perdido:** grava `status = 'perdido'`, o `motivo_perda` e move
  para **"Fechado Perdido"**.
- **Renovação:** apenas uma lista dos contratos com `data_renovacao` nos
  próximos 30 dias (sem automação).
- **Follow-ups de hoje:** atividades com `concluida = false` e `data` no dia atual.
- **Multi-tenant / RLS:** toda tabela é escopada por `tenant_id` via a função
  `current_tenant_id()`. O `tenant_id` é preenchido automaticamente no insert
  por trigger — o frontend nunca o envia.

---

## 8. Premissas e decisões (confirmadas para este MVP)

- A **empresa** é a entidade central do funil.
- Um **deal pode reabrir** o ciclo comercial em uma empresa que já é cliente.
- **Kanban** é o preferido; **lista agrupada** é o fallback (ambos disponíveis).
- Sistema usa **apenas BRL**; sem suporte a múltiplas moedas.

Decisões técnicas não cobertas pela spec e adotadas aqui: Next.js 14 (App Router)
+ React 18 + TypeScript; `@supabase/ssr` para auth; login obrigatório com RLS por
tenant; Kanban com `@dnd-kit`; formulários com **estado controlado nativo +
validação HTML5** (sem react-hook-form/zod, para reduzir dependências).

> ⚠️ Os nomes dos estágios **"Fechado Ganho"** e **"Fechado Perdido"** são usados
> pela lógica de fechamento (`win_deal` e marcação de perda). Se renomeá-los na
> tabela `pipeline_stages`, ajuste também `WON_STAGE_NAME` / `LOST_STAGE_NAME`
> em `src/lib/constants.ts` e a função `win_deal` em `supabase/schema.sql`.

---

## 9. Fora do escopo (v2+)

IA, automações de WhatsApp/Evolution API, integrações n8n, qualificação
automática, multiusuário avançado, permissões granulares, dashboards,
relatórios, metas e comissão.
