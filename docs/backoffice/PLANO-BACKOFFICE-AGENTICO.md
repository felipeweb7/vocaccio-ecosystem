# Plano do Back-office Agêntico da Vocaccio (Ateliê Virtual)

> **Status:** planejamento congelado (Fase P0). Produzido em 2026-07-11 com Claude Fable 5 (planejador);
> execução futura por Sonnet/Haiku seguindo os pacotes em `pacotes/`.
> **Gate de destravamento:** 3 clientes pagantes (Fase M).
> Documentos-irmãos: [ADRS.md](./ADRS.md) · [whatsapp-bot.md](./whatsapp-bot.md) ·
> [pesquisa-repositorios.md](./pesquisa-repositorios.md) · [PERGUNTAS-FELIPE.md](./PERGUNTAS-FELIPE.md) · `pacotes/`

---

## 1. Resumo executivo

A Vocaccio já tem **80% da fundação** de um back-office agêntico construída — e quase nada disso precisa
ser reescrito. O que existe: fila operacional (`ServiceRequest` + cockpit `/atelie/fila`), portal de
aprovação com trilha de eventos, CRM com Context Pack e Religare, publicação real via Temporal + 36
providers, API pública com API key, RBAC próprio (`VocaccioRole`) e um ecossistema de agentes de
desenvolvimento maduro no Claude Code.

O que falta não é "mais agentes" — é **infraestrutura de confiança**: uma tabela de comandos operacionais
tipados com idempotência e auditoria, um MCP fino de leitura/escrita sobre os application services
existentes, e skills operacionais que codifiquem o método da agência. Com isso, o mesmo Claude Code que
hoje desenvolve o produto passa a **operar a agência**, com dois agentes novos (Conductor e Analista),
reuso de Hagrid e Fred & Jorge, e gates humanos em tudo que é irreversível.

**Decisões centrais** (detalhadas nos ADRs):
1. Substrato = **Claude Code nativo**. Nenhum framework de orquestração adicional. Ruflo fica dormente;
   OpenSquad é só referência conceitual; claude-mpm rejeitado.
2. **Vocaccio é a fonte de verdade**; WhatsApp/e-mail/Drive são interfaces. LLM propõe **comandos
   tipados**, nunca escreve no banco.
3. **2 agentes operacionais novos**, não 9. O resto é skill, serviço determinístico, hook ou humano.
4. WhatsApp: a pesquisa reprovou **todos** os conectores não-oficiais (licença, segurança, abandono)
   — laboratório passa a usar a própria **Meta Cloud API em sandbox** (número de teste gratuito,
   mesmo código da produção, zero risco de ban); produção segue **Meta Cloud API oficial** (decisão
   já travada no PLANO-MESTRE). Ver ADR-05.
5. Apelo comercial imediato sem violar o congelamento: fatia **P0.5 "alavanca interna"** — skills
   operacionais (arquivos .md, zero código de produto, zero daemon, zero IA paga) que reduzem o
   trabalho manual da agência real hoje e viram argumento de venda ("back-office assistido por IA").

---

## 2. Diagnóstico do estado real da Vocaccio

Confirmado no código (não no plano) em 2026-07-11:

| Área | Estado real | Evidência |
|---|---|---|
| Ateliê Virtual | AT-0/AT-1/AT-2 **implementados e validados**; AT-3 em espera | `ServiceOffering`/`ServiceRequest`/`ServiceRequestEvent` no schema; `apps/backend/src/api/routes/atelie.controller.ts`; `.claude/skills/atelie/` |
| Cockpit `/atelie/fila` | Kanban por status, gera prompt do operador **localmente, sem IA** | `apps/frontend/src/components/atelie/fila-client.component.tsx` |
| CRM | Client/Contact/Interaction/Expert/ReligareProfile completos, RBAC `VocaccioRole` | `libraries/nestjs-libraries/src/database/prisma/crm/` |
| Projetos | Context Pack (`contextPackCache`), persona, tom de voz, briefing | model `Project`; `ProjectRepository.getContextPackSnapshot()` |
| Kanban de conteúdo | `ContentItem` (status+position) + timeline `ContentItemEvent` (flag `byGuest`) | `crm/content.service.ts` |
| Portal de aprovação | Token HMAC-SHA256, `AccessLinkEvent` de auditoria, aprovar/ajustar/comentar validados | `portal.controller.ts`; rota `/aprovar/[token]` |
| Publicação | Temporal (não BullMQ), workflows versionados, 36 providers sociais | `apps/orchestrator/`; `posts.service.ts:708` |
| API pública | **Viva** (`/public/v1/*`, API key em `Organization.apiKey`) — mas só posts/integrações/analytics | `public-api/`; `public.auth.middleware.ts` |
| Webhooks | Existem, mas disparam **apenas em "post publicado"** | `post.activity.ts:385` |
| Analytics | Pull on-demand por provider (canal e post) | `analytics.controller.ts` |
| Audit log formal | **Não existe** — só event-tables por domínio | grep confirmado |
| Idempotência | **Não existe** chave formal (aprox. via Temporal `postingClaimedAt`) | grep confirmado |
| `InternalTask` | Model **órfão** no schema (sem service/controller) — candidato natural às tarefas do time operacional | `schema.prisma` l.954 |
| Mastra / MCP público | **Adormecida** (`MASTRA_ENABLED` default off) | `main.ts` |
| Agentes de dev | 10 agentes maduros (Sirius, Flitwick, McGonagall, Moody, Severus, Griphook, Fred & Jorge, Filch, Hagrid, Edwiges) | `.claude/agents/` |

