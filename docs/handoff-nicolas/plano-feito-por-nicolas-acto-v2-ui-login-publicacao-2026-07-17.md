# Plano Acto v2 — UI /studio, Editor, Modelo de Marca, Login/ADM e Publicação
**Data:** 2026-07-17 · **Autor:** Fable 5 (auditoria feita direto no código em 2026-07-17)
**Fonte 1:** anotações do Nicolas (17/07) + 8 imagens de referência do Opus Clip (descritas
textualmente na seção 2 — o executor NÃO verá as imagens; a descrição aqui é a fonte)
**Fonte 2:** `Rotas de posicionamento e marca editorial — Vocaccio.pdf` (diretrizes na seção 1.3)
**Fonte 3:** estado real do repositório em 2026-07-17 (arquivos e linhas citados por tarefa)

Este plano NÃO substitui `plano-funcionalidades-acto-2026-07-12.md` (roadmap 37/37 concluído);
ele é a fila nova. CLAUDE.md continua sendo o contrato de operação — nada aqui o revoga.

> **⚠️ CONFLITO ABERTO (2026-07-17) — FASE G bloqueada.** A pendência de decisão #5 do plano
> de 12/07 (seção 7 daquele documento) diz que calendário/publicação/analytics **não devem
> ser reconstruídos no Acto** — ficam para o HUB via Postiz. A FASE G abaixo propõe o oposto
> (publicação direta + calendário dentro do Acto), a partir de anotação literal do Nicolas em
> 17/07. Perguntado diretamente: **ainda não decidido com o Felipe**. Não iniciar G1-G4 até
> essa decisão ser tomada e este aviso ser removido/atualizado. Fases A-F não dependem disso.

---

## 0. GUIA DO EXECUTOR

Executor esperado: **Sonnet** na maioria das tarefas (o "Modelo" de cada tarefa indica exceções).
Regras completas em `CLAUDE.md` (leia SEMPRE primeiro). Resumo do que mais importa aqui:

1. **Uma tarefa por sessão.** Ao terminar: verificação real (régua da seção 6 do CLAUDE.md),
   `/checkpoint`, parar.
2. **Backend/libraries sem hot-reload (E1)** — matar e resubir a instância descartável (porta
   3011+) após toda edição. Frontend de teste em 4300+. Portas 3000/4200 são intocáveis (E4).
3. **Campo persistido novo = `/campo-rico` obrigatório** (E2) e **3 espelhos de tipo** (E7):
   canônico → `apps/frontend/src/lib/api.ts`/`editorTypes.ts` → cópia do `apps/video-renderer`.
4. **Zero libs de UI** (dnd-kit, radix, framer-motion…). Dropdown/popover/toggle/modal são feitos
   à mão — os padrões já existem no repo (`.st-menu`, `.st-profile-menu`, `.ed-switch`,
   `.modal-overlay`). Copie o precedente, não invente.
5. **Schema só aditivo+nullable** via `pnpm db:push` (E13).
6. **Nunca copiar código AGPL.** Neste plano isso vale especificamente para o **Postiz**
   (AGPL-3.0): referência de leitura de arquitetura, **zero copy-paste**. OpenCut é MIT — pode
   estudar e adaptar padrões livremente (com atribuição em comentário quando adaptar algo
   substancial).
7. **Nenhuma conta externa criada por você (E14).** Credenciais OAuth (Google/Meta/TikTok) são
   do Nicolas; feature sem chave = implementada atrás de env com `*NotConfiguredError` claro e
   testada com stand-in local em `127.0.0.1`.
8. **Verificação de frontend = browser de verdade + screenshot** (E5/E16). Typecheck verde não
   é entrega.

### 0.1 Ordem recomendada de execução

```
FASE A (studio, correções)  →  FASE B (tela do projeto)  →  FASE C (editor v2)
     →  FASE D (Modelo de Marca)  →  FASE E (configurações)
     →  FASE F (login/ADM)  →  FASE G (publicação/agendamento)
```

- A→E são independentes de login: tudo continua rodando com `ORG_ID='default'` até a FASE F.
- FASE F (login) **antes** da FASE G (publicação): contas sociais conectadas precisam pertencer
  a um usuário/organização de verdade.
- Dentro de cada fase, as tarefas estão em ordem de dependência.
- **Gates de decisão do Nicolas** estão na seção 9 — nenhuma tarefa que dependa de um gate
  aberto deve ser iniciada.

---

## 1. DIREÇÃO DE DESIGN (vale para TODAS as tarefas visuais)

### 1.1 Barra de qualidade

O padrão de referência é o acabamento de CapCut/Opus Clip/Linear/Vercel: interfaces escuras,
densas mas respiráveis, hierarquia por peso tipográfico e não por caixas, motion curto e
intencional. Concretamente:

- **Tokens antes de valores.** Toda cor/raio/sombra nova entra como CSS var em
  `apps/frontend/src/app/globals.css` (bloco de tokens no topo). Nenhum hex solto em JSX.
- **Nova cor de destaque: `--accent: #E0568D`** (tarefa C1). Nota: é praticamente o rosa do
  gradiente aurora existente (`#DF548E`) — a troca harmoniza, não briga com a paleta. O aurora
  completo continua reservado a CTAs (regra DS Vocaccio); `--accent` é o novo estado
  ativo/seleção/highlight em editor e studio (substituindo os usos de `--violet`/`--peach`
  como cor de interação).
- **Motion:** 120–220ms, `cubic-bezier(0.3, 0.7, 0.3, 1)` (já usado no `warp-burst`), só em
  opacity/transform. Popovers entram com `warp-in` (precedente `.st-profile-menu`). Respeitar
  `prefers-reduced-motion` (precedente já existe em globals.css:363).
- **Popover/dropdown ("warp")**: superfície `rgba(22,18,33,0.92)` + `backdrop-filter: blur`,
  raio 13px, padding 8px, linhas de 36–40px com ícone 15–18px — é EXATAMENTE o `.st-profile-menu`
  atual. Todo "warp" novo deste plano deriva desse padrão.
- **Foco visível:** `:focus-visible` com anel de 2px `--accent` em todo controle novo.
- **Estados vazios e de carregamento:** skeleton (bloco com shimmer sutil) em vez de texto
  "Carregando…" nas superfícies novas (studio grid, calendário, painel de publicação).

### 1.2 O que continua proibido (DS Vocaccio / CLAUDE.md)

Órbitas em editor/timeline/transcript; decoração "mágica" em badges de IA; score apresentado
como previsão científica de viralidade; libs de UI.

### 1.3 Diretrizes do PDF de posicionamento que afetam ESTE plano

Do `Rotas de posicionamento e marca editorial — Vocaccio.pdf`:

- **"A tecnologia trabalha no operacional. A identidade permanece no centro."** → IA nunca é
  personagem na UI: nada de "✨ mágica da IA"; botões de IA têm rótulo funcional
  ("Regenerar descrição", "Sugerir outro hook") e badge técnico.
- **Não prometer viralização** (seção 13 do PDF, "promessas que devem ser evitadas") → o copy
  da UI NUNCA usa "viral/viralizar". A "Pontuação" do clipe é apresentada como *análise técnica
  de potencial* (o tooltip atual "Pontuação de viralidade" em `ClipGrid.tsx:139` deve mudar
  para "Pontuação do clipe — análise técnica" na tarefa B3).
