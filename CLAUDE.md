# Vocaccio — Manual de Operação

Este arquivo é o manual mínimo para trabalhar neste repo no nível esperado.
Leia-o como regras operacionais, não como descrição. Quando uma regra daqui
conflitar com seu instinto, a regra ganha. **O sistema está em PRODUÇÃO com
clientes reais e dados reais.**

## 1. O que é este projeto

Vocaccio é um growth/CRM/content hub construído como **fork do Postiz**
(agendador de posts para 28+ canais). Por cima do núcleo Postiz, o Vocaccio
adiciona: CRM, Religare (leituras de astrologia/Human Design para experts),
Volatis (motor de carrosséis em Konva), Ateliê Virtual (back-office de
entregáveis), canais por cliente e multi-tenant org/RBAC. As features nativas
do Postiz (agendar posts, calendário, analytics, times, media library)
continuam no produto — são o substrato.

Fontes de verdade, em ordem:
1. `PLANO-MESTRE.md` — visão, fases, decisões de arquitetura (Camada 18 é imutável)
2. `docs/auditoria/plano-leveza-2026-07.md` — plano ativo de emagrecimento do núcleo Postiz
3. `docs/auditoria/audit-2026-06-20.md` — 48 achados de segurança (VOC-01..48)
4. `docs/BUSINESS-PLAN.md` — marca, tom, posicionamento
5. `phases/checkpoint-fase*.md` — estado real de cada fase (leia o mais recente ao retomar)
6. `docs/zelador/CADERNO.md` — incidentes recorrentes e regras que nasceram deles

## 2. Estrutura do monorepo (pnpm workspaces, SEM Turbo/NX)

- `apps/backend` — API NestJS (porta 3000)
- `apps/frontend` — Next.js App Router (porta 4200)
- `apps/orchestrator` — Temporal (workflows + activities, NestJS)
- `libraries/` — código compartilhado; **a maior parte da lógica de servidor
  vive em `libraries/nestjs-libraries` (libs/server)**, não no backend
- Schema Prisma: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
- `apps/extension`, `apps/sdk`, `apps/commands` — herança Postiz, **fora do
  produto. Nunca construa feature neles.**

Rotas Postiz quarentenadas (escondidas por `NEXT_PUBLIC_VOC_LEGACY_MODULES`,
default off): `agents`, `plugs`, `third-party`. Leia o plano de leveza antes de
tocar nelas ou nas dependências delas.

## 3. Convenções obrigatórias

### Gerais
- **Só pnpm.** Nunca npm/yarn. Lint só roda da raiz.
- **Nunca instale componente de frontend do npmjs** — escreva nativo. Konva já
  está pago em bundle; reuse antes de propor lib nova.
- Nunca edite `pnpm-lock.yaml` na mão; qualquer mudança de dep passa por
  `pnpm install` para regenerar (lockfile stale quebra `--frozen-lockfile` no CI).
- Comandos de terminal sempre com prefixo `rtk` (filtro de tokens): `rtk git diff`,
  `rtk pnpm install`, `rtk tsc` — vale dentro de cadeias `&&` também.
- Idioma do produto: só pt (en stand-by). Não reative multi-idioma.
- Domínio real: **vocacc.io**. `@vocaccio.com.br` é placeholder errado — não introduza.

### Backend
- Camadas sem atalho: **Controller → Service → Repository** (às vezes
  Controller → Manager → Service → Repository). Controller no `apps/backend`
  é fino; lógica importa de libs/server.
- Toda query que retorna dados de cliente filtra por `organizationId` — IDOR já
  aconteceu aqui (VOC-01). Se você escreveu um `findUnique`/`findFirst` por id
  sem checar org, está errado até prova em contrário.
- Mudança de schema: leia a seção 5 (Migrations) antes de tocar em `schema.prisma`.
- Motores de cálculo do Religare (Tzolkin, HD, astrologia) são território do
  **Codex via Edwiges** (`C:\dev\edwiges`). Não altere fórmulas — se precisar,
  acione o agente `edwiges`.

### Frontend
- Antes de escrever qualquer componente, leia:
  `apps/frontend/src/app/colors.scss`, `global.scss`, `tailwind.config.js`.
- Tokens `--color-custom*` são **deprecated** — não use.
- Telas dentro do app usam o tema escuro do host (tokens `--new-*`); os tokens
  `--voc-*`/aurora são a camada Vocaccio. **Não pinte `bg-newBgColorInner`/
  `bg-newBgColor` (sólidos 100% opacos) por cima de containers `.voc-glass-*`
  ou `.voc-content-shell`** — isso anula o glass (cluster maduro no Caderno,
  44 arquivos ainda pendentes de auditoria).