**Lacunas reais** (o que o back-office agêntico precisa e não existe):
1. Comandos operacionais tipados + idempotência + audit log formal.
2. Superfície de API para operações de CRM/Kanban/Ateliê fora da sessão web (a API pública não as expõe).
3. Skills operacionais (o método da agência codificado — intake, produção, revisão, relatório).
4. Canal de entrada WhatsApp (hoje 100% manual).
5. Agente com responsabilidade contínua sobre carteira de clientes (hoje é o Felipe).

**Decisões já travadas que este plano NÃO reabre:** nome "Ateliê Virtual"; triagem
repetitivo→front-office / profundo→back-office; contrato AT-2; cockpit sem chamada a IA; Context Pack +
Religare + validação Hagrid obrigatórios antes de entregar; zero API de IA paga até monetizar; AT-3
gated pela Fase 3.5; Ruflo adiado até fim da Fase 4; WhatsApp produção = Meta Cloud API; motores
Religare = Codex; tenancy 3 níveis sem branding hard-coded; vídeo = Nicolas.

---

## 3. Capacidades reaproveitáveis do Postiz

Auditoria completa do fork (divergiu do upstream na base de ~jun/2026, commit `826d07d2`; histórico
completo preservado, 2.737 commits):

| Capacidade | Estado no fork | Decisão para o back-office |
|---|---|---|
| Publicação/agendamento (36 providers, Temporal) | Funcional | **Reaproveitar como está** — Publishing Operator = API pública + gate humano |
| Drafts nativos (`State.DRAFT`) | Funcional | Reaproveitar (rascunho → aprovação → fila) |
| Analytics por canal/post | Funcional (pull on-demand) | Reaproveitar — Analista consome via API pública `/analytics/*` |
| Webhooks (evento: post publicado) | Funcional | Reaproveitar; **estender eventos só quando houver consumidor** (P2+) |
| API pública `/public/v1/*` + API keys | Funcional | Reaproveitar como transporte do MCP para posts/analytics; **estender com rotas `/ops` para CRM/Ateliê** (P1/P2) |
| Media library + upload | Funcional | Reaproveitar |
| Autopost/repost + Plugs (backend) | Funcional; UI quarentenada | Deixar adormecido (repost automático fere autenticidade; reavaliar P3) |
| CopilotKit + AgentGraph (geração de post) | Funcional/core | Não usar no back-office (usa OpenAI pago; conflita com "zero IA paga"); manter para o front-office |
| Mastra / endpoint MCP `/mcp/:apiKey` | Adormecida (flag off) | **Não reativar** — pesada demais para camada fina; o MCP próprio será novo e mínimo (ADR-08) |
| Marketplace de criadores + chat interno | Desativado (models órfãos) | Deixar morto; **não** ressuscitar como inbox — Chatwoot/alternativa só em P3 |
| Approval de marketplace (`approvedSubmitForOrder`) | Órfão sem UI | Ignorar — o fluxo de aprovação da Vocaccio (`ContentItem` + portal) já é superior |
| Times/roles Postiz (`Role`) | Funcional | Manter; RBAC operacional usa `VocaccioRole` |
| Notificações | Funcional | Reaproveitar para avisos internos do time operacional |
| Upstream pós-fork | A verificar em `pesquisa-repositorios.md` | **Não fazer merge**; cherry-pick pontual só com ADR próprio. A Vocaccio já divergiu demais em schema/menu/RBAC para seguir o upstream em bloco |

---

## 4. Princípios arquiteturais

1. **Fonte de verdade única.** Clientes, projetos, tarefas, status, aprovações, comentários,
   entregáveis, memória de marca, histórico, auditoria, canais, publicações e métricas vivem na
   Vocaccio. Canais externos (WhatsApp, e-mail, Drive) são interfaces de entrada/saída.
2. **LLM propõe, serviço executa.** Nenhum modelo escreve SQL ou altera tabela. A saída de um LLM é
   um **comando tipado** validado por policy engine determinística e executado por application service
   existente, com idempotency key e evidência de origem.
