# Guia de Migração e Prompt: System Design Vocaccio (2026-07-20)

Este documento "empacota" o que precisa ser feito para levar o system design
consolidado ao código real de cada IDE. Use como roteiro de handoff — cole o
bloco da seção 2 na próxima sessão de desenvolvimento (Claude Code, Codex,
Cursor, Windsurf etc.).

Fonte única e absoluta de direção visual: `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md`.
Não existe mais um `system-design-unificado-2026-06.md` nem um design system
paralelo por IDE — as três derivações permitidas (Volatis, Acto, Religare/LP)
estão listadas na seção 9 do consolidado.

## 1. Passo a passo da integração

Se a IA for executar o trabalho, seguirá esta ordem:

1. **Tokens (CSS/SCSS):** substituir hexadecimais espalhados e variáveis
   legadas do Postiz (`--new-*`) pelas variáveis base `--voc-*` do consolidado
   em Edwiges. Sem quebrar o código antigo: mapear (ex.: `--new-btn-primary`
   passa a chamar `var(--voc-violet)`).
2. **Tailwind Config:** ajustar a tipografia base para `Manrope`, e integrar
   utilitários de sombreamento Glass e gradientes Aurora (incluindo o Aurora
   Ramp expandido, seção 3 do consolidado) no Tailwind config.
3. **Injeção do Background Orgânico:** adicionar o componente das Auras
   (Ambient Glows) no arquivo principal da arquitetura do frontend (ex.:
   `layout.tsx`, `App.vue` ou index principal).
4. **Refatoração B2B dos Cards:** aplicar a diagramação B2B (borders suaves,
   sub-cards, encapsulamento de ícones) nos componentes compartilhados
   (painéis de configuração, CRM, listagens).
5. **Tratamento específico de LPs:** inserir vídeo/imagem de fundo e scroll
   motion (ver derivação Religare/LP) e o Orbital Effect isolado apenas em
   Hero de LPs com fundo escuro.

## 2. Prompt de execução (handoff)

Copie o bloco abaixo na íntegra e cole na sessão de desenvolvimento de
código. O texto carrega o contexto necessário para agir sobre o repositório.

> **Contexto:** O System Design unificado da Vocaccio (SaaS Premium B2B + Aura
> Mágica) está documentado em `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md`
> — essa é a fonte única e absoluta, cross-IDE. Não crie nem consulte nenhum
> outro arquivo de "system design" como se fosse fonte primária.
>
> **Objetivo:** Refatorar a base do Front-End (Estilos Globais, Tailwind e
> Layout Base) para injetar esse System Design sem quebrar as funcionalidades
> do sistema atual.
>
> **Plano de execução (siga esta ordem):**
> 1. **Variáveis e CSS Root:** abra o arquivo principal de estilos globais
>    (ex.: `globals.css` ou `colors.scss`). Inclua os tokens mãe:
>    `--voc-peach: #F29676`, `--voc-rose: #DF548E`, `--voc-violet: #7C5EE1`,
>    `--voc-blue: #23A6D6`, mais o Aurora Ramp expandido (seção 3 do
>    consolidado) para gradientes mais vivos. Mapeie variáveis legadas do
>    Postiz (ex.: `--new-btn-primary`) para referenciar esses tokens.
> 2. **Tailwind Config:** defina `Manrope` como sans-serif principal. Inclua
>    extensões para Box Shadow e Background referenciando os gradientes
>    `--voc-aurora` e sombras de Glassmorphism.
> 3. **Background Dinâmico (Ambient Glows):** no layout raiz, adicione a
>    camada inferior fixa (`inset: -10vw`) com 3 bolhas de gradiente radial
>    que se movem sutilmente via `translate`, para a "Aura Mágica" orgânica.
> 4. **Glassmorphism:** atualize o componente base de `Card` para o padrão
>    B2B: fundo semi-translúcido (`backdrop-filter: blur(48px)`), borda
>    extremamente sutil (0.08 opacidade) e sombreamento glass.
> 5. **(LP) Vídeo/imagem de fundo e scroll motion:** para landing pages, use
>    os assets e princípios da derivação Religare/LP
>    (`C:\dev\vocaccio-codex\docs\RELIGARE-LP-DIRETRIZES-VISUAIS-2026-07-20.md`)
>    — câmera travada entre cenas, movimento contemplativo, scroll motion como
>    primitiva de composição (implementação técnica é território da skill
>    `luna-gamedev`).
> 6. **(Opcional) Orbital Effect:** para LPs, prepare o Efeito Orbital com
>    `display: none` em Light Mode, nunca renderizado nas áreas internas de
>    SaaS.
>
> **Restrição crítica:** siga rigorosamente
> `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md` para valores
> hexadecimais, espaçamentos e raios. Não altere comportamento de JavaScript,
> mude apenas folhas de estilo, temas e marcações no DOM base. Peça aprovação
> no diff antes de seguir para a próxima etapa.
