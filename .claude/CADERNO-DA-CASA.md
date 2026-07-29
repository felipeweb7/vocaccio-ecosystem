# Caderno da Casa — Vocaccio

Especificidade deste projeto para o time de agentes HP (Dumbledore, Flitwick, Sirius,
McGonagall, Moody, Severus, Griphook, Weasley, Filch, Hagrid, Edwiges, Draco, Luna).

**Regra de mão única (decisão do Felipe, 2026-07-29):** o agente global (`~/.claude/agents/`)
lê este caderno e ele tem **precedência sobre exemplos genéricos** do `.md` do agente quando os
dois tratarem do mesmo tema. O caminho inverso é **proibido**: nada específico do Vocaccio volta
para `~/.claude/agents/`. As cópias de agente em `.claude/agents/` deste repo são só **ponteiros**
(ver cada `.md` lá) — a fonte de verdade de comportamento é sempre o arquivo global; a fonte de
verdade de especificidade é sempre este caderno.

**Identidade**: Vocaccio é um growth/CRM/content hub, fork do Postiz (agendador de posts,
28+ canais). Adiciona CRM, Religare (astrologia/Human Design), Volatis (carrosséis Konva),
Ateliê Virtual (back-office de entregáveis), multi-tenant org/RBAC.

**Stack real**: monorepo pnpm workspaces (sem Turbo/NX) — `apps/backend` (NestJS, porta 3000),
`apps/frontend` (Next.js App Router, porta 4200), `apps/orchestrator` (Temporal), `libraries/`
(a maior parte da lógica de servidor vive em `libraries/nestjs-libraries`/`libs/server`). Schema
Prisma em `libraries/nestjs-libraries/src/database/prisma/schema.prisma`.

**Fontes de verdade, em ordem** (ver `CLAUDE.md` §1):
1. `PLANO-MESTRE.md` — visão, fases, decisões de arquitetura (Camada 18 imutável).
2. `docs/auditoria/plano-leveza-2026-07.md` — emagrecimento do núcleo Postiz.
3. `vocaccio-docs-privado/seguranca/audit-2026-06-20.md` (repo privado) — 48 achados VOC-01..48.
4. `vocaccio-docs-privado/marca/BUSINESS-PLAN.md` (repo privado) — marca, tom, posicionamento.
5. `phases/checkpoint-fase*.md` — estado real de cada fase.
6. `docs/zelador/CADERNO.md` — Caderno do Zelador (watch-list de incidentes, distinto deste
   caderno: aquele é log de erros recorrentes do TIME; este é ficha de fatos do PROJETO).

**Nota de versão (não resolvida por mim — confirme com McGonagall/Hagrid antes de citar):**
`CLAUDE.md` cita `docs/planejamento/Plano-de-Decolagem-Vocaccio-v4.md` como Anexo 1 do mapa do
HUB; `hagrid-brand.md` (versão de projeto, antes da consolidação de hoje) citava a v3 como
canônica de comercial/posicionamento. `git status` desta sessão mostra `Plano-de-Decolagem-
Vocaccio-v4.{md,docx}` como **modificados, não commitados, por outra sessão** — não mexi neles.
Ao validar comercial/marca, confira qual versão está de fato ativa antes de citar §.

---

## ♨️ Sirius (back-end)
- `apps/backend` (controllers finos, importam de libs) + `apps/orchestrator` (Temporal:
  workflows/activities) + `libraries/nestjs-libraries` (a maior parte da lógica).
- Camadas: `Controller → Service → Repository` (ou `→ Manager →` quando houver manager).
- Migrations: **nunca `db push` em mudança de tipo**; `VOC-29` (o projeto ainda opera com
  `db push` para mudança aditiva) é dívida conhecida, não licença — ver `CLAUDE.md` §5.
- Plano de leveza: módulos `copilot`/`third-party`/`agents` em quarentena condicional
  (Fase B2, não executada) — não expandir, ver `docs/auditoria/plano-leveza-2026-07.md`.
- Ambiente: `bcrypt_lib.node` ausente → `node-pre-gyp install --update-binary` (build script
  pulado, não é o node).
- As skills operacionais (`boot-real`, `poda-segura`) já estão no `sirius-backend.md` global —
  este caderno só reforça que são obrigatórias aqui, não opcionais.

## 🎨 Flitwick (front-end)
- `apps/frontend` (Next.js App Router + Tailwind 3) + carrossel Volatis (`src/components/
  volatis/carousel`, React/Konva) + motor `libraries/carousel-engine`.
- Tema: `--new-*` (host Postiz, dark) para estrutura; `--voc-*`/aurora para cor/acento.
  **Nunca** roxo Postiz (`#612bd3`/`#612ad5`) nem laranja Brands Decoded.