- **Tom de voz** (seção 16): claro, direto, leve acidez permitida, zero hype. Mensagens de erro
  amigáveis e específicas ("O link do Google Drive precisa estar com compartilhamento 'Qualquer
  pessoa com o link'"), nunca genéricas ("erro ao processar").
- **"Mais humano para quem recebe. Mais leve para quem produz."** → toda decisão de UX deste
  plano deve reduzir cliques/fricção do operador (upload em background, autosave, filtros).
- **Público prioritário** (terapeutas, mentores, educadores — seção 7/13): não são editores de
  vídeo profissionais. Defaults bons > opções em excesso. É por isso que o modal de novo projeto
  ENCOLHE neste plano (A1) em vez de crescer.

---

## 2. IMAGENS DE REFERÊNCIA — DESCRIÇÃO TEXTUAL CANÔNICA

O executor não tem acesso às imagens. Estas descrições são a especificação:

**REF-IMG-1 — Warp de layout (Opus).** Na toolbar sobre o preview, um botão-pílula escuro
"⛶ Layout: Preencher". Ao clicar, abre popover escuro (estilo 1.1) com: cabeçalho
"Configurações globais de layout ›" (link para config global), divisor, label pequena
"Layout atual", e 3 linhas de opção com ícone + nome + check na ativa: "Preencher" ✓,
"Ajustar", "Dividir". *(No Acto, as opções serão só Preencher e Dividir — ver C3.)*

**REF-IMG-2 — Modal de crop "Recortar" (Opus).** Modal escuro quase fullscreen. Título
"Recortar" (esq., topo), X (dir.). Texto explicativo com link sublinhado ("Ativar layout").
Label "Proporção da tela:" + dropdown "Personalizada" (dir.). Centro: o frame do vídeo com a
área de crop demarcada por 4 alças circulares nos cantos + alças-pílula nos lados/topo/base;
área fora do crop escurecida. Rodapé dir.: botão secundário "Redefinir" + primário branco
"Aplicar".

**REF-IMG-3 — Painel Typography (CapCut-like).** Painel claro, seções colapsáveis com chevron.
Seção "Typography": campo "Font" (dropdown com ícone T, valor "Arial"), campo "Size" (input
numérico com ícone Aa, valor 72), campo "Color" (swatch quadrado + hex "FFFFFF"). Campos em
cápsulas de fundo neutro, raio ~10px, label pequena acima. *(No Acto mantemos dark, mas a
estrutura seção→campos-cápsula é essa — ver C4.)*

**REF-IMG-4 — Modal "Agendar post" (Opus).** Modal largo. Título "Agendar post" + subtítulo.
Coluna esq.: "+ Adicionar conta", seletor "Todas as plataformas", lista de contas conectadas
(avatar + nome + plataforma) com check nas selecionadas. Coluna dir.: bloco "Regenerar texto"
(input "Peça à IA para reescrever com seu tom, estilo ou hashtags" + chips Tom/Formato/
Imitar/Hashtag + botão "Regenerar Tudo"); abaixo, por conta: tabs "Feed | Inbox", textarea da
descrição com hashtags coloridas, thumbnail do clipe à direita. Rodapé: "‹ Agendamento em
massa" (esq.), "📅 Selecionar horário" e primário "Publicar agora" (dir.).

**REF-IMG-5 — Grid de clipes (Opus).** Cards verticais: thumb 9:16 com chip de tempo
"00:00 1:51" (topo dir.) e hook em balão branco sobre o vídeo. Abaixo do thumb: score grande
verde (99, 98…), ícones de ação em linha (agendar 📅, baixar ⬇, editar ✂), título do clipe em
2 linhas. Header da lista: "Clipes originais (40)", toggle grid/lista (⊞/≡), à direita
"Selecionar", "Filtrar", ordenar (⇅), nuvem de download, "···".

**REF-IMG-6 — Lista de clipes (Opus).** Cada linha: coluna esq. com like/dislike + score
"99/100" + notas por eixo (letras A/B ao lado de Hook/Fluxo/Valor/Trend); centro: player
compacto com hook; texto "Análise de cena" + transcrição resumida com timestamps; coluna dir.
empilhada de botões: "Publicar nas redes sociais", "Exportar XML", "Baixar em HD",
"Editar clipe", "Ferramentas de IA", "9:16", "Duplicar".

**REF-IMG-7 — Warp de filtro (Opus).** Popover sob "Filtrar": checkboxes Curtido, Não curtido,
Editado, Dublado, Não dublado; seção "Duração do clipe:" (90s-180s); seção "Tipo:" com
categorias. *(No Acto: Curtido, Não curtido, Editado, Não editado, Publicado, Não publicado —
ver B2.)*

**REF-IMG-8 — Warp de ordenação (Opus).** Popover sob o ícone ⇅ com radio: "Pontuação de
viralidade" ✓ e "Cronológico". *(No Acto: "Pontuação" e "Cronológico" — sem a palavra
viralidade, ver 1.3.)*

---

## 3. FASE A — /studio: correções, novo fluxo de upload e polish

### A1 — Modal de novo projeto: sobreposição + redesign com warps
**Modelo:** Sonnet · **Esforço:** médio

**Bug de sobreposição (corrigir primeiro, é 1 linha):** `.modal-overlay` tem `z-index: 60`
(`globals.css:239`) e o header fixo tem `z-index: 10000/10001` (`globals.css:1109/1111`) — por
isso o header fica POR CIMA do modal. Correção: elevar `.modal-overlay` para `z-index: 10010`.
Conferir que `.st-profile-menu` (10001) também fica abaixo do overlay.

**Redesign (`apps/frontend/src/app/studio/NewProjectModal.tsx`):**
1. **Remover** os campos "Formato do conteúdo" (linhas ~332-352) e "Objetivo editorial"
   (~354-375) — os states `format`/`editorialGoal` saem do submit (o backend já os trata como
   opcionais em `startJob`, nada quebra). Remover também as constantes `FORMATS` e
   `EDITORIAL_GOALS`.
2. **Remover** a seção "Fonte do vídeo" (tabs file/url + dropzone, linhas ~208-250) — a fonte
   passa a ser decidida ANTES do modal abrir (ver A2).
3. **Trocar chip-rows por warps:** Idioma, Duração média dos cortes e Assuntos viram
   dropdowns-popover no padrão 1.1 (botão-pílula mostrando o valor atual + chevron; popover
   com as opções e check na ativa). Legendas vira um `.ed-switch` ("Legendas" + toggle).
   Estilo de legenda (e futuramente Modelo de Marca — D2) vira warp com preview do nome.
4. **Barra de progresso de upload:** barra fina (3px, `--accent`, raio full) fixa no topo do
   corpo do modal + texto "Enviando vídeo… 43%" — alimentada pelo estado de upload do A2.
5. Layout geral: título "Configure seus clipes", campos em coluna única com labels pequenas
   (padrão REF-IMG-3 adaptado ao dark), rodapé com "Cancelar" + primário aurora "Gerar clipes".

**Pronto quando:**
- [ ] Modal aberto cobre o header (screenshot provando).
- [ ] Nenhum chip-row sobra no modal; warps abrem/fecham com clique-fora e Esc.
- [ ] `format`/`editorialGoal` não são mais enviados e um job novo roda até o fim normalmente
      (verificação de pipeline mínima: job completo com clipe `-captioned.mp4`, E3).

### A2 — Upload em background + novo fluxo de entrada
**Modelo:** Sonnet · **Esforço:** alto (é a tarefa mais delicada da fase)

Comportamento-alvo (anotação do Nicolas, itens 1-3):

1. **Fluxo URL:** usuário cola URL na barra da home (`page.tsx:294-317`) e clica "Obter clipes"
   → valida (A3) → abre o modal de config **já criando o Source** (`createSourceFromUrl`) em
   paralelo enquanto ele preenche. (O download real da URL acontece no estágio ingest do job —
   criar o Source cedo não baixa nada, mas já elimina a espera do POST na hora do submit.)
2. **Fluxo arquivo:** botão "Enviar arquivo" abre DIRETO o file picker nativo (input file
   escondido, sem modal intermediário). Ao escolher o arquivo → abre o modal de config com o
   upload JÁ rodando em background (`uploadSource` com `onProgress` alimentando a barra do A1).
3. **Cancelamento:** se o usuário fechar o modal (X, Esc, clique-fora) com upload em andamento
   → diálogo de confirmação "Cancelar o envio do vídeo?" (padrão modal pequeno; botões "Voltar"
   e "Cancelar envio" destrutivo). Ao confirmar: abortar o XHR **e deletar o que já existir no
   storage** — se o Source já foi criado, `deleteSource(sourceId)` (endpoint existente, já
   remove arquivos do storage); se o upload foi abortado antes do response, não há Source, mas
   o backend pode ter recebido bytes parciais — conferir no backend (`sources.controller`)
   que upload abortado não deixa arquivo órfão em `storage/uploads/` (se deixar, limpar no
   handler de aborto/erro do multer).

**Implementação:**
- `uploadSource` em `lib/api.ts:168` já usa XHR — adicionar suporte a aborto (retornar/aceitar
  um handle com `xhr.abort()`, mantendo a assinatura retrocompatível).
