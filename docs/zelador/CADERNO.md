# Caderno do Zelador — Vocaccio

Watch-list de incidentes agrupados por **causa-raiz** (não por semelhança superficial).
Regra nasce de padrão: ≥2 incidentes mesma causa-raiz → cluster; ≥3 sem plano ativo → rascunho
de correção. Nada persiste em CLAUDE.md/`.md` de agente/hook sem aprovação do orquestrador ou
do usuário. Fix aplicado → cluster fica **graduado** aqui (histórico não se apaga).

Formato de entrada: `AAAA-MM-DD | causa-raiz | incidente(s) | mecanismo proposto | status`

---

## Pendências de revisão de processo (gate — checar ANTES de módulo novo ou retomada do HUB)

- **2026-07-25 | pedido direto do Felipe, não incidente de causa-raiz do time** | Depois de
  ~2 dias trabalhando no que devia ser um "funil de venda simples" do módulo Religare
  (captura de lead + checkout InfinitePay + SMTP + admin mínimo), o Felipe expressou
  frustração real e explícita: sentiu que o processo foi muito mais complicado do que
  deveria ser pra algo com poucas etapas, e não conseguia ver progresso claro em direção à
  conclusão apesar do esforço. Pedido textual: *"Para os próximos módulos e para HUB
  gostaria de repensar nossa estrutura para garantir uma maior fluidez futuramente. Anota
  no Filch para vermos isso assim que finalizarmos aqui e antes de começar qualquer outro
  módulo ou retomar o HUB."* Motivação adicional citada: vai integrar em breve o "Actus
  Clip" (projeto do Nicolas, sócio dele) e não quer repetir esse nível de fricção
  estrutural nessa integração.
  **Gate formal:** antes de iniciar qualquer módulo novo (Religare ou não) ou retomar
  trabalho no HUB, a sessão (Dumbledore ou Filch) **puxa esta pendência primeiro** e
  conduz, com o Felipe, uma revisão de propósito da estrutura/fluxo de trabalho — não é
  opcional esperar ele lembrar de pedir de novo.
  **Pontos de partida pra quando a revisão acontecer** (citados aqui só como contexto —
  **NÃO analisados agora**; a análise em si é da sessão dedicada, depois que o trabalho
  atual do Religare fechar):
  (a) o incidente de worktree órfão registrado nesta mesma sessão/data, mais acima em "Em
  observação — continuação" ("sessão nasce PINADA num worktree desatualizado, 4 commits
  atrás do canônico") — possível sintoma de fragilidade na abertura de sessão/gestão de
  worktrees que a estrutura atual não blinda;
  (b) um gap de configuração local (`.env` sem `RELIGARE_PROD_ORG_ID`) só foi descoberto na
  hora de um teste manual tardio — sinal de que o processo de "boot real"/skill
  `boot-real` pode não estar cobrindo o cenário de rotas admin/superadmin;
  (c) o custo de fricção humana do fluxo "verificar sessão real de superadmin" (o usuário
  precisa logar manualmente, extrair cookie do DevTools, rodar curl) — correto do ponto de
  vista de segurança, mas repetitivo a cada rodada de verificação; candidato a alguma
  automação L1/L2 que reduza o passo manual sem abrir mão da verificação real.
  **Status: PENDENTE — gate ativo, não teste de recorrência normal.** Não se aplica o
  "1 incidente = observação, ≥2 = cluster" aqui: não é erro repetido do time, é pedido
  deliberado do dono do produto — vale gate desde a 1ª menção. Só sai do estado
  "pendente" quando a sessão de revisão de estrutura acontecer de fato e produzir uma
  decisão/plano registrado (aqui ou em documento próprio, ex. `docs/planejamento/`).

---

## Clusters ativos (≥2 incidentes, mesma causa-raiz)

_(nenhum ainda — primeira ronda)_

## Em observação (1 incidente, aguardando recorrência antes de virar regra)