3. **Mínimo contexto necessário.** Classificar uma mensagem exige a mensagem e o mapa grupo→projeto,
   não o Context Pack inteiro. O Context Pack completo só entra em fluxos criativos.
4. **Autenticidade como pipeline, não como prompt.** Context Pack → skill de produção → especialista →
   Hagrid (marca) → revisor → aprovação humana → publicação. Já é o desenho do Ateliê (AT-1);
   o back-office agêntico o automatiza por partes, nunca o encurta.
5. **Autonomia é conquistada por trilha de acertos, não concedida por padrão.** Todo fluxo nasce A1/A2
   e só sobe de nível com métricas de erro e decisão explícita do Felipe.
6. **Leveza é requisito, não preferência.** 8 GB de RAM, nenhum daemon permanente antes de monetizar,
   MCP stdio sob demanda, Markdown antes de código, código determinístico antes de LLM.
7. **Planner ≠ executor.** Decisões de arquitetura ficam em ADRs e pacotes de execução; modelos
   econômicos executam sem reabrir o que está fechado.
8. **Dois times, uma caixa de ferramentas.** Agentes de desenvolvimento (Sirius etc.) e agentes de
   operação (Conductor etc.) compartilham princípios e skills, nunca responsabilidades. Hagrid é a
   exceção deliberada: o critério de marca é um só (ADR-04).

---

## 5. Organograma mínimo recomendado

A hipótese inicial de 9 papéis foi **reduzida a 2 agentes novos + reuso de 2 existentes**. Teste
aplicado a cada papel: *"tem responsabilidade contínua, estado e coordenação multi-etapas?"* Se não,
vira skill, serviço ou hook.

### Agentes novos (time de operação)

| Agente | Modelo | Responsabilidade | Autonomia |
|---|---|---|---|
| **Conductor** (Account & Project Conductor) | Sonnet | Carteira de clientes: prazos, pendências, aprovações abertas, follow-ups; coordena especialistas via skills; propõe comandos (nunca executa escrita direta) | A2 (propõe e aguarda); leitura A0 livre |
| **Analista** (Insights, Reporting & Commercial Analyst) | Sonnet (Haiku para extração) | Métricas via analytics existente, relatórios mensais, leitura de oportunidades no CRM, rascunhos de proposta | A1 (rascunhos); leitura A0 |

### Reuso do time existente (sem misturar responsabilidades)

- **Hagrid** — guardião de marca: valida entregáveis do Ateliê (já previsto no AT-1).
- **Fred & Jorge** — produção de conteúdo/growth: já são o "departamento criativo" do back-office.
- **Griphook** — continua recomendando modelo/custo para cada fluxo operacional.
- **Filch** — continua zelando o ecossistema (agora incluindo as skills operacionais).

### O que a hipótese original tinha e virou outra coisa

| Papel da hipótese | Virou | Por quê |
|---|---|---|
| Intake & Briefing Analyst | **Skill** `ops-intake` + extração Haiku | Trabalho delimitado com entrada/saída claras; sem estado próprio |
| Production Router | **Serviço determinístico + skill** | Classificar demanda→offering é regra de negócio; a fila já existe (`ServiceRequest`) |
| Brand & Authenticity Guardian | **Hagrid (reuso)** | O critério de marca é um só; duplicar criaria deriva |
| Approval & Revision Coordinator | **Skill** `ops-aprovacao` + comandos tipados | O estado da aprovação vive em `ContentItem`/portal; o LLM só interpreta feedback e propõe |
| Publishing Operator | **Serviço determinístico** (API pública Postiz) + gate humano | Publicar conteúdo aprovado não exige interpretação |
| Compliance & Audit Gate | **Hooks + policy engine + audit log** | Já era a recomendação da hipótese; confirmada |
| Commercial Coordinator | Absorvido pelo **Analista** | Volume atual não justifica agente dedicado; separar quando houver pipeline comercial real |

---

## 6. Mapa completo de papéis

Classificação de todos os papéis do §14 do briefing. Legenda de implementação:
**A**=agente · **SK**=skill · **SD**=serviço determinístico · **H**=humano · **HK**=hook ·
**MCP**=ferramenta · **NC**=não construir agora · **FO**=já coberto pelo front-office.

### Atendimento e gestão
| Papel | Impl. | Notas |
|---|---|---|
| Account Director | **H** (Felipe) | Relacionamento e decisões sensíveis não se automatizam nesta fase |
| Account Manager / Customer Success | **A** Conductor | Mesma responsabilidade contínua; não separar |
| Project Manager | **A** Conductor + **SD** | Transições de status são código; o agente acompanha e cobra |
| Traffic Manager (fluxo de produção) | **SD** | A fila do Ateliê já é o traffic; skill de priorização se precisar |
| Meeting Notes | **SK** `ops-reuniao` (Haiku/Sonnet) | Transcrição→resumo→ações propostas (A1) |
| Briefing Analyst | **SK** `ops-intake` | Mensagens/áudios/formulários → briefing estruturado + lacunas |
| Approval Coordinator / Revision Coordinator | **SK** `ops-aprovacao` | Feedback → comando tipado (`RequestContentRevision` etc.) |
| Scope Controller | **SD** + **H** | Detecção de mudança de escopo é classificação (Haiku); aceite é A5 humano |

