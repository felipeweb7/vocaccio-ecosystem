# PE-02 — `OperationalCommand` + audit log + idempotência (fundação de escrita)

**Gatilho:** P2 (operação interna validada). Pré-requisito de QUALQUER escrita automatizada (ADR-17).

1. **Objetivo:** tabela `OperationalCommand` (+ enum de tipos do catálogo em
   `whatsapp-bot.md` §3) com estados `PROPOSTO→APROVADO→EXECUTADO|REJEITADO|FALHOU`, idempotency key
   única, e trilha de auditoria; service + repository + endpoints `/hub/ops/commands` (listar,
   aprovar, rejeitar); execução despacha para os application services existentes.
2. **Problema:** não há registro tipado de ações propostas por agentes, nem idempotência formal.
3. **Resultado:** comando proposto por qualquer origem (skill, bot, MCP) fica auditável e só executa
   após gate; replay da mesma origem+ação não duplica efeito.
4. **Ler antes:** `schema.prisma` (models `ServiceRequestEvent`, `AccessLinkEvent`, `InternalTask`),
   `libraries/nestjs-libraries/src/database/prisma/atelie/*` (padrão repo/service),
   `atelie.controller.ts` (padrão RBAC), `docs/backoffice/ADRS.md` (09, 16, 17),
   `.claude/skills/boot-real/` e `poda-segura` (checklists do projeto).
5. **Pode modificar:** `schema.prisma` (aditivo), nova pasta
   `libraries/nestjs-libraries/src/database/prisma/ops/`, novo `ops.controller.ts`, migration manual.
6. **Não pode modificar:** models existentes (exceto relações aditivas), fluxo do portal, Temporal,
   RBAC existente.
7. **Reutilizar:** `@VocaccioRoles`, padrão de event-table, services de CRM/content/atelie como
   executores (o dispatcher chama métodos existentes — não duplicar lógica).
8. **Contratos:** comando = `{type, actorType(HUMAN|AGENT|BOT), actorId, orgId, crmClientId,
   projectId, targetEntity, payload Json, origin(canal+refId), evidence, confidence, idempotencyKey
   @unique, requiresApproval, status, executedAt, result Json}`.
9. **Estado inicial:** sem tabela; escritas só manuais via UI.
10. **Estado final:** migration aplicada; CRUD+aprovação+dispatcher funcionais; seed não necessário.
11. **Segurança:** aprovação exige `OWNER|OPERATOR`; dispatcher só executa tipos do catálogo
    (allowlist hard-coded); nenhum tipo `DELETE_*` nesta fase; payload validado por DTO por tipo.
12. **Erros:** idempotencyKey duplicada → retorna comando existente (200, não erro); executor lança
    → status `FALHOU` + result com erro; comando órfão (projeto apagado) → `REJEITADO` automático.
13. **Aceite:** propor→aprovar→executar `AddProjectComment` e `CreateProjectTask` (usar o model
    `InternalTask` órfão, criando seu service mínimo) via curl; replay idempotente comprovado.
14. **Testes mínimos:** e2e curl dos dois comandos + replay + rejeição por role insuficiente.
15. **Validação:** **boot real obrigatório** (regra do projeto): build completo + `curl` no
    endpoint após migration; `rtk pnpm install` se lockfile mudar.
16. **Rollback:** migration é aditiva — rollback = revert do commit + `migrate resolve`;
    documentar no PR.
17. **Modelo mínimo:** Sonnet (Sirius).
18. **Limite de turnos:** ~40.
19. **Decisões fechadas:** nome e formato do contrato (campo a campo, item 8); estados; allowlist
    inicial = só os 2 comandos do aceite (ampliar em pacotes futuros); Prisma/Postgres (nenhuma
    fila nova).
20. **Escalonar se:** o contrato do item 8 se mostrar insuficiente (mudança de contrato = Fable/Opus,
    ADR-09/§25.16), ou se surgir necessidade de executar via Temporal.
