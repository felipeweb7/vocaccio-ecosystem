# ADRs — Back-office agêntico da Vocaccio

> Formato compacto: Contexto → Decisão → Alternativas → Consequências (+/−) → Gatilho de revisão.
> Status de todos: **Aceito em P0 (2026-07-11, Fable 5)**. Executores não reabrem sem o gatilho.

## ADR-01 — Claude Code nativo como substrato de orquestração
**Contexto:** o time de dev já opera em `.claude/agents/`+skills; candidatos externos avaliados.
**Decisão:** agents .md (`model`, `tools`, `disallowedTools`), skills, hooks, MCP stdio e subagentes
nativos são o único substrato. **Alternativas:** OpenSquad (sem licença, autor único, redundante),
claude-mpm (rejeitado: Python, peso, lock-in), Ruflo (ADR-02). **+:** zero dependência nova, zero
daemon, um só modelo mental para os dois times. **−:** sem UI de pipeline pronta; checkpoints são
disciplina (hooks/permissionMode), não produto. **Gatilho:** mudança estrutural no modelo de agentes
do Claude Code, ou necessidade comprovada de >3 fluxos paralelos coordenados.

## ADR-02 — Ruflo dormente e removível
**Contexto:** instalado (v3.10.37; upstream em v3.25.6), adiado até fim da Fase 4 por decisão prévia.
**Decisão:** permanece dormente; não roteia, não guarda memória, não define agentes. Promoção exige:
um workflow paralelo concreto que o nativo não atenda + upgrade controlado + ADR novo.
**Alternativas:** remover já (perde opção barata); adotar como padrão (disputaria roteamento/memória
com o nativo — vetado pela regra de não-conflito). **+:** opção preservada sem custo. **−:** gap de
versão cresce. **Gatilho:** fim da Fase 4 ou demanda real de swarm.

## ADR-03 — OpenSquad apenas como referência conceitual
**Decisão:** não instalar (sem licença = uso legal ambíguo; 3 meses sem push; autor único). Copiar o
conceito: pipeline de entrega com checkpoints humanos nomeados, codificado em skills próprias.
**Gatilho:** licenciamento + manutenção sustentada por 6 meses.

## ADR-04 — Time operacional mínimo (2 agentes) com Hagrid compartilhado
**Contexto:** hipótese inicial de 9 papéis; risco de "organograma de brinquedo".
**Decisão:** Conductor + Analista; Hagrid e Fred & Jorge reusados; resto = skill/serviço/hook/humano
(mapa na seção 6 do plano). Hagrid é deliberadamente compartilhado entre os times: o critério de
marca é um só. **Alternativas:** 9 agentes (contexto caro, deriva, manutenção); 0 agentes/só skills
(perde acompanhamento contínuo de carteira). **+:** custo de tokens e manutenção mínimos. **−:**
Conductor acumula funções; dividir quando doer. **Gatilho:** >10 clientes ativos ou pipeline
comercial real (separar Commercial do Analista).

## ADR-05 — WhatsApp: sem conector não-oficial, nem em laboratório com dados reais
**Contexto:** pesquisa 2026-07-11 reprovou todos os conectores Baileys/whatsmeow (licença, sessão em
texto plano, abandono, skip-permissions, peso). **Decisão:** laboratório usa **Meta Cloud API
sandbox** (número de teste, grátis, mesmo código da produção). Rota não-oficial = plano C documentado,
só com dados fictícios e nunca para clientes. **Consequência-chave:** grupos reais só no piloto
(limitação de grupos da Cloud API é a maior incógnita — pergunta ao Felipe sobre grupo vs. 1:1).
**Gatilho:** Meta ampliar suporte a grupos, ou surgimento de conector auditável e licenciado.

## ADR-06 — Meta Cloud API oficial em produção
**Decisão:** (reafirma PLANO-MESTRE) produção = Cloud API com verificação de negócio, número
empresarial, webhooks gerenciados, templates aprovados. Custos BR: service window grátis, utility
~R$0,08, marketing ~R$0,39/msg. **Alternativas:** Wassenger/Twilio (custo recorrente sem ganho
estrutural); Evolution modo oficial (servidor próprio — só se multi-instância exigir, P3+).
**Gatilho:** volume que justifique BSP gerenciado.

## ADR-07 — Vocaccio como fonte de verdade operacional
**Decisão:** clientes, projetos, tarefas, status, aprovações, comentários, entregáveis, memória de
marca, histórico, auditoria, canais, publicações e métricas vivem na Vocaccio; WhatsApp/e-mail/Drive
são interfaces. Toda interação externa relevante vira registro interno com evidência.
**Alternativas:** estado no canal (irrecuperável, sem auditoria); ferramenta externa de PM (duplicação
vetada). **Gatilho:** nenhum previsto — princípio permanente.

