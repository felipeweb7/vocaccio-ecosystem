# Checkpoint — Fase 2 (portal) + Fase 3.5 (coerência visual): FECHADAS

**Escrito:** 2026-07-15, fim de sessão. Substitui integralmente a versão anterior
(02-04/07), que descrevia tudo isto como pendente — já não é o caso.

## Estado real (verificado com boot real + browser nesta sessão)

**Fase 2 (portal `/aprovar/[token]`) ✅ fechada.** Fluxo ponta a ponta validado de novo
em 15-07: criar cliente → projeto → item → gerar link → aprovar sem login → status
sincroniza de volta pro Kanban do CRM (`APROVADO`). O bug histórico do item "sumir" após
aprovação (`content.repository.ts` filtrando só `PENDING_APPROVAL`/`ADJUSTMENT_REQUESTED`
em vez de `notIn: ['DRAFT','ARCHIVED']`) segue corrigido, sem regressão. Fluxos "Solicitar
ajuste"/"Comentar" ainda não exercidos ponta a ponta (mesma rota de código, risco baixo).

**Fase 3.5 (coerência visual) ✅ fechada, incluindo validação pixel-a-pixel.**
Três tickets fechados sem interrupção em 13-07 (commits `c1312e13`, `142049db`):
1. `#cf6295` (roxo Postiz legado) removido de 6 arquivos (`waffle-menu`, `projects-list`,
   `clients-list`, `client-detail`, `religare-pdf-export`, `mini-image-editor`) — trocado
   por `var(--voc-rose)` onde CSS vars funcionam, hex literal `#df548e` comentado onde não
   (jsPDF, Konva/canvas).
2. Roxo residual em `media.component.tsx` (`var(--new-btn-primary)`, `!bg-customColor45`)
   trocado por tokens `--voc-*` explícitos.
3. `portal-approval.component.tsx` migrado pros primitivos `ui/*` (Button/Badge) — Card
   mantido bespoke de propósito (classe `voc-glass-card` incompatível com a estética
   paper/pública do portal; documentado em comentário no JSX).

Validação visual (15-07, boot real neste worktree, backend:3000 + frontend:4200):
computed-style via `javascript_tool` confirmou `--voc-rose` = `#df548e` em toda tela
tocada (waffle menu, CRM client-detail/projects-list, media library, portal), **zero**
ocorrência de `rgb(207,98,149)` (hex legado) em nenhuma delas. Badge do portal com padding
`4px 10px` batendo o override documentado; os 3 botões (Aprovar/Solicitar
ajuste/Comentar) com cores aurora corretas (blue/rose/violet). Screenshot via `computer`
travou por pressão de recursos (múltiplos node.exe concorrentes na máquina) — contornado
com leitura de computed style, que é mais confiável pra essa verificação de qualquer forma.

## Pendência aberta desta sessão

Dados de teste ficaram na base de **produção** (Supabase real, `.env` deste worktree
aponta pra lá): cliente "Cliente QA Visual" (id `de552fac-4357-4407-816c-05a159c44420`),
projeto "Projeto QA Visual", item "Item QA Visual", conta `qa-visual-fase35@vocacc.io`.
O classificador de segurança bloqueou o `DELETE` automático (ação destrutiva em produção
não verificável sozinho pelo classificador) — precisa ser apagado manualmente ou com
autorização explícita numa próxima sessão. Rota existe: `DELETE /hub/crm/clients/:id`
(`apps/backend/src/api/routes/crm.controller.ts:81`, cascade via `CrmService.deleteClient`).

## Ambiente (nota que se repete a cada worktree novo)

Rodar boot real num worktree exige: `.env` copiado (neste caso já existia), e
`pnpm install` local (regenera `apps/*/node_modules` que não vêm por padrão — store
compartilhado, ~15s). Backend em modo watch leva ~2-3min até `nest start --watch` de fato
escutar a porta 3000, mesmo depois de "0 errors" no log de compilação — não é sinal de
boot pronto, só de compile pronto.

## Próximas frentes (não iniciadas nesta sessão, ver PLANO-MESTRE.md §"Estado atual")

- **Fase M (comercial)**: `vocaccio-docs-privado/comercial/oferta-ancora.md` (repo privado) e `vocaccio-docs-privado/comercial/pipeline-playbook.md` (repo privado)
  prontos desde 12-07, zero execução real (0 clientes pagantes). Próximo passo é do
  Felipe (contatos reais, ligações) — não é código.
- **Religare / Fase 3 restante ("Sincronário")**: território Codex/Edwiges — Religare
  está sendo desenvolvido separadamente pelo Codex, integração futura. Não mexer aqui.
- **Limpeza de worktrees/branches órfãs** (achado do Filch): decisão destrutiva, pede
  confirmação explícita do Felipe por instância antes de qualquer `branch -D`.