- **2026-07-12 | causa-raiz: convenção textual em doc lida 1x no início da sessão não é
  reforçada em cada resposta/comando — depende da memória de execução do Dumbledore, sem
  checagem mecânica | incidente: numa sessão de retomada, Dumbledore não usou o cabeçalho
  "Time atual: ..." nem o rodapé "🔦 Filch: ..." em nenhuma resposta, e não prefixou NENHUM
  comando Bash com `rtk`, apesar das três regras estarem **corretamente documentadas** em
  `.claude/agents/README.md` (linhas 7-24 para cabeçalho/rodapé, linha 29 para `rtk`) — ou
  seja, **não é gap de localização de doc** (a hipótese inicial de "a regra só vive em
  memória/CLAUDE.md e não está no README que o Dumbledore lê" foi checada e refutada: está
  no README, no lugar certo). O gap real é enforcement: nada intercepta a resposta/comando
  pra cobrar a convenção antes dela sair | mecanismo proposto (ainda NÃO aplicado — só 1
  incidente, aguardando 2º pra virar cluster): (a) curto prazo, sem tocar settings — Filch
  ou o próprio Dumbledore fazem autocheck de fechamento: antes de encerrar qualquer resposta
  de tarefa não-trivial, perguntar "cabeçalho? rodapé? rtk em todo Bash desta resposta?"; (b)
  médio prazo, se recorrer — hook `PreToolUse` em Bash que barra/avisa comando git/tsc/lint/
  test sem prefixo `rtk` (mecânico, não depende de lembrança), e hook `Stop`/`UserPromptSubmit`
  como lembrete de cabeçalho/rodapé; ver skill `update-config` pra desenhar o hook quando for
  hora. **Não persistir hook ainda** — 1 incidente é observação, não cluster (regra do
  Filch: único → observação; ≥2 mesma causa-raiz → cluster; ≥3 → rascunho de correção) |
  status: EM OBSERVAÇÃO — se o mesmo padrão (header/rodapé/rtk esquecidos por Dumbledore)
  se repetir numa próxima sessão, promover a cluster e levar a proposta de hook ao
  Dumbledore + Griphook (dono de `rtk`/economia) pra aprovação.

## Clusters maduros (≥3, correção rascunhada/pendente de aprovação)

- **2026-07-16 | causa-raiz: `git worktree remove --force` falha silenciosamente no Windows
  (long-path ou "Permission denied" por arquivo em uso) sem indicar que o registro git já foi
  removido | incidentes: 3x na mesma sessão — `magical-allen-1f35af` ("Filename too long"),
  `elegant-kirch-e09197` ("Permission denied", processo Next.js zumbi segurando o arquivo),
  `agitated-williams-e8829c` (timeout de 2min) | mecanismo: **não insista no comando que já
  falhou** (bate com a regra "Fim dos paliativos" §8) — na primeira falha, rode
  `git worktree prune -v` (confirma que o git já soltou o registro, mesmo a pasta física
  sobrevivendo) e então remova a pasta com `PowerShell Remove-Item -Recurse -Force`, não
  repita `git worktree remove`. Se `Remove-Item` também falhar por "being used by another
  process", **isso é sinal de processo vivo usando aquele worktree** — pare e investigue
  processos (`Get-CimInstance Win32_Process | Where CommandLine -match <pasta>`) antes de
  forçar, não assuma que é só lentidão de disco. | status: MADURO, mecanismo escrito aqui,
  falta promover pro `.md` do Filch/Sirius se recorrer numa 4ª vez.

