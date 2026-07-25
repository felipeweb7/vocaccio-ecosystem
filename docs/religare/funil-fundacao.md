# Funil Religare — fundação (schema + backend NestJS)

Estado: **implementado como arquivos revisáveis, NÃO aplicado/deployado em
produção.** Ver seção 9 ("Antes de aplicar em produção") no final.

**Isto NÃO é uma integração concluída.** Coisas explicitamente faltam:
1. A migration ainda não foi aplicada em nenhum banco.
2. Nenhuma LP/frontend chama `POST /religare/lead` ainda — o endpoint existe,
   mas não está conectado a nenhum modal real.
3. Nenhum checkout InfinitePay real foi criado nem testado contra a API
   deles — o código foi escrito a partir da documentação pública, não de uma
   chamada de sandbox validada.
4. **Um checkout `PAID` (confirmado, reconciliado, sem ambiguidade) ainda
   NÃO gera nenhum pedido operacional.** Não existe hoje nenhum processo —
   automático ou manual — que avise alguém do time pra entregar o Mapa
   Religare depois que o cliente paga. Ver seção 6.

Contexto de origem: pedido do Felipe em 2026-07-23 para fundar o funil de
vendas do Religare no projeto Supabase existente `vocaccio-ecosystem`
(organização de produção `vocaccio-org-seed` / "Vocaccio | Soul 2 Soul"),
sem criar projeto novo, sem tocar dados existentes (3 admins + 2
ReligareProfile hoje).

Revisões:
- 2026-07-23: trocar Edge Functions por NestJS (seção 1), fluxo real de
  checkout com preço fixo.
- 2026-07-24 (1ª auditoria): validação completa real (seção 8), guarda de
  URL pública, confirmação de `transaction_nsu` contra doc oficial.
- 2026-07-24 (2ª auditoria): fluxo em 2 passos com `DRAFT` sem contato
  (seção 4), `RELIGARE_PROD_ORG_ID` fail-closed (seção 4), retenção de
  dados sensíveis (seção 3.1).

## 1. Arquitetura: NestJS, não Edge Functions

A primeira versão desta fundação (mesmo dia) usava Supabase Edge Functions
(Deno). Decisão revisada pelo Felipe: **manter tudo no backend NestJS
existente**, para não introduzir um segundo runtime sem uma razão concreta de
deploy/disponibilidade — não havia nenhuma. Todo o funil (captura de lead,
geração de checkout, webhook) vive agora em:

- `apps/backend/src/api/routes/religare-funnel.controller.ts` — rotas
  públicas `POST /religare/lead` e `POST /religare/infinitepay-webhook`.
  **Não** está em `authenticatedController` (`apps/backend/src/api/
  api.module.ts`) — igual ao `StripeController`, sem `AuthMiddleware`, sem
  sessão, porque quem chama é o navegador anônimo do lead ou o servidor da
  InfinitePay.
- `libraries/nestjs-libraries/src/database/prisma/religare/
  religare-funnel.service.ts` — orquestração (regra de negócio).
- `libraries/nestjs-libraries/src/database/prisma/religare/
  religare-funnel.repository.ts` — acesso a dado (Prisma), camada fina.
- `libraries/nestjs-libraries/src/services/infinitepay.service.ts` — cliente
  HTTP da InfinitePay (`/links`, `/payment_check`), padrão espelhado em
  `stripe.service.ts`.
- `libraries/nestjs-libraries/src/dtos/religare/funnel.dto.ts` — validação
  de entrada (`class-validator`, reforçado pelo `ValidationPipe` global já
  configurado em `apps/backend/src/main.ts`).

Controller → Service → Repository, como o resto do backend. Nenhuma pasta
`supabase/` existe mais neste repo (removida nesta revisão).

## 2. Modelo de dados (aditivo)

Migration: `libraries/nestjs-libraries/src/database/prisma/migrations/20260723_religare_funnel_foundation/migration.sql`

- `ReligareLead` — lead capturado; `orgId`, `userId`, `email`, `status`
  indexados. `profileId` aponta pro `ReligareProfile` existente. `userId` é
  opcional: leads anônimos começam sem identidade compartilhada e podem ser
  vinculados posteriormente a `public.User.id` por fluxo confiável.
- `ReligareProfile` — recebe `userId` opcional e indexado para permitir que
  um mesmo usuário do ecossistema seja reconhecido no Religare sem misturar
  seus funis de cobrança. O vínculo não é inferido automaticamente apenas
  por email não verificado.
- `ReligareCheckout` — 1 linha por tentativa de checkout.
  `providerReference` (= `order_nsu` gerado por nós) é `NOT NULL` + `UNIQUE`
  desde a criação — é a chave que o webhook usa pra localizar o checkout,
  nunca um id vindo do payload do provider. Nunca reaproveita `Orders`
  (marketplace buyer/seller herdado do Postiz — domínio diferente).
- `ReligareCheckoutEvent` — log de todo evento de webhook, gravado **antes**
  de processar, idempotente por `providerEventId` (unique).

As tabelas comerciais existentes não foram alteradas. A migration adiciona
apenas a coluna opcional `ReligareProfile.userId`, seu índice e sua FK para
`User`; as novas tabelas também possuem `ReligareLead.userId` opcional. Rodar
`prisma format` reindentou os models `Expert` e `ReligareProfile`; isso é
cosmético, sem alteração de default ou nome de campo além do novo vínculo
explicitamente documentado.

### 2.1 Identidade compartilhada — `userId` (fundação, sem uso ainda)

`ReligareLead.userId` e `ReligareProfile.userId` são `String?` (opcionais),
com índice e FK pra `User.id` (`ON DELETE SET NULL` — confirmado batendo
com o que o Prisma geraria via `prisma migrate diff --from-empty`, seção 8.2).
Pontos que valem registrar explicitamente, porque são decisão de design, não
óbvios pelo código:

- **Lead anônimo começa sem `userId`.** O passo 1 (`startLead`) nunca seta
  `userId` — não há sessão nem identidade nesse ponto do funil, só
  nascimento + consentimento. `userId` fica `null` até (e se) alguém
  implementar o fluxo de vínculo (fora do escopo desta fundação).
- **Não existe vinculação automática por email não verificado.** Mesmo que
  um `ReligareLead.email` bata com um `User.email` existente, nenhum código
  desta fundação cria esse vínculo sozinho — email não é prova de
  identidade (qualquer um pode digitar o email de outra pessoa num
  formulário público). Vincular exige um fluxo de confirmação (login,
  magic link, OTP — a definir), nunca inferência silenciosa.
- **`User.id` é a identidade interna compartilhada** do ecossistema
  Vocaccio (a mesma tabela `User` usada por HUB, Ateliê, CRM, etc.) — é pra
  ela que `userId` aponta, não pra um id específico do Religare. Isso é o
  que permite, no futuro, reconhecer "esta é a mesma pessoa" entre o funil
  público do Religare e uma conta já existente no produto, sem duplicar
  cadastro.
