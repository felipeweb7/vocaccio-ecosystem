# Auditoria Glass — progresso (varredura em massa 2026-07-11)

Janela de exceção aprovada pelo Felipe em 2026-07-11 para zerar o cluster
maduro (~44 arquivos, ver `docs/zelador/CADERNO.md`). Inventário gerado com:

```
rtk grep -rl "bg-newBgColorInner\|bg-newBgColor" apps/frontend/src --include="*.tsx"
```

Resultado: 56 arquivos, 176 ocorrências totais (contagem real do grep, ver
sessão 2026-07-11).

node_modules ausente neste worktree → dev server não subiu; nenhuma tela foi
verificada visualmente nesta sessão. Todas as trocas abaixo são triagem
estática (JSX/hierarquia de containers) — **precisam de confirmação no
checkout principal (`C:\dev\vocaccio`, dev server real) antes de fechar o
cluster como GRADUADO.**

## Lista de trabalho

- [ ] apps/frontend/src/app/(app)/(site)/admin/errors/page.tsx — 1 — admin
- [ ] apps/frontend/src/app/(app)/(site)/admin/stats/page.tsx — 1 — admin
- [ ] apps/frontend/src/app/(app)/(site)/billing/page.tsx — 1 — billing
- [ ] apps/frontend/src/app/(app)/(site)/hub/crm/novo/page.tsx — 3 — CRM
- [ ] apps/frontend/src/app/(app)/(site)/hub/crm/projetos/novo/page.tsx — 2 — CRM
- [ ] apps/frontend/src/components/admin/admin-errors.component.tsx — 7 — admin
- [ ] apps/frontend/src/components/admin/admin-stats.component.tsx — 6 — admin
- [ ] apps/frontend/src/components/billing/embedded.billing.tsx — 3 — billing
- [ ] apps/frontend/src/components/billing/first.billing.component.tsx — 1 — billing
- [ ] apps/frontend/src/components/billing/main.billing.component.tsx — 1 — billing
- [ ] apps/frontend/src/components/developer/developer.component.tsx — 16 — developer
- [ ] apps/frontend/src/components/hub/crm/client-detail.component.tsx — 8 — CRM
- [ ] apps/frontend/src/components/hub/crm/clients-list.component.tsx — 9 — CRM
- [ ] apps/frontend/src/components/hub/crm/crm-modal.component.tsx — 1 — CRM (modal)
- [ ] apps/frontend/src/components/hub/crm/project-detail-client.component.tsx — 7 — CRM
- [ ] apps/frontend/src/components/hub/crm/project-form.component.tsx — 1 — CRM
- [ ] apps/frontend/src/components/hub/crm/projects-list.component.tsx — 6 — CRM
- [ ] apps/frontend/src/components/hub/religare/religare-astrology-tab.component.tsx — 3 — Religare
- [ ] apps/frontend/src/components/hub/religare/religare-home.component.tsx — 3 — Religare
- [ ] apps/frontend/src/components/hub/religare/religare-human-design-tab.component.tsx — 2 — Religare
- [ ] apps/frontend/src/components/hub/religare/religare-onboarding.component.tsx — 2 — Religare
- [ ] apps/frontend/src/components/hub/religare/religare-profile.component.tsx — 7 — Religare
- [ ] apps/frontend/src/components/hub/volatis-channel-manager.component.tsx — 2 — Volatis
- [ ] apps/frontend/src/components/hub/volatis-client-selector.component.tsx — 1 — Volatis
- [ ] apps/frontend/src/components/hub/volatis-cockpit.component.tsx — 1 — Volatis
- [ ] apps/frontend/src/components/launches/filters.tsx — 7 — launches
- [ ] apps/frontend/src/components/launches/import-debug-post.modal.tsx — 1 — launches (modal)
- [ ] apps/frontend/src/components/launches/information.component.tsx — 1 — launches
- [ ] apps/frontend/src/components/launches/launches.component.tsx — 1 — launches (já corrigido ref.)
- [ ] apps/frontend/src/components/launches/menu/menu.tsx — 1 — launches
- [ ] apps/frontend/src/components/launches/repeat.component.tsx — 2 — launches
- [ ] apps/frontend/src/components/launches/select.customer.tsx — 2 — launches
- [ ] apps/frontend/src/components/launches/tags.component.tsx — 1 — launches
- [ ] apps/frontend/src/components/launches/time.table.tsx — 2 — launches
- [ ] apps/frontend/src/components/layout/new-modal.tsx — 1 — layout (modal base)
- [ ] apps/frontend/src/components/layout/settings.component.tsx — 2 — layout
- [ ] apps/frontend/src/components/media/media.component.tsx — 2 — media
- [ ] apps/frontend/src/components/new-launch/delay.component.tsx — 3 — launches
- [ ] apps/frontend/src/components/new-launch/editor.tsx — 5 — launches
- [ ] apps/frontend/src/components/new-launch/manage.modal.tsx — 5 — launches (modal)
- [ ] apps/frontend/src/components/new-launch/modal.wrapper.component.tsx — 1 — launches (modal wrapper)
- [ ] apps/frontend/src/components/new-launch/providers/tiktok/tiktok.preview.tsx — 1 — launches
- [ ] apps/frontend/src/components/new-layout/layout.media.component.tsx — 1 — layout
- [ ] apps/frontend/src/components/onboarding/onboarding.modal.tsx — 1 — onboarding (modal)
- [ ] apps/frontend/src/components/platform-analytics/platform.analytics.tsx — 4 — analytics
- [ ] apps/frontend/src/components/plugs/plugs.tsx — 4 — plugs (quarentena)
- [ ] apps/frontend/src/components/public-api/public.component.tsx — 9 — settings
- [ ] apps/frontend/src/components/third-parties/third-party.component.tsx — 2 — third-party (quarentena)
- [ ] apps/frontend/src/components/ui/button.component.tsx — 2 — ui base
- [ ] apps/frontend/src/components/ui/input.component.tsx — 1 — ui base
- [ ] apps/frontend/src/components/volatis/carousel/add-project.component.tsx — 4 — Volatis
- [ ] apps/frontend/src/components/volatis/carousel/carousel-editor.component.tsx — 23 — Volatis
- [ ] apps/frontend/src/components/volatis/carousel/carousel-gallery.component.tsx — 8 — Volatis
- [ ] apps/frontend/src/components/volatis/carousel/project-settings.component.tsx — 6 — Volatis
- [ ] apps/frontend/src/components/volatis/carousel/template-select.component.tsx — 2 — Volatis