- Novo estado no `StudioInner` (`page.tsx`): `pendingUpload: { file?, url?, sourcePromise,
  progress, abort() } | null`, passado ao `NewProjectModal` via prop. O submit do modal faz
  `await sourcePromise` (se ainda não resolveu, o botão mostra "Aguardando envio…") e segue
  para `startJob` normalmente.
- O `beforeunload` deve avisar se houver upload em andamento (precedente no editor,
  `editor/page.tsx:1157`).

**Pronto quando:**
- [ ] Escolher arquivo → modal abre com barra progredindo; preencher config e submeter ANTES
      do upload terminar funciona (submit espera e conclui).
- [ ] Fechar modal no meio do upload → confirmação → storage sem arquivo órfão (listar
      `storage/uploads/` antes/depois como prova) e Source deletado se existia.
- [ ] Fluxo URL cria o Source em paralelo e o job inicia sem segundo POST redundante.

### A3 — Validação de URL (vazio, formato, Google Drive)
**Modelo:** Sonnet · **Esforço:** médio

1. **Campo vazio:** clicar "Obter clipes" com a barra vazia → erro inline sob a barra ("Cole o
   link de um vídeo do YouTube ou Google Drive para começar") + foco no input + shake sutil
   (~200ms, respeitando reduced-motion). Hoje `openWithUrl()` (`page.tsx:273`) abre o modal
   mesmo vazio — passa a exigir URL válida.
2. **Formato:** validação client-side com `URL()` + allowlist de hosts (youtube.com, youtu.be,
   drive.google.com — espelho do `MEDIA_PLATFORM_HOSTS` de
   `apps/orchestrator/src/activities/ingest.activity.ts:24`). Host fora da lista → "Por
   enquanto aceitamos links do YouTube e do Google Drive."
3. **Compartilhamento do Drive:** impossível verificar de forma confiável no client (CORS).
   Criar endpoint leve no backend: `POST /sources/validate-url` → para links do Drive, faz um
   HEAD/GET parcial (até primeiro byte) na URL de download direto
   (`https://drive.google.com/uc?id=<id>`); resposta HTML de login/permissão → `400` com
   mensagem exata: "O link do Google Drive precisa estar com compartilhamento 'Qualquer pessoa
   com o link'." Para YouTube, `200` direto (o ingest já trata erros). A home chama esse
   endpoint entre a validação de formato e a abertura do modal — com spinner no botão
   ("Verificando link…").
4. Atualizar placeholder da barra: **"Cole um link do YouTube ou Google Drive"** (anotação
   literal do Nicolas; substitui o atual "…YouTube, TikTok, Instagram…" em `page.tsx:303`, que
   promete o que o ingest não suporta).

**Pronto quando:**
- [ ] Vazio → erro inline, modal NÃO abre.
- [ ] `https://exemplo.com/x.mp4` → mensagem de host não suportado.
- [ ] Link de Drive restrito real → mensagem exata de compartilhamento (curl do endpoint
      colado na verificação); link de Drive público → passa.
- [ ] Caminho de erro do endpoint responde 4xx amigável, nunca 500 (régua backend).

### A4 — Remoções: busca global de transcrições + botão Google Drive
**Modelo:** Haiku · **Esforço:** baixo

1. Remover `<TranscriptSearch />` da home (`page.tsx:341`) e deletar
   `apps/frontend/src/app/studio/TranscriptSearch.tsx` + estilos `ts-*` órfãos do globals.css.
   **Manter o endpoint** `/sources/search-transcripts` e o código de embeddings (DIF-3) — a
   CLI e a busca dentro do projeto (futuro) usam; anotar no checkpoint que a UI da home saiu.
2. Remover o botão "Google Drive" da home (`page.tsx:329-337`) — o fluxo de URL já cobre Drive.
   "ou Enviar arquivo" continua (agora abrindo file picker direto, A2).

**Pronto quando:** home sem busca e sem botão Drive (screenshot); `pnpm typecheck` limpo;
nenhum CSS `ts-*` órfão sobrando (grep).

### A5 — Projetos favoritos (estrela) + saída de "Clipes favoritos" do /studio
**Modelo:** Sonnet · **Esforço:** médio · **Skill:** `/campo-rico`

1. **Schema (aditivo):** `Source.favorite Boolean @default(false)` + `pnpm db:push`.
   Rodar a checklist `/campo-rico` (normalizadores de Source no caminho list/summary).
2. **Endpoint:** `PATCH /sources/:id` já existe para rename — aceitar `favorite` no body.
3. **UI:** tabs da biblioteca (`page.tsx:187-197`) passam a ser: "Todos os projetos (N)" e
   **"Projetos favoritos"** (substitui "Projetos salvos"; a tab "Clipes favoritos" SAI — a
   funcionalidade correspondente vira o filtro "Curtido" DENTRO do projeto, tarefa B2).
   Estrela de favoritar: ícone outline ao lado do título do card (`st-card__body`), sempre
   visível, preenchida com `--accent` quando ativa, clique com `stopPropagation` e update
   otimista (SWR mutate local antes do PATCH).
4. Tab "Projetos favoritos" filtra client-side (`projects.filter(p => p.favorite)`); estado
   vazio próprio ("Nenhum projeto favorito ainda — clique na estrela de um projeto").

**Pronto quando:** favoritar → recarregar página → estrela persiste (round-trip por API,
régua de schema); tab filtra; screenshot dos dois estados.

### A6 — Polish de hovers, seleção e troca de perfil
**Modelo:** Haiku · **Esforço:** baixo

1. **"Selecionar" sem fundo no hover:** `.st-tab-action:hover` deve mudar APENAS a cor do
   texto para `--e-ink` (mais branco), sem background. Localizar a regra atual no globals.css
   e remover o fundo.
2. **Hover do botão Home** (`.st-iconbtn:hover`): reduzir a opacidade do fundo para o mesmo
   valor do hover do botão de configurações (`.st-gearbtn:hover`) — inspecionar os dois no
   browser e igualar.
3. **Troca de perfil:** o menu (`.st-profile-menu`, `globals.css:1120`) deve abrir alinhado
   IMEDIATAMENTE abaixo do perfil atual (hoje usa `position: fixed; right: 28px` — trocar para
   posicionamento relativo ao container do perfil, `top: calc(100% + 6px)`). Adicionar um
   **backdrop com blur** atrás do menu: overlay fixo fullscreen `rgba(8,7,12,0.25)` +
   `backdrop-filter: blur(6px)` que desfoca o conteúdo atrás, clique nele fecha o menu
   (o menu fica acima do backdrop; header abaixo dele).

**Pronto quando:** screenshots dos 3 estados (hover selecionar, hover home, menu de perfil
aberto com fundo desfocado).

### A7 — Blur do header falhando
**Modelo:** Sonnet · **Esforço:** baixo-médio

Sintoma: o `backdrop-filter: blur(24px)` do `.st-header` (`globals.css:1109`) "falha" em
partes — típico de Chrome quando um ancestral/irmão cria stacking context ou quando o
conteúdo rolado tem `transform`/`filter` próprios (os `.glow` de `ambient-glows` usam blur e
podem interferir). Diagnóstico no browser de verdade (DevTools → Layers): identificar qual
elemento quebra o backdrop. Correções candidatas (aplicar a que o diagnóstico apontar):
`isolation: isolate` no header; `will-change: backdrop-filter`; mover os glows para z-index
negativo em vez de `z-index: 0`; garantir que nada entre header e body cria filter próprio.
Também reproduzir na tela do projeto (B1 menciona o mesmo bug).

**Pronto quando:** scroll da home e da tela do projeto com o blur uniforme em toda a largura
(screenshots em 2 posições de scroll diferentes).

---

## 4. FASE B — Tela do projeto (clipes)

### B1 — Adequação ao design do /studio
**Modelo:** Sonnet · **Esforço:** médio

`ProjectView` (`page.tsx:245-262`) e `ClipGrid.tsx` ganham o mesmo vocabulário visual da home:
header da seção com título do projeto (tipografia display), botão voltar como `.st-iconbtn`,
toolbar com "Selecionar" idêntico ao da home (mesmo componente/classe `st-tab-action`, mesmo
comportamento de hover do A6), barra de seleção `.st-selectbar` idêntica. O blur do header
corrigido no A7 deve valer aqui também.

**Pronto quando:** lado a lado (screenshot home + projeto), os controles são visualmente
idênticos; nenhum estilo `cg-*` conflitando com os `st-*`.

### B2 — Ver em blocos/lista + filtros + ordenação
**Modelo:** Sonnet · **Esforço:** alto · **Skill:** `/campo-rico` (campo `edited`)

**Toolbar do projeto** (padrão REF-IMG-5): à esquerda toggle ⊞ grid / ≡ lista; à direita
"Selecionar", "Filtrar" (warp REF-IMG-7) e ordenar ⇅ (warp REF-IMG-8).

1. **Grid/lista:** grid = cards atuais (simplificados no B3). Lista = linha horizontal por
   clipe (REF-IMG-6 adaptado): thumb compacto à esquerda, score + eixos no centro-esquerda,
   título/hook/análise no centro, coluna de ações à direita (Editar, Baixar, Publicar — G4).
   Persistir a escolha em `localStorage` (`acto:clipsLayout`).
2. **Filtros** (multi-check no warp): Curtido / Não curtido / Editado / Não editado /
   Publicado / Não publicado.
   - *Curtido/Não curtido:* o `ClipFeedback` é append-only (DIF-2) — derivar o estado atual
     por clipe = ÚLTIMO sinal de cada clipe. Endpoint de listagem de clipes passa a incluir
     `currentFeedback: 'like' | 'dislike' | null` (computado no service com `groupBy`/última
     linha por clipId — sem coluna nova). O botão like/dislike do card passa a refletir esse
     estado persistido (hoje é só otimista local, `ClipGrid.tsx:62`).
   - *Editado/Não editado:* coluna nova aditiva `Clip.editedAt DateTime?` — setada pelo
     backend no primeiro PATCH vindo do editor (update em `clips.service`). `/campo-rico`.
     (Não inferir de `updatedAt` — re-render de pipeline também atualiza `updatedAt`.)
   - *Publicado/Não publicado:* existe `PublishRecord` só depois da FASE G — até lá o par de
     filtros fica no warp **desabilitado com tooltip "Em breve"** (padrão rail do editor).
3. **Ordenação** (radio no warp): "Pontuação" (default, `score` desc — comportamento atual) e
   "Cronológico" (`startMs` asc — ordem em que os momentos acontecem no vídeo fonte).

**Pronto quando:** cada filtro comprovado com um clipe em cada estado (like num, dislike
noutro, um editado); troca grid/lista sobrevive a reload; ordenação cronológica confere com
os `startMs`; round-trip do `editedAt` (editar no editor → filtro "Editado" pega).

### B3 — Card de clipe simplificado (remove o bloco de análise)
**Modelo:** Haiku-Sonnet · **Esforço:** baixo-médio

Anotação do Nicolas: retirar do card o bloco de informações (reason + barras dos 6 eixos +
badges de risco/uso). Em `ClipGrid.tsx`: remover `cg-reason` (linha 179) e o bloco
`cg-scores`/`cg-badgerow` (183-206) do **card do grid**. O card fica: thumb + score + duração
+ título + hook (com o botão de regenerar) + ações (like/dislike/editar/baixar/excluir — e
publicar na G4). A análise completa NÃO morre: ela vive na **visão de lista** (B2, REF-IMG-6)
onde há espaço para ela. Ajustar o tooltip do score conforme 1.3 ("análise técnica").

**Pronto quando:** screenshot do card novo; a lista continua mostrando a análise completa.

### B4 — "Criar clipe deste trecho" migra do editor para o projeto
**Modelo:** Sonnet · **Esforço:** médio

Hoje o botão vive no header da transcrição do editor (`editor/page.tsx:1220-1227`) e usa o
`AddSectionModal` com a transcrição inteira (`newClipModalOpen`, linhas 1798-1808;
`createClipFromSelection` na 846). Mover a função para a tela do projeto:

1. Botão "＋ Criar clipe" na toolbar do projeto (ao lado de "Selecionar").
2. Abre o mesmo `AddSectionModal` (mover/reexportar o componente para uso fora do editor —
   ele precisa de `words` da transcrição do source: buscar via endpoint de transcript já
   existente usado pelo editor).
3. A chamada de criação é a mesma do editor (`createClipFromSelection` → extrair a lógica
   API para `lib/api.ts` se ainda estiver acoplada ao componente).
4. Remover o botão e o modal do editor (o `AddSectionModal` de ADICIONAR SEGMENTO ao clipe
   atual, `addAt`, CONTINUA no editor — são dois usos distintos do mesmo componente; só o
   "criar clipe novo" migra).

**Pronto quando:** criar um clipe novo a partir do projeto funciona de ponta a ponta (clipe
aparece no grid em PROCESSING → READY `-captioned.mp4`, E3); editor sem o botão; typecheck.

### B5 — Favoritos de clipe dentro do projeto
**Modelo:** — (absorvida)

Não é tarefa separada: "Clipes favoritos" dentro do projeto = filtro "Curtido" da B2 (o like
já é o mecanismo de favoritar clipe). Registrado aqui só para rastrear a anotação do Nicolas.

---

## 5. FASE C — Editor v2

### C1 — Cor de destaque `#E0568D` via token
**Modelo:** Haiku · **Esforço:** baixo

Criar `--accent: #E0568D` no bloco de tokens do globals.css. Substituir usos de INTERAÇÃO no
editor e studio: `accent-color` dos ranges (hoje `var(--violet)`, ~8 ocorrências em
`editor/page.tsx`), estados `aria-pressed`/seleção (`.ed-style-card`, `.ed-chip`), playhead e
seleção da timeline (hoje `--peach` em `.ed-playhead::before/::after`, `.ed-tl-drop`), foco.
NÃO mexer: gradiente aurora dos CTAs, cores do próprio conteúdo de legenda (configs do
usuário). Grep de `--violet` e `--peach` no CSS + JSX decidindo caso a caso (uso decorativo
fica; uso de interação troca) — listar a decisão por ocorrência no checkpoint.

**Pronto quando:** screenshot do editor mostrando range/seleção/playhead na cor nova; grep
sem `--violet`/`--peach` restantes em estados de interação.

### C2 — Toolbar sobre o preview (proporção + enquadramento)
**Modelo:** Sonnet · **Esforço:** médio

Hoje: proporções são 3 chips soltos sobre o preview (`editor/page.tsx:1265-1276`) e
enquadramento é uma aba do rail direito. Alvo (REF-IMG-1):

1. Toolbar horizontal centrada acima do preview com 2 botões-pílula:
   **"⤢ Proporção: 9:16"** e **"⛶ Layout: Preencher"** (+ espaço para futuros).
2. Warp de proporção: opções 9:16 / 1:1 / 4:5 / 16:9 (as de `ASPECT_RATIOS`), check na ativa.
3. Warp de layout: ver C3.
4. A aba "Enquadrar" SAI do rail direito (`RAIL`, `editor/page.tsx:97-104`): remover o item
   `framing`; o conteúdo restante da aba (Enquadrar por falante, Tamanho do recorte) migra
   para o warp de layout (C3) e para o modal de crop (C3).

**Pronto quando:** toolbar funcional com os dois warps; rail sem "Enquadrar"; trocar proporção
pelo warp re-renderiza o preview igual antes (round-trip de save preservado — os 6 pontos de
integração do editor na régua do CLAUDE.md).

### C3 — Enquadramento estilo Opus (warp + seleção + modal de crop)
**Modelo:** Sonnet alto (é a tarefa mais complexa do editor) · **Esforço:** alto

Comportamento-alvo, mapeado do Opus para o modelo de dados real (cada segmento já carrega seu
`framing { layout, regions }` — `persist()` em `editor/page.tsx:1040`):

1. **Warp "Layout"** (REF-IMG-1) na toolbar do C2: opções **"Preencher"** (`fill`) e
   **"Dividir"** (`split2`; manter `split3` como sub-opção "Dividir em 3" — os 3 layouts
   existem em `LAYOUTS`/`editorData.ts`). A escolha aplica ao(s) **segmento(s)
   selecionado(s)** (mesmo comportamento do `changeLayout` atual). Linha de cabeçalho
   "Configurações do layout ›" abre o modal de crop (item 3).
2. **Seleção no preview:** 1 clique no vídeo do preview = selecionar o vídeo (moldura fina
   `--accent` ao redor do stage + o clique NÃO dá mais play/pause — play/pause migra para a
   barra de transporte da timeline e barra de espaço, que já existem). **Clique duplo** =
   abre o modal de crop. (Hoje o canvas dá play/pause no clique, `editor/page.tsx:1300` —
   esse handler muda para selecionar; manter play/pause via espaço e timeline.)
3. **Modal de crop "Recortar"** (REF-IMG-2): substitui o `FrameFraming` inline da lateral.
   Modal quase fullscreen sobre o editor mostrando o FRAME FONTE inteiro (não o crop),
   com o retângulo de crop arrastável/redimensionável por alças (Pointer Events manuais —
   reusar a lógica de drag do `FrameFraming.tsx`, que já mapeia regions normalizadas).
   Para layout dividido: uma área de crop por célula, com tabs "Célula 1/Célula 2" ou
   seleção clicando na célula. Slider "Tamanho do recorte" (zoom, `framingZoom` atual) dentro
   do modal. Rodapé: "Redefinir" (volta ao crop automático detectado) + "Aplicar" (commit no
   estado do editor — histórico/undo integra igual hoje via `snapNow`).
   "Enquadrar por falante" (REF-3) vira uma linha com switch dentro do warp de layout.
4. `FrameFraming.tsx` continua existindo como o motor de crop, agora renderizado dentro do
   modal (adaptar props; não duplicar lógica).

**Pronto quando:** fluxo completo verificado no browser: warp muda layout do segmento →
duplo-clique abre modal → arrastar crop → Aplicar → salvar → re-render → **frame extraído do
MP4 final confere com o crop escolhido** (E16, régua de render); undo/redo cobre as ações
novas; round-trip dos 6 pontos do editor.

### C4 — Legendas: redesign clean (Tipografia/Estilo) + destaque com toggle
**Modelo:** Sonnet · **Esforço:** alto · **Skill:** `/campo-rico` (campo `highlight.enabled`)

**Mudanças de comportamento:**
1. **Excluir "Slide"** das opções de destaque (`HIGHLIGHT_KINDS`, `editor/page.tsx:113-118`).
   Compat: clipes antigos com `kind:'slide'` persistido — o resolver
   (`captionConfig.ts:153`) passa a mapear `'slide'` → `'duo'` (fallback mais próximo em
   comportamento). O tipo canônico mantém `'slide'` aceito NA LEITURA (não quebrar dados),
   mas a UI e o render novo não o oferecem. Tocar os 3 espelhos (E7) + a cópia do
   video-renderer se o kind chega lá.
2. **Excluir "Nenhum" + toggle de ativação:** novo campo `highlight.enabled: boolean`
   (default `true`; `kind:'none'` legado resolve para `enabled:false` + kind default).
   UI: switch "Destaque" no cabeçalho da seção; kinds restantes: "Duo" e "Bold Word".
   `/campo-rico` completo (persist → resolver → render → espelhos).
3. **Reorganização em seções (REF-IMG-3):**
   - **Tipografia:** Fonte (warp dropdown com preview da fonte no item), Tamanho (cápsula
     numérica + slider), Cor do texto.
   - **Estilo:** Contorno (switch + cor + espessura), Sombra (switch + cor + blur),
     Fundo (switch + cor + opacidade — se `captionConfig` ainda não tiver campo de fundo,
     criar `background: { color, opacity } | null` via `/campo-rico`; conferir primeiro em
     `captionConfig.ts` se já existe).
   - **Destaque:** switch geral + kind + cores ativa/inativa + params do kind.
   - **Modelo de Marca** (após D2): substitui o bloco "Meus presets" atual.
   - Maiúsculas/minúsculas entra em Tipografia.
4. **Estrutura visual:** seções colapsáveis (chevron, padrão REF-IMG-3 em dark), campos em
   cápsulas `--e-surface` raio 10px, labels pequenas — o painel deixa de ser uma lista corrida.
   As sub-tabs "Texto | Destaque" atuais (`editor/page.tsx:1339-1346`) morrem em favor das
   seções colapsáveis (decisão: 1 painel com seções > 2 tabs, menos cliques — se durante a
   implementação o painel ficar longo demais, degradar para as tabs é aceitável, anotar no
   checkpoint).

**Pronto quando:** round-trip completo de cada campo novo (editar → salvar → re-seed → UI e
banco); clipe legado com `slide`/`none` abre sem erro e resolve como especificado; frame do
render final prova contorno/sombra/fundo/destaque (E16); 3 espelhos atualizados na mesma
sessão (E7).

### C5 — Aprimorar IA: só Limpeza de áudio, desativado no rail
**Modelo:** Haiku · **Esforço:** baixo

Em `editor/page.tsx`: no painel `enhance` (linhas 1654-1701), remover os cards "Remover
vícios de linguagem" e "Punch-in automático" (o código das funções `removeFillersCaption`/
`removeFillersVideo`/`applyPunchInEffect` e detecções pode ficar — só a UI sai; anotar no
checkpoint que DIF-8 fica dormente). Fica só o card "Limpeza de áudio" (DIF-7). No `RAIL`
(linha 97), marcar `enhance` com `disabled: true` (visível, não clicável, tooltip "Em breve"
— padrão já existente). O painel fica pronto para reativar com 1 flag.

