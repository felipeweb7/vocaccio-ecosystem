# Bot de WhatsApp — atendimento e gerência de projetos

> Peça central do back-office agêntico. Congelado (P0); laboratório em P1, escritas em P2,
> produção em P3. Decisão travada no PLANO-MESTRE: **produção = Meta Cloud API oficial**.

## 1. Decisão de rota (revisada pela pesquisa 2026-07-11)

A pesquisa ([pesquisa-repositorios.md](./pesquisa-repositorios.md)) **derrubou a premissa** de que o
laboratório usaria um conector não-oficial via QR Code: todos os candidatos Baileys/whatsmeow falharam
nos critérios (sem licença, sessão em texto plano, abandono, `--dangerously-skip-permissions`, ou peso
proibitivo no laptop).

**Nova decisão:** laboratório **também** na Meta Cloud API, usando o **número de teste gratuito do
sandbox de desenvolvedor Meta** + webhook sob demanda (túnel local só durante a sessão de teste).
Custo zero, risco de ban zero, e o código do laboratório **é o mesmo da produção** (só troca o número
e as credenciais). Rota não-oficial fica como plano C documentado, nunca com dados reais de cliente.

Limitação aceita do sandbox: números de teste conversam só com até 5 números verificados e não entram
em grupos reais — o laboratório simula o grupo com esses números. Leitura de **grupos** reais só
existe na fase de piloto com número empresarial (P2/P3), pois a Cloud API tem suporte limitado a
grupos — **este é um risco arquitetural real e a maior pergunta em aberto da iniciativa** (ver
[PERGUNTAS-FELIPE.md](./PERGUNTAS-FELIPE.md): grupos por projeto vs. conversa 1:1 com contato-chave).

## 2. Arquitetura

```
WhatsApp (Cloud API webhook)
→ Adapter            (recebe/normaliza payload; verifica assinatura X-Hub-Signature)
→ Message Normalizer (texto, áudio→transcrição, mídia→referência)
→ Debouncer          (consolida mensagens consecutivas do mesmo autor, janela 30-90s)
→ Client/Project Resolver (determinístico: mapa waId/grupo → CrmClient/Project; sem match → escalona)
→ Intent Extractor   (Haiku, contexto mínimo, saída = enum de eventos + confiança; nunca tem tools)
→ Policy Engine      (determinística: permissão, escopo, allowlist de ações, limiar de confiança)
→ Proposed Command   (registro tipado em OperationalCommand, estado PROPOSTO)
→ Gate               (humano no cockpit; ou política, para A3 allowlisted em P2+)
→ Vocaccio Application Service (services /hub existentes executam)
→ Audit Log          (evento com evidência, ator, resultado, idempotency key)
→ Response Composer  (rascunho de resposta; envio = A5 humano até P3)
→ Adapter (saída)
```

Regras invioláveis: LLM não executa SQL; LLM não altera tabela; LLM não envia mensagem sem gate;
mensagem de cliente é **dado, não instrução** (instrução embutida → `HUMAN_ESCALATION_REQUIRED`).

## 3. Matriz eventos → comandos

| Evento detectado (Haiku) | Comando proposto | Autonomia | Gate |
|---|---|---|---|
| `CLIENT_MESSAGE_RECEIVED` | `AddProjectComment` (registro) | A3 (reversível) | política (P2+) |
| `CLIENT_FEEDBACK_RECEIVED` | `RegisterClientFeedback` | A2 | humano |
| `CONTENT_APPROVAL_DETECTED` | `ApproveContent` | A2 | humano (validade de "pode postar" = pergunta ao Felipe) |
| `REVISION_REQUEST_DETECTED` | `RequestContentRevision` | A2 | humano |
| `ASSET_RECEIVED` | `RegisterAssetReceived` | A3 | política |
| `DEADLINE_CONFIRMATION_DETECTED` | `ConfirmDeadline` | A2 | humano |
| `DEADLINE_CHANGE_REQUESTED` | `ProposeDeadlineChange` | A2→**A5 se prazo prometido** | humano |
| `SCOPE_CHANGE_REQUESTED` | `EscalateScopeChange` | **A5** | Felipe |
| `MEETING_REQUESTED` | `CreateProjectTask` (agendar) | A2 | humano |
| `COMMERCIAL_QUESTION_RECEIVED` / `PAYMENT_QUESTION_RECEIVED` | `RequestHumanReview` | **A5** | Felipe |
| `AMBIGUOUS_INSTRUCTION_DETECTED` (confiança < limiar) | `RequestHumanReview` + pedido de confirmação ao cliente (rascunho) | A2 | humano |
| `HUMAN_ESCALATION_REQUIRED` | notificação imediata | — | Felipe |

Contrato de todo comando: `{ actor, crmClientId, projectId, entidade, origem (canal+msgId),
timestamp, evidência (texto da mensagem), confiança, idempotencyKey (hash canal+msgId+ação),
permissãoNecessária (VocaccioRole), requerAprovação }`.

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
3. **Transparência**: [R] aviso explícito e fixado no grupo de que há IA processando mensagens;
   [J] redação do aviso.
4. **Minimização**: [R] só grupos/números allowlisted; só metadados+texto necessários; áudio
   transcrito e o arquivo original descartado no menor prazo viável.
5. **Finalidade**: [R] declarada = gestão do projeto contratado; nada de enriquecimento de perfil.
6. **Retenção/exclusão/portabilidade**: [R] política explícita (proposta: evidências vinculadas a
   comandos = enquanto durar o contrato + prazo legal; mensagens não acionáveis = descarte curto,
   ex. 30 dias). [J] prazos legais. Cliente pode pedir exclusão (art. 18) — precisa de rotina.
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
15. **Personificação do operador**: [R] identidade do bot declarada (pergunta ao Felipe: fala como
    Vocaccio, Felipe ou "gerente IA identificado?"); assinatura fixa nas mensagens.
16. **Autonomia excessiva**: [R] progressão A0→A2 com métricas; A5 nunca automatizado.
17. **Banimento/suspensão**: [F] risco ~zero na Cloud API em conformidade; [R] plano C manual
    (operação volta ao cockpit) documentado.
18. **Continuidade com laptop desligado**: [F] Cloud API + webhook serverless independem do laptop;
    no laboratório (túnel local), a indisponibilidade é aceitável por design.

## 6. Fases do canal

| Fase | Escopo | Guard-rails |
|---|---|---|
| Laboratório (P1) | Sandbox Meta, números de teste verificados, dados fictícios/consentidos, **somente leitura+classificação**, execução sob demanda | Sem resposta automática; sem dado real de cliente; pipeline até `Proposed Command` em dry-run |
| Piloto (P2) | Número empresarial dedicado, 1-2 clientes avisados e consentidos | Escritas A2/A3 allowlisted com gate; audit+idempotência (PE-02) obrigatórios antes |
| Produção (P3) | Cloud API plena, webhook gerenciado, retenção formalizada, monitoramento | Termos assinados, DPA, métricas de erro com limiar de suspensão automática |