- Rotas quarentenadas (`agents`, `plugs`, `third-party`) ocultas por
  `NEXT_PUBLIC_VOC_LEGACY_MODULES` — não reative sem pedido explícito.
- App-shell sem scroll desnecessário (regra do Felipe, 2026-07-04): meça em viewport 1366×768;
  piso de legibilidade `text-[11px]` (legenda) / `text-[13px]` (corpo).
- Autoridade visual cross-IDE e o gate Luna-antes-do-hero já estão no `flitwick-frontend.md`
  global (consolidados hoje) — este caderno só aponta onde a fonte cross-IDE mora:
  `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md` + `C:\dev\edwiges\prototype-
  referencia.html`.

## 🛖 Hagrid (marca)
- Fonte de verdade: `vocaccio-docs-privado/marca/BUSINESS-PLAN.md` (repo privado, Business
  Canvas Vocaccio) para arquétipos/tom/sistema visual.
- Fio condutor comercial: `docs/planejamento/Plano-de-Decolagem-Vocaccio-v3.md` (ou v4, ver
  nota de versão acima) — prevalece sobre BUSINESS-PLAN em conflito de categoria/promessas/CTAs
  (§15 tem as 22 regras permanentes de comunicação).
- Autoridade visual cross-IDE: `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md` (§4 =
  filtro anti-Postiz), protótipo vivo `C:\dev\edwiges\prototype-referencia.html`.
- Paleta Aurora: Peach `#F29676`, Rose `#DF548E`, Violet `#7C5EE1`, Blue `#23A6D6`; Dark App
  `#090614`; Light App `#FAFAFA`. Rosa legado `#cf6295` e roxo Postiz não são canônicos.
- Arquétipos: Mago (atmosfera) + Sábio (estrutura) + Criador (entrega), apoio de
  Cuidador/Explorador/Governante.
- Dashboard de evolução (painel de status por fase/módulo): `C:\dev\edwiges\DASHBOARD-
  EVOLUCAO-HUB.html` — inclui seção "Caderno de pendências" (achados de branch/worktree/decisão
  travada esperando o Felipe).
- Meta de erradicação do Postiz: nenhuma tela deve seguir com visual herdado até fim da Fase 4.
- Handoff Nicolas/Acto: `vocaccio-docs-privado/handoff-nicolas/actus-kit/docs/vocaccio-design-
  system.md` (cópia autocontida, não o consolidado direto).

## 🔦 Filch (zelador — este projeto)
- Caderno do Zelador (watch-list de incidentes recorrentes do time): `docs/zelador/CADERNO.md`.
- Skills operacionais locais que evitam regra nova redundante: `boot-real` (verificação real de
  backend pós-mudança), `poda-segura` (checklist de remoção de dependência/módulo),
  `auditoria-glass` (varredura do cluster `bg-newBgColorInner`/glass — progresso em
  `docs/zelador/auditoria-glass-progresso.md`).
- **Achado pendente herdado, não resolvido — carregar pra próxima ronda de entulho** (2026-07-20):
  `.claude/worktrees/` tinha 8 pastas no disco, mas `git worktree list` só reconhecia
  `branch-cleanup-worktree-3671a9` (detached HEAD `a40cce9f`, `git status` limpo, **não
  mergeado** em `main`). As outras 7 (`elegant-kirch-e09197`, `friendly-pike-4bd7e1`,
  `interesting-hypatia-fc900b`, `kind-haslett-28b375`, `nestjs-b2-conditional-controllers-
  b2f47d`, `quirky-hertz-b159aa`, `unruffled-williams-8bbdc7`) não aparecem em `git worktree
  list` — provável registro já solto, pasta física ainda presente, conteúdo próprio não
  auditado. Rode o checklist completo de poda (§2 do agente global) em cada uma antes de
  qualquer recomendação — ainda não foi feito, volume/risco pede rodada dedicada.
- Fio condutor documental: `PLANO-MESTRE.md` (seção "Fio condutor" v6.x) →
  `docs/planejamento/Plano-de-Decolagem-Vocaccio-v3/v4.md` (marca/comercial) →
  `vocaccio-docs-privado/planejamento/PLANO-EXECUCAO-DECOLAGEM-2026-07.md` (operacional) →
  `SUBPLANO-*.md` (execução). Sessão de execução declara no início qual subplano está rodando.
- Pauta de retraining pendente herdada (2026-07-19): `SUBPLANO-TIME-HP.md` §2 (tabela
  agente-a-agente) — retomar em micro-tarefas de 1 arquivo.
- Protocolo Fênix: fila `FX-*` em `C:\dev\edwiges\MEMORIA-COMPARTILHADA.md`; rotina local em
  `C:\dev\edwiges\TIME-HP-PORTAVEL.md` §8.