- **`auth.users` (Supabase Auth) será conectado numa etapa futura**, fora
  desta fundação. Hoje o produto não usa Supabase Auth pra sessão de
  usuário (confirmado: nenhum `@supabase/supabase-js` em código real, ver
  seção 1 da versão anterior deste doc) — `userId` aqui aponta pro `User`
  do Postgres/Prisma, que é a identidade que já existe. Quando/se
  `auth.users` entrar no produto, o vínculo entre `auth.users` e
  `public.User` é responsabilidade de outra peça, não desta.
- **Nenhum código de aplicação usa `userId` ainda** — confirmado por grep:
  zero referências em `religare-funnel.service.ts`,
  `religare-funnel.repository.ts`, `funnel.dto.ts` ou
  `religare-funnel.controller.ts`. É coluna+índice+FK prontos pra um fluxo
  de vínculo futuro decidir como e quando popular, não uma feature
  funcionando hoje.

### Diff (resumo)

```
git diff --stat -- libraries/nestjs-libraries/src/database/prisma/schema.prisma
 schema.prisma | 217 ++++++++++++++++-----
 1 file changed, 171 insertions(+), 46 deletions(-)
```
46 remoções = reindentação de `Expert`/`ReligareProfile` (cosmético, sem
mudança de tipo/nome/default). O resto são os 2 enums + 3 models novos + os
campos `userId` (seção 2.1) + 2 campos de relation-back (`religareLeads` em
`Organization`, `religareLeads`/`religareProfiles` em `User`). Diff completo
disponível via `git diff` no worktree — não colado aqui por tamanho.
Confirmado (seção 8.2, grep): nenhuma menção a `authUserId` em lugar nenhum
do worktree — não foi adicionado prematuramente.

### Comando de validação

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db" pnpm dlx prisma@6.5.0 validate \
  --schema=libraries/nestjs-libraries/src/database/prisma/schema.prisma
```
Rodado nesta sessão → `is valid 🚀` (evidência real, não afirmação). **Isso
valida só sintaxe/relations**, não substitui `prisma migrate diff` contra um
banco real (não disponível neste worktree — ver seção 8).

### Rollback

```sql
ALTER TABLE "ReligareProfile" DROP CONSTRAINT "ReligareProfile_userId_fkey";
DROP INDEX IF EXISTS "ReligareProfile_userId_idx";
ALTER TABLE "ReligareProfile" DROP COLUMN "userId";
DROP TABLE "ReligareCheckoutEvent";
DROP TABLE "ReligareCheckout";
DROP TABLE "ReligareLead";
DROP TYPE "ReligareCheckoutStatus";
DROP TYPE "ReligareLeadStatus";
```
(Também documentado no cabeçalho do `migration.sql`.) Reverter
`schema.prisma` é um `git revert` do commit desta mudança — sem isso, o
Prisma Client ficaria dessincronizado do banco.

## 3. RLS

As 3 tabelas têm `ENABLE ROW LEVEL SECURITY` sem nenhuma policy (deny-all
pros papéis `anon`/`authenticated` do Supabase). Como agora **nenhum** client
Supabase (Edge Function, `@supabase/supabase-js`) toca essas tabelas — tudo
passa pela `DATABASE_URL` privilegiada do backend, igual a toda outra tabela
do schema — isso é puramente defesa em profundidade, não um gate funcional.
Detalhe completo no comentário da migration.

## 3.1 Retenção e acesso — nascimento, email, WhatsApp, payload bruto do webhook

Dados sensíveis coletados por este funil e onde ficam:

| Dado | Tabela.coluna | Sensibilidade |
|---|---|---|
| Data/hora/local de nascimento | `ReligareLead.birthDate/birthTime/birthPlace`, depois replicado em `ReligareProfile` | Dado pessoal (não é dado sensível no sentido LGPD art. 5º II, mas é a base do produto — permite inferir signo/mapa astral) |
| Email | `ReligareLead.email` | Dado pessoal, identificador direto |
| WhatsApp | `ReligareLead.whatsapp` | Dado pessoal, identificador direto |
| Payload bruto do webhook InfinitePay | `ReligareCheckoutEvent.payload` (JSONB) | Pode conter `receipt_url`, valores pagos, `capture_method` — dado financeiro-adjacente, não cartão (nunca armazenamos PAN/CVV, só o que a InfinitePay manda no webhook) |
| Consentimento | `ReligareLead.consentVersion`/`consentedAt` | Metadado de conformidade (LGPD) — existe desde a fundação original justamente pra rastrear base legal |

**Acesso**: só o backend NestJS, via `DATABASE_URL` privilegiada — mesmo
caminho de acesso que todas as outras tabelas do schema (Clients, Orders,
etc.). Nenhum client Supabase com role `anon`/`authenticated` toca essas
tabelas (seção 3). Não existe hoje nenhuma tela de admin pra listar/editar
leads do funil — consulta só é possível via Prisma Studio/query direta por
quem já tem acesso ao banco de produção (mesmo grupo que já acessa qualquer
outra tabela sensível do sistema).

**Retenção — GAP, decisão pendente**: esta fundação **não implementa**
nenhuma rotina de expurgo/anonimização automática. Estado atual:
- Leads `DRAFT` que nunca completam o passo 2 (abandono no meio do
  formulário) ficam retidos indefinidamente, com dado de nascimento mas sem
  contato — órfãos de baixo risco de identificação isolada, mas ainda assim
  dado pessoal.
- Leads convertidos (`CONVERTED`) e seus `ReligareProfile`/`ReligareCheckout`
  associados também ficam retidos indefinidamente — mesmo padrão que o
  resto do produto hoje (nenhuma tabela deste schema tem expurgo
  automático; `ReligareProfile` já usa soft-delete via `deletedAt`, sem
  purge físico programado).
- `ReligareCheckoutEvent.payload` (JSONB bruto) idem — retido junto com o
  checkout, sem TTL.

**Antes de escalar o funil pra tráfego real**, decidir e documentar (fora
do escopo desta fundação, é decisão de produto/compliance, não técnica):
tempo de retenção de `DRAFT` abandonado (ex. purge automático após 30/90
dias é padrão comum pra funis de captura), se `ReligareCheckoutEvent.payload`
precisa de retenção mais curta que o resto (é o dado com maior superfície —
inclui `receipt_url` e valores), e se há obrigação de retenção mínima por
outro motivo (fiscal/contábil, já que envolve pagamento confirmado).

## 4. Fluxo real — `POST /religare/lead` (2 passos, mesmo endpoint)

Revisado em 2026-07-24 (auditoria do Felipe) para persistir nascimento
imediatamente e nunca depender de email/whatsapp pra existir um lead.
`ReligareFunnelService.captureLead()` roteia pro passo certo pela presença
de `leadId` no corpo:

### Passo 1 — `startLead()` (sem `leadId` no request)

1. `orgId` = `RELIGARE_PROD_ORG_ID` — **sem fallback**. Se a env var não
   estiver setada, `prodOrgId()` lança erro e a requisição inteira falha com
   500 (ver seção "fail-closed" abaixo) — nunca escreve na org de produção
   por acidente.
2. Exige `birthDate` (YYYY-MM-DD) + `birthTime` (HH:mm) + `birthPlace` +
   `consentVersion`, todos válidos. **NÃO exige email nem whatsapp.**
3. Rate limit básico: 30 leads novos/minuto por org (contagem via Prisma na
   própria tabela, sem infra nova).
4. Cria `ReligareLead` com `status = DRAFT`, `consentedAt = now()`. Nenhuma
   dedup por contato acontece aqui — cada passo 1 sempre gera um lead novo
   (não há como deduplicar sem contato ainda).
5. Retorna `{ leadId, checkoutId: null, checkoutUrl: null }`. **Nenhum
   checkout é criado no passo 1** — isso só faz sentido depois que existe
   contato pra cobrar.

`leadId` (o `id` do `ReligareLead`, UUID v4 gerado pelo Prisma) é o "token
seguro" que o passo 2 usa. Não existe um campo de token separado — decisão
deliberada: um UUID v4 tem 122 bits de entropia (computacionalmente
inviável de adivinhar/força-bruta), o mesmo padrão que gateways de
pagamento usam pra session/order id (ex. Stripe Checkout Session), e evita
uma segunda tabela/coluna só pra isso numa fundação. Trade-off documentado:
se um `leadId` vazar em log/analytics de terceiro, quem tiver o id pode
completar aquele lead específico (só aquele — não há acesso a outros dados)
até ele virar `CONVERTED`; mitigação atual é não logar `leadId` junto de
PII em nenhum lugar do código (conferir isso continua valendo a cada PR
futuro que mexer neste service).

### Passo 2 — `completeLead(leadId, dto)` (com `leadId` no request)

1. `orgId` = `RELIGARE_PROD_ORG_ID` (mesma regra fail-closed do passo 1).
2. Valida email (`class-validator @IsEmail`)/whatsapp (normalizado pra
   dígitos, 10–13). Exige pelo menos um dos dois — **antes** de tocar o
   banco (testado: `findLeadById` não é chamado se a validação falhar).
3. Busca o lead **sempre** por `(id = leadId, orgId = servidor)` — nunca por
   email/whatsapp, nunca confiando em orgId do navegador. `leadId`
   inexistente OU de outra org retornam o mesmo erro genérico
   `invalid_request` (sem revelar qual dos dois motivos foi).
4. Atualiza o lead (merge — nunca sobrescreve campo já preenchido com
   `null` se o passo 2 não reenviar).
5. `ReligareProfile` só é criado quando `fullName` + `birthDate` +
   `birthTime` + `birthPlace` estão TODOS presentes e válidos
   (`ReligareProfile.name` é `NOT NULL`, por isso `fullName` entra nos
   "campos mínimos"). Reaproveita `ReligareRepository.createProfile()` já
   existente. Se ainda faltar `fullName`, o lead vira `NEW` (tem contato,
   ainda não qualificado).
6. `order_nsu` interno: gerado como `RLG-<uuid v4>` na primeira vez que um
   checkout é necessário; reaproveitado em retry de uma falha anterior (ver
   próximo item), pra não gerar order_nsu órfão a cada clique.
7. Checkout idempotente (`ensureCheckout`): se o lead já tem um checkout
   `PAID`/`PROCESSING`/`PENDING`-com-link, reaproveita (não chama a
   InfinitePay de novo, evita cobrança duplicada em resubmissão do modal).
   Se o checkout anterior falhou ou ficou sem link, tenta de novo com o
   MESMO `order_nsu`.
8. Chama `InfinitePayService.createPaymentLink()` (`POST
   https://api.checkout.infinitepay.io/links`) com o preço fixo do servidor
   (seção 5) — só depois de passar pela guarda de URL pública (seção 6).
   Se falhar, marca o checkout como `FAILED` e retorna `checkoutUrl: null`
   (lead e checkoutId ainda são retornados, pro frontend poder tentar de
   novo).