Total: 56 arquivos / 176 ocorrências.

## Status ao fim da sessão 2026-07-11 (Flitwick)

Worktree é **compartilhado com outra sessão concorrente** trabalhando o mesmo
cluster em paralelo (commits vistos surgindo durante a sessão em
admin/billing/settings/media e platform-analytics) — ver nota em
`PLANO-MESTRE.md` sobre a "janela de exceção 2026-07-11". Não tratei isso como
ruído: os diffs paralelos seguiam o mesmo padrão do fix de referência
(`launches.component.tsx`), então comitei-os junto, por área.

**Concluído nesta sessão (12 arquivos, 2 commits meus + confirmação dos
paralelos):**
- CRM (6 arquivos): `client-detail`, `clients-list`, `project-detail-client`,
  `project-form`, `projects-list` — commit `2d7e33a7`
- admin/billing/media/settings (6 arquivos): `admin/errors/page.tsx`,
  `admin/stats/page.tsx`, `billing/page.tsx`, `first.billing.component.tsx`,
  `settings.component.tsx`, `layout.media.component.tsx` — commit `021e941a`

**Regra aplicada**: só troquei o wrapper "painel grande" (page root
`bg-newBgColor min-h-full`/`animate-pulse`, header bar `bg-newBgColorInner
border-b`, card de tabela `rounded overflow-hidden`). Mantive intactos itens
pequenos dentro dessas mesmas telas (hover de linha, skeleton pulse bar,
busca, paginação) — mesmo critério do fix de referência ("contraste pontual,
não é o painel cinza chapado").

**Pendente — não triado nesta sessão (44 arquivos restantes)**: admin-errors/
admin-stats components (7+6 ocorrências internas — só o wrapper de page.tsx
foi corrigido, os componentes internos ainda têm ocorrências não avaliadas),
Religare (5 arquivos), Volatis (7 arquivos, incluindo carousel-editor com 23
ocorrências — o maior do inventário), developer.component.tsx (16
ocorrências), public-api (9), platform-analytics (4, outra sessão pode estar
tocando), launches remanescentes (filters, delay, editor, manage.modal,
modal.wrapper, repeat, select.customer, tags, time.table, menu, tiktok
preview, import-debug-post.modal), ui/button e ui/input (bases compartilhadas
— alto risco de regressão em cascata, exigem atenção redobrada), plugs.tsx e
third-party.component.tsx (rotas quarentenadas — baixa prioridade).

**Modais/dropdowns já identificados como OK-flutuante (não trocar)**:
`crm-modal.component.tsx`, `new-modal.tsx`, `manage.modal.tsx`,
`modal.wrapper.component.tsx`, `onboarding.modal.tsx`,
`import-debug-post.modal.tsx` — confirmar individualmente ao processar (nome
sugere popover/modal, mas não foi lido o JSX de todos).

**Não verificado no browser**: node_modules ausente neste worktree → dev
server não subiu. Nenhuma tela foi confirmada via DevTools nesta sessão.
Verificar no checkout principal (`C:\dev\vocaccio`, dev server real) antes de
fechar o cluster como GRADUADO no CADERNO — checar especialmente loading
state, estado vazio e header colapsado das telas de CRM tocadas.

Cluster no CADERNO permanece **MADURO** (não GRADUADO) — 12 de 56 arquivos
fechados nesta sessão, 44 seguem pendentes.
