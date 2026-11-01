# Auditoria do pedido de mudança: revisão dos cortes e unidade 1 (decisões 321 a 324)

Data: 2026-11-01. Auditor: `auditor-curricular`. Só relato: nada do mapa, do código ou do conteúdo foi editado; o relatório de palavras vistas
(`dados/RELATORIO-palavras-vistas.md`) **não** foi regravado (comparei o mapa de antes, `HEAD~1`, com o de agora em memória, com `naoGravar`).

**O que mudou** (commit `187d885`): 23 palavras que tinham ido para nota de vocabulário, ficado só em frase ou saído por causa do limite antigo de
palavras por unidade voltam a ser cartão (lista aprovada pela dona em `dados/revisao-dos-cortes.md`); *le portable* e *le mail* passam do A2 para o A1;
*l'écran* volta no A2; 5 notas de vocabulário do A1 que ficaram vazias saem; a nota "Outras palavras de países" fecha a lista; na unidade 1
("Cumprimentar e se despedir", módulo "Apresentar-se"), *salut / coucou* passa a "oi / olá" e a frase do cartão *pardon* passa a *Pardon ? Vous pouvez répéter ?*.

**Rodado**: `node fr/scripts/curriculo_mapa.js --conferir` (todas as 9 conferências ok, nenhum cartão publicado fora do mapa);
`tests/curriculo/test_mapa_totais.js` 71/71, `test_palavras_vistas.js` 50/50, `test_papel_frases.js` 18/18; relatório de palavras vistas em memória:
antes 272 textos com achado e 527 palavras não vistas, agora **267 e 519**.

## Bloqueia

Nada bloqueia. As contas batem, nenhuma palavra fica com dois cartões, nenhum cartão publicado muda de lugar e nenhuma gramática perde a versão grátis.

## Editor corrige (sem decisão nova)

