---
name: auditoria-glass
description: Auditoria arquivo-a-arquivo do débito visual Postiz — painéis com bg-newBgColorInner/bg-newBgColor sólidos pintados sobre containers glass (.voc-glass-*/.voc-content-shell), cluster maduro do Caderno do Zelador com ~44 arquivos pendentes. Use quando o usuário pedir "auditoria glass", "débito visual", "fundo sólido sobre glass", ou ao tocar qualquer tela listada como pendente (CRM, Religare, Volatis, billing, admin, launches).
---

# Auditoria Glass — zerar o débito visual Postiz sobre os shells Vocaccio

Contexto: cluster maduro em `docs/zelador/CADERNO.md` (2026-07-04). Painéis com
`bg-newBgColorInner`/`bg-newBgColor` (`#1a1919`/`#0e0e0e`, 100% opacos) dentro
de containers já migrados pra glass anulam a transparência do pai. Correção
pontual já foi feita em `launches.component.tsx` (3 ocorrências); **~44
arquivos seguem pendentes**. Meta registrada: zero débito visual Postiz até a
Fase 4.

**Regra central: NÃO é substituição global cega.** `bg-newBgColor*` é legítimo
em popover/dropdown/modal flutuante que precisa de opacidade. A troca só vale
quando o elemento está DENTRO de um shell glass.

## Passo 1 — Inventário vivo

```bash
rtk grep -rl "bg-newBgColorInner\|bg-newBgColor" apps/frontend/src --include="*.tsx"
```

Gere/atualize a lista de trabalho em `docs/zelador/auditoria-glass-progresso.md`
(crie se não existir) com formato:
`- [ ] caminho/arquivo.tsx — N ocorrências — área (CRM/Religare/Volatis/...)`
Marque `[x]` com data ao concluir cada um. Este arquivo é o estado entre
sessões — leia-o primeiro em toda retomada.

## Passo 2 — Triagem por arquivo (batch de 5–8 por sessão, não mais)

Para cada ocorrência, decida por inspeção do JSX (suba a árvore de containers):

| O elemento está… | Decisão |
|---|---|
| Dentro de `.voc-glass-*` / `.voc-content-shell` (direta ou via layout pai) | **Trocar** por `bg-transparent` ou token glass equivalente |
| Em popover/dropdown/tooltip/modal flutuante (Portal, z-index alto) | **Manter** — opacidade é legítima; anote "OK-flutuante" |
| Ambíguo (não dá pra saber o pai sem rodar) | **Verificar no browser** antes de trocar — nunca chute |

Dica: os layouts que aplicam shell ficam em `apps/frontend/src/components/new-layout`
e nos wrappers de página do App Router — confira qual layout envolve a rota
antes de decidir.

## Passo 3 — Verificação visual (obrigatória, econômica)

- Suba o frontend (checkout principal se o worktree não tiver ambiente) e abra
  cada tela alterada.
- Verifique via **DevTools/DOM** (computed background-color do painel =
  transparente; aurora visível atrás), não por screenshot em loop — screenshot
  só 1, no fim do batch, como prova (memória `feedback-context-economy`).
- Estados que escondem regressão: loading state, estado vazio, painel lateral
  colapsado — os 3 casos do `launches.component.tsx` original eram exatamente
  esses.

## Passo 4 — Commit por batch + registro

1. Commit por batch coerente (mesma área): `fix(glass): remove sólido Postiz sobre shell glass — <área> (N arquivos)`.
2. Atualize `auditoria-glass-progresso.md` (checkboxes + data).
3. Quando a lista zerar: atualize o cluster no `docs/zelador/CADERNO.md` de
   MADURO → **GRADUADO**, com data e commits.
4. `moody-revisor` no diff antes do commit; se o batch tocou telas de marca
   (aurora/aura), Hagrid valida aderência.

## Saída esperada

Por sessão: lista dos arquivos triados com decisão (trocar/OK-flutuante/
verificar), telas verificadas no browser, commit hash do batch, contagem
restante (`N de 44`). Termine com recomendação de modelo+esforço — este
trabalho é mecânico após a triagem: **Sonnet esforço baixo** costuma bastar;
Haiku só se a triagem já estiver anotada no arquivo de progresso.