9. Retorna `{ leadId, checkoutId, checkoutUrl }`.

### `RELIGARE_PROD_ORG_ID` fail-closed

Antes desta revisão, `prodOrgId()` tinha um fallback silencioso:
`process.env.RELIGARE_PROD_ORG_ID || 'vocaccio-org-seed'`. Isso significava
que QUALQUER ambiente (dev local esquecido, CI, um deploy futuro com env
var faltando) escreveria por engano na org de produção real, sem aviso.
Removido: hoje `prodOrgId()` lança `Error('religare_funnel_misconfigured:
RELIGARE_PROD_ORG_ID ausente')` se a env var não existir, e a requisição
inteira falha com 500 — testado (seção 7). `vocacc-org-seed` continua sendo
o valor correto pra produção, mas agora tem que ser setado explicitamente
em CADA ambiente, nunca herdado por omissão.

## 5. Preço — fixo no servidor

`libraries/nestjs-libraries/src/database/prisma/religare/religare-funnel-pricing.ts`:

```ts
export const RELIGARE_MAPA_PRODUCT = {
  name: 'Mapa Religare',
  totalCents: 47_640, // 12 x R$ 39,70
  installments: 12,
} as const;
```

Constante de código (não env var) — decisão deliberada: mudar preço deve
passar por revisão de PR, não por uma variável de ambiente que pode ficar
errada/ausente num deploy. Nunca lido do corpo da requisição nem do
navegador em nenhum ponto do fluxo.

## 6. Webhook — `POST /religare/infinitepay-webhook`

**Gap de segurança documentado, sem mudança nesta revisão**: a InfinitePay
não publica esquema de assinatura HMAC (verificado via busca na documentação
pública em jul/2026 — diferente da Stripe, que este repo já integra com
`stripe.webhooks.constructEvent`). Duas camadas substituem:

1. **Token de alta entropia** embutido na `webhook_url` que nós mesmos
   registramos ao chamar `/links` (`?token=...`). Gerado fora do código
   (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
   documentado no `.env.example`) e comparado em **tempo constante** —
   `InfinitePayService.validateWebhookToken()` usa digest SHA-256 dos dois
   lados + `crypto.timingSafeEqual`, evitando timing attack e o erro de
   `timingSafeEqual` com buffers de tamanho diferente.
2. **Reconciliação ativa**: mesmo com o token certo, o valor/status do corpo
   do webhook nunca é confiado. `ReligareFunnelService.handleInfinitePayWebhook()`
   chama de volta `POST /payment_check` (server-to-server, com `handle` do
   lojista) e só marca `PAID` se a InfinitePay confirmar `paid: true` **e**
   `paid_amount` bater exatamente com `amountCents` salvo no checkout.

Ordem exata (coberta pelos testes da seção 7):
1. Valida token (`401` se errado, antes de tocar no banco).
2. Valida `order_nsu`/`transaction_nsu` presentes no payload (`400
   invalid_payload` se não).
