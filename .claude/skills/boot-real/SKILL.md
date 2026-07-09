---
name: boot-real
description: Verificação real do backend Vocaccio depois de qualquer mudança em schema.prisma, migrations, tsconfig, deps ou rotas — build com heap correto, boot do NestJS, matriz de curl (sucesso + negado/403 + org errada), sanidade de Prisma. Use sempre antes de declarar "backend ok", commitar mudança de backend, ou quando o usuário pedir "verifica o backend", "boot real", "smoke test".
---

# Boot Real — verificação de backend que não mente

Motivação registrada em memória (`feedback-verificar-backend-pos-mudanca`):
o typecheck do backend/orchestrator **OOMa silenciosamente e sai 0** sem heap
ampliado, e "compilou" nunca provou que o Nest sobe (DI quebrada, módulo eager
conectando no import, env faltando). Esta skill é o gate antes de qualquer
"pronto" de backend.

## Quando NÃO serve

- Worktree sem `node_modules`/`.env`/DB: dá pra rodar `pnpm install` + copiar
  `.env` do checkout principal (validado 2026-07-03, memória `project-env-pnpm`).
  Se nem isso for possível, **declare explicitamente** que o boot não foi
  verificado e onde verificar — nunca declare "ok" sem boot.

## Passo 1 — Build real (não typecheck)

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
rtk pnpm run prisma-generate          # se schema.prisma foi tocado
rtk pnpm --filter ./apps/backend run build
rtk pnpm --filter ./apps/orchestrator run build   # se libs compartilhadas mudaram
```

Exit 0 **com** o heap ampliado é o único exit 0 que vale. Se o build passou em
menos tempo que o normal e sem output, desconfie de OOM mascarado — re-rode
verificando o log com `rtk err`.

## Passo 2 — Boot

```powershell
rtk pnpm run dev-backend    # ou só o backend, conforme a tarefa
```

Espere o log de rotas do Nest. Falhas típicas a caçar no log de boot:
- `Nest can't resolve dependencies` — provider esquecido em módulo;
- conexão de DB no import (módulo eager — padrão `pStore` já mordeu uma vez);
- env var nova sem valor no `.env` (adicione também ao `.env.example`, com
  placeholder óbvio — VOC-42).

Antes de sugerir Docker/WSL para "resolver" ambiente: **cheque o `.env`** — o
projeto usa Supabase/Upstash remotos, não Postgres/Redis locais (memória
`feedback-docker-confusion-recorrente`).

## Passo 3 — Matriz de curl

Para cada rota nova/alterada, no mínimo 3 chamadas:

| Caso | Esperado |
|---|---|
| Autenticado, org dona do recurso | 200 + payload correto |
| Sem auth | 401/403 |
| Autenticado, **recurso de OUTRA org** (troque o id) | 403/404 — nunca o dado |

A terceira linha é obrigatória: IDOR por `organizationId` é o achado nº 1 da
auditoria (VOC-01). Se a rota escreve, confirme o efeito com uma leitura em
seguida (GET pós-POST).

## Passo 4 — Sanidade pós-schema (só se `schema.prisma` mudou)

- Confirme que a mudança foi **aditiva**; mudança de tipo/coluna existente
  não passa por esta skill — pare e siga a seção 5 do CLAUDE.md (plano de
  migração + aprovação do Felipe).
- `db push` só com aprovação na conversa atual; **seed nunca roda de novo**.
- Depois do push: 1 query de leitura na tabela tocada via rota real (não via
  psql direto) confirmando shape.

## Saída esperada

Bloco curto: build (exit + heap usado) → boot (subiu? warnings relevantes) →
tabela da matriz de curl com resultados reais → pendências. Se qualquer linha
falhou, o veredito é **NÃO VERIFICADO** — corrija ou reporte, nunca suavize.
Termine com recomendação de modelo+esforço para o próximo passo.
