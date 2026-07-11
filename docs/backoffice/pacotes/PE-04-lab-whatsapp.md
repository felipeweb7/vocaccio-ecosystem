# PE-04 — Laboratório WhatsApp (Cloud API sandbox, read-only, dry-run)

**Gatilho:** P1, após PE-03. Nada aqui toca cliente real.

1. **Objetivo:** provar o pipeline `whatsapp-bot.md` §2 até `Proposed Command` em **dry-run**:
   receptor de webhook local (script Node simples + túnel sob demanda) → normalizer → debouncer →
   resolver (mapa estático em JSON) → Intent Extractor (Haiku via Claude Code, saída = enum §3) →
   policy engine (função pura) → comando proposto impresso/salvo em arquivo (SEM PE-02, sem banco).
2. **Problema:** o desenho do bot nunca foi exercitado; a viabilidade da classificação por Haiku e
   do debouncing é hipótese.
3. **Resultado:** relatório de laboratório com taxa de acerto do classificador em ≥40 mensagens de
   teste (fictícias/consentidas), latência, e lista de ajustes de prompt/limiar.
4. **Ler antes:** `docs/backoffice/whatsapp-bot.md` (inteiro), `ADRS.md` (05, 09, 16), doc oficial
   Meta "Cloud API Get Started" (número de teste, verify token, assinatura de webhook).
5. **Pode modificar:** pasta nova `docs/backoffice/lab-whatsapp/` (scripts + fixtures + relatório) —
   **fora de `apps/`/`libraries/`**; nada entra no build do produto.
6. **Não pode modificar:** qualquer código do produto, schema, `.env` do produto.
7. **Reutilizar:** enums de eventos/comandos de `whatsapp-bot.md` §3 (copiar como TS types no lab).
8. **Contratos:** entrada = payload webhook Cloud API; saída = JSON `ProposedCommand` (§3) em
   `lab-whatsapp/out/`.
9. **Estado inicial:** nenhum canal WhatsApp conectado.
10. **Estado final:** app Meta de teste configurado (conta dev do Felipe), 5 números verificados,
    pipeline dry-run funcional, relatório escrito.
11. **Segurança:** número de teste apenas; **zero envio automático** (nem no sandbox — respostas só
    impressas); token do app em `.env` local do lab (gitignorado); mensagens de teste sem dados
    pessoais reais; instrução embutida em mensagem → deve sair `HUMAN_ESCALATION_REQUIRED`
    (caso de teste obrigatório de prompt injection).
12. **Erros:** assinatura de webhook inválida → descartar e logar; intent com confiança < 0.7 →
    `AMBIGUOUS_INSTRUCTION_DETECTED`.
13. **Aceite:** ≥40 mensagens de fixture cobrindo os 13 eventos do §3 + 3 tentativas de injection;
    acerto ≥80% nos eventos, 100% nas injections escalonadas.
14. **Testes mínimos:** os fixtures acima, rodados por script.
15. **Validação:** relatório em `lab-whatsapp/RELATORIO.md` com números reais (não estimados).
16. **Rollback:** apagar a pasta do lab + app de teste no Meta dashboard.
17. **Modelo mínimo:** Sonnet constrói; Haiku classifica (medir com Haiku — é o modelo-alvo).
18. **Limite de turnos:** ~40.
19. **Decisões fechadas:** Cloud API sandbox (nunca Baileys aqui — ADR-05); dry-run sem banco;
    enum fechado de eventos; limiar inicial 0.7.
20. **Escalonar se:** Haiku ficar <80% após 2 iterações de prompt (decidir Sonnet-classificador ×
    redesenho é decisão de custo/arquitetura), ou se o modelo de grupos exigir revisão (pergunta 1
    de PERGUNTAS-FELIPE).