3. Grava `ReligareCheckoutEvent` **antes** de processar — idempotência por
   `providerEventId` (assumido = `transaction_nsu`; a InfinitePay não
   documenta um "event id" explícito, **validar contra payload real de
   sandbox antes de produção**). Conflito = replay, retorna `200
   {success:true}` sem reprocessar.
4. Localiza `ReligareCheckout` por `providerReference = order_nsu` (nunca
   por um id vindo do payload — a InfinitePay nem envia um).
   `order_nsu` desconhecido → `400 unknown_order`, sem chamar `payment_check`.
5. Se já `PAID`, marca evento processado e responde sucesso (idempotência de
   negócio, não só de evento).
6. Chama `payment_check`. Se `paid !== true`, responde sucesso sem marcar
   pago (evento válido, mas ainda não é confirmação).
7. Se `paid_amount` não bate com `amountCents` → `400 amount_mismatch`,
   **nunca marca `PAID`**.
8. Só então: `markCheckoutPaid` + `markEventProcessed`.

Resposta segue o contrato documentado pela InfinitePay:
`{ success: boolean, message: string | null }`, `200` em sucesso, `400` em
erro retry-ável do lado deles.

### Gap operacional explícito: `PAID` ≠ pedido em produção

Depois do passo 8 (`markCheckoutPaid`), o `ReligareCheckout` fica com
`status = PAID` — verificado, reconciliado com a InfinitePay, sem
ambiguidade de valor. **E é só isso que acontece.** Nenhum `ServiceRequest`
(o model que o Ateliê Virtual usa pra fila de produção) é criado. Nenhuma
notificação sai pro time. Nenhum e-mail de confirmação é disparado pro
cliente. O `TODO` comentado em `handleInfinitePayWebhook()` marca
exatamente esse ponto de extensão, mas **não está implementado** — depende
de mapear Religare → `ServiceOffering` (domínio do Ateliê Virtual), decisão
de produto ainda não tomada (que oferta? que nível de escopo? processo
manual ou automático?).

**Consequência prática se este funil for ativado sem resolver isso**: um
cliente pode pagar de verdade (via link real da InfinitePay) e nada
operacional acontece — o pagamento fica "preso" em `ReligareCheckout.status
= PAID`, visível só por quem consultar o banco diretamente. Isso precisa
ser resolvido (mesmo que como processo manual — "alguém confere
`ReligareCheckout` com `status = PAID` e `orgId` toda semana" — antes de
qualquer tráfego real chegar no checkout, não só antes do `ServiceRequest`
automático existir).

## 7. Testes automatizados

`libraries/nestjs-libraries/src/database/prisma/religare/religare-funnel.service.spec.ts`
— Jest, mocks manuais do repository/InfinitePayService. **Executado de
verdade em 2026-07-24** (ver seção 8) — **11/11 PASS**:

Webhook (`handleInfinitePayWebhook`):
- **Sucesso**: `payment_check` confirma `paid:true` com valor correto →
  `markCheckoutPaid` chamado, resposta `{success:true}`.
- **Replay**: `providerEventId` já existe (conflito no insert) → `payment_check`
  **não é chamado de novo**, `markCheckoutPaid` não é chamado, resposta
  `{success:true}` (idempotente, sem reprocessar).
- **Valor incorreto**: `payment_check` confirma `paid:true` mas com valor
  diferente do esperado → `markCheckoutPaid` **nunca** chamado, resposta
  `{success:false, message:'amount_mismatch'}`.
- **order_nsu desconhecido**: checkout não encontrado → não chama
  `payment_check`, responde `unknown_order`.

Passo 1 (`startLead`):
- Cria lead `DRAFT` sem email/whatsapp quando nascimento+consentVersion
  estão completos.
- Rejeita passo 1 sem os campos mínimos, sem tocar o banco.

Passo 2 (`completeLead`):
- Completa o lead por `(id=leadId, orgId=servidor)` — nunca por
  email/whatsapp; sem `fullName` ainda, vira `NEW` (não `QUALIFIED`).
- `leadId` de outra org (ou inexistente) → erro genérico, sem vazar qual dos
  dois motivos foi.
- Rejeita sem email nem whatsapp, **antes** de consultar o banco.

Configuração:
- `RELIGARE_PROD_ORG_ID` ausente → recusa processar (fail-closed), nunca
  usa `vocaccio-org-seed` como default.
- URL não-pública: `NEXT_PUBLIC_BACKEND_URL`/`FRONTEND_URL` em localhost →
  `InfinitePayService.createPaymentLink` **nunca é chamado**, checkout vai
  direto pra `FAILED`.

## 8. Validação completa executada em 2026-07-24 (2ª rodada)

Rodada pedida pelo Felipe após a fundação inicial: `prisma generate`,
`prisma migrate diff` (sem aplicar), os 5 testes, boot real + curl,
confirmação de `transaction_nsu` contra a doc oficial, e guarda de URL
pública. Executada **neste worktree** (não em `C:\dev\vocaccio`, que estava
com outra branch — `claude/sprint-caixa-d1-d2-ac37e5` — e trabalho não
commitado de outra sessão; replicar lá teria exigido trocar de branch num
worktree com mudanças alheias pendentes, então copiei `.env` real pra cá e
rodei `pnpm install` aqui, mesmo padrão já validado antes). `.env` copiado
foi apagado ao final (é gitignored, nunca chegou a ser commitado).

**PASS (evidência real, comandos e saída abaixo):**

| # | Item pedido | Comando | Resultado |
|---|---|---|---|
| 1a | `prisma generate` | `pnpm install` (postinstall roda `prisma-generate`) | `✔ Generated Prisma Client (v6.5.0)` |
| 1b | `prisma migrate diff` sem aplicar | `prisma migrate diff --from-schema-datasource schema.prisma --to-schema-datamodel schema.prisma` (introspecção **read-only** do banco real, sem shadow DB) | Diff exatamente igual à migration escrita à mão: 2 enums + 3 tabelas + índices/FKs, **zero divergência inesperada** no resto do schema |
| 4 | 5 testes automatizados | `jest` com heap ampliado (`NODE_OPTIONS=--max-old-space-size=4096`, `isolatedModules`) — config ad-hoc porque `jest.config.ts` da raiz depende de `@nx/jest`, não instalado (gap de infra pré-existente, não desta feature) | **5/5 PASS** |
| 4 | Boot real | `pnpm run dev:backend` | `Nest application successfully started`, porta 3000 — **achou e corrigiu 1 bug real de tipo** (`Prisma.InputJsonValue` vs `Record<string,unknown>` no payload do evento) que só o `tsc` completo pegou, nem `jest --isolatedModules` nem `prisma validate` |
| 4 | `/religare/lead` — payload inválido (sem email/whatsapp, email malformado, sem consentVersion) | `curl` x3 | 400 em todos, mensagens genéricas/de validação, **sem tocar o banco** |
| 4 | `/religare/infinitepay-webhook` — token ausente/errado | `curl` x2 | 401 `unauthorized`, **sem tocar o banco** (`timingSafeEqual` funciona com token vazio/errado, sem crashar) |
| 4 | `/religare/infinitepay-webhook` — token certo, payload sem order_nsu/transaction_nsu | `curl` | 400 `invalid_payload`, **sem tocar o banco** |
| 5 | `transaction_nsu` como identificador do evento | `WebFetch` na doc oficial (`infinitepay.io/checkout-documentacao`) | Confirmado: `transaction_nsu` é descrito como "ID único da transação"; **não existe campo de event id separado** — escolha original estava certa, comentário no código atualizado de "assumido" pra "confirmado" |
| 6 | webhook_url/redirect_url HTTPS públicas configuráveis | Novo guard `isPublicHttpsUrl()` em `religare-funnel.service.ts` + teste dedicado | Bloqueia e marca `FAILED` **antes** de chamar a InfinitePay se `NEXT_PUBLIC_BACKEND_URL`/`FRONTEND_URL` forem `localhost`/não-HTTPS — testado no Jest E confirmado no boot real (com URLs de teste `https://vocacc.io`, o guard deixou passar e o código tentou mesmo a chamada real à InfinitePay) |

