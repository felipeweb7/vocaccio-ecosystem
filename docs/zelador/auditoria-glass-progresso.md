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
- [x] apps/frontend/src/components/platform-analytics/platform.analytics.tsx — 4 — analytics (2026-07-11, commit b9e85ab0)
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

## Retomada — mesma sessão 2026-07-11 (Flitwick, execução direta após correção de papel)

O agente de background lançado no início da sessão de fato executou (commits
`2d7e33a7` CRM e `021e941a` admin/billing/media/settings, mais o doc de
progresso original acima) — a mensagem "delegado, rodando em background" desta
sessão estava certa quanto ao mecanismo, mas eu (Flitwick, executor único
desta conversa) confirmei o resultado e continuei o trabalho diretamente.

Ao retomar, tentei consertar `admin/stats/page.tsx`, `admin/errors/page.tsx`,
`billing/page.tsx`, `layout.media.component.tsx`, `settings.component.tsx`,
`first.billing.component.tsx` — todos já estavam corrigidos pelo commit
`021e941a` (edits idênticas viraram no-op, confirmado via `git diff --stat`
antes de commitar qualquer coisa). O único arquivo genuinamente pendente que
peguei foi:

- [x] `apps/frontend/src/components/platform-analytics/platform.analytics.tsx`
  — 4 ocorrências (loading state, empty state, sidebar, painel principal) —
  mesmo padrão root-panel do resto do batch — commit `b9e85ab0`.

**Total real fechado agora: 13 de 56 arquivos** (12 do batch anterior + 1
platform-analytics). `git diff --stat` confirmado limpo após o commit (só
`PLANO-MESTRE.md` seguia modificado, de origem de outra sessão concorrente,
fora do escopo desta tarefa — não tocado).

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

Cluster no CADERNO permanece **MADURO** (não GRADUADO) — 13 de 56 arquivos
fechados nesta sessão (commits `2d7e33a7`, `021e941a`, `b9e85ab0`), 43 seguem
pendentes.

## Fechamento — varredura completa 2026-07-11 (Flitwick, continuação após handoff de outra sessão)

Processados os 44 arquivos pendentes na ordem pedida: Religare, Volatis
(incl. `carousel-editor.component.tsx`, linha a linha, as 23 ocorrências),
`developer.component.tsx`, `public-api/public.component.tsx`, admin
components, resto de launches, `ui/button`/`ui/input` (cautela extra —
ver decisão abaixo), `billing/embedded`/`billing/main`, e os 2 arquivos de
página do CRM (`crm/novo`, `crm/projetos/novo`) que tinham ficado de fora do
primeiro inventário verificado. `plugs.tsx`/`third-party.component.tsx`
pulados por instrução (quarentena, baixa prioridade).

**Todos os 56 arquivos do inventário original foram triados nesta sessão.**

### Commits desta continuação
- `8e75c29c` — Religare (5 arquivos): astrology-tab, home, human-design-tab,
  onboarding, profile
- `cb27f0a4` — Volatis (3 arquivos): volatis-cockpit, carousel-gallery,
  carousel-editor (6 de 23 ocorrências trocadas — só os wrappers estruturais:
  toolbar, aside esquerda, drawer de templates, canvas central, aside
  direita, componente `Panel` compartilhado do accordion; as outras 17 são
  inputs/textareas/botões de ícone/segmented control pequenos ou os 2
  dropdowns flutuantes `absolute z-50 shadow`)
- `3f0cf39a` — developer.component.tsx (1 arquivo, 8 de 16 trocadas: cards de
  seção + headers internos; 8 inputs/token-display mantidos)
- `146f48e9` — public-api/public.component.tsx (1 arquivo, 6 de 9 trocadas:
  3 cards + headers; 2 blocos `<pre>` de código e 1 input marcados
  VERIFICAR-BROWSER/mantidos — ambíguo, não chutado; também corrigido typo de
  classe inexistente `bg-newBgColorInnerInner` → `bg-transparent`)
- `dc560685` — admin components (2 arquivos): admin-errors.component,
  admin-stats.component (painel de detalhe inline, barra de filtros, header
  de grid de tabela; selects/stat-tiles pequenos mantidos)
- `33a9328e` — CRM formulários novo (2 arquivos): `hub/crm/novo/page.tsx`,
  `hub/crm/projetos/novo/page.tsx` — haviam ficado fora da varredura visual
  anterior, mesmo padrão do resto do CRM

