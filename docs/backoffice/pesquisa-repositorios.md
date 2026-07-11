# Pesquisa de repositórios — back-office agêntico

> 2026-07-11. Metodologia: verificação via GitHub API/páginas (licença, último push, releases,
> mantenedores, issues) por 4 subagentes Sonnet com WebSearch/WebFetch. Nada instalado/clonado.
> "Não verificado" = honestamente não confirmado, não presumir.

## Orquestração

| Repo | Licença | Último push | Mantenedores | Manutenção | Maturidade | Peso | Veredicto |
|---|---|---|---|---|---|---|---|
| [renatoasse/opensquad](https://github.com/renatoasse/opensquad) | **nenhuma** | 2026-04-10 (3 meses parado) | 1 (autor único) | incerta | experimental | leve sob demanda | **Apenas referência** — sem licença, sem releases, sobrepõe subagentes nativos. Copiar o conceito de pipeline-com-checkpoint, não instalar |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | MIT | 2026-07-11 (ativíssimo) | 1 dominante + comunidade pequena | alta | produção c/ ressalvas (releases quase diárias = risco de breaking) | moderado | **Já instalado (v3.10.37), dormente.** Gap p/ v3.25.6 — upgrade é tarefa separada, só se for promovido (ADR-02) |
| [bobmatnyc/claude-mpm](https://github.com/bobmatnyc/claude-mpm) | não-padrão (NOASSERTION) | 2026-07-09 | 1 + afiliados | alta (autor único) | piloto controlado | moderado-pesado; **Python = 2º runtime** | **Rejeitado** — Windows não confirmado, licença não-padrão, sobreposição total com `.claude/agents/` nativo |

## WhatsApp

| Candidato | Licença | Último push | Manutenção | Peso | Red flags | Veredicto |
|---|---|---|---|---|---|---|
| [Rich627/whatsapp-claude-plugin](https://github.com/Rich627/whatsapp-claude-plugin) | Apache-2.0 | 2026-07-09 | moderada (36★, 1 mantenedor) | leve sob demanda | Windows não documentado (setup via brew); criptografia de sessão não verificada | Apenas referência |
| [crisandrews/claude-whatsapp](https://github.com/crisandrews/claude-whatsapp) | MIT | 2026-06-09 | baixa/incerta (7★) | leve persistente (daemon) | **flag `--dangerously-skip-permissions` explícita**; sessão sem criptografia; SQLite sem retenção | Apenas referência (bons filtros de grupo como inspiração) |
| [jlucaso1/whatsapp-mcp-ts](https://github.com/jlucaso1/whatsapp-mcp-ts) | **nenhuma** | 2026-01-23 (5+ meses parado) | baixa (1 mantenedor) | moderado (full history sync) | **sessão `auth_info/` em texto plano; retenção indefinida; Node 23.10+** | **Rejeitado** |
| [lharries/whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) | MIT | **2025-07-13 (~1 ano parado)**, 210 issues acumuladas | abandonada | moderado-pesado (Go+Python+CGO no Windows) | build MSYS2 no Windows; sem criptografia | **Rejeitado** (referência de arquitetura bridge apenas) |
| [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) | MIT | 2026-07-11 | alta (org, 10k★) | leve-moderado | **Risco estrutural de ban** (violação de ToS Meta); ecossistema com forks maliciosos confirmados (`lotusbail` roubava sessões, dez/2025) | Referência de base técnica; qualquer uso = risco assumido conscientemente |
| [EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api) | não-padrão (cláusulas de marca) | 2026-06-25 | alta (8.9k★) | **exige servidor** (Docker+Postgres/Redis) | modo Baileys = risco de ban; org pode ter migrado (`evolution-foundation` — confirmar canônico antes de decidir) | Referência; se usado, **só modo Cloud API oficial e só pós-monetização** |
| [wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect) | LGPL | 2026-07-11 | alta (org) | **pesado** (Chrome headless/Puppeteer por sessão) | risco de ban | **Rejeitado** para laptop 8GB |
| **Meta WhatsApp Cloud API** (oficial) | serviço Meta | — | — | serviço externo, zero infra local obrigatória | fricção de setup (verificação de negócio, templates); custo por msg (BR: marketing ~R$0,39, utility ~R$0,08, **service window 24h = grátis**); **número de teste gratuito no sandbox de dev** | **Caminho recomendado — inclusive para laboratório** (sandbox) e único sem risco de ban |

**Comerciais (comparação):** Wassenger (€39,90–99,90/mês sobre Cloud API, sem markup de conversa) — válido se não quiser construir infra; Twilio (BSP oficial, +$0,005/msg, ~20-40% acima da Meta) — robusto, caro em escala, sem vantagem sobre ir direto; Z-API (BR, foco Baileys = mesmo risco de ban; pricing não verificado).

**OpenClaw:** existe (github.com/openclaw/openclaw, 382k★, push diário) — **não é alucinação**, mas é um assistente pessoal completo concorrente do Claude Code, licença não-padrão, pesado. Fora de escopo; apenas referência.

## Agentes/skills de marketing

| Repo | Licença | Último push | Manutenção | Veredicto |
|---|---|---|---|---|
| [thatrebeccarae/claude-marketing](https://github.com/thatrebeccarae/claude-marketing) | MIT | 2026-05-14 | moderada (72★) | **Aprovado para laboratório** — 56 skills em 3 camadas; preenche gaps reais (paid media, GA4/analytics, email/lifecycle). Testar 1-2 skills isoladas, nunca instalar o pacote inteiro |
| [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) | MIT | 2026-07-09 | alta (130k★) | Apenas referência — 230+ personas multi-domínio + app desktop instalador; extrair no máximo 1-2 personas manualmente |
| [charlie947/social-media-skills](https://github.com/charlie947/social-media-skills) | MIT | 2026-05-20 | moderada-alta (1.6k★) | Apenas referência — exige `APIFY_API_TOKEN` (pago) + `GOOGLE_AI_API_KEY`; conflita com "zero IA paga" |
| [zxkane/social-agents](https://github.com/zxkane/social-agents) | **nenhuma** | 2026-02-28 | baixa (25★) | **Rejeitado** — sem licença, depende de serviço terceiro (RUBE), duplica o próprio Postiz |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | MIT | 2026-07-11 | alta (22k★) | Apenas referência — supermercado de 345 skills; curadoria cara em tokens (Griphook veta importação em bloco) |
| [realjaymes/marketingagentskills](https://github.com/realjaymes/marketingagentskills) | MIT | 2026-07-07 | moderada (42★) | Apenas referência — redundante com skills globais já instaladas |
| [ekinciio/saas-growth-marketing-skills](https://github.com/ekinciio/saas-growth-marketing-skills) | MIT | 2026-03-21 (parado) | baixa (10★) | Apenas referência — copiar ideia de 1-2 skills (pricing-analyzer) se precisar |

## Integrações e operação

| Item | Estado verificado | Veredicto |
|---|---|---|
| [Postiz upstream](https://github.com/gitroomhq/postiz-app) | AGPL-3.0, push 2026-07-10, v2.21.9 (jun/2026) — só fixes incrementais pós-fork, nada estrutural | Sem merge; cherry-pick pontual de fix com ADR próprio, se um bug herdado doer |
| MCPs Postiz da comunidade | antoniolg/postiz-mcp sem licença e 5 meses parado; oculairmedia exige Docker; oficial hospedado existe (postiz.com/mcp) | Rejeitados/desnecessários — **a Vocaccio É o Postiz**; o MCP próprio (`vocaccio-ops`) cobre o caso de uso |
| [Firecrawl MCP](https://github.com/mendableai/firecrawl-mcp-server) | MIT, push 2026-07-10, 6.9k★, `npx` sob demanda, processamento remoto | **Aprovado p/ laboratório** (pesquisa de concorrência, Fred & Jorge) — free tier; API paga só pós-monetização |
| KyaniteLabs/mcp-video | existe (Apache-2.0, push hoje, 74★, sinal de rebrand "Kinocut") | Apenas referência — jovem + sobrepõe hyperframes já instalado; vídeo é do Nicolas |
| [Supabase MCP](https://github.com/supabase/mcp) | oficial, Apache-2.0, push 2026-07-10, modo `read_only` | Condicional — só se/onde o projeto usar Supabase de fato; read-only |
| [Google Workspace MCP](https://github.com/taylorwilsdon/google_workspace_mcp) (taylorwilsdon) | MIT, push 2026-07-07, 2.8k★, 12 serviços, OAuth 2.1 | **Aprovado p/ laboratório** (e-mail/agenda do back-office, P2+) |
| [GA4 MCP](https://github.com/googleanalytics/google-analytics-mcp) | **oficial Google**, Apache-2.0, push 2026-06-29, read-only | **Aprovado p/ laboratório** (Analista, P1+) |
| GSC MCP | sem oficial; AminForou/mcp-gsc ~1.1k★ não verificado a fundo | Apenas referência |
| Meta Ads MCP (pipeboard-co) / Google Ads MCP (googleads) | oficiais/semi-oficiais ativos; licença Meta Ads não-padrão | Apenas referência — sem cliente de mídia paga ainda (P3+) |
| Chatwoot / Typebot / n8n | Chatwoot: 4-8GB RAM + Rails+Postgres+Redis+Sidekiq; Typebot: mini full-stack Docker; n8n: 2GB+ + Postgres p/ produção | Todos **"só depois de monetizar"**, hospedados (nunca no laptop). n8n aceitável pontualmente em Docker p/ prototipar 1 workflow, com dev server parado |

## Listas finais

**APROVADOS PARA LABORATÓRIO:** Meta Cloud API (sandbox/número de teste — laboratório E produção do WhatsApp); thatrebeccarae/claude-marketing (skills a dedo); Firecrawl MCP; GA4 MCP oficial; Google Workspace MCP (taylorwilsdon, P2+).

**APENAS REFERÊNCIA:** OpenSquad; Rich627/whatsapp-claude-plugin; crisandrews/claude-whatsapp; Baileys; Evolution API; agency-agents; social-media-skills; alirezarezvani/claude-skills; realjaymes; ekinciio; KyaniteLabs/mcp-video; GSC/Ads MCPs; Wassenger/Twilio; OpenClaw; Chatwoot/Typebot/n8n (P3).

**REJEITADOS:** claude-mpm; jlucaso1/whatsapp-mcp-ts; lharries/whatsapp-mcp; WPPConnect (neste hardware); zxkane/social-agents; antoniolg/postiz-mcp.

**Achados inesperados:** (1) o gap de 15 versões do Ruflo instalado (v3.10.37→v3.25.6) — tarefa de upgrade separada, só se promovido; (2) OpenClaw é real e gigante, mas concorrente, não conector; (3) **nenhum** conector WhatsApp não-oficial passou nos critérios de segurança — o que fortalece a Cloud API oficial até no laboratório.
