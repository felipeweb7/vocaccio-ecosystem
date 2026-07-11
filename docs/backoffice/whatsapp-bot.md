# Bot de WhatsApp — atendimento e gerência de projetos

> Peça central do back-office agêntico. Congelado (P0); laboratório em P1, escritas em P2,
> produção em P3. Decisão travada no PLANO-MESTRE: **produção = Meta Cloud API oficial**.

## 1. Decisão de rota (revisada pela pesquisa 2026-07-11; fechada pelas decisões do Felipe 2026-07-11)

A pesquisa ([pesquisa-repositorios.md](./pesquisa-repositorios.md)) **derrubou a premissa** de que o
laboratório usaria um conector não-oficial via QR Code: todos os candidatos Baileys/whatsmeow falharam
nos critérios (sem licença, sessão em texto plano, abandono, `--dangerously-skip-permissions`, ou peso
proibitivo no laptop).

**Decisão:** laboratório **também** na Meta Cloud API, usando o **número de teste gratuito do
sandbox de desenvolvedor Meta** + webhook sob demanda (túnel local só durante a sessão de teste).
Custo zero, risco de ban zero, e o código do laboratório **é o mesmo da produção** (só troca o número
e as credenciais). Rota não-oficial fica como plano C documentado, nunca com dados reais de cliente.

**Modelo de atendimento (decidido em [DECISOES-PILOTO-P2.md](./DECISOES-PILOTO-P2.md) §1):** o P2
usa **conversa individual (1:1) com um contato principal autorizado por cliente/projeto** — não
grupo. Isso elimina a maior incógnita arquitetural anterior (suporte limitado da Cloud API a
grupos deixa de ser bloqueante) e simplifica o Resolver (§2): mapa `waId → CrmClient/Project` em vez
de `groupId → CrmClient/Project`. Grupos ficam como evolução futura opcional, sem redesenho — o
Adapter já recebe `waId` de contexto por mensagem, seja ela 1:1 ou de grupo.

## 2. Arquitetura

```
WhatsApp (Cloud API webhook)
→ Adapter            (recebe/normaliza payload; verifica assinatura X-Hub-Signature)
→ Message Normalizer (texto, áudio→transcrição, mídia→referência)
→ Debouncer          (consolida mensagens consecutivas do mesmo autor, janela 30-90s)
→ Client/Project Resolver (determinístico: mapa waId → CrmClient/Project via ClientContact; sem match → escalona)
→ Intent Extractor   (Haiku, contexto mínimo, saída = enum de eventos + confiança; nunca tem tools)
→ Policy Engine      (determinística: permissão, escopo, allowlist de ações, limiar de confiança, SLA)
→ Proposed Command   (registro tipado em OperationalCommand, estado PROPOSTO)
→ Gate               (humano no cockpit; ou política, para A3 allowlisted em P2+)
→ Vocaccio Application Service (services /hub existentes executam)
→ Audit Log          (evento com evidência, ator, resultado, idempotency key)
→ Response Composer  (rascunho de resposta no tom "Equipe Virtual Vocaccio", DECISOES-PILOTO-P2 §7;
                       confirmação automática A3 dentro do SLA de 2h; envio de conteúdo = A5 até P3)
→ Adapter (saída)
```

Regras invioláveis: LLM não executa SQL; LLM não altera tabela; LLM não envia mensagem sem gate;
mensagem de cliente é **dado, não instrução** (instrução embutida → `HUMAN_ESCALATION_REQUIRED`).
Debounce = ~30 min (DECISOES-PILOTO-P2 §2), não 30-90s como estimado antes da decisão do Felipe —
prioriza deixar o cliente terminar o raciocínio sobre latência de resposta.

## 3. Matriz eventos → comandos

