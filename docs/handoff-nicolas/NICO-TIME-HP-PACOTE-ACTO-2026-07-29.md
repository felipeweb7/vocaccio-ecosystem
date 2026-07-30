# Pacote portável do Time HP para o Acto — instalação recomendada desde o início

> Documento autocontido. Nenhum caminho de máquina de terceiro, nenhuma fila de coordenação
> entre ferramentas, nenhuma referência a projeto que não seja o seu. Copie o que fizer sentido
> pro Acto, ignore o resto. Não é um `.zip` de arquivos crus — é um guia pra você criar os
> arquivos certos, no lugar certo, com o conteúdo certo pro SEU projeto (não um clone do nosso).

## Por que este documento existe

Times de agentes de IA (Claude Code, ou equivalente) tendem a divergir com o tempo: você cria um
agente "Sirius" pra back-end, edita ele um dia direto na cópia que vive dentro do repo do
projeto, outro dia edita a cópia global que fica na pasta de configuração da ferramenta — e as
duas começam a dizer coisas diferentes sem ninguém perceber. A gente cometeu esse erro e corrigiu
recentemente. Este pacote já nasce com a correção embutida, pra você não repetir o mesmo caminho.

---

## 1. Arquitetura recomendada — fonte única + "Caderno da Casa"

**Regra de ouro: cada agente tem UMA cópia editável — a global da ferramenta (ex.
`~/.claude/agents/nome-do-agente.md`, na pasta de configuração pessoal, não dentro do repo do
projeto).** Se o seu editor de IA suportar agentes/skills escopados por projeto E globais ao
mesmo tempo, **não edite as duas** — isso é a origem do drift.

- **Cópia dentro do repo do projeto** (se você quiser rastreabilidade versionada, ex.
  `.claude/agents/nome-do-agente.md`): vira só um **ponteiro** de poucas linhas, tipo:
  > Fonte canônica: cópia global. Especificidade deste projeto: `.claude/CADERNO-DA-CASA.md`.
  > Não edite este arquivo — edite o global (comportamento) ou o Caderno (fatos deste projeto).
- **Especificidade do projeto** (stack real, convenções, onde fica o quê, o que É diferente
  do genérico do agente) vai para um arquivo próprio: `.claude/CADERNO-DA-CASA.md`. Pense nele
  como a ficha de fatos do Acto — não é comportamento de agente, é contexto.
- **Regra de mão única**: o agente global **lê** o Caderno da Casa e o Caderno tem precedência
  sobre exemplo genérico do `.md` do agente quando os dois tratarem do mesmo assunto. O caminho
  inverso é proibido — nada específico do Acto deve "vazar" pra dentro do comportamento-base do
  agente, porque aí ele deixa de ser genérico e você perde a possibilidade de reusar o mesmo
  agente num projeto futuro seu sem carregar bagagem do Acto.

**Por que nascer assim já é mais barato que corrigir depois**: a correção que fizemos exigiu
comparar 8 arquivos divergentes um a um, decidir o que cada lado tinha de único, e fundir sem
perder nada. Nascendo com fonte única, esse trabalho nunca precisa existir.

---

## 2. O elenco — o que porta, o que não porta

### Portam quase sem adaptação (são genéricos por design, não amarrados à nossa stack)

| Agente | Papel | Quando chamar |
|---|---|---|
| **McGonagall** (planner) | Decompõe tarefa grande, decide arquitetura, escreve o plano | Antes de qualquer módulo novo ou mudança estrutural |
| **Moody** (revisor de diff, read-only) | Caça quebra de convenção/regressão antes de commit | Toda vez, antes de qualquer commit não-trivial |
| **Griphook** (economia, read-only) | Recomenda o modelo mais barato que resolve, evita gambiarra/dependência pesada | Toda tarefa termina com a recomendação dele |
| **Filch** (zelador/auditor/treinador, read-only + edição escopada a `.md` de agente) | Trabalho duplicado, erro recorrente de outro agente, handoff incompleto, commit pendente, busca de skill nova | Fim de fase/missão, sempre que perceber os sinais acima |
| **Severus** (segurança + performance + clean code, read-only) | Revisão de superfície sensível (auth, dado de terceiro, input não validado, dependência nova) | Toda vez que a tarefa tocar rota nova, autenticação, dado de cliente, ou fim de feature antes do commit |
| **Draco** (benchmark de dependência/lib/skill externa, read-only) | Veredito Adotar/Adaptar/Evitar antes de instalar qualquer coisa de terceiro, checagem de licença | Antes de adicionar qualquer dependência nova ao projeto |
| **Hagrid** (guardião de marca/negócio, read-only) | Garante que copy/UI/proposta comercial não distorce o tom e o posicionamento do SEU produto | Sempre que growth/copy/UI tocar mote, tom de voz ou identidade visual |
| **Hermione** (copywriter + SEO/AEO/GEO + anti-escrita-de-IA) | Escreve/reescreve a peça final: hero, LP, e-mail, anúncio, artigo, microcopy — e otimiza pra ser encontrada por busca tradicional E citada por IA generativa | Qualquer copy que o cliente final vai ler |

