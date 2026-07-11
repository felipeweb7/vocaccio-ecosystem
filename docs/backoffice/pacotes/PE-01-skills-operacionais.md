# PE-01 — Skills operacionais (fatia P0.5 "alavanca interna")

**Gatilho:** aprovação do Felipe (não depende dos 3 pagantes — zero código de produto).

1. **Objetivo:** criar 4 skills em `.claude/skills/`: `ops-intake` (mensagens/áudios/formulários →
   briefing estruturado + lacunas), `ops-aprovacao` (feedback de cliente → ações/regras de marca
   propostas), `ops-reuniao` (transcrição → ata + ações), `ops-proposta` (CRM + faixas → rascunho de
   proposta).
2. **Problema atual:** intake, atas, interpretação de feedback e propostas são 100% manuais.
3. **Resultado esperado:** operador (Felipe) roda cada skill no Claude Code e recebe artefato .md
   padronizado em `docs/atelie/pedidos/` ou `docs/backoffice/saidas/` (gitignorada).
4. **Ler antes:** `.claude/skills/atelie/SKILL.md` (padrão de skill do projeto),
   `docs/atelie/briefings/*.md`, `docs/atelie/plano-atelie-virtual.md`,
   `docs/backoffice/PLANO-BACKOFFICE-AGENTICO.md` §4-6.
5. **Pode modificar:** `.claude/skills/ops-*/**` (novos), `.gitignore` (pasta de saídas).
6. **Não pode modificar:** qualquer código em `apps/`/`libraries/`, schema, skills existentes,
   `PLANO-MESTRE.md`.
7. **Interfaces a reutilizar:** templates de briefing existentes; checklist Hagrid do AT-1;
   skills globais `copywriting`/`docx`/`pdf`.
8. **Contratos:** entrada = texto colado/arquivo apontado pelo operador; saída = .md com frontmatter
   (`cliente`, `projeto`, `origem`, `data`, `confianca`, `lacunas[]`).
9. **Estado inicial:** só existe a skill `atelie` (produção de entregável).
10. **Estado final:** 4 skills novas invocáveis, documentadas no README de agents.
11. **Segurança:** skills nunca chamam APIs externas nem escrevem fora das pastas de saída; dados
    de cliente ficam locais; `ops-proposta` nunca inventa preço — usa faixas de
    `PERGUNTAS-FELIPE.md` §11 ou marca "PREÇO: definir".
12. **Erros:** cliente/projeto não identificado → skill pergunta, não assume; áudio sem transcrição
    disponível → instruir operador (sem instalar transcritor).
13. **Aceite:** rodar cada skill com 1 caso real e 1 caso ambíguo; saída segue o frontmatter;
    ambíguo gera pergunta em vez de suposição.
14. **Testes mínimos:** os 8 casos acima (2 por skill), manuais.
15. **Validação:** `rtk git status` limpo fora de `.claude/skills/ops-*` e `.gitignore`.
16. **Rollback:** deletar as pastas das skills (nada mais é tocado).
17. **Modelo mínimo:** Sonnet para escrever as skills; em uso, Haiku roda `ops-intake`/`ops-reuniao`,
    Sonnet roda `ops-aprovacao`/`ops-proposta`.
18. **Limite de turnos:** ~15.
19. **Decisões fechadas:** nomes/escopo das 4 skills; formato frontmatter; nada de API externa;
    Hagrid valida marca (não duplicar critério dentro da skill).
20. **Escalonar (Opus/Fable) se:** surgir necessidade de estado persistente entre execuções ou de
    novo agente — isso muda a arquitetura (ADR-04).