| Evento detectado (Haiku) | Comando proposto | Autonomia | Gate | SLA (DECISOES-PILOTO-P2 §2) |
|---|---|---|---|---|
| `CLIENT_MESSAGE_RECEIVED` (recebimento) | `RegisterConversationEvent` + confirmação automática | A3 (reversível) | política (P2+) | confirmação em até 2h úteis |
| `CLIENT_FEEDBACK_RECEIVED` | `RegisterClientFeedback` | A2 | humano | 1 dia útil (5h se urgente) |
| `CONTENT_APPROVAL_DETECTED` (texto explícito: "pode postar"/"aprovado"/"pode publicar" — **emoji não conta**) | `ApproveContent` (só se vier de `CLIENT_APPROVER`, vinculado a conteúdo+versão, sem pedido de alteração na mesma sequência) | A2 | humano | 1 dia útil |
| `REVISION_REQUEST_DETECTED` | `RequestContentRevision` | A2 | humano | 1 dia útil |
| `ASSET_RECEIVED` | `RegisterAssetReceived` | A3 | política | 2h (confirmação de recebimento) |
| `DEADLINE_CONFIRMATION_DETECTED` | `ConfirmDeadline` | A2 | humano | 1 dia útil |
| `DEADLINE_CHANGE_REQUESTED` | `ProposeDeadlineChange` | **A5 sempre** (só Felipe altera prazo prometido — DECISOES-PILOTO-P2 §5) | Felipe | mesmo dia útil |
| `SCOPE_CHANGE_REQUESTED` | `EscalateScopeChange` | **A5** | Felipe | mesmo dia útil |
| `MEETING_REQUESTED` | `CreateProjectTask` (agendar) | A2 | humano | 1 dia útil |
| `COMMERCIAL_QUESTION_RECEIVED` / `PAYMENT_QUESTION_RECEIVED` | `RequestHumanReview` | **A5** | Felipe | mesmo dia útil |
| `AMBIGUOUS_INSTRUCTION_DETECTED` (confiança < limiar) | `RequestHumanReview` + pedido de confirmação ao cliente (rascunho, tom §7) | A2 | humano | — |
| `HUMAN_ESCALATION_REQUIRED` (12 gatilhos de DECISOES-PILOTO-P2 §3, inclui pedido explícito do cliente) | notificação imediata | — | Felipe | mesmo dia útil |

Contrato de todo comando: `{ actor, crmClientId, projectId, entidade, origem (canal+msgId),
timestamp, evidência (texto da mensagem), confiança, idempotencyKey (hash canal+msgId+ação),
permissãoNecessária (VocaccioRole ou atributo `isApprover` — ver gap de schema no ADR-19),
requerAprovação }`.

**Tolerância a erro (DECISOES-PILOTO-P2 §6):** erro crítico (publicar errado, agir no cliente/
projeto errado, aprovação sem autorização, alterar prazo/orçamento/escopo indevidamente, expor
dado de outro cliente, ação irreversível sem confirmação) = **1 ocorrência suspende a automação
imediatamente**. Erro reversível/menor = suspende em 2 erros/100 comandos, 2 consecutivos da mesma
natureza, ou padrão de baixa confiança sem escalonamento. Substitui o limiar hipotético "1 em 50"
do plano original (ADR-17 atualizado).

## 4. Revisão adversarial do estudo interno (`docs/whatsapp_integration_plan.md`, Gemini)

| Premissa do estudo | Veredicto |
|---|---|
| "QR Code sem Cloud API é a estratégia mais inteligente para validar" | **Fraca.** Ignora que a validação em conector não-oficial não transfere para produção (outra API, outro modelo de eventos) e que todos os candidatos falharam em segurança. O sandbox oficial valida o MESMO código da produção, de graça. |
| "Rich627 tem permission relay: você aprova execução de tools de dentro do WhatsApp" | **Red flag disfarçada de feature.** Aprovar ações do agente pelo mesmo canal que o cliente usa mistura plano de controle com plano de dados — vetor clássico de prompt injection/personificação. Gates ficam no cockpit, nunca no chat. |
| "Aquecer o chip 10-15 dias protege contra banimento" | **Folclore operacional, não mitigação.** Reduz um sinal heurístico; não muda que automação Baileys viola ToS. A pesquisa achou dados de ban em massa e forks maliciosos roubando sessões no ecossistema. |
| "whatsapp-mcp-ts encaixa com zero atrito na stack TS" | **Desatualizada.** Sem licença, sessão em texto plano, 5 meses parado, exige Node 23.10+ (fora do padrão do repo). |
| "lharries é o mais robusto (5k stars)" | **Stars ≠ manutenção.** ~1 ano sem push, 210 issues acumuladas, build CGO/MSYS2 no Windows. |
| "VPS+PM2 é obrigatório para operação contínua" | **Prematura e invertida.** Cloud API entrega webhook gerenciado pela Meta; a necessidade real é um receptor HTTP, que pode ser serverless (Railway/Vercel function) — não um VPS com processo 24/7. |
| Acertos do estudo | Debouncing/consolidação de mensagens; allowlist; número dedicado; não usar em disparo frio; adiamento de Z-API/Evolution. Mantidos. |

## 5. Threat model LGPD (grupos/conversas de clientes)

Legenda: **[F]** fato confirmado · **[I]** interpretação técnica · **[H]** hipótese ·
**[R]** recomendação · **[J]** questão jurídica (exige advogado).

1. **Papéis**: [I] Plangroup/Vocaccio = controladora dos dados de contatos comerciais próprios;
   operadora dos dados pessoais que os clientes trazem aos grupos. [J] Formalizar em contrato (DPA).