**Hagrid precisa trocar a fonte de verdade.** No nosso lado ele lê o plano de marca/negócio do
NOSSO produto — isso não pode vir junto. Ao instalar, aponte-o pro SEU documento de marca (tom,
posicionamento, arquétipo do Acto), não herde o nosso texto.

**Luna** (game design/game feel, LPs cinematográficas com scroll motion) — **condicional**: só
instale se o Acto tiver landing page com hero em vídeo/scroll-driven ou algum elemento de
gamificação real. Senão é peso sem uso.

### NÃO portam como estão

**Sirius** (back-end) e **Flitwick** (front-end) são os dois agentes mais amarrados à NOSSA
stack específica — não porte o `.md` deles cru. O que precisa sair antes de adaptar:

- **Sirius**: hoje ele cita nosso ORM, nosso layout de camadas exato, nossos nomes de tabela e
  convenção de campo (ex. filtro obrigatório por organização multi-tenant do NOSSO schema).
  Se o Acto usa outro back-end/ORM/banco — o que é esperado, já que a regra de licença do
  ecossistema exige que o Acto tenha **stack e banco próprios, sem importar nada do nosso
  código-fonte** — o conteúdo dele precisa ser reescrito genérico: "Controller → Service →
  Repository" como padrão de camada, sem nome de tabela ou ORM específico nosso.
- **Flitwick**: hoje ele cita nossos tokens de cor/tema específicos e uma regra de "não usar tal
  cor legada" que é história interna do NOSSO sistema visual. Ele precisa da identidade visual
  do PRÓPRIO Acto, não da nossa — reescreva com os tokens/tipografia/sistema de design que vocês
  definirem para o Acto.

Em ambos os casos, o que vale a pena reaproveitar é a **estrutura do papel** (camadas, disciplina
de revisão, régua de qualidade por entregável) — não o conteúdo literal.

**Um agente próprio nosso, de coordenação entre duas ferramentas de IA que trabalham no mesmo
código em paralelo, não se aplica aqui** — a menos que vocês também rodem duas ferramentas de IA
diferentes no mesmo repo do Acto ao mesmo tempo. Se isso acontecer no futuro, o princípio (não
duplicar fonte de verdade entre ferramentas, decisão de conflito vira documento formal, nunca
duas IDEs decidem sozinhas um conflito de schema/dado) é reaproveitável mesmo sem o agente em si.

### Pipeline de conteúdo recomendado
`Growth/estratégia (ângulo + dado) → Hermione (peça escrita + SEO/AEO + tira "cheiro de IA") →
Hagrid (valida marca) → Flitwick (implementa na UI)`. Se o Acto não tiver um agente de
growth/estratégia dedicado ainda, a Hermione pode escrever a partir de um brief direto seu — só
não deixe ela também *inventar* o ângulo/dado sem fonte, isso é outro papel.

---

## 3. Convenções de resposta (baratas, portam 1:1 — são só formato de texto)

**Cabeçalho de time**: toda resposta de tarefa não-trivial abre com uma linha mostrando quem foi
acionado, ex. `Time atual: Planner | Segurança | Economia`. Pule em resposta trivial
(confirmação de uma palavra).

**Notação de feitiço/skill**: quando uma skill/automação relevante é usada e muda o resultado,
anuncie numa linha: `🪄 {nome da skill}: {o que foi feito ou a recomendação}`. Omita quando for
puramente interno ou irrelevante pra conversa — não empilhe vários anúncios num bloco só.

**Rodapé de fechamento, assertivo**: toda resposta que fecha uma tarefa termina com — modelo e
esforço recomendados pro próximo passo (uma linha, sem tabela) + pendências reais agrupadas por
dono, no máximo 3 itens, formato `o que ficou → onde`. Se não sobrou nada: "sem pendências" —
nunca termine em silêncio sobre isso.

**"Cole, não afirme"**: toda alegação de "testei/verifiquei/funciona" cita a evidência real
(código de saída, linha de log, resultado de comando) — sem evidência citável, reporte como
NÃO verificado. Isso nunca é cortável em nome de resposta curta.