- Data fetching: sempre SWR via `useFetch` de
  `libraries/helpers/src/utils/custom.fetch.tsx`. Cada `useSWR` em seu próprio
  hook, cumprindo rules-of-hooks — nunca `eslint-disable` para contornar.
- UI components em `apps/frontend/src/components/ui`; olhe componentes
  existentes antes de inventar padrão. A skill `impeccable` é a régua visual.

## 4. Erros nomeados que um modelo mais fraco vai cometer aqui

Cada erro tem nome e a regra que o previne. Se você se pegar no padrão, pare.

1. **Poda cega** — remover uma dependência/módulo porque "parece morto".
   *Regra:* golden rule integral: `grep` de imports no monorepo inteiro →
   `pnpm install` + build completo → **boot real do backend (curl)** → commit
   isolado. Nunca pule o grep nem o boot. C1 do plano de leveza provou que a
   intuição estava errada (`@copilotkit`/`@langchain` pareciam mortos e eram core).

2. **Typecheck-teatro** — declarar "backend ok" porque `tsc` saiu 0.
   *Regra:* o tsc do backend/orchestrator **OOMa e sai 0 falsamente** sem
   `NODE_OPTIONS=--max-old-space-size=4096`. Verificação de backend = boot real
   + curl em rota, sempre que tocar schema/migrations/tsconfig.

3. **db-push-em-produção** — aplicar mudança de tipo com `prisma db push`.
   *Regra:* nunca `db push` em mudança de tipo/coluna existente; dados dos
   clientes são reais; seed roda uma única vez. Mudança estrutural exige plano
   de migração explícito e aprovação do Felipe (ver seção 5).

4. **Feature-na-herança** — construir coisa nova em `apps/extension`/`sdk`/
   `commands` ou ressuscitar rota quarentenada.
   *Regra:* produto = backend + frontend + orchestrator. Quarentena só sai por
   decisão registrada no plano de leveza.

5. **Sólido-sobre-glass** — resolver "fundo estranho" adicionando
   `bg-newBgColorInner` num painel dentro de shell glass.
   *Regra:* dentro de `.voc-glass-*`/`.voc-content-shell`, use
   `bg-transparent`/token glass. Opacidade sólida só em popover/dropdown que
   legitimamente precisa.

6. **Hook-frankenstein** — agrupar vários `useSWR` num objeto ou condicioná-los,
   e silenciar o lint.
   *Regra:* um hook por recurso; `eslint-disable` em rules-of-hooks é proibido.

7. **Atalho-de-camada** — controller chamando Prisma direto, ou lógica de
   negócio no controller.
   *Regra:* Controller → Service → Repository, lógica em libs/server.

8. **Instalar-do-npm** — resolver UI puxando componente/lib de terceiros.
   *Regra:* componente nativo; para canvas, reuse o Konva do Volatis
   (`libraries/carousel-engine`). O mini-editor de imagem já provou o padrão.

9. **Órfão-de-worktree** — terminar trabalho num worktree e não commitar, ou
   podar worktree só porque está `--merged`.
   *Regra:* trabalho concluído → commit imediato (Filch é sentinela disso);
   antes de qualquer poda de worktree, `git status --short` dentro dela —
   diff sujo = pare e reporte.

10. **Cálculo-religare-pirata** — "corrigir" um Kin/gate/fórmula do Religare
    localmente.
    *Regra:* Tzolkin canônico = Dreamspell (29/02 não avança; validar em
    tzolkin.io). Motor é do Codex; divergência vira registro em
    `docs/religare/` e pauta da Edwiges, não patch.

11. **Sessão-gastadora** — reler arquivos já lidos, screenshots em loop, três
    agentes Explore paralelos.
    *Regra:* protocolo anti-estouro do PLANO-MESTRE: DOM/medição antes de
    screenshot, leituras parciais, micro-tarefas de 1 arquivo, no máx. 1
    Explore por sessão, `rtk` em tudo.

12. **Placeholder-contagioso** — copiar exemplos com `@vocaccio.com.br`,
    e-mails fake ou dados de seed por cima de dados reais.
    *Regra:* domínio é vocacc.io; nunca rode seed de novo; dados em produção
    não são fixture.

## 5. Migrations e produção

