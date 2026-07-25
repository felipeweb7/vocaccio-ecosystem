-- Extensão aditiva mínima do funil Religare (D-22 em
-- C:\dev\edwiges\MEMORIA-COMPARTILHADA.md): admin precisa marcar um checkout
-- como pago manualmente (reconciliação humana fora do webhook automático),
-- sem nunca sobrescrever `paidAt`, que continua exclusivo do fluxo
-- automático confirmado por payment_check. Gap documentado em
-- docs/religare/funil-fundacao.md seção 6.
--
-- Classificação: ADITIVA (2 colunas novas, nullable, 1 índice, 1 FK opcional
-- ON DELETE SET NULL — mesmo padrão já usado para ReligareLead.userId e
-- ReligareProfile.userId). Nenhuma tabela/coluna existente é alterada em tipo
-- ou obrigatoriedade. Nenhum dado existente é tocado.
--
-- Escrita à mão (sem `prisma migrate dev` real). Validada com:
--   `prisma validate` — OK;
--   `prisma migrate diff --from-schema-datasource schema.prisma
--   --to-schema-datamodel schema.prisma --script` (introspecção READ-ONLY do
--   banco de produção real) — a saída bateu exatamente com este arquivo,
--   copiada sem edição.
--
-- Rollback:
--   ALTER TABLE "ReligareCheckout" DROP CONSTRAINT "ReligareCheckout_manualPaidByUserId_fkey";
--   DROP INDEX IF EXISTS "ReligareCheckout_manualPaidByUserId_idx";
--   ALTER TABLE "ReligareCheckout" DROP COLUMN "manualPaidByUserId";
--   ALTER TABLE "ReligareCheckout" DROP COLUMN "manualPaidAt";

-- AlterTable
ALTER TABLE "ReligareCheckout" ADD COLUMN     "manualPaidAt" TIMESTAMP(3),
ADD COLUMN     "manualPaidByUserId" TEXT;

-- CreateIndex
CREATE INDEX "ReligareCheckout_manualPaidByUserId_idx" ON "ReligareCheckout"("manualPaidByUserId");

-- AddForeignKey
ALTER TABLE "ReligareCheckout" ADD CONSTRAINT "ReligareCheckout_manualPaidByUserId_fkey" FOREIGN KEY ("manualPaidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
