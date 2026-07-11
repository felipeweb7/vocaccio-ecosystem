# Perguntas que só o Felipe pode responder

> Somente o que bloqueia decisão. Respostas devem ser registradas aqui mesmo, com data.

## Operação e relacionamento
1. **Grupo por projeto ou 1:1?** A Cloud API oficial tem suporte limitado a grupos. O modelo de
   atendimento será grupos WhatsApp por projeto (exige revisitar a rota técnica no piloto) ou
   conversa 1:1 com um contato-chave por cliente (encaixa perfeito na Cloud API)? *Bloqueia a
   arquitetura do piloto P2.*
2. Qual é o SLA de resposta que a agência promete (ou quer prometer) hoje? *Calibra debouncer e
   escalonamento.*
3. Que situações devem SEMPRE chegar a você, mesmo quando a automação estiver madura? *(rascunho
   A5 no plano §15 — validar/editar a lista).*

## Autonomia e aprovações
4. "Pode postar" numa mensagem de WhatsApp vale como aprovação formal? E aprovação por emoji (👍)?
   Ou aprovação só vale no portal `/aprovar/[token]`? *Bloqueia o comando `ApproveContent` via bot.*
5. Quem além de você pode: alterar prazo? aceitar escopo adicional? aprovar conteúdo? (mapear para
   `VocaccioRole`.) *Bloqueia a policy engine.*
6. Qual taxa de erro é aceitável antes de suspender uma automação? (ex.: 1 comando errado em 50).
   *Bloqueia o limiar do ADR-17.*

## Identidade e transparência
7. O bot fala como **Vocaccio**, como **você**, ou como "assistente identificado da equipe"?
   *Bloqueia o Response Composer e o aviso de transparência.*
8. Clientes serão avisados explicitamente de que há IA processando o grupo/conversa? Com que
   redação? *(recomendação: sim, sempre — mas a redação é decisão sua + advogado).*

## Dados e privacidade
9. Retenção: 30 dias para mensagens não acionáveis está bom? Quanto tempo para áudios?
10. Você tem (ou quer contratar) apoio jurídico para: DPA com clientes, aviso de IA, cláusulas de
    transferência internacional? *Sem isso, o piloto P2 não deve tocar dados reais.*

## Comercial e preços
11. Faixas reais de preço/prazo por `ServiceOffering` (pendência aberta desde AT-0 §7.3).
    *Bloqueia a skill `ops-proposta` e o AT-3.*
12. Billing do Ateliê: avulso por `ServiceRequest` ou incluído em planos? *Pendência AT-0.*

## Infraestrutura e WhatsApp
13. Qual número será usado no piloto (novo empresarial? chip atual da agência?) e quem é o admin
    do Meta Business Manager para a verificação de negócio?
14. O plano gratuito atual (Vercel/Railway) recebe o webhook do piloto, ou você prefere adiar
    qualquer webhook para P3?

## Equipe
15. Além de você e o Nicolas, alguém operará o cockpit `/atelie/fila` nos próximos 6 meses?
    *Calibra RBAC e treinamento das skills ops-*.*
