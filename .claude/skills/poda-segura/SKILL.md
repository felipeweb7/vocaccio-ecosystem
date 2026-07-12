---
name: poda-segura
description: Protocolo completo de remoção/quarentena de dependência ou módulo herdado do Postiz — grep de imports no monorepo inteiro, decisão remover×adormecer, pnpm install + build dos 3 apps, boot real com curl, commit isolado. Use SEMPRE que a tarefa envolver remover/desligar dependência, rota, provider ou módulo (plano-leveza), ou quando o usuário disser "podar", "remover dep", "quarentenar", "emagrecer".
---

# Poda Segura — remoção/quarentena de dependência ou módulo

Você está executando o eixo mais arriscado do `docs/auditoria/plano-leveza-2026-07.md`.
O sistema está em produção. A regra de ouro é inegociável:
**grep → decisão → install/build → boot real → commit isolado.** Nunca pule etapa.

## Passo 0 — Contexto (obrigatório, barato)

1. Leia a linha/onda correspondente em `docs/auditoria/plano-leveza-2026-07.md`
   (Fases 0→A→B→D→C→E). Se o alvo já tem veredito registrado (ex.: C1 =
   adormecer, C2 = on hold, B4 = não tocar), **obedeça o veredito** — não
   re-decida.
2. Confirme onde você está: worktree sem `node_modules`/DB **não valida boot**.
   Se for o caso, declare no início que a validação final acontece no checkout
   principal `C:\dev\vocaccio` e planeje o handoff.

## Passo 1 — Grep exaustivo (nunca pule)

Para CADA pacote/módulo alvo:

```bash
rtk grep -r "<nome-do-pacote>" apps/ libraries/ --include="*.ts" --include="*.tsx" --include="*.json"
```

- Busque também variações: subpath imports (`pacote/sub`), `require(`, uso em
  `package.json` de cada app, scripts, `patches/`, configs (`next.config`,
  `nest-cli`, jest).
- Classifique cada hit: **core em uso** / **morto** / **usado só por módulo já
  quarentenado**.
- Lição registrada (C1): `@copilotkit`/`@langchain`/`openai` "pareciam mortos"
  e eram core do editor/autopost. **Zero hits é a única prova de morte.**
  Um hit ambíguo = leia o arquivo.

## Passo 2 — Decisão: remover × adormecer × não tocar

| Situação | Decisão |
|---|---|
| Zero imports em código vivo, sem valor futuro declarado | **Remover** (dep + código morto) |
| Em uso, mas só por feature que Felipe quer manter em standby | **Adormecer**: flag env default-off + `dynamic()`/import dinâmico + singleton lazy (padrão Mastra/Polotno) — dep fica no package.json |
| Em uso core, ou veredito "fica" no plano (ex. billing) | **Não tocar** — reporte e encerre |
| Precisa de dado de produção pra decidir (ex. providers) | **Pare** — peça a query ao Felipe (padrão B3: `SELECT provider, count(*) FROM "Integration"...`) |

Remoção definitiva de dependência sempre pede confirmação explícita do Felipe
na conversa atual. Quarentena/adormecimento (reversível por env) não pede.

## Passo 3 — Execução

1. Edite código primeiro (remova imports/rotas/registries), depois `package.json`.
2. **`rtk pnpm install`** — obrigatório, regenera o lockfile. Nunca edite
   `pnpm-lock.yaml` na mão.
3. Atenção aos registries centrais que sempre esquecem: `integration.manager.ts`,
   `api.module.ts`, `show.all.providers.tsx`, `all.providers.settings.ts`,
   `app.module.ts` (módulos Nest eager que conectam no import — caso `pStore`).

## Passo 4 — Verificação (a parte que separa isto de uma poda cega)

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"   # sem isso o tsc OOMa e SAI 0 FALSAMENTE
rtk pnpm --filter ./apps/backend run build
rtk pnpm --filter ./apps/orchestrator run build
rtk pnpm --filter ./apps/frontend run build
```

- Build real, **não só typecheck**. Os 3 apps.
- **Boot real**: suba o backend e faça curl em ao menos: `/` (health), login,
  1 rota da área tocada. Se mexeu no frontend, abra a tela no browser.
- 1 referência perdida é normal (aconteceu no C3 com `web3.list.tsx`) — o build
  pega; corrija e re-rode.

## Passo 5 — Commit isolado + registro

1. **Um commit por onda/módulo** — rollback tem que ser `git revert` simples.
   Mensagem em pt: `chore(leveza): remove <alvo> (onda CN)` com o resumo do
   grep no corpo.
2. Atualize a linha da onda em `docs/auditoria/plano-leveza-2026-07.md` com o
   veredito real, data e commit hash (siga o formato das ondas C1/C3).
3. Rode `moody-revisor` no diff antes do commit; se tocou auth/deps sensíveis,
   `severus-security` também.
4. Push só com aprovação do Felipe.

## Saída esperada da skill

Relatório curto: alvo → veredito (remover/adormecer/não tocar) → evidência do
grep → resultado build/boot → commit hash → o que ficou pendente de validação
(se worktree sem ambiente). Termine com recomendação de modelo+esforço para a
próxima onda.