**BLOQUEIO real, não contornado (por decisão, não por incapacidade):**

Os cenários "captura válida", "reenvio idempotente", "order_nsu inexistente"
(via webhook) e "replay" **fim-a-fim contra banco real** exigem que
`ReligareLead`/`ReligareCheckout`/`ReligareCheckoutEvent` existam no
Postgres — e a migration **não foi aplicada**, por instrução explícita.
Testado (`curl` com payload 100% válido em ambos endpoints) e confirmado via
log do servidor: erro `PrismaClientKnownRequestError P2021` — *"The table
`public.ReligareLead` [ou `ReligareCheckoutEvent`] does not exist"* — pilha
de erro passa por `Controller → Service → Repository → Prisma` corretamente,
provando que a wiring está certa e que o único motivo do bloqueio é a
migration ausente, não um bug. Cliente recebeu só
`{"statusCode":500,"message":"Internal server error"}` (sem vazar nome de
tabela/stack — o filtro de exceção global do backend já sanitiza isso).

A cobertura *de negócio* desses 4 cenários (idempotência, order_nsu
desconhecido, valor incorreto, replay) está nos 5 testes Jest da seção 7,
que rodam contra um repository mockado e por isso não dependem da migration
estar aplicada. Fim-a-fim contra banco real só é possível depois do passo 1
da seção 9.

**Ainda não verificado** (segue fora do escopo desta rodada):
- Chamada real a `POST /links`/`POST /payment_check` da InfinitePay com
  `handle` de comerciante de verdade (usei `test-handle-nao-real` — a
  InfinitePay rejeitaria, mas não cheguei a testar isso porque o código
  falha antes, na tabela ausente).
- `ESLint`/`tsc --noEmit` do monorepo completo (só o `nest start --watch`
  real, que compila via webpack incremental).

**Achado à parte, não relacionado a esta feature:** `jest.config.ts` da raiz
do monorepo depende de `@nx/jest`, que não está instalado — `pnpm test`/
`npx jest` na raiz falha imediatamente com esse projeto. É uma lacuna de
infra pré-existente (o repo não usa Nx de verdade, só sobrou config
vestigial do fork do Postiz). Vale um item de faxina separado.

## 8.1 Rodada de 2026-07-24 (3ª — fluxo em 2 passos)

Após a 2ª auditoria do Felipe (`DRAFT` sem contato, `leadId`/token,
`RELIGARE_PROD_ORG_ID` fail-closed, retenção de dados, gap do
`ServiceRequest`), repeti a validação completa neste worktree (mesmo padrão:
copiar `.env` real, rodar, apagar `.env` ao final).

**PASS (evidência real):**

| Item | Comando/verificação | Resultado |
|---|---|---|
| Schema com `DRAFT` | `prisma validate` | `is valid 🚀` |
| Prisma Client regenerado | `prisma generate` | `✔ Generated Prisma Client (v6.5.0)` |
| `prisma migrate diff` (sem aplicar) | introspecção real, read-only | Mesmo diff estrutural de antes (2 enums + 3 tabelas + índices/FKs), zero divergência |
| 11 testes automatizados | jest (mesmo config ad-hoc) | **11/11 PASS** (4 webhook + 2 passo1 + 3 passo2 + 1 fail-closed + 1 URL pública) |
| Boot real (2ª vez, código novo) | `pnpm run dev:backend` | `Nest application successfully started` — **0 erros de compilação** (o rework não introduziu o tipo de bug que a 1ª rodada pegou) |
| Passo 1 — payload válido (sem contato) | `curl` | 500 `P2021` — tabela `ReligareLead` ausente (esperado, migration não aplicada); pilha confirma `ReligareFunnelService.startLead` |
| Passo 1 — sem `birthPlace` | `curl` | 400 `invalid_request`, **sem tocar o banco** |
| Passo 2 — `leadId` sem email/whatsapp | `curl` | 400 `invalid_request`, **sem tocar o banco** (`findLeadById` nem chamado — mesma ordem de validação do teste unitário) |
| Passo 2 — `leadId` válido + email, lead não existe (tabela ausente) | `curl` | 500 `P2021`, pilha confirma `ReligareFunnelService.completeLead` → `findLeadById` |
| Passo 2 — `leadId` mal formado (não-UUID) | `curl` | 400 `["leadId must be a UUID"]` — `@IsUUID()` do DTO funcionando |

**Não testado via curl nesta rodada (coberto só pelo teste unitário)**:
`RELIGARE_PROD_ORG_ID` ausente — exigiria reiniciar o backend sem essa env
var só pra reconfirmar algo que o teste Jest já prova isoladamente; decidi
não gastar mais um ciclo de boot (4-5 min) pra isso. Se quiser essa
confirmação end-to-end também, é só pedir.

## 8.2 Rodada de 2026-07-24 (4ª — vínculo de identidade compartilhada + commit)

Auditoria pré-commit pedida pelo Felipe: confirmar os ajustes de `userId`
(seção 2.1), garantir que nada fora do escopo foi tocado, e validar de novo
antes de registrar um commit local coeso (sem aplicar/deployar/conectar LP).

**Achado real desta rodada — 2 FKs inconsistentes corrigidas.** Rodei
`prisma migrate diff --from-empty --to-schema-datamodel schema.prisma
--script` (gera o SQL que o Prisma criaria do zero a partir do schema —
não precisa de banco, é a fonte mais confiável pra conferir se o SQL
escrito à mão bate com o schema). Ele apontou que
`ReligareLead_profileId_fkey` e `ReligareCheckoutEvent_checkoutId_fkey`
deveriam ser `ON DELETE SET NULL` (são relações opcionais — esse é o
default do Prisma pra FK opcional), mas o `migration.sql` tinha `ON DELETE
RESTRICT` nos dois — erro meu, de quando escrevi a migration original (não
relacionado ao `userId`, mas só apareceu ao comparar com rigor agora).
Corrigido nos dois pontos antes deste commit.