## ADR-08 — MCP próprio `vocaccio-ops`, fino, sem reativar Mastra
**Contexto:** API pública não expõe CRM/Kanban/Ateliê; Mastra (MCP herdado) está adormecida e é pesada.
**Decisão:** MCP stdio novo e mínimo, chamando os application services `/hub/*` existentes (ou rotas
`/ops` novas finas). Toolset **leitura** (P1) e **escrita** (P2, só comandos tipados) em superfícies
separadas. **Alternativas:** reativar Mastra (peso, acoplamento LangChain); expor Prisma direto
(viola ADR-09). **+:** RBAC e validações existentes reusados. **−:** rotas `/ops` novas a manter.
**Gatilho:** upstream Postiz entregar MCP nativo leve equivalente.

## ADR-09 — LLM propõe comandos tipados; nunca escreve no banco
**Decisão:** saída de LLM = comando do catálogo fechado (`ApproveContent`, `CreateProjectTask`, …)
com ator/escopo/evidência/confiança/idempotencyKey; policy engine determinística valida; application
service executa. SQL/Prisma direto por agente é proibido em qualquer autonomia. **Alternativas:**
tool de escrita genérica (indefensável em auditoria); SQL supervisionado (gargalo + risco).
**Gatilho:** nenhum — princípio permanente.

## ADR-10 — Human-in-the-loop por lista A5 explícita
**Decisão:** ações A5 (publicar, preço, desconto, prazo prometido, escopo, envio a cliente, jurídico,
apagar material, regras de marca…) sempre humanas nesta era. Fluxos nascem A1/A2; promoção a A3
exige métricas de erro + decisão registrada do Felipe; A4 exige ADR. **Gatilho:** 3 meses de operação
A3 com taxa de erro abaixo do limiar definido em PERGUNTAS-FELIPE.

## ADR-11 — Autenticidade como pipeline técnico
**Decisão:** todo fluxo criativo recebe Context Pack (projeto, marca, persona, CTAs, restrições,
exemplos aprovados, padrões de revisão, Religare, funil, canal, formato, critério de sucesso) e passa
por Hagrid + revisor + aprovação humana antes de publicar. Classificadores recebem contexto mínimo,
nunca o Pack. **Alternativas:** autenticidade só no prompt (degrada); revisão só humana (não escala).
**Gatilho:** nenhum — é o diferencial do produto.

## ADR-12 — Memória operacional em arquivos + banco, não em framework
**Decisão:** memória de longo prazo do time operacional = (a) dados estruturados na Vocaccio
(Context Pack, eventos, comandos), (b) memória nativa do Claude Code por projeto, (c) aprendizados
de revisão gravados como regras no Context Pack (Fase 4 do PLANO-MESTRE). Nenhum banco vetorial novo.
**Gatilho:** Fase 4 (memória por projeto) pode refinar o formato.

## ADR-13 — Reutilização do Postiz por superfície de API, sem merge do upstream
**Decisão:** publicação/agendamento/analytics/webhooks/media/drafts reusados como estão; upstream
não é mergeado (divergência de schema/menu/RBAC já é grande); fixes pontuais via cherry-pick com ADR.
Marketplace/repost automático permanecem mortos (repost fere autenticidade). **Gatilho:** bug herdado
crítico corrigido no upstream.

## ADR-14 — Estratégia planner × executor com pacotes de execução
**Decisão:** decisões estruturais ficam em ADRs+pacotes (Fable/Opus); execução por Sonnet/Haiku
seguindo os 20 campos do pacote; ambiguidade não prevista = parar e escalar, nunca improvisar.
**Gatilho:** revisão a cada fase concluída (retro do pacote).

## ADR-15 — Retenção e tratamento de mensagens
**Decisão:** evidências vinculadas a comandos = vida do contrato + prazo legal; mensagens não
acionáveis = descarte curto (proposta 30 dias — confirmar com Felipe/advogado); áudio original
descartado após transcrição; dados sensíveis não persistidos (escalonar). Rotina de exclusão sob
pedido (LGPD art. 18) obrigatória antes do piloto. **Gatilho:** parecer jurídico.

## ADR-16 — Separação entre leitura e escrita (toolsets e agentes)
**Decisão:** nenhum agente acumula (mensagens privadas + filesystem amplo + envio externo). MCP de
leitura e de escrita são superfícies distintas; o Intent Extractor não tem tools; quem propõe não
executa. **Gatilho:** nenhum — princípio permanente.

## ADR-17 — Observabilidade e audit log como pré-requisito de escrita
**Decisão:** nenhuma escrita automatizada (A3+) antes de `OperationalCommand`+audit log+idempotência
(PE-02) em produção. Métricas mínimas: comandos propostos/aprovados/rejeitados/errados por semana;
limiar de erro suspende a automação (valor definido pelo Felipe). **Gatilho:** PE-02 entregue.

## ADR-18 — Critérios para reescrever funções herdadas
**Decisão:** reescrever só quando (a) a função bloqueia um caso de uso do back-office E (b) adaptação
custa mais que reescrita E (c) há teste de regressão do comportamento atual. Hoje: **nada** do herdado
precisa de reescrita; criam-se camadas novas (rotas `/ops`, MCP, `OperationalCommand`, service do
`InternalTask` órfão). Bugs conhecidos (`addUserToOrg` sem `vocaccioRole`) são fixes, não reescritas.
**Gatilho:** caso concreto que satisfaça (a)-(c).
