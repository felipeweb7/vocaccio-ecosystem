-- Fundação do funil de vendas Religare: captura pública de lead + geração de
-- checkout InfinitePay + webhook de confirmação de pagamento — tudo dentro
-- do backend NestJS existente (ver ReligareFunnelController/Service em
-- apps/backend e libraries/nestjs-libraries). Ver
-- docs/religare/funil-fundacao.md para o desenho completo.
--
-- Classificação: ADITIVA (3 tabelas novas, 2 enums novos, 0 alteração em
-- tabela/coluna existente). Nenhum dado existente é tocado — os 3 usuários
-- administrativos e os 2 ReligareProfile atuais permanecem intactos.
--
-- Escrita à mão (sem `prisma migrate dev` real — mesmo com node_modules
-- instalado neste worktree, não é permitido aplicar migration aqui, ver
-- docs/religare/funil-fundacao.md seção 9). Validada com:
--   `prisma validate` (sintaxe/relations) — OK;
--   `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma
--   --script` (SQL que o Prisma geraria do zero, sem precisar de banco) —
--   usado pra conferir cada ON DELETE/ON UPDATE bate exatamente com este
--   arquivo;
--   `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel
--   ...` (introspecção READ-ONLY do banco de produção real) — confirma que
--   o diff estrutural bate 100% com este arquivo, zero divergência em
--   qualquer outra tabela.
-- Nenhum desses comandos aplica nada — ver docs/religare/funil-fundacao.md
-- seção 8 em diante pro histórico completo de validação com comando+saída.
--
-- Rollback (ordem inversa, respeita FKs — RLS cai junto com a tabela):
--   ALTER TABLE "ReligareProfile" DROP CONSTRAINT "ReligareProfile_userId_fkey";
--   DROP INDEX IF EXISTS "ReligareProfile_userId_idx";
--   ALTER TABLE "ReligareProfile" DROP COLUMN "userId";
--   DROP TABLE "ReligareCheckoutEvent";
--   DROP TABLE "ReligareCheckout";
--   DROP TABLE "ReligareLead";
--   DROP TYPE "ReligareCheckoutStatus";
--   DROP TYPE "ReligareLeadStatus";

-- CreateEnum
CREATE TYPE "ReligareLeadStatus" AS ENUM ('DRAFT', 'NEW', 'QUALIFIED', 'CHECKOUT_STARTED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ReligareCheckoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ReligareLead" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "profileId" TEXT,
    "fullName" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "status" "ReligareLeadStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReligareLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReligareCheckout" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "status" "ReligareCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "checkoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReligareCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReligareCheckoutEvent" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ReligareCheckoutEvent_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "ReligareProfile" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "ReligareLead_orgId_idx" ON "ReligareLead"("orgId");

-- CreateIndex
CREATE INDEX "ReligareLead_userId_idx" ON "ReligareLead"("userId");

-- CreateIndex
CREATE INDEX "ReligareLead_email_idx" ON "ReligareLead"("email");

-- CreateIndex
CREATE INDEX "ReligareLead_status_idx" ON "ReligareLead"("status");

-- CreateIndex
CREATE INDEX "ReligareProfile_userId_idx" ON "ReligareProfile"("userId");

-- CreateIndex
CREATE INDEX "ReligareCheckout_leadId_idx" ON "ReligareCheckout"("leadId");

-- CreateIndex
CREATE INDEX "ReligareCheckout_status_idx" ON "ReligareCheckout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReligareCheckout_providerReference_key" ON "ReligareCheckout"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "ReligareCheckoutEvent_providerEventId_key" ON "ReligareCheckoutEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "ReligareCheckoutEvent_checkoutId_idx" ON "ReligareCheckoutEvent"("checkoutId");

-- AddForeignKey
ALTER TABLE "ReligareLead" ADD CONSTRAINT "ReligareLead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReligareLead" ADD CONSTRAINT "ReligareLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReligareLead" ADD CONSTRAINT "ReligareLead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReligareProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReligareProfile" ADD CONSTRAINT "ReligareProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReligareCheckout" ADD CONSTRAINT "ReligareCheckout_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ReligareLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReligareCheckoutEvent" ADD CONSTRAINT "ReligareCheckoutEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "ReligareCheckout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RowLevelSecurity
-- Habilita RLS nas 3 tabelas, SEM nenhuma policy — deny-all por padrão para
-- os papéis do Supabase sujeitos a RLS (`anon`, `authenticated`). Diferente
-- da primeira versão desta fundação, hoje NENHUM caminho de escrita passa
-- por Supabase Edge Function/client — todo o funil (captura de lead, geração
-- de checkout, webhook) vive dentro do backend NestJS existente, acessando o
-- Postgres via Prisma com a mesma `DATABASE_URL` privilegiada que já contorna
-- RLS em todas as outras tabelas do schema. Isso é puramente defesa em
-- profundidade: se um client Supabase com role anon/authenticated algum dia
-- for exposto por engano, essas 3 tabelas continuam inacessíveis por padrão.
ALTER TABLE "ReligareLead" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ReligareCheckout" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ReligareCheckoutEvent" ENABLE ROW LEVEL SECURITY;