## 🕵️ Severus (segurança)
- Playbook treinado: `vocaccio-docs-privado/seguranca/audit-2026-06-20.md` (repo privado, 48
  achados VOC-01..48, ver memória `project-auditoria-2026-06`).
- Padrão mais recorrente: IDOR cross-tenant (VOC-01/02/04/30) — toda mutation escopa `orgId`;
  `where:{id}` puro só com `_assert...BelongsToOrg` antes.
- **Incidente aberto, severidade alta (2026-07-29)**: o harness não registrou
  `severus-security.md` como agente disponível numa sessão recente, apesar do arquivo ser válido
  (frontmatter ok, UTF-8 sem BOM, já rodou com sucesso em sessão anterior — ver
  `docs/zelador/CADERNO.md`). Teste pendente: nova sessão + `Agent(subagent_type=
  "severus-security")`. Já era pauta de retraining pendente desde 2026-07-19 ("diagnosticar por
  que severus-security.md não carregou") — 10 dias sem reteste.

## 🔒 Griphook (economia)
- RTK instalado (`~/.cargo/bin/rtk`), ~60-90% de economia medida via `rtk gain`. Prefixar
  git/tsc/lint/test sempre, inclusive em cadeias `&&`.
- CacheAligner + CCR (saída grande/reaproveitável de ferramenta vai pra `tmp/`, já no
  `.gitignore`, em vez de `docs/`/raiz) — doutrina extraída da avaliação do Headroom (rejeitado
  como ferramenta, `FX-2026-07-13-04` — RTK já cobre a economia sem o peso de Python+ML+proxy).
- **2ª ocorrência de confiabilidade do `rtk` (2026-07-29, ver Caderno do Zelador)**: `rtk diff`
  normalizou fim-de-linha (CRLF) e reportou "Files are identical" para pares de agente que na
  verdade divergiam em conteúdo real — mascarou drift genuíno. 1ª ocorrência já registrada:
  `rtk git log --oneline origin/main` devolvendo tip desatualizado vs. `git rev-parse` puro.
  Mesma causa-raiz (saída filtrada do `rtk` divergindo do comando puro numa decisão que importa)
  — passa o portão de recorrência, vira apontamento formal pro Griphook decidir uso/ressalva.

## 📐 McGonagall (planner)
- `PLANO-MESTRE.md` é o plano mestre (fases, decisões de arquitetura, Camada 18 imutável).
- Handoffs ativos em `docs/referencias/` (ex. `volatis-content/carrossel-status-e-roadmap.md`);
  estado real de fase em `phases/checkpoint-fase*.md`.

## 🧨 Weasley (growth/conteúdo)
- Produtos que geram conteúdo/growth: Ateliê Virtual, Volatis (carrossel), Religare.
- Fonte de posicionamento/comunicação: `docs/planejamento/Plano-de-Decolagem-Vocaccio-v3/v4.md`
  §15 (regras permanentes) — não citar IA como argumento comercial nesta fase; não prometer
  viralização/agenda cheia; preços (`Cosmologia R$397`, `Starter R$1.497`) só no repo privado.

---

## Fatos estruturais (derivados do Graphify)

**PENDENTE — aguardando rebuild do grafo.** `graphify-out/graph.json` está parado desde
2026-07-06 (commit `6b549005`; `HEAD` atual do repo é `35b8dccc` nesta sessão) e o corpus
indexado é ~97% código / ~3% documentação — não confiável hoje para fatos de doc/planejamento
recentes. Rebuild tem custo de IA real (chave Gemini) e é **decisão do Felipe**, não do Filch —
não rodei `/graphify` nesta sessão. Os fatos abaixo vieram de leitura direta do repo/`CLAUDE.md`
nesta sessão, não do grafo:
- Entry points: `apps/backend` (NestJS, porta 3000), `apps/frontend` (Next.js, porta 4200),
  `apps/orchestrator` (Temporal).
- Schema: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`.
- Mapa do HUB (Anexo 1 do Plano de Decolagem): Religare (alma do negócio) + Augeo (automação/
  growth) no topo; Volatis, Acto, Base, CRM e **Tribali** (marca-filha, repo próprio
  `C:\dev\tribali`, trava AGPL — conectado, não faz parte deste monorepo) como módulos. Nem
  todo módulo do mapa está construído — confira `PLANO-MESTRE.md` para status real.

## Skills locais desta casa (`.claude/skills/`)

`boot-real`, `poda-segura`, `auditoria-glass`, `migration-safety`, `atelie`, `gsap-core`,
`gsap-frameworks`, `gsap-performance`, `gsap-plugins`, `gsap-react`, `gsap-scrolltrigger`,
`gsap-timeline`, `gsap-utils`, `impeccable` (cópia local). Ver `.claude/skills/<nome>/SKILL.md`
de cada uma para o conteúdo completo — este caderno só indexa a lista, não duplica o conteúdo.