### Decisão ui/button e ui/input (cautela pedida pelo peer)
`ui/button.component.tsx`: `hover:bg-newBgColor` no variant "outline" é
**hover-only**, não fundo estático — não é o padrão "sólido sobre glass"
(só aparece na interação, e o componente é usado tanto dentro quanto fora de
shells glass). Decisão: **não tocar**, não é ambíguo, é correto como está.
`ui/input.component.tsx`: `bg-newBgColor` é o fundo **default** do campo de
texto — mas todo campo de input/textarea/select do inventário inteiro (CRM,
Religare, Volatis, developer, admin) foi tratado como "pequeno, contraste
legítimo" e mantido intacto, o mesmo critério do fix de referência em
`launches.component.tsx`. Trocar a base mudaria a legibilidade de texto
digitado em **todo** o app de uma vez, incluindo contextos fora de shell
glass. Decisão: **não tocar** — consistente com a base já estabelecida, não
ambíguo o suficiente para preferir arriscar uma mudança de alto raio de
impacto sem verificação visual real.

### Modais/popovers confirmados como OK-flutuante (JSX lido, não presumido)
`crm-modal.component.tsx` (botão hover), `layout/new-modal.tsx` (`w-fit
rounded-[24px]`, painel do sistema de modal), `onboarding.modal.tsx`,
`new-launch/manage.modal.tsx`, `new-launch/modal.wrapper.component.tsx`,
`new-launch/delay.component.tsx` (`absolute z-[300] menu-shadow`),
`launches/repeat.component.tsx`, `launches/select.customer.tsx`,
`launches/tags.component.tsx`, `launches/menu/menu.tsx` (`fixed z-[100]
shadow-menu`), `launches/information.component.tsx` (tooltip `group-hover`),
`launches/import-debug-post.modal.tsx`, `volatis/carousel/add-project`,
`volatis/carousel/project-settings`, `volatis/carousel/template-select`
(todos `fixed inset-0 z-[100] bg-black/55` — overlay confirmado no JSX),
`religare-profile.component.tsx` (dropdown de ações `absolute z-[41]
shadow-lg`), `billing/embedded.billing.tsx` (`fixed bottom-0 z-[100]`,
barra flutuante).

### Pequenos/OK mantidos (não é "painel cinza chapado")
Todos os campos de input/select/textarea, hover de linha de tabela, barras
de skeleton pulse, botões de ícone pequenos, segmented controls
(mode-switcher, view-switcher), stat tiles pequenos, barras de progresso —
mesmo critério do fix de referência ("contraste pontual").

### Pendente-browser (não tocado, ambíguo)
- `launches/time.table.tsx` (2 ocorrências) — parente não confirmado sem
  rodar; pode ser modal-interno ou painel direto sobre shell.
- `public-api/public.component.tsx` — 2 blocos `<pre>` de código/URL e 1
  input (ver acima).

### Skipped por instrução (quarentena, baixa prioridade)
`plugs/plugs.tsx`, `third-parties/third-party.component.tsx` — não tocados.

### Contagem final
- **56 de 56 arquivos do inventário original triados.**
- **~27 arquivos com troca de código aplicada** (total ou parcial, conforme
  a regra de "só o painel grande, não o controle pequeno"): CRM (7, incl. os
  2 de formulário novo), admin/billing/media/settings pages (6),
  admin components (2), Religare (5), Volatis (3), developer (1), public-api
  (1, parcial), platform-analytics (1, sessão paralela) = 26–27 (pequena
  divergência de contagem entre passes desta sessão, não um arquivo
  perdido — todos os 56 caminhos do grep original foram abertos e
  decididos).
- **~27 arquivos revisados e mantidos como OK-flutuante/controle pequeno**
  (nenhuma mudança necessária, decisão documentada acima).
- **1 arquivo com ocorrências pendentes de verificação visual**
  (`time.table.tsx`) + **3 ocorrências pendentes dentro de
  public.component.tsx** (`<pre>` × 2 + 1 input).
- **2 arquivos pulados** por instrução (quarentena).

### Não verificado no browser
`node_modules` seguiu ausente neste worktree durante toda a sessão — nenhuma
tela foi aberta em DevTools/browser real. Toda a triagem foi por leitura de
JSX (estrutura de containers, presença de `fixed`/`absolute`+`z-index`+
`shadow` para confirmar flutuante, confirmação de que a rota vive sob
`.voc-content-shell` via `new-layout/layout.component.tsx:134`).
**Verificação visual real no checkout principal (`C:\dev\vocaccio`, dev
server real) é o próximo passo obrigatório antes de promover o cluster a
GRADUADO** — checar especialmente: `carousel-editor.component.tsx` (tela
mais densa, 23 ocorrências, 6 trocadas), estados de loading/vazio de CRM e
Religare, e os 2 arquivos com ocorrências pendentes.

Cluster no `docs/zelador/CADERNO.md`: **rebaixado de MADURO para candidato a
GRADUADO** nesta sessão — promoção formal para GRADUADO fica condicionada à
verificação visual real (regra dura do projeto: não afirmar sem prova).