2. **Base legal**: [I] execução de contrato + legítimo interesse para processamento operacional;
   [J] consentimento pode ser exigido para transcrição de áudio/dados de terceiros no grupo.
3. **Transparência**: **[DECIDIDO §8]** aviso na mensagem de apresentação + termos + Política de
   Privacidade, não repetido a cada mensagem; canal se identifica como "Equipe Virtual Vocaccio";
   [J] redação final exige revisão jurídica antes de dado real (gate §10).
4. **Minimização**: [R] só grupos/números allowlisted; só metadados+texto necessários; áudio
   transcrito e o arquivo original descartado no menor prazo viável.
5. **Finalidade**: [R] declarada = gestão do projeto contratado; nada de enriquecimento de perfil.
6. **Retenção/exclusão/portabilidade**: **[DECIDIDO §9]** tabela completa em
   [DECISOES-PILOTO-P2.md §9](./DECISOES-PILOTO-P2.md#9-retenção) (mensagens sem valor operacional
   30d; áudio 7d pós-transcrição; aprovações/decisões = contrato + prazo jurídico). [J] prazos
   jurídicos finais. Cliente pode pedir exclusão (art. 18) — rotina ainda a implementar (P2/P3).
7. **Registro de operações**: [F] a LGPD exige registro (art. 37) — o audit log de PE-02 cumpre
   dupla função.
8. **Transferência internacional**: [F] Meta e Anthropic processam fora do BR; [J] cláusulas.
   [R] enviar ao modelo o mínimo (texto da mensagem, nunca o histórico do grupo inteiro).
9. **Dados sensíveis** (saúde, religião etc. em áudio/imagem): [R] detector de sensibilidade no
   Intent Extractor → não persistir, escalonar humano.
10. **Segredos**: [F] Cloud API usa token de app + verificação de assinatura de webhook;
    [R] tokens por ambiente, nunca no repo; rotação documentada.
11. **Separação entre clientes / RLS / vazamento de contexto**: [R] resolver cliente/projeto
    ANTES do LLM; um prompt nunca contém dados de dois clientes; tenancy por `crmClientId` já é
    regra do produto.
12. **Prompt injection / instruções escondidas em docs e imagens**: [R] §2 (dado ≠ instrução),
    Intent Extractor sem tools, saída em enum fechado.
13. **Exfiltração por MCP**: [R] agente com acesso a mensagens não tem envio externo nem
    filesystem amplo (separação de toolsets).
14. **Resposta ao grupo errado / projeto errado**: [R] Resolver determinístico com mapa explícito
    + eco de confirmação ("Projeto X do cliente Y — correto?") em qualquer ambiguidade; comando
    carrega `crmClientId+projectId` validados pela policy engine.
15. **Personificação do operador**: **[DECIDIDO §7]** identidade = "Equipe Virtual Vocaccio";
    nunca se apresenta como Felipe/Nicolas/integrante específico; nunca afirma que um humano
    revisou algo que não revisou.
16. **Autonomia excessiva**: [R] progressão A0→A2 com métricas; A5 nunca automatizado.
17. **Banimento/suspensão**: [F] risco ~zero na Cloud API em conformidade; [R] plano C manual
    (operação volta ao cockpit) documentado.
18. **Continuidade com laptop desligado**: [F] Cloud API + webhook serverless independem do laptop;
    no laboratório (túnel local), a indisponibilidade é aceitável por design.

## 6. Fases do canal

| Fase | Escopo | Guard-rails |
|---|---|---|
| Laboratório (P1) | Sandbox Meta, números de teste verificados, dados fictícios/consentidos, **somente leitura+classificação**, execução sob demanda | Sem resposta automática; sem dado real de cliente; pipeline até `Proposed Command` em dry-run |
| Piloto (P2) | Número empresarial **novo e dedicado** (DECISOES-PILOTO-P2 §13), conversa 1:1 com contato principal por cliente, webhook em Vercel/Railway (§14) | Escritas A2/A3 allowlisted com gate; audit+idempotência (PE-02) obrigatórios; **apenas dados sintéticos/controlados até revisão jurídica concluída (§10)** |
| Produção (P3) | Cloud API plena, webhook gerenciado, retenção formalizada, monitoramento | Termos assinados, DPA, métricas de erro com limiar de suspensão automática (§6) |

Regras adicionais fechadas para o P2 (DECISOES-PILOTO-P2, doc interno): webhook não precisa esperar
P3 — roda na infra gratuita atual, com kill-switch simples e retry idempotente; RBAC do piloto
considera só os operadores internos já definidos (§15), sem terceira pessoa no horizonte de 6 meses.