**PASS (evidência real, comandos e saída):**

| # | Item pedido | Comando | Resultado |
|---|---|---|---|
| 1 | Diff inspecionado, ajustes de `userId` presentes | `git diff` + leitura direta do schema | Confirmado: `ReligareLead.userId String?`, `ReligareProfile.userId String?`, relações `user User? @relation(...)`, `@@index([userId])` nos dois, FKs `ON DELETE SET NULL` (agora também corretas no SQL) |
| 2 | `authUserId` não adicionado prematuramente | `grep -r authUserId` no worktree inteiro | **Zero ocorrências** |
| 3 | HUB/Ateliê/Orders/assinaturas/ServiceRequest não alterados | `git diff` filtrado por nome desses models | **Zero linhas tocando esses models** — únicas menções são o comentário no `ReligareCheckout` explicando que ele NÃO é o `Orders` (documentação, não código) |
| 4a | `prisma validate` | `prisma validate --schema=schema.prisma` | `is valid 🚀` |
| 4b | `prisma generate` | `prisma generate --schema=schema.prisma` | `✔ Generated Prisma Client (v6.5.0)` |
| 4c | Testes do funil Religare | `jest` (config ad-hoc, heap ampliado) | **11/11 PASS** |
| 4d | `git diff --check` | nos 4 arquivos trackeados modificados | **exit 0**, sem erro de whitespace |
| 5 | `prisma migrate diff` read-only contra banco real | `--from-schema-datasource` (introspecção, sem shadow DB) | Confirma exatamente o esperado: `userId` (coluna+índice+FK) novo em `ReligareProfile`; `userId` (índice+FK) novo em `ReligareLead`; resto idêntico às rodadas anteriores. **Zero divergência inesperada em qualquer outra tabela** |

Nenhum código de aplicação (`religare-funnel.service.ts`,
`.repository.ts`, `funnel.dto.ts`, `religare-funnel.controller.ts`)
referencia `userId` — confirmado por grep, zero ocorrências. É fundação de
schema pronta pra um fluxo de vínculo futuro, não uma feature ativa.

`.env` copiado (mesmo padrão das rodadas anteriores) foi apagado ao final;
nada de secret foi impresso ou commitado nesta rodada.

## 8.3 Rodada de 2026-07-25 (5ª — consolidação no checkout primário + reconciliação com o ADR do Codex + 2ª migration)

Contexto: uma sessão Codex (`C:\dev\vocaccio-codex`) leu `C:\dev\vocaccio` no
branch `claude/sprint-caixa-d1-d2-ac37e5` (que nunca teve `main` mesclado) e
concluiu que `ReligareLead`/`ReligareCheckout`/`ReligareCheckoutEvent` "não
existem" — achado desatualizado, não um bug real: esses modelos já estavam
migrados em produção desde a rodada anterior (seção 8.2), só não estavam
visíveis nesse branch específico. Reconciliação completa registrada em
`C:\dev\edwiges\MEMORIA-COMPARTILHADA.md` **D-22**.

**Ações desta rodada:**

1. **Consolidação**: `main` (commit `880e4144`) mesclado em
   `claude/sprint-caixa-d1-d2-ac37e5` — 2 merges sem conflito (zero overlap de
   arquivo entre os branches), WIP pré-existente do Felipe preservado intacto.
   `C:\dev\vocaccio` (checkout primário, não mais só o worktree) agora reflete
   o estado real.
2. **Hardening InfinitePay**: `AbortController`/timeout (`INFINITEPAY_TIMEOUT_MS`,
   default 10s) em `createPaymentLink`/`checkPayment`, com erro distinto pra
   timeout vs falha de rede + 4 testes novos (commit `3e8022ea`).
3. **Decisão de schema** (pergunta feita ao Felipe: extensão aditiva mínima vs
   reshape completo seguindo o ADR do Codex `ADR-MVP-COMERCIAL-RELIGARE-FUNIL-CHECKOUT-2026-07-25.md`
   §5, que propõe `publicTokenHash`, `emailLookup` HMAC, `offerId`/`offerVersion`
   etc.): Felipe escolheu **extensão aditiva mínima**. Hagrid (agente guardião
   de marca/negócio) revisado e confirmou: coerente com `BUSINESS-PLAN.md`,
   sem nova abstração — "Religare + futuras LPs de venda avulsa" fica como
   **convenção documentada** (mesmo padrão de camadas), não uma abstração de
   código/schema compartilhada agora (regra dos três: só extrair quando
   existir um segundo consumidor real).
4. **2ª migration aplicada**: `20260725_religare_checkout_manual_paid` —
   `ReligareCheckout.manualPaidAt`/`manualPaidByUserId` (nullable, FK opcional
   `ON DELETE SET NULL` pra `User`), cobrindo o gap "admin confirma pagamento
   manualmente" sem tocar `paidAt` (exclusivo do fluxo automático via
   webhook). Commit `e6e6b16f`, aplicada com `pnpm run prisma-migrate-deploy`
   a partir de `C:\dev\vocaccio` (não mais um worktree separado).

**PASS (evidência real):**

| # | Item | Comando | Resultado |
|---|---|---|---|
| 1 | `prisma validate`/`generate`/`migrate status` pós-merge, a partir do checkout primário | `prisma validate`/`generate`/`migrate status --schema=schema.prisma` | válido; client gerado; `Database schema is up to date!` antes da 2ª migration |
| 2 | Testes do funil + InfinitePay | jest (config ad-hoc) | **15/15 PASS** (11 funil + 4 timeout/rede) |
| 3 | `git diff --check` | nos arquivos da 2ª migration | exit 0 |
| 4 | `prisma migrate diff` read-only pré-aplicação | `--from-schema-datasource` | 2 colunas + 1 índice + 1 FK, exatamente o migration.sql escrito à mão |
| 5 | `pnpm run prisma-migrate-deploy` (2ª migration) | — | `All migrations have been successfully applied.` |
| 6 | Boot real do backend no checkout primário | `pnpm run dev:backend` | `Nest application successfully started`, porta 3000 |
| 7 | Round-trip das colunas novas | script sintético (`religareCheckout.create`→`update({manualPaidAt})`→`findUnique`→`delete`) contra o Supabase real | `manualPaidAtRoundTrips: true`, `manualPaidByUserIdIsNullByDefault: true`, dado de teste limpo ao final |
| 8 | Integridade de tabelas não relacionadas | contagem antes/depois | `ServiceRequest=0`, `ServiceOffering=8`, `Subscription=0` inalterados; `ReligareLead/Checkout/Event=0`, `ReligareProfile=2` (baseline exato) |

