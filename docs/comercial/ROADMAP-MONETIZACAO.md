# Roadmap de Monetização — Vocaccio (2026-07-09)

> Auditoria de consultor: projetos, ofertas, fluxos, precificação e alocação de tempo.
> Escrito para ser executável por um modelo menos capaz — cada jogada tem o porquê,
> os passos exatos, o critério de "pronto" e o prompt literal para rodar.
> Dono do documento: Felipe. Fases de produto continuam no `PLANO-MESTRE.md`
> (ver Camada 17.5, que aponta pra cá).

---

## O diagnóstico em uma página

**O que existe (auditado no repo e na memória):**
- Plataforma em produção: CRM, portal de aprovação (Fase 2 ~90%), Volatis
  (carrosséis + GPT Redator), Religare com cálculos validados contra fonte
  externa e 2 PDFs desenhados, Ateliê Virtual AT-1 validado ponta a ponta.
- Marca com posicionamento raro e defensável (`docs/BUSINESS-PLAN.md`):
  "essência → presença", anti-growth-agressivo, arquétipos claros.
- Time de agentes de dev maduro, skills, planos, auditorias de segurança.

**O que NÃO existe (e é onde o dinheiro mora):**
- **Nenhuma oferta escrita.** Não há um documento que diga o que se vende,
  para quem, por quanto e com qual entrega.
- **Nenhum preço.** Zero documentos de precificação em `docs/`.
- **Nenhum funil.** Nenhuma landing de venda, nenhum pipeline de conversas,
  nenhum registro de proposta enviada.
- **Uso real baixíssimo:** a query B3 em produção (2026-07-03) retornou
  `total=0` integrações de canal conectadas. A plataforma "em produção com
  muitos usuários" tem, na prática, quase nenhum uso ativo mensurável.
- **Receita do Vocaccio: R$ 0.** Tudo até aqui foi financiado por tempo.

**Para onde o tempo foi (evidência, não opinião):** o índice de memória do
projeto tem ~35 entradas; a maioria é engenharia do ecossistema de agentes
(Filch, Griphook, skills, economia de tokens), sistema de design e fases de
produto. **Zero entradas sobre cliente, proposta, preço ou venda.** O padrão
dos commits é o mesmo. O tempo está indo ~90% para construir e refinar a
ferramenta, ~10% para polir o plano da ferramenta, e ~0% para vender qualquer
coisa com ela.

**A tese do consultor:** o Vocaccio não tem problema de produto — tem produto
demais para a receita que existe. O ativo mais vendável **hoje** não é o SaaS
(Fase H, última); é o **serviço produtizado entregue COM a plataforma**:
leitura Religare + presença/conteúdo operado via Volatis/Ateliê. Vender
serviço primeiro não é desvio do plano — é o teste de demanda mais barato
possível do próprio SaaS, com margem para financiar o resto.

---

## As jogadas, ranqueadas por retorno esperado

### Jogada 1 — Oferta Âncora: a Leitura Religare produtizada
**Retorno esperado: primeira receita em 2–4 semanas, sem escrever código novo.**