**Pronto quando:** rail mostra "Aprimorar IA" desabilitado; typecheck; clipe com
`audioCleanup` já salvo antes continua renderizando com limpeza (não regredir o campo).

### C6 — Timeline: scrollbar estável + marcador mais fino
**Modelo:** Haiku · **Esforço:** baixo

1. **Scrollbar que some/aparece no zoom** (a tela "dá mexidas"): `.ed-tl-scroll`
   (`globals.css:906`) usa `overflow-x: auto` — quando o zoom faz o conteúdo caber, a barra
   some e a altura muda. Trocar para `overflow-x: scroll` + `scrollbar-gutter: stable` (a
   barra fica sempre reservada). Conferir no Safari também (scrollbar overlay do macOS: com
   "Always show scroll bars" do sistema em Auto a barra é overlay e não afeta layout — o
   gutter estável resolve o caso do Chrome, que é onde o pulo acontece).
2. **Marcador (playhead) mais fino:** `.ed-playhead` (`globals.css:996-1007`): linha
   `::after` de 2px → **1.5px**; cabeça `::before` de 10px → **8px**; manter a hit area de
   14px (não reduzir a área de arrasto — só o visual).

**Pronto quando:** zoom in/out contínuo sem pulo de altura (gravar a verificação com 2
screenshots em zoom mín/máx); playhead visivelmente mais fino.