- **2026-07-16 | causa-raiz: `gh pr merge --delete-branch` reporta erro só da parte LOCAL
  (branch em uso por worktree) e isso foi lido como "delete falhou, mas deve ter feito a
  parte remota" sem verificar | incidentes: 6 branches remotas (`backend-performance-review-
  fa9c68`, `fase-p-leveza-2026-400ff0`, `vocaccio-hub-kickoff-457fec`, `magical-allen-1f35af`,
  `nestjs-b2-conditional-controllers-b2f47d`, `vocaccio-backoffice-planning-9f4f90`) ficaram
  vivas no GitHub — 3 delas com a história sensível que a purga do histórico (mesma sessão)
  deveria ter eliminado, quase anulando o trabalho | mecanismo: **toda alegação de "branch
  deletada" cita a evidência** (`gh api repos/<owner>/<repo>/branches --jq '.[].name'` ou
  `git ls-remote`), nunca confia no exit code/mensagem de uma única chamada de conveniência
  (`--delete-branch`) quando ela reportou erro em qualquer parte da operação — é a mesma
  regra "cole, não afirme" do CLAUDE.md, agora nomeada pro caso específico de deleção de
  branch remota. | status: MADURO, sem correção automática ainda — verificação manual
  obrigatória até virar checklist formal.

- **2026-07-04 | causa-raiz: painéis com `bg-newBgColorInner`/`bg-newBgColor` (Postiz,
  `#1a1919`/`#0e0e0e`, 100% opaco) pintados por cima de containers já migrados pra glass
  (`.voc-content-shell`/`.voc-glass-shell`), anulando a transparência do pai não importa o
  valor ajustado nele | incidentes: achado ao vivo pelo Felipe via DevTools na tela de Posts
  (`launches.component.tsx`, 3 ocorrências corrigidas — painel "Canais", loading state, área
  do calendário) — `grep -rl "bg-newBgColorInner"` acha **44 outros arquivos** com o mesmo
  padrão (CRM, Religare, Volatis, billing, admin, launches/modais) que NÃO foram auditados
  ainda | mecanismo proposto: Hagrid/Flitwick tratam isso como item explícito da meta "zero
  débito visual Postiz até Fase 4" (já registrada no `.md` de ambos) — auditar arquivo por
  arquivo (não substituição global cega, já que `--new-bgColor*` também é usado em contextos
  que legitimamente precisam de opacidade, ex. popovers/dropdowns) e trocar por
  `bg-transparent`/token glass onde o container pai já é `.voc-glass-*` | status: MADURO,
  correção pontual aplicada só na tela relatada — resto pendente de auditoria dedicada. **2026-07-09:**
  mecanismo formalizado como skill `auditoria-glass` (`.claude/skills/auditoria-glass/SKILL.md`) —
  inventário vivo em `docs/zelador/auditoria-glass-progresso.md` (criado na primeira execução),
  Flitwick invoca proativamente. Cluster gradua quando esse arquivo zerar os 44 pendentes.
  **2026-07-11 (janela de exceção do Felipe, "colheita Fable 5"):** os 56 arquivos do
  inventário (44 + 12 já mapeados) foram triados de ponta a ponta em duas sessões
  (worktree compartilhado, commits intercalados) — `2d7e33a7`, `021e941a`, `b9e85ab0`,
  `8e75c29c`, `cb27f0a4`, `3f0cf39a`, `146f48e9`, `dc560685`, `33a9328e`. ~27 tiveram troca
  de código (painel grande/header/card de seção → `bg-transparent`); ~27 revisados e
  mantidos intactos por serem controle pequeno ou modal/popover/tooltip flutuante
  confirmado no JSX (`fixed`/`absolute`+`z-index`+`shadow`); 2 arquivos com ocorrências
  ambíguas deixadas explicitamente como VERIFICAR-BROWSER (`time.table.tsx`, 2 `<pre>` em
  `public.component.tsx`); `plugs.tsx`/`third-party.component.tsx` pulados (quarentena).
  Detalhe completo em `docs/zelador/auditoria-glass-progresso.md`. **Status: candidato a
  GRADUADO, não promovido ainda** — nenhuma tela foi confirmada em browser real
  (`node_modules` ausente no worktree); promoção formal exige verificação visual no
  checkout principal (`C:\dev\vocaccio`, dev server real), sobretudo `carousel-editor.component.tsx`
  e os 2 pontos VERIFICAR-BROWSER.