**Por quê:** é o único ativo do ecossistema que é simultaneamente (a) pronto
(cálculos validados, 2 PDFs), (b) diferenciado (ninguém no mercado de social
media entrega isso), (c) entregável manualmente hoje via Ateliê AT-1, e
(d) alinhado ao mote da marca ("antes de produzir mais, reconheça de onde sua
comunicação nasce" — frase que já está no BUSINESS-PLAN). Vender leitura não
canibaliza o SaaS: é o degrau de entrada dele.

**Passos exatos:**
1. Escrever a oferta em 1 página: **"Leitura de Essência Vocaccio"** —
   entrega = PDF Vocacional + sessão de devolutiva de 60min + 1 mapa de
   comunicação (3 pilares de conteúdo derivados da leitura). Público:
   terapeutas, experts e criadores da rede do Felipe.
2. Preço de teste: **R$ 497** (hipótese a validar, não verdade). Regra do
   teste: se 5 dos 5 primeiros comprarem sem objeção, o preço está baixo —
   sobe pra R$ 797 no lote seguinte. Se ninguém comprar em 10 conversas,
   o problema é oferta/público, não preço — volta pro passo 1.
3. Versão B2B da mesma oferta: **"Leitura de Marca"** para o expert que já
   tem negócio — R$ 1.497 com o segundo PDF + plano de presença de 30 dias
   (gerado no Volatis, aprovado no portal). Essa versão usa a plataforma
   inteira como diferencial de entrega.
4. Sem landing page nova nesta jogada — a venda é por conversa direta
   (WhatsApp/DM). Landing é a Jogada 3, depois de 5 vendas provarem o texto.

**Pronto quando:** oferta de 1 página escrita e aprovada pelo Hagrid (aderência
de marca) + preço de teste definido + **primeira venda registrada** (pix caído,
não promessa).

**Prompt para um modelo menos capaz:**
```
Leia docs/BUSINESS-PLAN.md e docs/comercial/ROADMAP-MONETIZACAO.md (Jogada 1).
Convoque weasley-growth e hagrid-brand. Escreva a oferta de 1 página da
"Leitura de Essência Vocaccio" (R$ 497) e da "Leitura de Marca" (R$ 1.497):
promessa, entregáveis, para quem é / para quem não é, como comprar, FAQ de 5
perguntas. Tom: o do BUSINESS-PLAN — sem linguagem coach genérica, sem promessa
de viralização, sem gatilho gritado. Salve em docs/comercial/oferta-ancora.md.
Hagrid valida antes de fechar. Não crie página web — é texto pra conversa
direta. Não toque em código.
```

---

### Jogada 2 — Pipeline de 20 nomes / 10 conversas / 3 vendas
**Retorno esperado: transforma a Jogada 1 em receita repetível; dá o primeiro dado real de demanda.**

**Por quê:** oferta sem pipeline é documento. O Felipe tem o ativo que
fundador nenhum de SaaS early tem: uma agência com clientes reais e uma rede
de terapeutas/experts (o público exato do Religare). O custo de aquisição da
primeira dezena de clientes é uma lista e mensagens pessoais — não tráfego.

**Passos exatos:**
1. Listar 20 nomes reais: clientes atuais da agência, terapeutas conhecidos,
   experts da rede. Coluna: nome, canal de contato, por que a leitura serve
   pra ele, qual das 2 ofertas.
2. Mensagem de abertura individual (não broadcast), 3–4 linhas, coerente com
   a marca: contexto pessoal → o que é a leitura → convite pra conversa de
   15min. Sem pitch na primeira mensagem.
3. Meta mecânica: 20 mensagens → 10 conversas → 3 vendas. Registrar tudo
   (nem que seja numa planilha ou no próprio CRM do Vocaccio — dogfooding).
4. Cada entrega vira insumo: gravar a devolutiva (com permissão), guardar
   reação/depoimento. Isso alimenta a Jogada 3.

**Pronto quando:** 20 mensagens enviadas + 10 conversas feitas + resultado
registrado (mesmo que seja 0 vendas — dado negativo também é dado; nesse caso
a Jogada 1 volta pra mesa com o aprendizado das conversas).

**Prompt para um modelo menos capaz:**
```
Leia docs/comercial/oferta-ancora.md e docs/BUSINESS-PLAN.md. Convoque
weasley-growth. Escreva: (1) o template da mensagem de abertura 1-a-1 em 3
variações (cliente atual da agência / terapeuta conhecido / expert frio),
(2) o roteiro da conversa de 15min com as 3 perguntas de qualificação e o
momento exato de falar preço, (3) a planilha-modelo de pipeline (colunas).
Salve em docs/comercial/pipeline-playbook.md. Hagrid valida o tom. A lista de
20 nomes é do Felipe — deixe a tabela vazia pronta pra ele preencher. Não
envie nada; quem envia é o Felipe.
```

---

### Jogada 3 — Landing de venda + prova social (só depois de 3 vendas)
**Retorno esperado: destrava venda sem conversa 1-a-1; primeiro ativo de escala.**

**Por quê:** landing antes de venda validada é decoração. Depois de 3 vendas,
o texto que converteu nas conversas vira o texto da página — copy provada, não
imaginada. A página usa o efeito orbital/aurora onde a marca manda (hero de LP
= uso "Alta" no BUSINESS-PLAN) e vira o destino de todo tráfego orgânico.

**Passos exatos:**
1. Extrair das conversas das Jogadas 1–2: as 3 objeções mais ouvidas, as
   palavras que os compradores usaram, o momento do "sim".
2. Página única no próprio frontend (rota pública): promessa, como funciona,
   2 depoimentos reais, preço, botão de compra (link de pagamento simples —
   Stripe/pix, sem gateway complexo nesta fase).
3. Fred e Jorge escrevem a copy (skill `copywriting` + `cro`), Flitwick
   implementa, Hagrid valida marca, `impeccable` audita a tela.

**Pronto quando:** página no ar em produção + 1 venda originada por ela (link
enviado sem conversa prévia → compra).

**Prompt para um modelo menos capaz:**
```
Pré-condição: docs/comercial/pipeline-playbook.md com ≥3 vendas registradas —
se não houver, PARE e devolva "Jogada 3 ainda não destravada". Caso contrário:
convoque weasley-growth (copy, skills copywriting+cro), depois flitwick-frontend
(implementação em apps/frontend, rota pública, tokens --voc-*, orbital só no
hero), hagrid-brand (validação) e a skill impeccable (auditoria final).
Conteúdo da copy vem das objeções/palavras registradas no pipeline. Botão de
compra = link de pagamento externo fornecido pelo Felipe. Verificar no browser
real antes de reportar pronto.
```

---

### Jogada 4 — Destravar o Nicolas (o multiplicador parado)
**Retorno esperado: dobra a capacidade de execução sem custar tempo do Felipe de forma recorrente.**

**Por quê:** há um sócio (Nicolas/Actus Clip) bloqueado por um pacote pendente
(`docs/handoff-nicolas/PENDENTE-proximo-pacote.md`). Sócio parado é o custo
invisível mais caro da operação: cada semana de bloqueio é uma semana em que
100% da execução depende do Felipe. Compilar o pacote é trabalho de horas, não
de semanas, e o retorno é permanente.

**Passos exatos:**
1. Ler o rastreador `docs/handoff-nicolas/PENDENTE-proximo-pacote.md` e
   compilar o pacote completo (design "Caminho do Meio" atualizado, Ateliê
   Virtual, Konva no lugar do Polotno, ambiente Mac dele).
2. Incluir no pacote uma frente comercial: se o Nicolas pode vender/entregar
   Actus Clip integrado, ele entra no pipeline da Jogada 2 com a linha de
   vídeo.
3. Entregar e marcar a conversa de alinhamento.

**Pronto quando:** pacote entregue ao Nicolas + primeira tarefa dele destravada
e em andamento (confirmação dele, não suposição).

**Prompt para um modelo menos capaz:**
```
Leia docs/handoff-nicolas/PENDENTE-proximo-pacote.md e a memória
project-nicolas-actus e project-pacote-nicolas-pendente. Compile o pacote
completo de handoff pro Nicolas (Mac, bash/zsh/Homebrew): o que mudou desde o
último pacote, decisões que o afetam (Konva substitui Polotno, Ateliê Virtual,
design Caminho do Meio), passos de setup, e o que se espera dele nas próximas
2 semanas. Salve como um único doc em docs/handoff-nicolas/ com data. Não
invente decisões — o que não estiver registrado, liste como "pergunta aberta
pro Felipe".
```

---

### Jogada 5 — Retainer "Presença Operada" para clientes da agência
**Retorno esperado: receita recorrente (MRR de serviço) usando a plataforma inteira; o precursor real do SaaS.**

**Por quê:** o degrau entre "leitura avulsa" e "SaaS self-service" é o serviço
recorrente operado: a agência do Felipe usa Vocaccio (Volatis + portal +
Sincronário) para operar a presença do cliente por assinatura mensal. Cada
retainer é um usuário real da plataforma, gerando o uso que hoje não existe
(`Integration` total=0) e o feedback que nenhuma fase de produto substitui.
Quando houver 5–10 retainers rodando, o white-label (Fase H) deixa de ser
aposta e vira migração.

**Passos exatos:**
1. Estruturar 2 tiers de retainer (hipóteses a validar): **Presença**
   R$ 1.500/mês (leitura inicial + 8 posts/carrosséis/mês aprovados via
   portal) e **Presença + Growth** R$ 3.000/mês (dobro de volume + relatório
   mensal + 1 sessão de direção).
2. Oferecer primeiro aos clientes atuais da agência (migração do que já é
   feito manualmente para o fluxo Vocaccio — o cliente ganha portal e
   consistência, o Felipe ganha margem por eficiência).
3. Cada cliente de retainer conecta canais de verdade → a plataforma passa a
   ter uso real mensurável.

**Pronto quando:** tabela de tiers escrita + 2 clientes em retainer operando
DENTRO do Vocaccio (posts agendados, aprovação via portal — verificável no
banco).

**Prompt para um modelo menos capaz:**
```
Leia docs/comercial/ROADMAP-MONETIZACAO.md (Jogada 5) e docs/BUSINESS-PLAN.md.
Convoque weasley-growth e hagrid-brand. Escreva a página interna de oferta dos
2 tiers de retainer (Presença R$1.500 / Presença+Growth R$3.000): o que entra,
o que não entra, SLA de aprovação via portal, política de revisões, cláusula
de saída. Formato: proposta-modelo pronta pra personalizar por cliente
(Cormorant na abertura, Manrope no escopo/valores, como manda o BUSINESS-PLAN).
Salve em docs/comercial/retainer-tiers.md. Não crie código nem tela.
```

---

### Jogada 6 — Precificação escrita em escada (o documento que falta)
**Retorno esperado: coerência entre todas as jogadas; elimina o improviso de preço conversa a conversa.**

**Por quê:** hoje cada preço citado acima é hipótese solta. Um documento único
de escada de valor (leitura avulsa → leitura de marca → retainer → futuro
SaaS/white-label) impede as duas mortes clássicas: cobrar barato demais por
âncora errada, e ofertas que competem entre si. Também registra o princípio:
**preço do SaaS não se decide agora** — se decide com os dados dos retainers.

**Passos exatos:**
1. Consolidar: R$ 497 (entrada) → R$ 1.497 (leitura de marca) → R$ 1.500–3.000/mês
   (retainer) → SaaS = TBD pós-retainers.
2. Para cada degrau: o que inclui, margem estimada (tempo do Felipe/Nicolas ao
   custo de oportunidade), gatilho de upgrade pro degrau seguinte.
3. Regra de revisão: preços re-avaliados a cada 5 vendas ou 60 dias, o que
   vier primeiro — com base no registro do pipeline, não em sensação.

**Pronto quando:** `docs/comercial/precificacao.md` existe, com a escada, as
margens e a regra de revisão — e as Jogadas 1/5 apontam pra ele.

**Prompt para um modelo menos capaz:**
```
Leia docs/comercial/oferta-ancora.md, retainer-tiers.md e o registro de vendas
do pipeline (se existir). Escreva docs/comercial/precificacao.md: a escada de
valor completa (leitura → leitura de marca → retainer → SaaS TBD), o que cada
degrau inclui, margem estimada, gatilho de upgrade, e a regra de revisão (a
cada 5 vendas ou 60 dias). Se não houver dado real de venda ainda, marque cada
número como HIPÓTESE em destaque. Griphook revisa a coerência de custo.
```

---

## As três coisas para PARAR de fazer (raciocínio por inteiro)

### 1. Parar de engenheirar o ecossistema de agentes/skills até a primeira receita.

O time HP, o Filch, o Caderno, as skills, a economia de tokens — tudo isso é
engenharia de alavanca, e ficou genuinamente boa. Mas alavanca só multiplica
força que existe: com receita zero, a alavanca multiplica zero. O padrão nos
registros é claro: rondas de calibração, doutrinas estudadas, agentes
treinados, skills auditadas — cada sessão dessas é uma sessão que não foi uma
conversa de venda, e o retorno dela só se realiza QUANDO houver operação
comercial usando a alavanca. Pior: meta-trabalho tem recompensa psicológica de
progresso ("o sistema está melhor") sem o risco de rejeição que a venda tem —
é a procrastinação mais sofisticada que existe, porque parece trabalho duro.
**Regra:** o ecossistema está congelado como está. Nenhum agente novo, nenhuma
skill nova, nenhuma ronda de refinamento até a primeira venda da Jogada 1.
Exceção única: correção de erro que esteja ativamente bloqueando trabalho.

### 2. Parar de polir visual além do funcional antes de ter olhos de cliente pagante.

A Fase 3.5, a auditoria glass de 44 arquivos, o sistema de primitivos — são
dívida real e o instinto de resolver é correto. Mas o dado de produção muda a
urgência: `Integration` com total=0 significa que quase ninguém está VENDO
essas telas. Polimento visual gera retorno quando multiplica a percepção de
quem usa; sem usuários pagantes, é estoque de qualidade parado. E há um risco
composto: cada rodada de polimento redefine o padrão ("agora tudo precisa
ficar no nível da tela nova"), esticando a própria Fase 3.5 indefinidamente —
o histórico das sessões mostra exatamente isso acontecendo. **Regra:** Fase
3.5 fecha com o escopo que já está escrito (auditar Volatis/portal) e nada
mais entra nela. A auditoria glass roda pela regra do escoteiro (arquivo
tocado por outro motivo = corrige junto, a skill `auditoria-glass` já faz
isso), não como frente dedicada. Polimento dedicado volta quando houver
retainer pagante reclamando de tela — aí é priorização por cliente, não por
perfeccionismo.

### 3. Parar de expandir produto (qualquer Fase ≥4 e aprofundamentos do Religare) antes de 3 clientes pagantes.

O plano tem Fases 4–10, G, H, MBTI, Eneagrama, astrologia natal, Sibila por
LLM, Kanban-bot, Comunidade das Comunidades. Cada uma é boa ideia — e é
exatamente por isso que são perigosas: ideia boa não precisa de defesa, então
entra na fila sem pagar pedágio. O custo real de cada fase nova não é só o
tempo de construir; é o tempo de manter, o peso no monorepo (a lição inteira
do plano de leveza é sobre o custo de código que ninguém usa — o Postiz fez
isso e o Vocaccio herdou a conta), e o adiamento do único teste que importa:
alguém paga? O produto atual já é maior que a demanda comprovada por ele.
**Regra:** gate de monetização explícito no PLANO-MESTRE — Fase 4 em diante
só inicia com 3 clientes pagantes ativos (leitura ou retainer). O que pode
rodar em paralelo às jogadas: fechar Fase 2 (100% — o portal é parte da
entrega do retainer), fechar Fase 3.5 no escopo congelado, e AT-3 quando 3.5
fechar (o Ateliê é motor de entrega das ofertas). Nada além disso.

---

## Onde o tempo do Felipe deve ir (proposta de alocação semanal)

| Frente | Antes (estimado pelos registros) | Proposto até a 1ª venda |
|---|---|---|
| Vender (Jogadas 1, 2, 5 — conversas, propostas) | ~0% | **50%** |
| Entregar (leituras, retainers, agência) | — | 25% |
| Produto (fechar F2 e F3.5 congeladas, bugs) | ~70% | 20% |
| Meta-trabalho (agentes, skills, planos, polish) | ~30% | **5%** |

A régua honesta: **numa semana em que nenhuma mensagem de venda foi enviada,
nenhum trabalho de produto deveria ter acontecido.** Produto é o prêmio da
semana, não o padrão dela.

---

## Sequência e gates (resumo executável)

```
AGORA (paralelo):  Jogada 1 (oferta) + Jogada 4 (Nicolas) + Jogada 6 (precificação-hipótese)
SEMANA SEGUINTE:   Jogada 2 (pipeline 20/10/3) — enquanto F2 fecha os 10% finais
APÓS 3 VENDAS:     Jogada 3 (landing) + Jogada 5 (retainers com clientes da agência)
APÓS 3 PAGANTES:   gate do PLANO-MESTRE abre → Fase 4+ volta à mesa, com dados
```

Modelo recomendado para executar as jogadas: **Sonnet esforço baixo-médio**
(são tarefas de escrita/estratégia com fontes claras — Fred e Jorge + Hagrid);
**nenhuma exige Opus**. A única exceção é a Jogada 3 (implementação de landing),
que segue o fluxo normal de UI (Flitwick, Sonnet médio).