1. **Versão grátis citando nota que saiu.** A unidade "Gramática: verbos pronominais" (módulo "Rotina e calendário", `A1-g18`) ainda diz no `mapa.json`
   (`versao_gratis_texto`) "cartões *se réveiller, se lever* e a nota 'Mais sobre rotina'". A nota saiu; o `08` já foi corrigido ("*se réveiller, se lever* e
   *se coucher*"). Recomendação: copiar o texto do `08` para o `mapa.json`.
2. **Regra 14 do `15` com frases que a 323 desmentiu, sem aviso.** No parágrafo das decisões 206, 216, 242 e 251 (linhas ~97 a 101) continua escrito, como se
   valesse hoje: *le portable* e *le mail* "são cartões só no A2"; *le menu* "não é cartão"; *le balcon* "só na nota 'Outras palavras de moradia'";
   *la faute* "deixou de ser cartão". Recomendação: acrescentar "(revisto pela decisão 323)" em cada trecho, como já foi feito na regra 13.
3. **Mesma coisa no `08`**, seção da regra 14 (linha ~405): "*le balcon* só na nota 'Outras palavras de moradia' (A1 M7.1)". Recomendação: marcar
   "revisto pela 323: cartão de 'Tipos de moradia e cômodos'".
4. **Frase que usa *adorer* antes do cartão.** *Les parents adorent leurs enfants.* (`A1-4-p8`, frase publicada da unidade "Apresentar a família", módulo
   "Família e pessoas próximas") continua usando *adorer* antes de ele virar cartão em "Gostos e pedidos no café" (módulo "Comer e beber", dois módulos
   depois). A revisão dos cortes dizia que a volta do cartão "dispensa trocar frases com *adorer*"; isso só vale para as frases que vêm depois (ditado `d6-p2`,
   *J'adore écouter de la musique.*, *Elle adore danser et chanter.*). A frase já fica pela decisão 211 (frase com tradução que ilustra cartão daqui).
   Recomendação: registrar o papel *só exemplo* dela em `dados/frases_na_frase.json`, para nunca ir a Ponto de verificação, ditado ou Desafio.
5. **Rascunho da unidade 1**: o `_doc` de `piloto-m1/A1-1/A1-1.json` diz que os campos `en` "ficam null até a aprovação da dona", mas *salut / coucou* já
   tem "hi / hello" (aprovado pela dona na 321, A6). Recomendação: dizer "salvo os aprovados (321)".
6. **Relatório de palavras vistas desatualizado** (gerado em 2026-10-29). Na implementação, regravar: somem 9 achados (ver Ok) e aparece 1 novo (ver
   decisão D3). Recomendação: regravar junto com o commit da implementação, não antes.

## Precisa de decisão da dona (contexto e recomendação)

**D1. Alunos que já concluíram unidades publicadas que ganham cartão.** Seis unidades que já estão no site recebem cartões novos: "Apresentar a família"
(+2: *les grands-parents, marié / mariée*), "Descrever a aparência" (+3: *beau / belle, long, court*), ambas do módulo "Família e pessoas próximas";
"Dizer as horas e a rotina" (+1: *se coucher*, módulo "Rotina e calendário"); "Gostos e pedidos no café" (+1: *adorer*, módulo "Comer e beber");
"Perguntar o preço e pagar" (+3: *en espèces, le portable, le mail*, módulo "Compras", que tem 6 cartões publicados); "Tipos de moradia e cômodos"
(+4: *le studio, l'immeuble, le jardin, le balcon*, módulo "Casa e moradia"). Nenhum cartão publicado muda de chave, unidade ou nível (as 23 têm chave
nova; nenhuma está em `fr/content.js`, `fr/published_ids.json` ou `fr/curriculum-changes.js`), então o FSRS (a memória de cada cartão) não corre risco. A dúvida
é o que acontece com quem já concluiu a unidade: a decisão 315 escolheu a **opção (a)** (quem concluiu recebe os cartões novos direto na Revisão), mas só para
a unidade 1. **Recomendo** estender a opção (a) a todas as unidades que ganham cartão, como regra geral, para não reabrir unidade concluída nem mexer no
Ponto de verificação de quem já passou.

**D2. Tempo dos módulos.** O tempo do A1 é digitado (decisão 300) e não mudou: o A1 continua com ~31h00, mesmo com +16 cartões e +2 lições (uma a mais em
"Pedir no restaurante", que vai de 10 a 12 cartões, e uma em "Tipos de moradia e cômodos", de 10 a 14). Pela regra antiga de estimativa (o `ACHADOS` item 26
fez a conta), "Comer e beber" iria de ~3h50 a ~4h15 e passaria do teto de 3h55 (regra 16 do `15`), e "Casa e moradia" iria a ~3h30. Pela medição real
(~45 s por cartão, confiança baixa), seriam só ~12 min no A1 inteiro. A regra 16 está "em revisão" desde a 308, mas o texto ainda diz "sem exceção".
**Recomendo** a dona dizer de vez que a regra 16 fica suspensa até a nova medição de tempo (ou trocar o teto pelo tempo medido), para o validador não dar um
"ok" que só existe porque o tempo não é recalculado.

**D3. *les Pays-Bas* na gramática de países.** A nota "Outras palavras de países" ("Países e cidades", módulo "Viagem e férias") foi fechada para servir à
"Gramática: preposições com cidades e países" (logo depois, no mesmo módulo; decisão 324). Mas pela regra de palavras vistas, palavra de nota só conta como
vista em diálogo (decisões 225 e 253), não em exercício de gramática. Resultado: duas frases publicadas dessa gramática passam a acusar *Pays-Bas* como não
vista (*Elle est aux Pays-Bas.*, tela 3; *Ils vivent aux Pays-Bas.*, exercício 4). Antes não acusavam porque o nome não estava em lista nenhuma. Opções:
(a) exceção só para essa gramática no `excecoes.json` (as palavras da nota contam como vistas lá); (b) a própria gramática apresenta *les Pays-Bas* com
tradução. **Recomendo (a)**: é o motivo de a lista existir.

**D4. Forma dos adjetivos que voltaram.** A revisão dos cortes falava em *beau, bel, belle* e em pares *bavard / bavarde* e *paresseux / paresseuse*; o mapa ficou
com *beau / belle*, *long*, *court*, *bavard*, *paresseux* (só masculino, como os outros adjetivos da unidade). Fica faltando *bel* (antes de vogal: *un bel
homme*) e o feminino irregular *longue*. **Recomendo** manter os cartões como estão e pôr uma linha de *bel* e de *longue* na nota "lugar do adjetivo" de
"Descrever a aparência" (é a versão grátis da "Gramática: adjetivos", módulo "Compras"); no A2, o feminino de *bavard* e *paresseux* já é sabido.

**D5. *salut / coucou* = "oi / olá" (decidido na 321; só confirmar o risco).** Em pt-BR, "olá" soa mais neutro, quase formal, e *coucou* é o mais íntimo dos
dois (família, amigos próximos). Com a barra, o aluno pode ler *coucou* = "olá". O contexto está nas notas, como a dona pediu. **Recomendo** manter a tradução e
conferir se a nota de registro da unidade diz em uma linha que *coucou* é o mais carinhoso dos dois.

## Atenção (não exige ação agora)

- **Regra 13 nova (3 a 5 cartões por lição) não é conferida nessas 13 unidades.** O código só confere unidades com `licao` em cada cartão (hoje só a
  unidade 1). Pela conta, todas cabem (12 a 14 cartões em 4 lições = 3 ou 4 por lição; nenhuma passa do aviso de ~18; a maior tem 14). Mas o número de
  lições ainda sai da regra antiga (`palavrasAte3Licoes`: até 10 palavras, 3 lições; acima, 4): por isso "Pedir no restaurante" ganhou uma lição (12 cartões,
  4 lições de 3), quando a revisão dos cortes previa 3 lições de 4. Já registrado no `ACHADOS` (item 26).
- ***beau / belle*** (cartão de "Descrever a aparência") x ***il fait beau*** (cartão publicado `A1-13-v0` de "Falar do tempo e das estações", módulo "Viagem e
  férias"): expressões diferentes, o validador da regra 14 aceita. Fica bem: *beau* vem antes.
- ***le mari*** e ***marié / mariée*** na mesma unidade ("Apresentar a família"): lexemas diferentes; convém não ficarem na mesma lição (sons e grafia parecidos).
- **"Pedir para repetir"** está no "Consigo..." do módulo "Apresentar-se", mas a frase *Pardon ? Vous pouvez répéter ?* é só exemplo (não vai para Ponto de
  verificação). A função continua cobrável pelo cartão *pardon* e pelo exemplo *Pardon ?* "Como? / Pode repetir?" da nota "Pardon, excuse-moi ou excusez-moi?".
- **Regra 15 (revisar Pontos de verificação)**: os Pontos de verificação das seis unidades publicadas de D1 vão ganhar cartões novos para cobrar; revisar na
  implementação. Notificações (`STUDY_ITEM_GATE` do `notification-cron`): o mapa do cron só muda quando o conteúdo for implementado; aí repetir o deploy.

## Ok

- **Contas** (script, `08`, `00`, `ACHADOS` e teste batem): A1 **382** cartões (**757** A/B = 382 × 2 − 7), ~153 lições, **128** notas (133 − 5), ~31h00;
  por módulo 66/38/51/52/36/29/39/41/30. A2 **433** (423 novos + 10 publicados; **862** A/B = 433 × 2 − 4), ~178 lições, 76 notas, ~33h10; por módulo
  49/36/35/48/36/38/48/48/47/48 (428 + 7 − 2). Antes: A1 366/725/~151/133; A2 428/852.
- **Regra 14**: cada uma das 23 é cartão numa unidade só. *le portable* e *le mail* são cartão só em "Perguntar o preço e pagar" (módulo "Compras"); no A2,
  "Telefonar e deixar recado" (11 cartões) e "Internet e redes" (12, com *l'écran*), ambas do módulo "Comunicar e se relacionar", usam só em frase.
  *marié / mariée* ("Apresentar a família") x *se marier* ("Contar as fases da vida", módulo "Lembranças e fases da vida"): dois cartões, registrado na
  regra 14 com o precedente *goûter / le goûter*. *en ligne* ("Comprar on-line e reclamar") x *la ligne* ("Telefonar e deixar recado"): já resolvido (190).
- **Regra 11 (cada cartão vem antes do uso)**: com o mapa novo, 9 textos publicados deixam de ter palavra não vista: o ditado `d6-p2` (*J'adore le week-end !*);
  *J'adore écouter de la musique.* e *Elle adore danser et chanter.* ("Falar de lazer"); *Il n'y a pas de jardin.* e *La fenêtre donne sur le jardin.* e as
  duas opções do "Você entendeu?" com *balcon* ("Tipos de moradia e cômodos"); *Aujourd'hui, il fait beau.* ("Dizer o dia e combinar"); o Desafio de
  Expressão `expr-a1m2-005` (*En se couchant*). O diálogo publicado *Il y a un balcon ? / Non, il n'y a pas de balcon, mais il y a un beau salon.* passa a ter
  cartão para *balcon* (mesma unidade) e para *beau* (antes). A nota *courriel* / *arobase* passa a ter gancho no cartão *le mail*, na mesma unidade.
  *Et comme boisson ?* não está em conteúdo publicado; o cartão *la boisson* fica na própria unidade "Pedir no restaurante". Única exceção: o item 4 acima.
- **Notas que saíram** ("Mais sobre família", "Mais sobre rotina", "Mais sobre o restaurante", "Mais sobre pagamento e contato", "Outras palavras de moradia"):
  nenhum gancho nem momento de outra nota apontava para elas, fora o texto do item 1. **Regra 12 (versão grátis)**: nenhuma gramática perdeu a versão grátis;
  a de "Gramática: verbos pronominais" até fica mais forte (três pronominais com cartão).
- **Notas que ficaram**: "Mais sobre gostos" só com *aimer bien*; "Outras palavras de traços" sem *long, court, beau / belle*; "Outras palavras de caráter" com
  *sociable, égoïste, ambitieux*; "Outras palavras de países" fechada em 5 (lista fechada, abaixo de 10; confiança alta).
- **Unidade 1**: "Consigo..." do módulo "Apresentar-se" com "reagir (*Et toi ? Et vous ?*)" no `mapa.json`, no `08` e no rascunho; nenhum documento vivo cita
  mais "*Moi aussi.*" no "Consigo"; frase do cartão *pardon* e *Pardon, madame !* coerentes no `08`, no `00` e no rascunho.

## Sugestões (sem decidir)

- Fazer o número de lições sair da regra 13 nova (ex.: o menor número de lições com 3 a 5 cartões cada) em vez de `palavrasAte3Licoes`; ou pôr `licao` por
  cartão nessas 13 unidades quando forem desenhadas.
- Com *adorer* como cartão, "Mais sobre gostos" (só *aimer bien*) pode virar uma nota de nuance *aimer bien / aimer / adorer* (tipo Exp), que esclarece em vez
  de listar palavra (decisão 287).
- Na implementação, passar a skill `criar-desafios` pelas unidades que ganharam cartão: *Vous payez en espèces ou par carte ?* e *Et comme boisson ?* são bons
  candidatos a "Ouça e traduza".