### Estratégia e conteúdo
| Papel | Impl. | Notas |
|---|---|---|
| Researcher / Competitive Intelligence | **SK** (offering "análise de concorrência" já existe no Ateliê) + Fred & Jorge | Subagente Sonnet com WebSearch sob demanda |
| Content / Social Media Strategist | **SK** + Fred & Jorge | Skills globais de marketing já instaladas |
| Copywriter / Editor | **SK** (`copywriting` global) + Fred & Jorge; revisão Sonnet | Sempre com Context Pack |
| Brand Voice | **Hagrid + Context Pack** | Já existe |
| SEO | **SK** (`seo-audit` global) | Sob demanda |
| Community / AEO-GEO / Lifecycle / Repurposing | **NC** | Sem cliente que justifique; reavaliar P3 |

### Criação
| Papel | Impl. | Notas |
|---|---|---|
| Art Director | **H** + Hagrid checklist | Direção de arte não se automatiza (autenticidade) |
| Graphic Designer / Carousel Producer | **FO** (Volatis/Konva + GPT Cedrico) | Não duplicar |
| Video Producer / Editor / Motion / Thumbnail | **H** (Nicolas, `deliveryMode: NICOLAS`) | Fora de escopo; skills `maestro`/`video-use` como apoio interno futuro |
| Landing Page Specialist | **SK** `atelie` (offering existente) + `impeccable` | Já é o AT-1 |
| Presentation & Report Designer | **SK** (`docx`/`pptx`/`pdf` globais) | Já instaladas |

### Growth e mídia
| Papel | Impl. | Notas |
|---|---|---|
| Growth Lead | Fred & Jorge (reuso) | |
| Data Analyst / Analytics / Reporting | **A** Analista | Sobre analytics Postiz existente |
| CRO | **SK** (`cro` global) | Sob demanda |
| Meta Ads / Google Ads / Attribution / Experimentation | **NC** (P3+) | Sem cliente de mídia paga; MCPs de Ads só depois de monetizar |

### Comercial
| Papel | Impl. | Notas |
|---|---|---|
| Lead Qualification | **SK** + Haiku sobre CRM existente | Classificação, não agente |
| Proposal Generator | **SK** `ops-proposta` (A1; envio = A5 humano) | Faixas de preço = pendência do Felipe (AT-0 §7.3) |
| Follow-up Coordinator | **SK** + `ClientInteraction` | A2 |
| CRM Lead | **SD** — é a própria Vocaccio | Não duplicar |
| Revenue Ops / Deal Desk / Pricing | **H** (Felipe) | |
| Contract Scope Analysis | **SK** (A1) + **H** | |

### Operações
| Papel | Impl. | Notas |
|---|---|---|
| Ops Lead | **H** + Filch (parcial) | |
| Knowledge Manager | Memória do Claude Code + graphify (existentes) | |
| Workflow Optimizer | Filch (reuso) | |
| Automation Governance / Compliance / Audit / Quality Gate | **HK + SD** (policy engine, audit log) + checklists Severus/Hagrid | Nunca personalidade conversacional |
| Capacity Planner / Finance Tracker | **NC** | Ferramenta externa/planilha até haver volume |

---

## 7. Matriz papel × ferramenta (papéis com responsabilidade distinta)

Colunas comprimidas; validação de repositórios em [pesquisa-repositorios.md](./pesquisa-repositorios.md).