## Clusters graduados (correção já aplicada)

- **2026-07-21 | scratchpad efêmero com arquivo útil preso lá** | Sessão publicou 2 Artifacts
  (fontes HTML) + 1 briefing de design pro claude.ai/design e deixou os 3 arquivos só no
  scratchpad de sessão (`...\Temp\claude\...\scratchpad`), que não é garantido sobreviver além
  da sessão. Felipe notou e pediu regra permanente ("Filch, vamos estabelecer uma regra").
  **Correção aplicada na hora**: os 3 arquivos movidos pra `C:\dev\edwiges\artifacts\`
  (pasta nova, reconhecida como 3ª exceção deliberada ao terreno neutro da Edwiges — junto de
  `Cred\` e `prototype-referencia.html`). Regra escrita em `~/.claude/CLAUDE.md` (global —
  scratchpad é mecanismo cross-projeto, não só Vocaccio) e em `filch-caretaker.md` §4 (item de
  ronda: checar arquivo útil preso no scratchpad, direção inversa do "entulho fora do
  scratchpad" que já existia). Régua: promove só o que tem cara de reusável (fonte de Artifact
  publicado, briefing externo), não todo arquivo de sessão.

## Decisões de avaliação de skill/metodologia externa (registro anti-re-avaliação)

- **2026-07-11 | fontes: `TheColliny/FableClaudeMDForOpus` + `Sahir619/fable-method` + texto
  viral "Fable 5 hacks"** | Auditoria de segurança (fetch): ambos os repos são metodologia de
  prompt pura — sem chamada de rede, credencial ou pedido de desligar permissão. Veredito:
  **SÓ INSPIRAR, não instalar** (Fase M congela o ecossistema; ~80% do conteúdo já existia
  aqui — guardrails checáveis = CLAUDE.md seções 4/6, verifier de contexto frio = Moody,
  transcript-artifact = boot-real). O que foi absorvido (commit desta data): briefing de
  delegação GOAL/PRONTO/INSUMOS/REGRAS + calibragem de scaffolding por modelo + limites duros
  anti-loop (3 verify falhos → devolve; 2 buscas vazias → para) no README dos agentes, e regra
  "cole, não afirme" no CLAUDE.md. Claims do texto viral REJEITADOS como falsos/não
  verificáveis: "'explain your reasoning' dispara classificador de recusa" (falso), "fallback
  silencioso pra Opus 4.8" (sem evidência), "message 30 custa 31x" (ignora prompt caching),
  "esvazie seus settings" (anti-padrão pro nosso setup), benchmarks numéricos (80.3%/3x/$10 —
  inventados ou não verificáveis). Não re-avaliar essas fontes sem mudança material nelas.

## Clusters graduados (correção já aplicada) — continuação
_(nota de organização, 2026-07-25: este bloco e o de cima são a mesma categoria, só
inseridos fora de ordem em rondas diferentes — mantidos como dois blocos pra não mexer
em histórico já escrito; próxima reorganização de fundo do Caderno deve fundir os dois.)_

- **2026-07-03 | causa-raiz: checklist de poda incompleto (só `--merged`, sem `git status` por
  worktree) | incidente: `interesting-hypatia-fc900b` e `magical-allen-1f35af` foram marcadas
  "candidatas seguras" na ronda de calibração só por estarem `--merged`; ao pedir confirmação
  pro Felipe, descobriu-se que as duas têm `git status` sujo (Portal/Carrossel em
  interesting-hypatia; `.claude/launch.json` em magical-allen) — quase virou perda de trabalho
  não commitado se a exclusão tivesse sido aprovada às cegas | mecanismo: checklist de 5 passos
  adicionado à seção 3 do `.md` do Filch (local + global, commit pendente): `git status --short`
  dentro de CADA worktree candidata é obrigatório antes de recomendar poda; diff sujo = pare e
  resuma, não classifique como lixo | status: GRADUADO — regra já escrita no `.md`, poda das
  duas worktrees continua pausada até o Felipe decidir o que fazer com o diff de cada uma.**

## Decisões de skill/dependência (mérito avaliado, inclusive rejeições)

- **2026-07-15 | lytenyte (`1771-Technologies/lytenyte`, LyteNyte Grid — data-grid React de alta
  performance) | avaliado a pedido do Felipe (queria checar integração com o Graphify) | decisão:
  NÃO instalar agora.** Motivo: (1) sem relação nenhuma com o Graphify — são projetos de domínios
  diferentes (grafo de conhecimento vs. tabela de UI), a pergunta partia de uma premissa errada;
  (2) contraria a regra herdada do Postiz (`CLAUDE.md`: "Never install frontend components from
  npmjs") — ver origem em `docs/zelador/CADERNO.md` mesmo, commit `9a7d9dea` do Postiz upstream,
  não é regra inventada pelo Vocaccio; (3) mérito real ausente hoje — nenhuma tela do produto
  (CRM, fila do Ateliê, admin-stats) lida com volume de linhas que justifique virtualização
  pesada; seria o mesmo padrão de escopo elástico já apontado como causa de lentidão do projeto.
  Núcleo é Apache-2.0, mas os recursos PRO são licença comercial — custo adicional sem
  necessidade comprovada. **Reavaliar quando**: alguma tela (provável candidata: relatórios do
  Augeo, Fase 6, ainda não construída) tiver de fato milhares de linhas com sort/filter/group
  travando a UI nativa — só então vale reabrir com os 3 eixos de mérito do Griphook (segurança →
  desempenho → economia de tokens/contexto).

- **2026-07-15 | `selmakcby/loop-engineering` (skill) + arxiv:2607.00038 ("Stop Hand-Holding
  Your Coding Agent") + `obra/superpowers` | avaliados a pedido do Felipe, buscando maior
  fluidez de sessão sem reduzir verificação | decisão: FUNDIR os dois primeiros na doutrina do
  Filch, NÃO instalar `obra/superpowers`.** Motivo `selmakcby/loop-engineering`: skill leve, sem
  código de terceiro/rede/segredo — mérito real (Honesty Test + "o Portão": nunca a IA valida o
  próprio "terminei") mas sobrepõe o que o Filch já cobre (L1/L2/L3, `/goal` nativo) — fundido
  direto em `filch-caretaker.md` §5 em vez de virar skill separada (evita duplicar mecanismo, ver
  §3.5). Motivo arxiv:2607.00038: puramente conceitual (nada pra instalar) — a "especificação de
  loop" em 5 partes (gatilho/objetivo/verificação/regra-de-parada/memória) virou checklist na
  mesma seção. Motivo `obra/superpowers` (**só inspirar**, rejeitado): metodologia completa
  (design→plano→TDD→revisão em 2 estágios→worktrees) que duplica o time HP já construído sob
  medida pro Vocaccio (Moody+Severus já fazem revisão em 2 estágios); além disso ele próprio
  exige aprovação humana explícita no design antes de implementar — não resolve o objetivo do
  Felipe (menos fricção de aprovação), só reorganiza onde ela acontece. **Reavaliar quando**: o
  time HP sentir necessidade real de TDD estruturado que Moody/Severus não cubram, ou o Felipe
  pedir explicitamente uma metodologia mais rígida de planejamento por tarefa.

## Em observação (incidente único — aguardando recorrência) — continuação
_(mesma categoria da seção "Em observação" acima, este bloco reúne incidentes de
sessão/infra em vez do padrão de convenção textual; nota de organização igual à de
"Clusters graduados" acima.)_

- **2026-07-25 | causa-raiz: sessão nasce PINADA (pinned) num worktree pelo lançador do
  harness, sem checagem automática de que o local/branch pinado bate com o que o usuário
  pede na 1ª mensagem** | incidente: sessão do Claude Code foi lançada já fixada em
  `C:\dev\vocaccio\.claude\worktrees\religare-smtp-admin-routes-6bd311`, branch
  `claude/religare-smtp-admin-routes-6bd311`, HEAD `3e8022ea` — mas a 1ª mensagem do Felipe
  pedia explicitamente pra continuar no **checkout canônico** `C:\dev\vocaccio`, branch
  `claude/sprint-caixa-d1-d2-ac37e5`, HEAD `93a7a15a`. O worktree pinado estava **4 commits
  atrás** do canônico (faltavam `880e4144`, `529fdd7d`, `e6e6b16f`, `93a7a15a`) e numa branch
  histórica diferente — se a sessão tivesse editado código sem notar, o resultado seria
  trabalho feito no lugar errado (conflito ou trabalho perdido ao tentar reconciliar depois),
  igual ao risco que a regra 9 do `CLAUDE.md` ("Órfão-de-worktree") já nomeia, só que na ponta
  de **abertura** de sessão em vez de fechamento. A sessão desta vez percebeu a divergência
  rodando `git worktree list` + `git log --oneline` nos dois lugares **antes** de tocar em
  qualquer arquivo, e desviou o trabalho pro lugar certo prefixando `cd` + caminhos absolutos
  em toda chamada — mas isso foi disciplina da instância, não um mecanismo que force a
  checagem. Ferramentas do harness não ajudaram a resolver: `EnterWorktree` recusou apontar
  pro checkout principal ("is the main working tree, not a linked worktree"), e `ExitWorktree`
  é no-op porque esta sessão não criou o worktree via `EnterWorktree` — ele já veio pinado no
  lançamento. **Teste de recorrência: 1º incidente deste tipo específico no Caderno** (não há
  precedente — a entrada de 2026-07-03 sobre "Fusão Filch/Hagrid pendente" é sobre branch
  desatualizada quanto a *conteúdo de agente*, não sobre a sessão nascer no lugar errado; não
  vira cluster/regra ainda) — mas o risco (edição no branch errado) é alto o bastante pra
  documentar o mecanismo pronto pra promover no 2º incidente, em vez de só anotar e esquecer.
  **Mecanismo proposto (rascunhado, NÃO aplicado — falha o critério 1 do portão de dois
  aprovadores do Filch, "recorrência genuína ≥2x", então não editar `.claude/agents/README.md`
  ainda):** no início de toda sessão, antes de qualquer edição de código, comparar
  `git rev-parse --abbrev-ref HEAD` + `git rev-parse HEAD` do cwd pinado contra qualquer
  caminho/branch/commit citado explicitamente pelo usuário na 1ª mensagem; se divergir, parar
  e confirmar o local antes de continuar (nunca assumir que o pin do harness é o lugar certo).
  Candidato natural: uma linha nova na seção "Como o Dumbledore orquestra" do
  `.claude/agents/README.md`, ou item do checklist de abertura de sessão — decidir isso é do
  Dumbledore quando (e se) houver um 2º incidente igual. Não é automatizável como hook hoje
  (não há gatilho `UserPromptSubmit` padrão neste repo que leia a 1ª mensagem contra `git
  status` do cwd) — se recorrer, é candidato a proposta L1 (relatório) na doutrina de loop do
  Filch, não L2/L3 direto. | status: **EM OBSERVAÇÃO** — nenhum estrago ocorreu desta vez
  (a sessão pegou sozinha antes de editar), registrado só pra não perder o padrão se
  repetir.
  **Achado correlato desta investigação (não é o mesmo incidente, é limpeza física):** os 3
  worktrees linkados listados por `git worktree list` a partir do canônico —
  `religare-funnel-foundation-13e6d1` (branch `claude/religare-funnel-foundation-13e6d1`,
  HEAD `880e4144`), `religare-main-integration` (branch `main`, HEAD `3e8022ea`) e
  `religare-smtp-admin-routes-6bd311` (branch `claude/religare-smtp-admin-routes-6bd311`,
  HEAD `3e8022ea`, o worktree onde esta sessão nasceu) — foram checados com `git status
  --short` dentro de cada um: **as três estão limpas, nenhum diff pendente.**
  `git merge-base --is-ancestor` confirma que os HEADs dos três (`880e4144` e `3e8022ea`) já
  são ancestrais do HEAD canônico atual (`93a7a15a`) — ou seja, **as três já estão totalmente
  incorporadas ao canônico** (consistente com `docs/religare/funil-fundacao.md` §8.3, que
  registra os 2 merges de `main`/`880e4144` em `claude/sprint-caixa-d1-d2-ac37e5` nesta mesma
  data). São candidatas reais a `git worktree remove` pelos critérios do checklist do Filch
  (merged + limpas), mas **Filch não executa** — poda de worktree é destrutivo e escala pro
  Felipe (Regra de autonomia, item "execução, não decisão"). Falta só o "pode" dele.

- **2026-07-03** — Fusão Filch/Hagrid pendente no `main`. Os agentes `filch-caretaker.md` e
  `hagrid-brand.md` (+ README atualizado com tabela/legenda dos dois) existem no worktree
  `agitated-williams-e8829c` (commits `dd712029`, `5a3f036a`) mas ainda não chegaram ao `main`
  (`6fede5b3`, sem esses arquivos). Não é erro — é trabalho em andamento neste worktree — mas
  vale acompanhar: se esta branch demorar a mergear, o resto do time (rodando a partir de
  `main` ou de outro worktree) não vê Filch/Hagrid ainda. Observação única, não cluster.

- **2026-07-16** — Processos de dev-server (`next dev`, `nest start --watch`) ficaram
  rodando em background muito além do fim da tarefa que os iniciou: um grupo de 6 (bash +
  5 node) de uma sessão de 15/07 que já tinha encerrado (o worktree que os originou já
  nem existia mais), e outro grupo de 4 do backend que o próprio Dumbledore desta sessão
  achou ter matado (`taskkill` de 1 PID) mas na verdade só matou um processo da árvore,
  deixando os filhos vivos por ~1h40. Isso foi confundido com "sessão paralela ativa" por
  boa parte da sessão. **Padrão a repetir se recorrer:** depois de `taskkill`/`Stop-Process`
  num processo pai, confirme com `Get-NetTCPConnection -LocalPort <porta>` ou
  `Get-CimInstance Win32_Process | Where CommandLine -match <pasta>` que a árvore inteira
  morreu — não assuma pelo exit code do kill do PID isolado.

- **2026-07-16** — Dumbledore (esta sessão, bem longa) esqueceu o cabeçalho "Time atual"
  em TODAS as respostas, do início ao fim — convenção já documentada em
  `.claude/agents/README.md` desde 2026-07-03, nunca aplicada aqui. Causa provável: sessão
  rodou majoritariamente sem invocar sub-agentes explicitamente (Dumbledore sozinho fazendo
  git/gh/pwsh direto), então não havia um Filch de fato rodando como watchdog externo — só
  o Felipe notou, no fim da sessão. **Risco:** sessão solo longa não tem quem cobre o
  Dumbledore além do próprio Dumbledore, que é exatamente o ponto cego. Sem mecanismo
  automático ainda (hook de lint de resposta seria over-engineering) — registrado como
  lembrete: sessões longas e solo merecem uma auto-checagem periódica (a cada handoff de
  fase, não só no fechamento).

- **2026-07-16** — Conteúdo comercial/de segurança sensível ficou pushado num repo
  PÚBLICO por ~6 semanas (desde a criação do repo em 2026-06-05) sem que nenhuma regra
  existente pedisse checar visibilidade do repo antes de commitar. Ninguém verificou isso
  até o classificador de permissão do harness bloquear um push e mencionar "repo público"
  de passagem. **Mecanismo agora existe** (`CLAUDE.md` §"Repo privado", `vocaccio-docs-
  privado` criado) — mas o gatilho que teria pego isso mais cedo (checar visibilidade do
  remote na primeira sessão que commita `docs/` sensível) não está em nenhum `.md` de
  agente ainda. Candidato a virar regra explícita se algum outro repo do ecossistema for
  criado no futuro.

- **2026-07-16** — `docs/referencias/actus-kit/.env` (migrado pro repo privado
  `vocaccio-docs-privado/handoff-nicolas/actus-kit/`) tem `GROQ_API_KEY` real em texto
  claro. Achado pelo agente Explore na auditoria de docs sensíveis. A pasta nunca foi
  rastreada pelo git (sempre no `.gitignore`), e o `.gitignore` local do próprio kit
  também barrou o `.env` de entrar no repo privado — a chave nunca esteve em nenhum
  histórico git, público ou privado. **Decisão do Felipe (2026-07-16): NÃO rotacionar
  por enquanto.** Registrado aqui pra não perder o rastro — reavaliar se: (a) a pasta
  `actus-kit` for compartilhada de novo com alguém fora do Nicolas, (b) surgir qualquer
  sinal de uso indevido da chave, ou (c) o Felipe decidir rotacionar por rotina de
  higiene de segredo, independente de incidente.

---

## Ronda 2026-07-03 — primeira ronda (calibração/teste)

**Time ativo:** 🔦 Filch (sozinho, ronda de teste).

### Entulho físico (worktrees/branches)
- `git worktree list` a partir de `C:/dev/vocaccio` (main): 3 worktrees além do principal —
  `agitated-williams-e8829c` (5a3f036a, branch atual, não merged em main — trabalho vivo, esta
  própria sessão), `interesting-hypatia-fc900b` (6fede5b3 — **mesmo commit do HEAD do main**),
  `magical-allen-1f35af` (ff806f66, atrás do main).
- `git branch --merged main`: `interesting-hypatia-fc900b` e `magical-allen-1f35af` já estão
  **merged** em main. Isso é sinal forte de worktree candidata a poda — mas Filch não deleta.
  Sinalizado ao dono: **`interesting-hypatia-fc900b` está no mesmo ponto do main (6fede5b3)** —
  se não há sessão viva usando-a, é a primeira candidata a `git worktree remove`.
  `magical-allen-1f35af` também já mergeada (ff806f66 ancestral de main) — mesma checagem antes
  de remover.
- `agitated-williams-e8829c` (esta sessão) está `--no-merged` — trabalho em progresso, correto
  não tocar.

### Sentinela de commit
- Worktree atual (`agitated-williams-e8829c`): `git status` limpo, nada pendente. Sem cobrança.

### Disciplina do time (`.claude/agents/`)
- Todos os 10 agentes têm `model:` no frontmatter (checado via grep): flitwick/sirius/severus/
  edwiges/weasley/hagrid/filch = sonnet; griphook/moody = haiku; mcgonagall = opus. Nenhum
  agente sem recomendação de modelo — **sem cobrança**.
- README local (`.claude/agents/README.md` neste worktree) já reflete Filch e Hagrid na tabela,
  legenda de emoji e protocolos dedicados (linhas 70-98) — bem documentado, sem drift entre
  README e os `.md` individuais.
- Nota: o README do **main** ainda não tem Filch/Hagrid (só chega quando esta branch mergear) —
  ver "Em observação" acima. Não é falha de disciplina, é sequência normal de merge.

### Skills / automação
- Fora de escopo nesta ronda (pedido explícito: sem auditoria de skill nova, sem acionar Hagrid).

### `/goal`
- Nenhuma fase/missão multi-etapas em andamento nesta ronda isolada que justifique propor
  `/goal` agora — revisitar quando o Filch acompanhar uma fase completa (ex. merge da branch
  atual + integração Filch/Hagrid no main).

**Veredito da ronda:** Castelo limpo — só uma poda de worktree para o dono avaliar (checar
sessão viva antes) e nenhuma cobrança de modelo/esforço pendente.