### C7 — Layout geral do editor (direção OpenCut/CapCut)
**Modelo:** Sonnet · **Esforço:** médio (fazer DEPOIS de C2-C6, é o polish integrador)

Referência estudável: **OpenCut** (MIT — https://github.com/opencut-app/opencut ·
https://opencut.app/). O que adaptar dele (padrões, não código copiado às cegas):

- **Hierarquia de 3 zonas limpas:** header fino (ações globais) / centro dominado pelo
  preview / timeline como painel próprio com sua toolbar. O Acto já tem os 3 — o polish é
  reduzir ruído: painéis laterais com fundo 1 nível mais escuro que o stage, divisores
  hairline, títulos de painel menores.
- **Painel de propriedades contextual:** o que aparece à direita depende da seleção
  (segmento selecionado → propriedades do segmento; nada selecionado → propriedades do clipe).
  Aplicar essa lógica: selecionar segmento na timeline foca as props de enquadramento dele.
- **Toolbar da timeline** com grupos separados por divisores: transporte (play, tempo) |
  edição (dividir, excluir) | zoom (slider + fit).
- **Atalhos visíveis:** tooltips com a tecla (S = dividir, Espaço = play, ⌘Z = desfazer).
- Padding/raio consistentes: stage com raio 12px, painéis 0 (full-bleed), cápsulas 10px.

**Pronto quando:** screenshot desktop 1280px do editor inteiro + aprovação do Nicolas no
próximo chat (esta tarefa é a única com gate visual explícito dele — é barata de iterar).

---

## 6. FASE D — Modelo de Marca

### D1 — Modelo de dados
**Modelo:** Sonnet · **Esforço:** médio · **Skill:** `/campo-rico`

Conceito (anotação do Nicolas): **"Kit de marca" + "Modelos" se unem em "Modelo de Marca"** —
uma entidade que define APENAS estilo de legenda + animação de destaque. Escolhida no upload
(preset "Padrão" ou criados pelo usuário) e trocável no editor, substituindo "Meus presets".

Mapeamento para o schema real (SEM migration destrutiva — E13):
- `CaptionPreset` (schema.prisma:203 — `name` + `config Json`) é EXATAMENTE isso e **vira o
  Modelo de Marca** (a entidade fica; só o nome de UI muda). O `config` já guarda
  `CaptionConfig` completo (tipografia + estilo + highlight).
- `VideoTemplate` e `BrandKit` **continuam existindo** no banco e na API v1 (CLI/lote os usa),
  mas SAEM das superfícies de UI do studio (o warp "Modelo" do upload atual e a aba "Marca" do
  editor). Watermark/logo do BrandKit: fica funcionando para quem já configurou, sem UI nova —
  **gate de decisão N3** (seção 9) define o destino.
- Adições aditivas ao `CaptionPreset`: `isDefault Boolean @default(false)` (o preset "Padrão"
  de fábrica, seedado por org na primeira listagem) e `updatedAt DateTime @updatedAt`.
- `ClipJob` ganha `captionPresetId String?` (aditivo) — o preset escolhido no upload; o
  `persist-clips.activity` aplica o `config` do preset em cada clipe criado (mesmo caminho que
  o `templateId` do ESS-7 já percorre — seguir esse precedente linha a linha).

**Pronto quando:** `pnpm db:push` limpo; job criado com `captionPresetId` produz clipes já
com o estilo do modelo (prova: frame do render, E16); `/campo-rico` checklist executada.

### D2 — Modelo de Marca nas superfícies (upload + editor + salvar novo)
**Modelo:** Sonnet · **Esforço:** médio

1. **Upload (modal A1):** warp "Modelo de Marca" com "Padrão" + os da org (substitui o warp
   "Modelo"/VideoTemplate). Envia `captionPresetId` no `startJob`.
2. **Editor:** na seção de legendas (C4), o bloco "Meus presets" vira **"Modelo de Marca"**:
   warp com os modelos; selecionar um aplica o `config` inteiro (mesmo `applyPreset` atual);
   botão "Salvar como novo Modelo de Marca" (mesmo fluxo `savePreset` atual, renomeado);
   trocar o modelo NÃO trava os campos — o usuário segue ajustando por cima (o modelo é
   ponto de partida, não lock).
3. **Aba "Marca" do rail:** some do rail (`RAIL`: remover/ocultar `brand`) — watermark segue
   o gate N3.

**Pronto quando:** upload com modelo → clipes nascem estilizados; trocar modelo no editor →
salvar → re-seed persiste; salvar novo modelo aparece no upload seguinte; screenshots.

---

## 7. FASE E — Tela de configurações

### E1 — Configurações com sidebar (Conta · Modelos de Marca · Plano e Créditos)
**Modelo:** Sonnet · **Esforço:** médio-alto

Reescrever `apps/frontend/src/app/studio/config/page.tsx` (hoje: forms de BrandKit +
VideoTemplate empilhados):

- **Layout:** header do studio + corpo em 2 colunas: sidebar esquerda fixa (220px) com os
  itens Conta / Modelos de Marca / Plano e Créditos (ícone + label, item ativo com fundo
  sutil e borda-esquerda `--accent`); conteúdo à direita em cards `glass` com títulos de
  seção. Navegação por query param (`?tab=conta`) para deep-link.
- **Conta:** antes da FASE F, mostra o perfil cosmético atual (nome/avatar) + placeholder
  "Login em breve". Depois da F1: nome, email, troca de senha, sessões ativas, logout.
- **Modelos de Marca:** CRUD dos `CaptionPreset` (lista com preview tipográfico do estilo —
  render de um "Aa Palavra" com a config aplicada —, renomear, excluir, duplicar). Os forms
  de BrandKit/VideoTemplate atuais saem da UI (código pode ficar num arquivo não roteado até
  o gate N3 decidir).
- **Plano e Créditos:** estático nesta fase — card com plano "Beta interna", medidor de uso
  (renderizações do mês, lidas de `usage-log`/contagem de jobs se trivial; senão "—") e nota
  "Cobrança em definição". NÃO inventar preços (gate N4/J3 do plano comercial).

**Pronto quando:** navegação entre as 3 abas com deep-link; CRUD de Modelo de Marca completo
com round-trip; screenshot das 3 telas.

---

## 8. FASE F — Login e ADM

### F1 — Autenticação (better-auth) — fundação
**Modelo:** Sonnet alto · **Esforço:** alto · **Gate:** N1 (seção 9)

**Recomendação de stack (pesquisada em 2026-07-17):**
- **[better-auth](https://github.com/better-auth/better-auth)** (MIT, TypeScript-first,
  self-hosted, dados no NOSSO Postgres via adapter Prisma). É a recomendação dominante em
  2026 para auth self-hosted em Next.js — o próprio time do Auth.js/NextAuth se juntou ao
  projeto em set/2025 e o Auth.js está em modo manutenção. Traz email+senha, sessões em
  banco (revogação imediata), e os plugins `organization` (orgs/membros/convites/roles — que
  casa 1:1 com o `organizationId` que já existe em TODAS as tabelas) e `admin`
  (roles/impersonation) prontos.
- Integração NestJS: montar o handler do better-auth como rota no Nest (há o pacote
  `@thallesp/nestjs-better-auth` como referência de integração; avaliar usá-lo vs montar o
  handler manualmente — decidir pelo mais simples e anotar). Frontend: client React oficial
  (`better-auth/react`) com hooks de sessão.
- Alternativa descartada: NextAuth/Auth.js v5 (modo manutenção; multi-tenancy exige código
  custom que o plugin organization do better-auth já entrega).

**Escopo da tarefa:**
1. Tabelas do better-auth geradas pelo CLI dele no NOSSO schema.prisma (são aditivas —
   `user`, `session`, `account`, `organization`, `member`…). Revisar o SQL antes do
   `db:push` (E13).
2. Email+senha apenas (OAuth social de LOGIN fica fora do escopo — não confundir com as
   contas sociais de PUBLICAÇÃO da FASE G).
3. Página `/login` (design: card glass centrado, logo Acto, campos email/senha, erro inline).
4. Middleware do Next protegendo `/studio/*` → redirect para `/login` sem sessão.
5. Guard no NestJS validando a sessão nas rotas do studio (`/sources`, `/clips`… — a surface
   `/api/v1/*` continua com ApiKeyGuard do ESS-4).
6. **Troca do `ORG_ID='default'`:** `lib/api.ts:5` passa a resolver a organização da sessão
   ativa. Migração de dados: a org `'default'` é adotada como a org do primeiro usuário
   criado (o do Nicolas) — script idempotente que cria a organization better-auth com id
   `'default'` (mantendo TODOS os dados existentes ligados; zero UPDATE em massa).
7. O seletor de perfil cosmético do header (`StudioHeader.tsx:9-13`) vira o menu de usuário
   real (nome/avatar da sessão, "Configurações", "Sair").

**Pronto quando:** sem sessão → /studio redireciona; login → studio funciona com os dados
existentes da org default (projetos antigos visíveis); logout mata a sessão no banco
(revogação imediata provada); `curl` sem cookie nas rotas guardadas → 401 amigável;
`/prova-real` de um job completo logado.

### F2 — Visão de ADM
**Modelo:** Sonnet · **Esforço:** médio

1. Campo `role` do plugin admin do better-auth (`admin` | `user`). O usuário do Nicolas
   é seedado `admin`.
2. **Aviso no header:** sessão admin → chip fixo "Visão de ADM" no `StudioHeader` (âmbar
   discreto, técnico — sem decoração), sempre visível.
3. **Mecanismo de features gated:** helper `isAdminView()` no frontend + arquivo único
   `featureFlags.ts` com o mapa `{ flag: 'admin' | 'all' }`. Features novas nascem `admin`,
   viram `all` quando o Nicolas liberar (1 linha de diff por promoção — auditável no git
   futuro). Aplicar já na FASE G: publicação nasce atrás de `publishing: 'admin'`.
4. Admin vê TODAS as organizações? **Não nesta fase** — admin vê a própria org + o chip;
   cross-org fica para quando houver cliente real (anotar como pendência).

**Pronto quando:** login admin mostra o chip e as features flagged; login user comum não vê
nem consegue chamar (guard server-side também — flag no frontend NUNCA é a única barreira,
o endpoint checa role).

---

## 9. FASE G — Publicação e agendamento (YouTube · Instagram · TikTok)

### Como isso funciona (arquitetura decidida — ler antes das tarefas)

**Realidade das 3 plataformas (verificada em 2026-07):**

| Plataforma | Via | Gates | Limitações que moldam o produto |
|---|---|---|---|
| **YouTube** | YouTube Data API v3 `videos.insert` (lib oficial `googleapis`, Apache-2.0) | Projeto no Google Cloud + OAuth consent; app não verificado = warning na tela de consent | Quota diária (10k unidades; ~100 uploads/dia pós-corte de dez/2025) — irrelevante pro nosso volume. Upload resumable direto do nosso backend. **Shorts:** vídeo ≤3min + 9:16 vira Short automaticamente |
| **Instagram** | Graph API (content publishing) — `fetch` puro, sem SDK | Conta IG Business/Creator vinculada a Página FB + App Review (`instagram_content_publish`) | **A API NÃO aceita upload de arquivo: exige `video_url` público** que a Meta baixa. Depende de storage acessível externamente (ESS-3/túnel) — ver G1. Reels via API: 3s–15min; janela de melhor distribuição ~90s. Máx 25 posts/24h por conta |
| **TikTok** | Content Posting API (Direct Post ou Upload-as-draft) | Cadastro developer + **auditoria específica do Content Posting**; ANTES da auditoria todo post é forçado `SELF_ONLY` (só o dono vê) | Suporta `FILE_UPLOAD` chunked direto do backend (não precisa URL pública). Sem agendamento nativo — o NOSSO scheduler resolve |

**Decisões de arquitetura:**
1. **Sem serviço intermediário pago** (Ayrshare/Blotato etc.) — integração direta nas 3 APIs,
   cada uma atrás de env (`YOUTUBE_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`,
   `TIKTOK_CLIENT_KEY/SECRET`) com `*NotConfiguredError` claro quando ausente (E14).
   As credenciais/apps são criadas pelo Nicolas (gate N2).
2. **Referência de arquitetura (LEITURA, não código):**
   [Postiz](https://github.com/gitroomhq/postiz-app) — **AGPL-3.0, PROIBIDO copiar código**
   (regra 0.5 do roadmap) — vale ler o desenho `providers/<rede>.provider.ts` com interface
   comum (auth URL, refresh, post, erros tipados). Reproduzir o PADRÃO com implementação
   própria em `libraries/nestjs-libraries/src/social/` seguindo a arquitetura de providers
   que o Acto JÁ tem no LLM (`provider-chain.ts` é o precedente da casa).
3. **Scheduler sem dependência nova:** NADA de Redis/BullMQ. Tabela `ScheduledPost` + loop de
   tick no backend (`setInterval` 60s dentro do job-runner inline — mesmo padrão do runner
   existente), com claim atômico (`UPDATE ... WHERE status='SCHEDULED' AND publishAt <= now()
   RETURNING`) para não publicar 2×. Caminho Temporal (produção) ganha um workflow depois —
   mesma activity.
4. **Publicar exige mídia final:** só clipes `READY` com `-captioned.mp4` (E3) entram na fila.

### G1 — Schema + módulo social + provider YouTube
**Modelo:** Sonnet alto · **Esforço:** alto · **Gate:** N2 · **Skill:** `/campo-rico`

1. **Schema (aditivo):**
   - `SocialAccount { id, organizationId, platform ('youtube'|'instagram'|'tiktok'),
     externalId, displayName, avatarUrl?, accessToken (criptografado at-rest — AES com chave
     em env, precedente: hash de ApiKey), refreshToken?, expiresAt?, status, createdAt }`
   - `ScheduledPost { id, organizationId, clipId, socialAccountId, caption, publishAt?,
     status ('DRAFT'|'SCHEDULED'|'PUBLISHING'|'PUBLISHED'|'FAILED'), externalPostId?,
     errorMessage?, attempts Int @default(0), createdAt, updatedAt }`
   - Índices por org + `@@index([status, publishAt])` para o tick.
2. **Módulo NestJS `social/`:** controller (connect/callback OAuth, listar contas,
   desconectar, criar/cancelar post) → service → providers. Interface
   `SocialProvider { authUrl(), exchangeCode(), refresh(), publish(clip, caption): externalId,
   validate(clip): erros de pré-checagem }`.
3. **Provider YouTube completo** (o primeiro porque não tem gate de review pesado): OAuth2
   com refresh token persistido; upload resumable do MP4 direto do storage; título/descrição
   da `caption`; categoria/visibilidade default (unlisted em modo teste — flag env).
4. **Tick de publicação** no runner inline (arquitetura acima) com retry: FAILED após 3
   tentativas com backoff (1min/5min/15min), `errorMessage` legível.
5. **Teste sem chave (E14):** provider stub `fake` habilitado por env
   (`SOCIAL_FAKE_PROVIDER=1`) que "publica" gravando arquivo em storage local — permite
   testar schema/fila/UI de ponta a ponta sem conta externa. O caminho YouTube real só é
   exercitado quando o Nicolas plugar as chaves (documentar EXATAMENTE o que ele precisa
   criar no console: projeto GCP → OAuth consent → client web → redirect URI).

**Pronto quando:** com o provider fake: agendar → tick publica → status PUBLISHED com
externalId; falha simulada → retries com backoff → FAILED com mensagem; claim atômico provado
(2 ticks concorrentes não duplicam); `/prova-real` adaptada (org de teste descartável, E17).

### G2 — Providers Instagram e TikTok
**Modelo:** Sonnet alto · **Esforço:** alto · **Gate:** N2 (app review de cada plataforma)

- **Instagram:** container flow (`POST /{ig-user-id}/media` com `video_url` +
  `media_type=REELS` → poll status → `media_publish`). **Pré-requisito técnico:** URL pública
  do MP4 — implementar rota de mídia assinada (`/public-media/:token` com token de uso único
  e expiração) que serve o clipe; em dev sem exposição pública, o provider retorna
  `InstagramNotReachableError` explicando (desvio documentado; produção usa o storage
  externo do ESS-3). Pré-checagens no `validate()`: duração 3s–15min, 9:16, conta business.
- **TikTok:** Direct Post com `FILE_UPLOAD` chunked (init → upload chunks → publish). Expor
  na UI o estado de auditoria: sem auditoria aprovada, aviso fixo no modal "TikTok em modo
  sandbox: o post fica visível só para você até a aprovação do app" (honestidade > surpresa).
- Ambos entram no mesmo tick/retry do G1.

**Pronto quando:** pré-checagens com clipe inválido retornam erros amigáveis; fluxo completo
com provider fake por plataforma; documentação exata dos gates de review para o Nicolas
executar (Meta App Review com screencast; TikTok audit) em `docs/social-setup.md`.

### G3 — Calendário no /studio
**Modelo:** Sonnet · **Esforço:** médio

1. **Ícone de calendário no header**, à DIREITA do perfil (simétrico ao Home à esquerda —
   anotação do Nicolas), mesmo `.st-iconbtn`. Abre `/studio/calendar`.
2. **Vista mensal custom** (grid CSS 7 colunas — SEM lib): células com os posts do dia como
   pílulas (thumb minúsculo + hora + ícone da plataforma), cor por status: agendado
   (neutro), publicado (verde técnico), erro (rose). Navegação ‹ mês ›, "Hoje".
3. Clique na pílula → painel lateral (drawer) com detalhes: clipe, conta, caption, status,
   erro se houver, ações (cancelar agendamento, tentar de novo, abrir no site da plataforma
   via externalId).
4. Endpoint: `GET /social/posts?from&to` (por org).

**Pronto quando:** calendário com os 3 estados visíveis (semear com o provider fake),
navegação de mês, drawer funcional; screenshot.

### G4 — Publicar/agendar a partir do clipe (modal)
**Modelo:** Sonnet · **Esforço:** médio-alto

1. **Ícone de calendário no card do clipe** entre Editar e Baixar (grid e lista — B2/B3).
2. **Modal de publicação** (REF-IMG-4 adaptado): coluna esquerda com as contas conectadas da
   org (check multi-seleção; link "Conectar conta" → config); direita: caption por
   plataforma (textarea com contador de caracteres e hashtags destacadas), thumbnail do
   clipe, e o bloco **"Regenerar descrição"** — IA gera caption/hashtags por plataforma a
   partir de título+hook+transcrição do clipe, via cadeia LLM existente
   (`provider-chain.ts`) com **schema zod** da resposta (E15) e registro em `usage-log.ts`.
   Botões: "Selecionar horário" (datetime picker nativo `<input type="datetime-local">` —
   zero lib) e primário "Publicar agora".
3. Validações pré-envio por plataforma (o `validate()` do provider) mostradas inline.
4. Tudo atrás da flag `publishing` (F2) até os gates N2 fecharem.

**Pronto quando:** agendar e publicar-agora com provider fake de ponta a ponta a partir do
card; caption por IA validada por zod (mismatch → erro tratado, não crash); estado do clipe
"Publicado" alimenta o filtro da B2.

---

## 10. ANÁLISE — dinâmica de salvar e exportar (pedida pelo Nicolas)

**Como funciona hoje** (`editor/page.tsx:1038-1162`):
1. "Salvar" → `persist()` → `PATCH /clips/:id` → backend marca `PROCESSING` e dispara
   re-render em child process (fire-and-forget, ESS-9) → UI faz polling até `READY`.
2. "Exportar" → salva se dirty → `waitForReady()` (poll 1.5s, timeout 3min) → download.
3. Sair do editor com dirty → autosave silencioso no unmount (fire-and-forget).
4. Fechar aba com dirty → `beforeunload` avisa.

**Problemas reais, do mais grave ao menor:**
- **P1 — Todo save re-renderiza TUDO.** Mudar 1 cor de legenda re-corta e re-legenda o clipe
  inteiro (5–25min de máquina, E10). O corte (ffmpeg) só precisa rodar quando
  segments/framing/aspect mudam; legenda (Remotion) quando caption muda. É o maior ganho de
  UX/custo disponível no editor.
- **P2 — Timeout de export fixo em 180s** (`waitForReady`, linha 1088) vs render real de
  5-25min (E10): export de clipe longo estoura timeout e mostra erro com o render VIVO —
  o usuário re-dispara e cria renders concorrentes (exatamente o cenário E10).
- **P3 — E3 institucionalizado:** polling por `READY` pega o estado intermediário sem legenda
  (race conhecida do `cut.activity`). O `waitForReady` do export já é vítima em potencial.
- **P4 — Autosave no unmount é fire-and-forget sem feedback:** se o PATCH falhar (rede,
  validação), a edição SOME silenciosamente — o usuário volta e o clipe está como antes.
- **P5 — Sem visibilidade de render:** "Renderizando…" sem progresso/fila; com 2+ clipes
  renderizando não há visão de conjunto (o G3/calendário não cobre renders).

**Correções propostas (vira fila só com aprovação do Nicolas — gate N5):**
- **X1 (ataca P1+P3):** separar estado de render em coluna aditiva
  `Clip.renderState ('IDLE'|'CUTTING'|'CAPTIONING'|'DONE'|'FAILED')` + o backend só re-cortar
  quando o diff do PATCH toca segments/framing/aspect (comparação server-side; caption-only →
  só re-caption). `READY` + `renderState='DONE'` mata a ambiguidade do E3 na raiz (a race
  atual é "não conserte de passagem" — ISSO é o conserto com escopo). `/campo-rico`.
- **X2 (ataca P2+P5):** `waitForReady` com timeout dinâmico (duração do clipe × fator) +
  toast persistente de render com etapa atual (lida de `ProcessingEvent`, que já registra
  estágios) em vez de banner estático.
- **X3 (ataca P4):** autosave com confirmação — no unmount, gravar também em
  `localStorage` (`acto:pendingEdit:<clipId>`); ao reabrir o editor, se o PATCH falhou,
  oferecer "Recuperar edição não salva". Toast de erro global para o PATCH falho.

---

## 11. SUGESTÕES AVANÇADAS (minhas — além do pedido)

Ordenadas por retorno/custo. Nenhuma entra na fila sem o Nicolas escolher (gate N5):

1. **S1 — Toast system global** (studio+editor): componente único `Toast` (sucesso/erro/
   progresso persistente) — hoje cada erro é um `<div>` local diferente. Pré-requisito
   natural de X2/X3 e da publicação (G). Custo baixo, retorno alto.
2. **S2 — Command palette (⌘K):** navegar projetos/clipes/ações ("abrir projeto X",
   "exportar clipe", "novo projeto") — padrão Linear/Vercel, custo médio, diferencial de
   produto sênior. Sem lib (input + lista filtrada + score fuzzy simples).
3. **S3 — Guardrails de publicação:** contador visível de posts IG nas últimas 24h (limite
   25), aviso de quota YouTube, fila que respeita rate-limit por conta — evita o modo de
   falha mais comum de schedulers sociais. Encaixa no G1 (tick) com custo marginal.
4. **S4 — Prévia de post por plataforma** no modal G4: mock visual de como o Reel/Short
   aparece (moldura do feed com caption truncada em "mais") — reduz erro de caption. Custo
   médio.
5. **S5 — View Transitions** (API nativa do Chrome) studio → projeto → editor: thumb do card
   expande para o preview. Custo baixo (progressive enhancement), acabamento raro no nicho.
6. **S6 — Atalho "?"** overlay de atalhos do editor (existem vários hoje, nenhum
   descobrível). Custo baixo.

---

## 12. GATES DE DECISÃO DO NICOLAS (bloqueiam as tarefas indicadas)

| # | Decisão | Bloqueia |
|---|---|---|
| **N1** | Aprovar better-auth como stack de login (vs Nest/Passport custom) | F1, F2 |
| **N2** | Criar apps/credenciais: Google Cloud (YouTube), Meta developers (IG), TikTok developers — com os passos de `docs/social-setup.md` que a G1/G2 produz. **Você (executor) NUNCA cria contas — E14** | G1 (parte real), G2 |
| **N3** | Destino do BrandKit (logo/watermark): vira parte do Modelo de Marca v2, vira "Marca d'água" avulsa no editor, ou morre da UI | D1 (parcial), E1 (parcial) |
| **N4** | Conteúdo real de "Plano e Créditos" (depende do preço J3 do plano comercial) | E1 (aba fica estática até lá) |
| **N5** | Quais itens da seção 10 (X1-X3) e 11 (S1-S6) entram na fila e em que ordem | X*, S* |
| **N6** | Excluir de vez os dados de VideoTemplate/rotas quando o Modelo de Marca estabilizar (operação destrutiva — só com aprovação explícita) | nada por ora |
| **N7** | **Publicação mora no Acto ou no HUB/Postiz?** Conflito direto com a pendência #5 de `plano-funcionalidades-acto-2026-07-12.md` (decisão de 12/07: "não reconstruir no Acto"). Perguntado em 17/07, ainda não decidido com o Felipe. **Bloqueia a FASE G inteira** — mais restritivo que N2, que só bloqueia a parte de credenciais | G1, G2, G3, G4 |

---

## 13. RESUMO EXECUTIVO

| Fase | Tarefas | Tema | Modelo dominante | Dependências |
|---|---|---|---|---|
| A | A1-A7 | /studio: modal, upload bg, validações, favoritos, polish | Sonnet (A4/A6 Haiku) | — |
| B | B1-B4 | Tela do projeto: design, grid/lista, filtros, criar clipe | Sonnet | A5-A7 |
| C | C1-C7 | Editor v2: accent, toolbar, enquadrar Opus, legendas, timeline | Sonnet (C3 alto) | — |
| D | D1-D2 | Modelo de Marca | Sonnet | C4 |
| E | E1 | Configurações com sidebar | Sonnet | D1 |
| F | F1-F2 | Login (better-auth) + Visão ADM | Sonnet alto | N1 |
| G | G1-G4 | Publicação YT/IG/TikTok + calendário + modal | Sonnet alto | F1-F2, N2 |
| X/S | X1-X3, S1-S6 | Save/export + sugestões | Sonnet | N5 |

Contagem: **26 tarefas comprometidas** (A-G) + 9 opcionais (X/S). Estimativa honesta de
sessões: ~30 (tarefas altas podem quebrar em 2 sessões — quebre SEMPRE em fronteira
verificável, nunca no meio de um round-trip).

Toda tarefa fecha com `/checkpoint`; todo problema não-trivial resolvido fecha com
`/extract-approach` (Lei do aprendizado). Em caso de conflito plano × código real: o código
vence, anote a divergência.
