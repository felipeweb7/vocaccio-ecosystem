# PE-03 — MCP `vocaccio-ops` (somente leitura)

**Gatilho:** P1 (3 clientes pagantes). Primeira fatia recomendada junto com PE-05.

1. **Objetivo:** servidor MCP stdio mínimo (TypeScript, dentro do monorepo, ex.
   `apps/ops-mcp/` ou `libraries/ops-mcp/` — decidir pelo padrão pnpm workspace) expondo tools de
   **leitura**: `list_clients`, `get_project`, `get_context_pack_snapshot`, `list_kanban`,
   `list_service_requests`, `get_pending_approvals`, `get_channel_analytics`.
2. **Problema:** Conductor/Analista não enxergam o estado da Vocaccio sem a UI.
3. **Resultado:** Claude Code (agents Conductor/Analista) consulta a operação via MCP sob demanda;
   processo morre ao fim da sessão.
4. **Ler antes:** `public.auth.middleware.ts` (auth por API key), controllers de crm/project/content/
   atelie (métodos de leitura), `ADRS.md` (08, 16), docs MCP SDK TypeScript da Anthropic.
5. **Pode modificar:** pasta nova do MCP; `apps/backend/src/public-api/` (rotas GET `/public/v1/ops/*`
   novas, finas, chamando services existentes); `package.json` raiz (workspace).
6. **Não pode modificar:** services/repositories existentes (só consumir), RBAC, schema.
7. **Reutilizar:** API key da organização (`Organization.apiKey`) como credencial; services de
   leitura existentes; `ssrfSafeDispatcher` não é necessário (chamadas internas).
8. **Contratos:** cada tool = wrapper 1:1 de uma rota GET; saída JSON compacta (sem campos de token/
   segredo — filtrar `token`, `refreshToken`, `apiKey` de qualquer resposta).
9. **Estado inicial:** API pública não expõe CRM/Kanban/Ateliê.
10. **Estado final:** MCP registrado em `.claude/settings.json` do projeto (stdio, sob demanda);
    rotas `/public/v1/ops/*` GET ativas.
11. **Segurança:** **somente leitura** — nenhuma tool de escrita neste pacote (a escrita virá em
    pacote próprio pós-PE-02, superfície separada, ADR-16); API key via env, nunca hard-coded;
    respostas filtradas de segredos.
12. **Erros:** API key ausente/inválida → erro claro sem stack; backend offline → mensagem de
    orientação ("suba o dev server").
13. **Aceite:** com dev server rodando, Claude Code lista clientes e fila do Ateliê via MCP;
    grep confirma que nenhuma resposta contém tokens.
14. **Testes mínimos:** invocação real das 7 tools contra o banco de dev; 1 teste de filtro de
    segredos.
15. **Validação:** boot real do backend + sessão Claude Code consumindo o MCP; `rtk tsc` limpo.
16. **Rollback:** remover registro do MCP + revert das rotas GET (aditivas).
17. **Modelo mínimo:** Sonnet (Sirius).
18. **Limite de turnos:** ~35.
19. **Decisões fechadas:** stdio (não SSE/HTTP); leitura e escrita em superfícies separadas;
    transporte = API pública com API key (não sessão); Mastra não é reativada.
20. **Escalonar se:** for tentador adicionar "só uma tool de escrita" (proibido aqui — exige PE-02
    entregue + pacote próprio), ou se o padrão workspace do monorepo não comportar o novo app.