Nenhum dado real tocado, nenhum secret impresso, `.env` copiado (mesmo padrão
das rodadas anteriores) apagado ao final. `docs/religare/INVENTARIO-CONTINGENCIA-CLAUDE.md`
atualizado (commit `529fdd7d`) apontando pra este estado.

## 8.4 Rodada de 2026-07-25 (6ª — e-mail transacional SMTP + admin mínimo do funil)

Contexto: fecha as 2 pendências registradas na seção 9, item 6 (5ª rodada):
(1) e-mail transacional via SMTP Hostinger quando um `ReligareCheckout` vira
`PAID`, (2) rotas de admin mínimo pra operar o funil (listar leads/checkouts,
verificar pagamento, marcar como pago manualmente).

**Ações desta rodada:**

1. **Ponto único de confirmação de pagamento**: `ReligareFunnelService`
   ganhou `confirmCheckoutPaid(checkoutId, options)` — privado, chamado pelos
   3 gatilhos que podem marcar um checkout como pago: webhook automático
   (`handleInfinitePayWebhook`), verificação manual de admin confirmada pela
   própria InfinitePay (`verifyCheckoutPayment`, usa `paidAt` — mesmo campo do
   webhook, porque quem confirma é a InfinitePay, não o admin) e confirmação
   manual sem reconciliar (`markCheckoutPaidManually`, usa
   `manualPaidAt`/`manualPaidByUserId`, nunca chama a InfinitePay). Os 3
   caminhos disparam o e-mail de confirmação através do mesmo método privado
   `sendPaidConfirmationEmail`, que chama `EmailService.sendEmailSync` — nunca
   `sendEmail` (que depende de Temporal, não usável aqui, conforme já
   investigado antes de começar esta rodada). Se o lead só tem whatsapp (sem
   email), o envio é pulado com log, sem lançar erro que derrubaria a
   confirmação de pagamento.
