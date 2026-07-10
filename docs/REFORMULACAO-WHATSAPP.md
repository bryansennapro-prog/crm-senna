# Reformulação — WhatsApp no centro do CRM

Documento de planejamento e referência da virada para um CRM **WhatsApp-first**.

## Decisões travadas

| Tema | Decisão |
|---|---|
| Conexão WhatsApp | **Cloud API oficial (Meta)** |
| Backend | **Next.js Route Handlers** (`app/api/...`) no mesmo repositório |
| Automação no 1º contato | **Criar tudo**: contato + empresa + conversa + negócio em "Novo Lead" |
| Escopo | **WhatsApp no centro + CRUD manual de apoio** (mantém empresas/negócios/contratos manuais) |

## Arquitetura

```
Cliente (WhatsApp)
   → Provider Meta (Cloud API)
   → Webhook  app/api/whatsapp/webhook  (GET verifica, POST recebe)
   → Motor de ingestão (service-role, ignora RLS; tenant via phone_number_id)
       → acha/cria Contato (telefone E.164)
       → associa/cria Empresa
       → abre/encontra Conversa
       → cria Negócio em "Novo Lead"
       → grava Mensagem (idempotente por wa_message_id)
   → Supabase (Postgres + RLS + Realtime)
   → Inbox em tempo real → atendente responde
   → app/api/whatsapp/send → Graph API → Cliente
```

## Variáveis de ambiente (server-only — nunca `NEXT_PUBLIC`)

```
SUPABASE_SERVICE_ROLE_KEY=...   # cliente admin usado pelo webhook (ignora RLS)
WHATSAPP_VERIFY_TOKEN=...       # validação do webhook (GET hub.verify_token)
WHATSAPP_APP_SECRET=...         # validação da assinatura X-Hub-Signature-256
WHATSAPP_GRAPH_VERSION=v21.0    # confirmar a versão atual na doc da Meta
```

O **token de envio**, `phone_number_id` e `waba_id` ficam por canal na tabela
`whatsapp_channels` (preparado para multi-tenant / revenda).

## Modelo de dados

**Novas tabelas:** `whatsapp_channels`, `conversations`, `messages`,
`message_templates`. **Ajustes:** `contacts` ganha `wa_id` + `company_id`
opcional + índice único `(tenant_id, wa_id)`; `deals` ganha `conversation_id`.
Ver `supabase/whatsapp.sql`.

## Regras da Meta

- **Janela de 24h:** fora dela, só **template aprovado**; dentro, mensagem livre.
- **Templates:** categorias (marketing/utility/auth) precisam de aprovação prévia.
- **Opt-in/opt-out:** respeitar consentimento e descadastro.

## Roadmap

| Fase | Entrega | Status |
|---|---|---|
| 0. Setup Meta | App, número, token, secrets, canal semeado | Depende de credenciais (você) |
| 1. Schema | `supabase/whatsapp.sql` | Implementado |
| 2. Ingestão | webhook + assinatura + idempotência + auto-criação | Implementado |
| 3. Inbox (leitura) | lista + thread + Realtime | Implementado |
| 4. Envio | responder texto na janela de 24h + status | Implementado |
| 5. Templates | envio fora da janela + gestão de templates | Parcial (detecção de janela; UI de gestão futura) |
| 6. Funil | atribuição, transições, conversa↔negócio | Base pronta (negócio criado/linkado) |
| 7. Mídia + multi-tenant | Storage de mídia + onboarding por cliente | Futuro |

## Como ativar (resumo)

1. Rodar no Supabase, nesta ordem: `schema.sql` → `seed.sql` → `whatsapp.sql`.
2. Criar app na Meta (WhatsApp Business / Cloud API), obter `phone_number_id`,
   `waba_id` e um token; configurar o webhook apontando para
   `https://SEU-DOMINIO/api/whatsapp/webhook` com o `WHATSAPP_VERIFY_TOKEN`.
3. Inserir uma linha em `whatsapp_channels` (ver instruções no fim de
   `supabase/whatsapp.sql`).
4. Preencher as envs server-only e fazer deploy.

> ⚠️ Os nomes de estágio "Novo Lead" e "Fechado Ganho/Perdido" continuam sendo
> usados pela lógica. Renomear exige ajuste em `src/lib/constants.ts`.
