# PE-05 — Relatório mensal assistido (skill `ops-relatorio`)

**Gatilho:** P1, junto com PE-03 (consome o MCP de leitura).

1. **Objetivo:** skill `ops-relatorio` que gera relatório mensal por cliente: métricas por canal/post
   (via MCP `get_channel_analytics`), destaques, aprendizados, recomendações — em .md e opcionalmente
   .docx/.pdf (skills globais).
2. **Problema:** relatório é horas de trabalho manual por cliente/mês.
3. **Resultado:** operador roda a skill com `cliente` + `mês` e recebe rascunho A1 para revisar.
4. **Ler antes:** PE-03 (tools disponíveis), `analytics.controller.ts` (formato `AnalyticsData`),
   1 relatório manual antigo da agência (Felipe fornece — vira template).
5. **Pode modificar:** `.claude/skills/ops-relatorio/**`, `docs/backoffice/saidas/` (gitignorada).
6. **Não pode modificar:** código do produto, MCP (se faltar tool, reportar — não improvisar).
7. **Reutilizar:** MCP PE-03; skills `docx`/`pdf`; tom de voz do Context Pack (via
   `get_context_pack_snapshot`) para o texto voltado ao cliente.
8. **Contratos:** entrada = `{crmClientId, mes}`; saída = .md com seções fixas (Resumo, Números por
   canal, Top conteúdos, Aprendizados, Recomendações, Próximo mês).
9. **Estado inicial:** relatórios manuais, sem padrão.
10. **Estado final:** skill funcional + template validado com 1 cliente real.
11. **Segurança:** dados de um único cliente por execução (nunca comparar clientes no mesmo prompt —
    §4.3 do plano); saída é rascunho A1 — enviar ao cliente é A5 humano.
12. **Erros:** canal sem métricas (provider sem analytics ou integração desconectada) → seção marca
    "sem dados", nunca inventa número.
13. **Aceite:** relatório de 1 mês real de 1 cliente, conferido pelo Felipe contra os números da UI;
    zero números inventados.
14. **Testes mínimos:** o caso real + 1 caso com canal sem dados.
15. **Validação:** comparação manual dos números (UI × relatório).
16. **Rollback:** deletar a skill.
17. **Modelo mínimo:** Sonnet (texto analítico); Haiku pode formatar tabelas.
18. **Limite de turnos:** ~20.
19. **Decisões fechadas:** seções fixas do item 8; números vêm SÓ do MCP (nunca de memória do
    modelo); um cliente por execução.
20. **Escalonar se:** precisar de métricas que a API de analytics não fornece (nova rota = decisão
    de backend, Sirius + revisão de escopo).