2. **`.env.example`**: adicionadas (comentadas, sem valor real)
   `EMAIL_PROVIDER`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`,
   `EMAIL_PASS`, com comentário indicando que são pro SMTP da Hostinger e que,
   sem elas + `EMAIL_FROM_ADDRESS`/`EMAIL_FROM_NAME`, o envio é pulado com log
   (não lança erro — comportamento já existente de `sendEmailSync`).
3. **`ReligareAdminController`** novo
   (`apps/backend/src/api/routes/religare-admin.controller.ts`), rotas sob
   `/admin/religare`, registrado em `authenticatedController`
   (`apps/backend/src/api/api.module.ts`) — passa pelo `AuthMiddleware` antes
   do gate `assertSuperAdmin`, que é cópia literal do padrão já em produção em
   `AdminController` (`HttpException('Unauthorized', 400)`). Decisão de
   design: controller **separado** de `AdminController` (não adicionado nele)
   pra manter o domínio Religare coeso num arquivo só, evitando inflar um
   controller genérico com rotas de um único módulo de negócio.
   - `GET /admin/religare/leads` — paginado (`page`/`limit`/`status`/`email`)
   - `GET /admin/religare/checkouts` — paginado (`page`/`limit`/`status`), com
     `lead.email`/`whatsapp`/`fullName` já embutidos (evita cruzar telas)
   - `POST /admin/religare/checkouts/:id/verify-payment` — aciona
     `payment_check` real contra a InfinitePay
   - `POST /admin/religare/checkouts/:id/mark-paid` — confia sem reconciliar
     (`manualPaidAt`/`manualPaidByUserId`)
4. **`ReligareFunnelRepository`**: `markCheckoutPaid` agora inclui
   `lead.{email,fullName}` (pro e-mail, sem query extra); `markCheckoutManuallyPaid`
   novo (espelha `markCheckoutPaid` mas grava `manualPaidAt`/`manualPaidByUserId`);
   `findCheckoutById(id, orgId)` novo, sempre filtrado por `lead.orgId` (nunca
   por id isolado — mesma disciplina de `findLeadById`); `findLatestEventForCheckout`
   novo; `listLeadsPaginated`/`listCheckoutsPaginated` novos (mesmo padrão de
   paginação de `ErrorsRepository.listErrors`).
5. **Gap conhecido, documentado no código e aqui**: `verifyCheckoutPayment`
   recusa com `400 no_webhook_event_to_reconcile` se nenhum
   `ReligareCheckoutEvent` existir ainda pro checkout — `transaction_nsu`/
   `invoice_slug` só existem dentro do payload bruto de um evento de webhook
   já recebido (nunca persistidos como coluna própria, ver `ensureCheckout`
   que descarta o `invoiceSlug` retornado por `createPaymentLink`). Se o
   webhook nunca chegou, não há como reconciliar — o botão "marcar como pago
   manualmente" continua funcionando nesse caso, propositalmente, pois não
   depende de nenhum evento.

**PASS (evidência real, comandos e saída):**

| # | Item | Comando | Resultado |
|---|---|---|---|
| 1 | `prisma generate` (schema não tocado nesta rodada) | `pnpm run prisma-generate` | `✔ Generated Prisma Client (v6.5.0)` |
| 2 | Build backend, heap 4096 | `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter ./apps/backend run build` | exit 0; `apps/backend/dist/apps/backend/src/main.js` regenerado com timestamp da rodada |
| 3 | Build orchestrator, heap 4096 (libs/server compartilhada mudou) | `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter ./apps/orchestrator run build` | exit 0 |
| 4 | Build frontend, heap 4096 (regressão, nada tocado lá) | `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter ./apps/frontend run build` | exit 0, todas as rotas (incl. `/hub/religare/*`) geradas normalmente |
| 5 | Testes do funil (jest, config ad-hoc — mesmo gap de `@nx/jest` já documentado na seção 8) | `jest --config <ad-hoc>.js` | **15/15 PASS** (11 já existentes + 4 novos: `markCheckoutPaidManually` feliz + idempotente, `verifyCheckoutPayment` sem evento (gap) + com evento confirmado; teste "sucesso" do webhook passou a afirmar `emailService.sendEmailSync` chamado) |
| 6 | Boot real | `pnpm run dev:backend` (heap 4096) | `Nest application successfully started`; log confirma as 4 rotas novas mapeadas: `GET /admin/religare/leads`, `GET /admin/religare/checkouts`, `POST /admin/religare/checkouts/:id/verify-payment`, `POST /admin/religare/checkouts/:id/mark-paid`; nenhum erro de DI |
| 7 | `GET /admin/religare/leads` sem sessão | `curl -i` | `401 Unauthorized` + `Set-Cookie: auth=; Max-Age=-1` (mesmo `HttpForbiddenException`/`HttpExceptionFilter` que já protege `/admin/errors`, `/admin/stats` — comportamento herdado, não novo) |
| 8 | `POST /admin/religare/checkouts/fake-id/mark-paid` sem sessão | `curl -i` | `401 Unauthorized`, idem |
| 9 | Regressão: `POST /religare/lead` payload inválido | `curl` | `500` (não `400`) — **não é regressão desta rodada**: este `.env` local não tem `RELIGARE_PROD_ORG_ID` setado, então `prodOrgId()` lança `Error` fail-closed (seção 4) antes de validar o DTO; mesmo comportamento documentado nas rodadas anteriores quando essa env falta |
| 10 | Regressão: `POST /religare/infinitepay-webhook` sem token | `curl` | `401 {"success":false,"message":"unauthorized"}` — igual às rodadas anteriores |

**Gate `assertSuperAdmin` — cobertura fechada (rodada seguinte, 2026-07-25):**
os 2 casos "autenticado mas não-superadmin → `400`" e "autenticado como
superadmin → funciona" foram cobertos SEM sessão HTTP real, via
`apps/backend/src/api/routes/religare-admin.controller.spec.ts` — chama os 4
métodos do `ReligareAdminController` diretamente com um objeto `User`
mockado (`@GetUserFromRequest()` é só um decorator de parâmetro do Nest; em
runtime o método recebe o valor já resolvido como argumento comum, dá pra
simular sem HTTP). Mesmo padrão manual de instanciação direta já usado nos
specs de service (`religare-funnel.service.spec.ts`) — primeiro spec de
controller do módulo, mesma convenção, sem `Test.createTestingModule`/
supertest. Cobre, pras 4 rotas: usuário sem `isSuperAdmin` (`false` e
`undefined`) → `HttpException` 400 e o service mockado NUNCA é chamado
(prova que o gate barra antes de tocar dado); usuário com
`isSuperAdmin: true` → chama o service com os argumentos certos e retorna o
resultado dele. **9/9 PASS** (`jest --config <ad-hoc>.js` sobre esse arquivo,
mesmo gap de `@nx/jest` já documentado na seção 8 — config ad-hoc no
scratchpad da sessão, não commitado).

**Ainda NÃO verificado — isso é sobre TRANSPORTE HTTP + middleware, não sobre
a lógica do gate (já coberta acima):** um `curl` fim-a-fim com sessão real de
superadmin contra o servidor rodando (cookie `auth` válido) continua
pendente — exigiria forjar/criar uma sessão real, ação bloqueada pelo
classificador de permissões do Claude Code (forjar autenticação de conta) e
pela lista de ações proibidas (criação de conta), mesmo com autorização do
dono do projeto. Evidência indireta que reduz o risco desse gap residual: o
gate é cópia literal do já usado em produção por `AdminController`
(`/admin/errors`, `/admin/stats`), mesmo decorator, mesma posição relativa ao
`AuthMiddleware` (rotas em `authenticatedController`, boot log confirma DI
resolvida sem erro).

**Como fechar este item** (precisa de credencial real, fora do alcance desta
sessão): logar no HUB com um usuário existente, copiar o cookie `auth` do
DevTools, e rodar:
```bash
curl -i http://localhost:3000/admin/religare/leads -H "Cookie: auth=<cookie copiado>"
```
uma vez com um usuário sem `isSuperAdmin` (espera `400 {"message":"Unauthorized"}`)
e uma vez com um superadmin real (espera `200` + payload paginado).

Nenhum dado real tocado, nenhum secret impresso. Servidor de dev finalizado
(`taskkill`) ao final da rodada, porta 3000 liberada.

## 9. Antes de aplicar em produção (não fazer sem registrar aqui)

1. ~~`pnpm run prisma-migrate-deploy`~~ — **feito** (seção 8.2: migration
   `20260723_religare_funnel_foundation` em 2026-07-24; seção 8.3: migration
   `20260725_religare_checkout_manual_paid` em 2026-07-25). Rollback de cada
   uma documentada no cabeçalho do respectivo `migration.sql`; não exercido
   (não foi necessário).
2. Repetir os testes de `curl` da seção 8 (captura válida, reenvio,
   order_nsu inexistente, valor incorreto via webhook, replay) — **feito**
   nas rodadas anteriores contra banco real; itens 3-5 abaixo continuam
   pendentes (credenciais/domínio reais, sandbox InfinitePay, LP).
3. Preencher no `.env` real (não este de teste, que já foi apagado):
   `INFINITEPAY_HANDLE` de verdade, `INFINITEPAY_WEBHOOK_TOKEN` (gerar com
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
   `NEXT_PUBLIC_BACKEND_URL`/`FRONTEND_URL` apontando pro domínio público
   real (ex. `https://vocacc.io`) — **confirmar se a InfinitePay precisa
   alcançar `{NEXT_PUBLIC_BACKEND_URL}/religare/infinitepay-webhook` direto
   ou se há prefixo `/api` no proxy reverso de produção** (o exemplo do
   Felipe foi `https://vocacc.io/api/religare/webhook`; o código hoje monta
   `.../religare/infinitepay-webhook` sem `/api` — se o proxy real usa esse
   prefixo, ajustar `NEXT_PUBLIC_BACKEND_URL` pra já incluir `/api`, não o
   código). **Domínio público real do backend (Railway) ainda não confirmado**
   — `.env` local aponta pra `localhost`, sem CLI Railway linkado nesta
   máquina; `MAIN_URL` já documentado em `.env.example` como forma de liberar
   CORS pra `https://vocacc.io` sem reaproveitar `FRONTEND_URL` (que também
   serve o HUB), mas não aplicado em nenhum ambiente real ainda.
4. Testar a chamada real a `POST /links` num ambiente de sandbox da
   InfinitePay (se existir) pra confirmar os nomes de campo da resposta —
   ajustar `infinitepay.service.ts` se divergir do assumido (`url`/
   `checkout_url`/`link`, código defensivo tentando os três).
5. Conectar a LP ao endpoint (`POST /religare/lead`) — fonte da LP é
   `C:\dev\vocaccio-codex` (entrypoint `src/ReligareCosmologyApp.tsx`), fora
   do território de escrita do lado Claude. Handoff pro Codex, não implementar
   aqui.
6. ~~SMTP Hostinger + rotas de admin mínimo~~ — **feito** (seção 8.4, 6ª
   rodada): `EmailService.sendEmailSync` disparado num ponto único
   (`confirmCheckoutPaid`) pelos 3 gatilhos (webhook, verificação manual,
   marcação manual); `ReligareAdminController` com listagem de leads/checkouts
   e os 2 botões (`verify-payment`, `mark-paid`). **Pendente real**: preencher
   `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_SECURE`/`EMAIL_USER`/`EMAIL_PASS`/
   `EMAIL_PROVIDER` com credencial real da Hostinger no `.env` de produção (só
   placeholders comentados no `.env.example`). Lógica do gate `assertSuperAdmin`
   já coberta por teste de controller (seção 8.4, "cobertura fechada") — falta
   só o `curl` fim-a-fim com sessão real de superadmin contra o servidor
   rodando (seção 8.4, "Ainda NÃO verificado"), que é sobre transporte
   HTTP/middleware, não sobre a lógica em si; o assistente não pôde forjar
   nem criar essa sessão por regra de segurança da própria sessão.