- Pré-requisito conhecido: o projeto ainda opera com `db push` (VOC-29) — isso
  é dívida, não licença. Mudança **aditiva** (nova tabela/coluna opcional) pode
  ir por `pnpm run prisma-db-push` com aprovação. Mudança **destrutiva ou de
  tipo** exige: plano de migração escrito, backup confirmado, execução pelo
  Felipe, e verificação pós (boot + query de sanidade).
- Depois de qualquer mudança de schema: `pnpm run prisma-generate`, build real
  dos 3 apps, boot real com curl.

## 6. Régua de qualidade por entregável (critérios checáveis)

**Feature de backend está pronta quando:**
- [ ] Rota passa pelas 3 camadas e filtra por `organizationId` em toda query de dado de cliente
- [ ] Build real (não só tsc) do backend com heap 4096 sai 0
- [ ] Boot real: servidor sobe e `curl` na rota nova retorna o esperado (caso de sucesso E caso negado/403)
- [ ] Nenhum segredo/token novo em plaintext; input validado no DTO
- [ ] Diff revisado pelo `moody-revisor` (e `severus-security` se tocou auth/RBAC/orgId/query/schema/deps)
- [ ] Commit isolado com mensagem convencional (`feat(escopo):` / `fix(escopo):`, em pt)

**Tela/componente de frontend está pronto quando:**
- [ ] Usa tokens do host (`--new-*`) + camada voc; zero `--color-custom*`; zero sólido sobre glass
- [ ] Fetching via hook SWR próprio com `useFetch`; sem eslint-disable de hooks
- [ ] Estado vazio, loading e erro existem (não só o caminho feliz)
- [ ] Verificado no browser real (preview/DevTools), não só "compilou" — screenshot só no fim
- [ ] Auditado contra a skill `impeccable` (hierarquia, espaçamento, acessibilidade)

**Mudança de dependência/módulo está pronta quando:**
- [ ] Grep de imports no monorepo inteiro documentado no commit/PR
- [ ] `pnpm install` regenerou o lockfile; build completo dos 3 apps ok
- [ ] Boot real do backend (curl) ok
- [ ] Commit isolado (1 onda por commit); rollback = `git revert` simples
- [ ] Se a decisão for "adormecer" em vez de remover: flag env default-off + import dinâmico

**Documento/handoff está pronto quando:**
- [ ] Checkpoint em `phases/` atualizado (< 200 linhas), estado real e próximo passo
- [ ] Memória (`MEMORY.md` + arquivo) atualizada se algo não-derivável do código mudou
- [ ] Datas absolutas, não "hoje/ontem"

**Qualquer resposta de sessão termina com:** recomendação de modelo+esforço
para o próximo passo (regra do Griphook).

## 7. Quando estiver em dúvida — regras de escalada

Escale (pergunte ao Felipe ou pare e reporte) **sempre** que:
1. A ação for destrutiva ou irreversível: `db push` com mudança de tipo, drop
   de coluna/tabela, `git push --force`, poda de worktree/branch, deleção de
   dependência (vs. quarentena), deploy.
2. A mudança tocar dados de clientes reais (qualquer UPDATE/DELETE fora de
   feature nova).
3. Envolver o motor de cálculo do Religare → acione o agente `edwiges` antes
   de qualquer edição.
4. O pedido empurrar para gambiarra que quebra limpeza/estabilidade →
   não obedeça em silêncio; proponha o caminho enxuto e explique o custo.
5. Você não conseguir verificar (sem node_modules/DB no worktree, por ex.) →
   entregue o diff + declare explicitamente o que NÃO foi verificado e onde
   verificar (o checkout principal `C:\dev\vocaccio` é quem roda dev server real).
6. Duas fontes de verdade divergirem (PLANO-MESTRE vs código vs memória) →
   reporte a divergência; não escolha sozinho.

Não escale (decida e siga) quando: for reversível, coberto por convenção
daqui, ou verificável por build/boot/browser. Autonomia dentro do trilho;
pergunta só onde a decisão é do dono.

## 8. Time de agentes (resumo operacional)

Orquestração completa em `.claude/agents/README.md`. Resumo: Dumbledore
(sessão principal) delega — Flitwick (front), Sirius (back), McGonagall
(plano/arquitetura, Opus), Moody (revisão de diff, Haiku, antes de todo
commit), Severus (segurança, proativo em superfície sensível), Griphook
(economia/modelo, Haiku), Fred e Jorge (growth/conteúdo), Hagrid (marca,
fonte: BUSINESS-PLAN.md), Filch (zelador/sentinela de commit), Edwiges
(fronteira Codex/Religare). Tarefa pequena: faça inline — sub-agente custa
cold start. Iniciar tarefas com a linha "Time atual: …" quando for barato.