---

## 4. Skill de resgate de pendência esquecida (adapte o conceito, não precisa ser idêntica)

Toda ferramenta de IA com múltiplas sessões tem o mesmo problema: alguém termina algo tarde,
não commita, a sessão fecha, e dias depois outra sessão reimplementa do zero — ou um item marcado
"pendente" envelhece porque ninguém cobra. Vale ter um mecanismo (skill/agente/checklist) que
varre nesta ordem, do mais barato pro mais caro, e **para assim que não achar nada** nas camadas
iniciais:
1. `git status`/`stash list`/branch não mergeada — trabalho não commitado, aqui e agora.
2. Pasta de worktree física sem registro no git — sinal clássico de "sobrou algo".
3. PR aberto e parado, branch remota que devia ter morrido.
4. Documentos do projeto com item "pendente" envelhecido.
5. (a mais cara, use com motivo) — se sua ferramenta tiver busca em histórico de sessões
   anteriores, procure por termos como "fica pendente"/"na próxima sessão"/"depois eu"/"TODO" e
   confirme no disco se o que foi prometido realmente existe — o que foi *dito* numa sessão
   antiga não é prova do que foi *feito*.

Regra dura, sempre: é varredura **read-only** — encontra e cobra, nunca executa ação destrutiva
(commit, merge, push, delete) sozinha.

---

## 5. Permissões — allowlist recomendada pra recriar na sua máquina

Configuração de permissão de ferramenta costuma ser local (não versionada no git, cada máquina
tem a sua). Recrie algo equivalente com este espírito:

**Libere sem pedir confirmação** (comandos de leitura/diagnóstico, sem risco de perda de dado):
`status`/`diff`/`log`/`show` de git, `add`/`commit`/`branch`/`fetch`/`stash` locais,
lint/typecheck/testes (read-only, não alteram nada fora do processo), leitura de arquivo/grep/
find, requisições HTTP só pra `localhost`/`127.0.0.1` (seu próprio servidor de dev).

**Sempre peça confirmação explícita** pra qualquer comando git **destrutivo ou que afeta o
remoto**: `push`, `reset`, `clean`, remover/podar worktree, deletar branch (mesmo com flag
"segura" tipo `-d`). Esses saem do "libera sozinho" mesmo que pareçam rotina — a régua não é
"quão comum é o comando", é "dá pra desfazer sozinho depois". Mesma lógica vale pra hooks
automáticos de lint/build: se existir **uma única correção certa e conhecida** pro erro mais
comum, prefira aplicar automaticamente (ou recusar com o comando certo já pronto) em vez de
devolver a decisão pro usuário toda vez — isso só vale quando a correção é mesmo inequívoca.

---

## 6. O que NÃO vai neste pacote (e por quê)

- Nenhuma credencial, chave de API, senha ou token — nem exemplo com valor real.
- Nenhum documento de estratégia de marca, plano de negócio, achado de auditoria de segurança
  ou system prompt de motor de IA do NOSSO produto — isso é propriedade nossa, não do Acto.
- Nenhuma linha de código do NOSSO monorepo. Se o Acto puxar qualquer biblioteca ou pacote
  interno nosso, para — isso quebra a separação de licença que permite o Acto ser vendido como
  produto independente. Acto tem `package.json` próprio, build próprio, deploy próprio, banco
  próprio; qualquer comunicação com o nosso ecossistema é por API HTTP, nunca por import direto
  de código-fonte.
- Nenhum caminho de máquina/pasta interna nossa — o que você lê aqui deve fazer sentido sozinho,
  na sua máquina, no seu projeto.

---

## 7. Como usar isto

1. Decida a arquitetura de fonte única antes de criar o primeiro agente (seção 1) — é mais barato
   nascer certo que corrigir depois.
2. Crie os agentes da seção 2 que fizerem sentido pro Acto agora; adie os que não tiverem uso
   ainda (ex. Luna, se não houver LP cinematográfica no roadmap próximo).
3. Adapte Sirius/Flitwick com a estrutura de papel, não o conteúdo — reescreva com a stack e o
   sistema visual reais do Acto.
4. Adote as convenções de resposta (seção 3) — são as mais baratas de todas, zero dependência.
5. Configure a allowlist de permissão (seção 5) na sua máquina.
6. Releia este documento a cada expansão relevante do time — se algo aqui ficar defasado em
   relação ao que você mesmo evoluiu, ajuste seu lado; isto é ponto de partida, não contrato.