| Papel | Problema | Agora? | Tipo | Aut. | Modelo mín. | Contexto | Ferramentas | Candidato | Peso | Risco seg./LGPD | Recomendação | Fase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Conductor | Carteira sob controle sem Felipe como gargalo | Pós-gate | Agente | A2 | Sonnet | Fila+Kanban+prazos (não o Context Pack) | MCP `vocaccio-ops` (leitura) | nativo | leve sob demanda | médio/médio | criar | P1 |
| Analista | Relatórios e leitura de métricas manuais | Pós-gate | Agente | A0–A1 | Sonnet | analytics+CRM leitura | API pública `/analytics` | nativo | leve sob demanda | baixo/baixo | criar | P1 |
| Intake/Briefing | Briefing manual e incompleto | **P0.5** | Skill | A1 | Haiku→Sonnet | mensagem+templates `docs/atelie/briefings/` | Read/Write local | nativo | baixo/médio (dados de cliente) | criar | P0.5 |
| Aprovação/Revisão | Feedback disperso vira retrabalho | **P0.5** manual; P2 via bot | Skill+comandos | A2 | Haiku (classif.) | item+feedback | portal existente; depois MCP | nativo | médio/médio | criar | P0.5→P2 |
| Produção Ateliê | Entregáveis profundos | Já existe | Skill `atelie` | A1 | Sonnet | Context Pack+Religare | docx/pdf/pptx/impeccable | existente | leve | baixo/médio | manter | — |
| Marca | Deriva de voz/identidade | Já existe | Agente Hagrid | A0 | Sonnet | BUSINESS-PLAN + Context Pack | Read | existente | leve | baixo | reusar | — |
| Publicação | Publicar aprovados | Pós-gate | Serviço+gate | A3 (allowlist) | — (código) | post aprovado | API pública `/public/v1/posts` | Postiz | leve | baixo | reusar | P2 |
| Relatório mensal | Horas manuais por cliente | Pós-gate | Skill | A1 | Sonnet | analytics+histórico | API pública | nativo+Postiz | leve | baixo | criar | P1 |
| WhatsApp intake | Mensagens viram trabalho manual | Pós-gate | Pipeline (webhook+Haiku+SD) | A0→A2 | Haiku | mapa conversa→projeto | Meta Cloud API (sandbox no lab) | ver whatsapp-bot.md | leve sob demanda | médio/**alto (LGPD)** | laboratório | P1–P2 |
| Proposta comercial | Propostas do zero | Pós-gate | Skill | A1 (envio A5) | Sonnet | CRM+faixas de preço | Read/Write | nativo | leve | baixo/médio | criar | P1 |
| Pesquisa/concorrência | Research manual | Já parcial | Skill+subagente | A0 | Sonnet | brief do cliente | WebSearch (Fred & Jorge) | existente | leve | baixo | reusar | — |
| Governança | Ação sem trilha | Pós-gate | Hook+SD | — | — (código) | comando proposto | policy engine+audit | nativo | leve | é a mitigação | criar | P2 |

---

## 8–9. Pesquisa de repositórios, maturidade e manutenção

Ver [pesquisa-repositorios.md](./pesquisa-repositorios.md) (fichas completas com licença, último
commit, mantenedores, peso, veredicto). Síntese das conclusões incorporada às seções 10, 12 e 21–23.

---

## 10. Comparação de orquestradores

| Critério | Claude Code nativo | OpenSquad | Ruflo (instalado) | claude-mpm |
|---|---|---|---|---|
| O que acrescenta | — (baseline) | Pipelines com checkpoints, "virtual office" | Swarms paralelos, memória própria | 47+ agentes, 171 skills, dashboard |
| Sobreposição com o nativo | — | Alta (agents/skills/hooks já fazem) | Alta (roteamento+memória disputam) | Total (agents/skills/hooks/MCP) |
| Processos/daemon | Nenhum extra | Node por execução | MCP residente se ativado | Python + dashboard |
| RAM (laptop 8 GB) | OK | OK | Moderado | **Pesado** |
| Windows | Nativo | Provável OK (npx) | OK (já instalado) | Incerto |
| Roteamento de modelo | `model` por subagente (nativo) | Próprio | Próprio | Próprio |
| Checkpoints humanos | permissionMode + hooks + AskUser | Nativo do pipeline | Parcial | Parcial |
| Lock-in / remoção | Zero | Baixo (file-based) | Baixo (já dormente) | Alto (ecossistema próprio) |
| Risco de abandono | Baixo (Anthropic) | **Alto** (mantenedor único, jovem) | Médio | Médio |
| **Veredicto** | **Substrato** | **Referência conceitual** (copiar o modelo de pipeline-com-checkpoint em skills) | **Dormente/removível**; promover só se um workflow paralelo concreto comprovar necessidade | **Rejeitado** |

Regra de não-conflito: **nunca dois frameworks disputando roteamento, memória, hooks, definição de
agentes ou controle de ferramentas.** O nativo já resolve tudo isso; qualquer adição precisa provar o
que acrescenta (nenhum candidato provou).

Recursos nativos confirmados do Claude Code usados como base: `model` por subagente (frontmatter),
`tools`/`disallowedTools`, `mcpServers` (por projeto e por agente via SDK), skills (open standard),
memória persistente por projeto, `maxTurns`/esforço, `permissionMode`, hooks (pre/post tool),
subagentes em background e `isolation: worktree`.

---

## 11. Arquitetura planner × executor

- **Fable (agora):** este plano, ADRs, contratos, fronteiras, pacotes. Depois desta sessão, Fable
  (ou Opus) só volta para os gatilhos listados na seção 25.16.
- **Sonnet (execução qualificada):** implementar pacotes PE-02..PE-05, estratégia/criação/revisão
  crítica, o agente Conductor em operação.
- **Haiku (volume):** extração, classificação de mensagens/intenção, atualização de status proposta,
  formatação, PE-01 parcial.
- **Código determinístico:** regras, permissões, transições de status, policy engine, idempotência.
- **Humano (Felipe):** tudo A5 (seção 15).

Cada pacote em `pacotes/` declara: modelo mínimo, limite de turnos, decisões fechadas (não reabrir) e
pontos de escalonamento obrigatório para modelo superior. Roteamento por tarefa:

| Tarefa | Modelo |
|---|---|
| Arquitetura, fronteiras, contratos novos | Fable/Opus (gatilhos §25.16) |
| Estratégia, criação, revisão crítica, relatório | Sonnet |
| Extração, classificação, intenção, status, formatação | Haiku |
| Regras, permissões, transições | Código |
| Escritas irreversíveis | Serviço validado + aprovação humana |

---

## 12–13. Bot de WhatsApp — arquitetura, eventos e comandos

Ver [whatsapp-bot.md](./whatsapp-bot.md) (arquitetura completa, matriz de eventos×comandos, threat
model LGPD e revisão adversarial do estudo interno). Resumo das decisões:

- **Pipeline:** Adapter → Normalizer → Debouncer → Client/Project Resolver → Intent Extractor (Haiku)
  → **Policy Engine (determinística)** → Proposed Command → Gate (humano ou política) → Application
  Service → Audit → Response Composer → Adapter.
- **Laboratório:** Meta Cloud API **sandbox** (número de teste gratuito, até 5 números verificados,
  dados fictícios/consentidos), **somente leitura+classificação em dry-run**, nenhuma resposta
  automática. A pesquisa reprovou todos os conectores não-oficiais (ADR-05) — o lab valida o mesmo
  código da produção.
- **Produção:** Meta Cloud API oficial (webhooks, credenciais empresariais, retenção, isolamento por
  tenant) — decisão já travada. **Risco arquitetural aberto:** suporte limitado da Cloud API a
  grupos → pergunta 1 de PERGUNTAS-FELIPE (grupo por projeto × conversa 1:1).
- **O LLM nunca executa SQL nem responde direto ao grupo sem gate.** Toda saída é comando tipado com
  ator, cliente, projeto, evidência, confiança, idempotency key e flag de aprovação necessária.

---

## 14. Níveis de autonomia

| Nível | Descrição | Exemplos no back-office |
|---|---|---|
| A0 | Leitura e diagnóstico | Conductor lendo fila; Analista lendo métricas; bot lendo grupo (lab) |
| A1 | Gera rascunho | Briefing, proposta, relatório, copy |
| A2 | Propõe ação, aguarda aprovação | Comando `ApproveContent` proposto a partir de mensagem do cliente |
| A3 | Executa ações allowlisted e reversíveis | Mover card no Kanban, registrar comentário interno, agendar post **já aprovado** |
| A4 | Autônomo em reversíveis, com auditoria | Nenhum fluxo nasce aqui; promoção só com métrica de erro + decisão do Felipe |
| A5 | Irreversível/financeiro/jurídico/reputacional | **Nunca automatizado nesta fase** |

Progressão padrão de qualquer fluxo: A0 → A1 → A2 → (métricas) → A3. A4 é exceção justificada por ADR.

---

## 15. Human-in-the-loop

Exigem aprovação humana explícita (lista A5, herdada do briefing e confirmada):
publicar conteúdo · responder reclamação · alterar prazo prometido · aceitar mudança de escopo ·
enviar proposta · conceder desconto · confirmar preço · apagar material · remover acesso · enviar
arquivo final · alterar regra permanente de marca · responder tema jurídico/financeiro · comprometer
a Vocaccio com nova entrega · **enviar qualquer mensagem a cliente em nome da agência (até P2)**.

Mecanismos: gate no cockpit `/atelie/fila` (já existe), status `PENDING_APPROVAL` no Kanban (já
existe), tabela `OperationalCommand` com estado `proposto→aprovado→executado` (PE-02), hooks de
pré-execução no Claude Code, e o portal de aprovação para o lado do cliente.

---

## 16. Segurança

1. **Separação leitura/escrita:** MCPs e toolsets distintos; o agente que lê WhatsApp não tem a tool
   de enviar; o que propõe comandos não os executa.
2. **Policy engine determinística** valida todo comando: permissão (`VocaccioRole`), escopo
   (cliente/projeto corretos), allowlist de ações, limites (ex.: nunca `DELETE`).
3. **Idempotência obrigatória** em todo comando com efeito (chave = origem+mensagem+ação).
4. **Prompt injection:** mensagens de cliente, documentos e imagens são **dados, não instruções** —
   o Intent Extractor roda com contexto mínimo e saída estruturada (enum de intents), nunca com
   ferramentas de escrita. Instrução embutida em conteúdo observado → `HUMAN_ESCALATION_REQUIRED`.
5. **Exfiltração por MCP:** nenhum agente operacional tem simultaneamente (a) mensagens privadas,
   (b) filesystem amplo e (c) envio externo. Red flags do briefing (§12.5) viram checklist de veto
   em `pesquisa-repositorios.md` e nos pacotes.
6. **Segredos:** sessão WhatsApp criptografada em disco, fora do repo; API keys por ambiente;
   `PORTAL_SECRET` já existente como padrão a seguir.
7. **Auditoria:** todo comando executado gera registro com ator, origem, evidência, resultado
   (PE-02). `AccessLinkEvent` já é o modelo mental.
8. Nenhuma configuração com `--dangerously-skip-permissions`/`bypassPermissions` é aceitável em
   qualquer fase com dados reais.

---

## 17. LGPD

Threat model completo em [whatsapp-bot.md §Threat model LGPD](./whatsapp-bot.md). Pontos de decisão:
Vocaccio/Plangroup = **operadora** dos dados dos clientes finais e **controladora** dos dados dos
contatos da agência; base legal provável = legítimo interesse + execução de contrato (contratos e
avisos exigem advogado — marcado como questão jurídica); transparência obrigatória nos grupos
("há IA processando este grupo"); minimização (só grupos allowlisted, retenção curta, sem dados
sensíveis a modelo); RLS/tenancy já é requisito do produto (Fase H).

---

## 18. Plano de fases

| Fase | Gatilho | Conteúdo |
|---|---|---|
| **P0 (agora)** | — | Este planejamento. Nada instalado, nada implementado. |
| **P0.5 "alavanca interna"** | Imediato, se Felipe aprovar (não viola o congelamento) | Skills operacionais em `.claude/skills/ops-*` (arquivos .md): intake/briefing, aprovação/feedback→ação, reunião→atas, proposta. Zero código de produto, zero daemon, zero IA paga, dados manuseados pelo operador (Felipe) no Claude Code. **Apelo comercial:** a agência já opera "assistida por IA" e isso entra no pitch dos 3 primeiros clientes. Pacote PE-01. |
| **P1** | 3 clientes pagantes | Conductor + Analista (agents .md); MCP `vocaccio-ops` **somente leitura**; relatório mensal assistido; laboratório WhatsApp **read-only** com número dedicado e dados consentidos. Pacotes PE-03, PE-04, PE-05. |
| **P2** | Operação interna validada (métricas de erro aceitáveis) | `OperationalCommand` + audit log + idempotência (PE-02); escritas allowlisted A2/A3 via MCP; bot propõe atualizações de Kanban com gate humano; número empresarial dedicado. |
| **P3** | Monetização suficiente p/ infra | Meta Cloud API oficial; serviços persistentes; inbox (Chatwoot ou alternativa); n8n/Typebot se comprovarem necessidade; automações bidirecionais; workers adicionais; monitoramento. |
| **P4** | Escala | Multi-tenant completo (Fase H), credenciais por cliente, limites por plano, dashboards de operação, SLAs, billing, APIs públicas de operação. |

---

## 19–20. ADRs e pacotes de execução

- 18 ADRs em [ADRS.md](./ADRS.md).
- Pacotes executáveis por modelos econômicos em `pacotes/PE-01..PE-05` (20 campos cada: objetivo,
  arquivos, contratos, segurança, aceite, rollback, modelo mínimo, turnos, decisões fechadas,
  escalonamento).

---

## 21–23. Veredictos de repositórios

Fichas e evidências em [pesquisa-repositorios.md](./pesquisa-repositorios.md). Posição arquitetural
(deste plano; prevalece em conflito com a ficha):

- **Aprovados para laboratório:** Meta Cloud API sandbox (lab E produção do WhatsApp);
  `thatrebeccarae/claude-marketing` (skills selecionadas a dedo, nunca em bloco); Firecrawl MCP
  (pesquisa, free tier); GA4 MCP oficial (Analista, P1+); Google Workspace MCP taylorwilsdon (P2+).
- **Apenas referência:** OpenSquad (modelo de pipeline com checkpoints); Rich627 e
  crisandrews/claude-whatsapp (bons filtros de grupo como inspiração; red flags impedem adoção);
  Baileys/Evolution API (risco de ban / servidor); agency-agents e demais coleções de skills;
  Chatwoot/Typebot/n8n (P3, "só depois de monetizar"); Postiz upstream (cherry-pick pontual com ADR);
  Wassenger/Twilio (comparação comercial); OpenClaw (existe, mas é produto concorrente).
- **Rejeitados:** claude-mpm (Python, peso, lock-in); `jlucaso1/whatsapp-mcp-ts` (sem licença,
  sessão em texto plano, parado); `lharries/whatsapp-mcp` (abandonado, build hostil no Windows);
  WPPConnect (Chrome headless em laptop 8GB); zxkane/social-agents (sem licença, serviço terceiro);
  qualquer candidato com red flag §12.5 sem redesenho; repost/autopost automático (fere autenticidade).

---

## 24. Perguntas em aberto

Somente as que bloqueiam decisão, em [PERGUNTAS-FELIPE.md](./PERGUNTAS-FELIPE.md).

---

## 25. Recomendação final

1. **Substrato:** Claude Code nativo (agents + skills + hooks + MCP stdio). Nada mais.
2. **Ruflo:** dormente e removível; promover apenas se um workflow paralelo concreto comprovar
   necessidade (gatilho no ADR-02).
3. **OpenSquad:** apenas estudado; copiar o conceito de pipeline-com-checkpoint em skills próprias.
4. **Agentes operacionais:** **2 novos** (Conductor, Analista) + reuso de Hagrid e Fred & Jorge.
5. **Somente skills:** intake/briefing, aprovação/feedback, reunião→atas, proposta, relatório,
   pesquisa/concorrência, SEO/CRO, produção Ateliê (já existe).
6. **Determinísticos:** roteamento de demanda, transições de status, policy engine, permissões,
   idempotência, publicação de aprovados, allowlists.
7. **MCP próprio:** `vocaccio-ops` — stdio fino sobre os application services `/hub/*`; toolset de
   leitura (P1) separado do de escrita por comandos tipados (P2). Não reativar Mastra para isso.
8. **Laboratório WhatsApp:** Meta Cloud API **sandbox** (número de teste gratuito, dry-run,
   read-only) — nenhum conector não-oficial passou na validação (ADR-05, PE-04).
9. **Produção WhatsApp:** Meta Cloud API oficial (já decidido; P3).
10. **Reaproveitar do Postiz:** publicação/agendamento/Temporal, API pública+keys, analytics,
    webhooks, media library, drafts, notificações.
11. **Reescrever/criar:** nada do herdado precisa de reescrita agora; **criar** (não reescrever):
    rotas `/ops` da API, `OperationalCommand`+audit, MCP fino, service p/ `InternalTask` órfão.
12. **Não construir:** outro CRM/Kanban/orquestrador/banco vetorial; inbox própria (Chatwoot em P3);
    Mídia paga (Ads) antes de cliente pagante de mídia; repost automático; respostas automáticas a
    cliente antes de P3; qualquer daemon antes de monetizar.
13. **Primeira fatia pós-3º cliente:** PE-03 (MCP `vocaccio-ops` leitura) + PE-05 (relatório mensal
    assistido) — valor imediato, risco mínimo, tudo A0/A1.
14. **Pacotes para Haiku:** partes de PE-01 (templates/checklists), classificadores do PE-04,
    formatações do PE-05.
15. **Pacotes que exigem Sonnet:** PE-02 (schema+policy engine), PE-03 (MCP), PE-04 (pipeline),
    corpo analítico do PE-05, e toda skill criativa com Context Pack.
16. **Decisões futuras que exigem modelo de arquitetura avançado (Fable/Opus):** desenho da escrita
    do MCP (P2) se o contrato de comandos precisar mudar; arquitetura Meta Cloud API multi-tenant
    (P3); promoção de qualquer fluxo a A3/A4; revisão do ADR-01 se o Claude Code mudar de modelo de
    agentes; Fase H (white-label do back-office).

---

## 26. Revisão adversarial (aplicada antes de fechar)

1. *Complexidade desnecessária?* — Cortada: 9 papéis→2 agentes; 18 ADRs num arquivo; MCP único em vez
   de framework; nenhuma tabela nova além de `OperationalCommand` (e reuso do `InternalTask` órfão).
2. *Agente que deveria ser skill?* — Commercial Coordinator virou skill+Analista; Router virou serviço.
3. *Skill que deveria ser código?* — Transições de status, publicação e policy engine são código.
4. *Duplicando o Postiz?* — Não: publicação, analytics, webhooks e API key são reusados; inbox adiada.
5. *Duplicando o CRM?* — Não: nenhuma ferramenta externa de CRM/Kanban recomendada.
6. *Confiança excessiva em automação não oficial?* — WhatsApp não oficial confinado a laboratório
   read-only com dados consentidos; produção só oficial.
7. *Agente com dados demais?* — Princípio do mínimo contexto (§4.3) + separação leitura/escrita (§16.1).
8. *Falta aprovação humana?* — Lista A5 explícita; todo fluxo nasce A1/A2; envio a cliente é A5 até P2.
9. *Fable decidindo o que executor decide?* — Pacotes deixam para o executor tudo que é implementação;
   Fable só fixou fronteiras e contratos.
10. *Decisão vaga para modelos inferiores?* — Cada pacote tem 20 campos, incluindo "decisões fechadas"
    e "pontos de escalonamento". Se o executor encontrar ambiguidade não prevista: parar e escalar.
