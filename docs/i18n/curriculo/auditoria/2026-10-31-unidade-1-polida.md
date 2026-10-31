# Auditoria: "Cumprimentar e se despedir" polida (módulo "Apresentar-se")

Data: 2026-10-31. Agente: `auditor-curricular`. Só relato: nada foi editado no mapa, no rascunho nem no código; sem commit.

Unidade auditada: "Cumprimentar e se despedir" (1ª unidade do módulo "Apresentar-se", id `A1-1`), no desenho polido pela dona (decisões 267 a 320 do `12`).
Fontes: `piloto-m1/A1-1/A1-1.json` e `A1-1.md` (rascunho), `dados/mapa.json`, `dados/excecoes.json`, `dados/frases_na_frase.json`, `08 v2`, `15`, `00`
e o conteúdo publicado (`fr/content.js`, carregado com `scripts/lib/course-content.js`).

Comandos rodados (números reais):
- `node docs/i18n/curriculo/piloto-m1/A1-1/validar.js`: **117 textos, 0 falhas** (coerência com o mapa ok; grupos obrigatórios sem palavra não vista).
- `node fr/scripts/curriculo_mapa.js --conferir`: tudo ok (lições, cartões por lição, regra 14, chaves, versão grátis, teto, títulos, excecoes).
- `tests/curriculo`: totais 61/61, palavras vistas 50/50, papel das frases 18/18.
- Contas do `mapa.json`: A1 com 57 unidades, **366 cartões (725 A/B)**, ~151 lições, 133 notas, ~31h00; "Apresentar-se" com 66 cartões e ~3h55. Batem com o `00` e o `08`.

Termos usados aqui: **"Na frase"** = a frase de exemplo que aparece embaixo do cartão; **essencial** = frase que pode ser cobrada em exercício e na Revisão da unidade;
**só exemplo** = frase que só aparece com a tradução à vista; **chave** (`k`) = o código fixo de cada cartão, que guarda o progresso de memória do aluno;
**Revisão da unidade** = o antigo "Ponto de verificação" no fim da unidade.

---

## Bloqueia (não dá para publicar sem resolver)

1. **A frase de cada cartão não existe no app.** Unidade "Cumprimentar e se despedir". Evidência: o app escolhe a frase "Na frase" pela 1ª frase da unidade
   que contém a palavra (`findStudyExamplePhrase` em `shared/study-trail-model.js`); as 16 frases escolhidas pela dona (decisão 312) só valem com o campo `exampleK`
   (decisão 273, D9), que não foi feito. Sem ele, *bonjour* pode pegar *Bonjour ! Je m'appelle {nome}.* (só exemplo) e duas palavras podem cair na mesma frase.
   Recomendação: implementar `exampleK` (função pura + teste) antes de mexer no `fr/content.js`.
2. **Dois diálogos em lições diferentes.** Evidência: o formato publicado tem um diálogo só por unidade (`unit.dialogue` + `includesDialogue` na lição); o desenho novo
   põe o informal "Encontro na rua" no fim da lição 2 e o formal "Na portaria" no fim da lição 4 (decisão 320). Recomendação: diálogo por lição no formato, com teste.
3. **A Revisão da unidade nova não cabe no gerador atual.** Evidência: `buildExerciseSet` (`fr/app.js`) monta ordenar, cenário e lacuna com **todas** as frases da unidade,
   inclusive as só exemplo, e sorteia as opções; o papel essencial / só exemplo só existe em script (`fr/scripts/curriculo_papel.js`), o app não o usa. Os cenários
   escritos à mão (sem frase, como "A Léa falou rápido demais...") e as lacunas com opções fixas não têm formato. Também o V/F depois de cada nota (regra 4) não existe
   no código (as notas só mostram texto). Recomendação: papel da frase no app + formato de itens fixos da Revisão + V/F por nota, tudo com teste (regra 15: revisar também
   o Ponto de verificação do módulo e o Teste de Nível A1, que não podem usar frase só exemplo).
4. **Chave publicada que sai sem destino.** Evidência: o livro-razão `fr/published_ids.json` tem o cartão `uA1-1-d3` (*Ça va. À bientôt !*, a fala do diálogo antigo que hoje é
   a "Na frase" de *à bientôt*); as falas `A1-1-d0` a `d3` saem (decisão 320) e `fr/curriculum-changes.js` está vazio. Sem a chave em `STUDY_RETIRED_KEYS`,
   o teste de ids publicados falha e o progresso de memória desse cartão fica órfão. Recomendação: `A1-1-d3` em `STUDY_RETIRED_KEYS` pelo `curriculo_ops.js`
   (as falas novas recebem chave nova pelo `congelar_chaves.js`, que nunca reaproveita número).
5. **Inglês ausente.** Evidência: todos os campos `en` do `A1-1.json` estão `null` (só "Unit review" existe). O site em inglês não pode ter nada em português.
   Recomendação: tradução en (com confiança por item) logo depois da aprovação da dona e antes de publicar (decisão 81).

## Editor corrige (sem decisão nova)

6. **O rascunho para a dona (`A1-1.md`) não tem a decisão 320.** Ele ainda diz "2 diálogos no fim da lição 4", mostra o "Encontro na rua" publicado com as falas
   `A1-1-d0` a `d3` ("igual"), a tabela de validação com "118 textos" e "Encontro na rua: 4" (o validador dá 117 e 3), a seção 9 sem a decisão 316 (arquivar
   *Un café, s'il vous plaît.*, *Bonne journée !* e *Bonne soirée !*) e as seções 8 e 10 como "para você confirmar", já aprovadas pela decisão 315. A seção 3.6 manda
   para "D1 da seção 9" (é a seção 10). Recomendação: atualizar o `.md` a partir do `A1-1.json` (versão 2026-10-31).
7. **O `A1-1.json` se contradiz.** Evidência: o diálogo informal está com `licao: cortesia-e-como-vai` (lição 2), mas a lição 2 tem `inclui_dialogo: false` e a sequência
   dela não tem o diálogo, enquanto a lição 4 ainda lista "diálogo Encontro na rua + Você entendeu?". `versao` e `_doc` param em 2026-10-29 e nas decisões 311 a 314.
   Recomendação: sequência da lição 2 terminando no diálogo; lição 4 só com "Na portaria".
8. **O validador confere o diálogo da lição 2 como se fosse o fim da unidade.** Evidência: `validar.js` usa o contexto `dialogo` (posição "fim": os 16 cartões e as 9 notas)
   para os dois diálogos. Hoje passa por acaso (as 3 falas só usam cartões das lições 1 e 2), mas uma troca futura com *merci* passaria sem aviso. Recomendação: validar cada
   diálogo na posição da sua lição (8 cartões e 5 notas para o informal) e conferir que a lição do diálogo no rascunho bate com o `mapa.json`.
9. **`08 v2`, linha da unidade (seção do módulo "Apresentar-se").** Ainda diz "lição 4 ... e os 2 diálogos (informal 'Encontro na rua', publicado; formal 'Na portaria', novo)"
   e "acima do limite de 12 da regra 13, liberada no `excecoes.json`". Pela 319 e pela 320: diálogo informal novo no fim da lição 2, e a regra 13 agora é de 3 a 5 cartões por
   lição (as quatro lições estão dentro: 4, 4, 5 e 3). A linha de "Gramática: perguntar sim ou não" ainda diz que a parte da 1ª unidade "fica a decidir pela dona", mas a
   decisão 285 já resolveu (*Vous allez bien ?* é a menção grátis). O resumo final do `08` e o `00` param na decisão 314. Recomendação: incluir 315 a 320 nos dois.
10. **Marcas "a confirmar" já respondidas.** Título da lição 3 "Fórmulas de cortesia" (`titulo_a_confirmar` no `mapa.json`, `a_confirmar: true` no rascunho; aprovado na 315, D8);
    *Pardon ? Vous pouvez répéter ?* com `a_confirmar` (aprovado, D3); `frases_na_frase.json` com "aguarda OK da dona". A lista `decisoes` da unidade no `mapa.json` para na 314.
11. **A nuance de *Comment vas-tu ?* foi aprovada e não entrou no texto.** Nota "Como perguntar 'tudo bem?'" (lição 2): a decisão 315 aceitou a D10 ("na fala do dia a dia soa
    um pouco mais cuidado que *Ça va ?* e *Tu vas bien ?*", confiança **média**), mas o texto da nota no `mapa.json`/rascunho não tem essa meia frase. Recomendação: acrescentar e
    marcar a confiança dessa frase como média.
12. **Traduções que não batem dentro da própria unidade (pt-BR).**
    - *Je vais bien, et toi ?*: "Estou bem, e você?" na frase do cartão *je vais bien* e "Vou bem, e você?" no diálogo informal. Recomendação: a mesma tradução nos dois.
    - *Au revoir, madame !*: "Até logo, senhora!" na frase do cartão *au revoir* e "Tchau, senhora! (com desconhecidos, au revoir)" na nota "Salut também pode ser tchau";
      "tchau, senhora" contradiz a própria nota (com desconhecidos, *au revoir*) e tem parêntese dentro de parêntese. Recomendação: "Até logo, senhora!".
    - *Tu vas bien ?*: "você está bem?" no cartão e "Oi! Tudo bem?" na fala do diálogo. Recomendação: "Oi! Você está bem?" no diálogo, ou aceitar a diferença de propósito.
    - *Pas mal, et toi ?* traduzido "Bem, e você?" enquanto a nota explica "nada mal". Recomendação: "Nada mal, e você?".
    - *Comment vas-tu ?* "Como você vai?" soa pouco natural. Recomendação: "Como vai você?" ou "Como você está?".
13. **Travessão em texto visível.** *Merci ! — De rien !* / "Obrigada! — De nada!" (frase do cartão *de rien*). As notas da unidade tiveram o travessão retirado (decisões 267 a 268);
    a frase do cartão vira cartão de Revisão. Recomendação: *Merci ! De rien !* em duas falas, ou confirmar com a dona que o travessão de diálogo francês fica.

## Precisa de decisão da dona (contexto e recomendação)

14. **"Pedir para repetir" só está numa nota, mas é cobrado na Revisão da unidade.** Contexto: o módulo "Apresentar-se" promete "pedir para repetir". Na unidade, o cartão
    *pardon* é traduzido "desculpe / com licença"; o sentido "Como? Pode repetir?" está só na nota "Pardon, excuse-moi ou excusez-moi?" e na frase só exemplo
    *Pardon ? Vous pouvez répéter ?*. Mesmo assim, o 1º cenário da Revisão da unidade ("A Léa falou rápido demais... O que você diz?", resposta *Pardon ?*) cobra esse sentido.
    Pela decisão 287, a nota não carrega o conteúdo da função, e pela 265 a nota não conta na Revisão da unidade. O validador não acusa porque a **palavra** *pardon* é cartão;
    o que falta é o **sentido**. Recomendação: pôr o sentido no cartão (tradução "desculpe / com licença / como? (para pedir que repita)"), sem cartão novo.
15. **O diálogo formal "Na portaria" usa fórmulas da nota no lugar dos cartões.** Contexto: o diálogo foi escrito pela dona na decisão 270, antes de *vous allez bien ?* e *je vais bien*
    virarem cartão (313). Hoje ele usa *Comment allez-vous ?* (só na nota) e *Très bien, merci* duas vezes (só na nota "Como responder"); os cartões da função não aparecem nele.
    É permitido (notas com tradução contam como vistas nos diálogos, decisão 253), mas o diálogo é o lugar onde o aluno vê os cartões em uso. Além disso, no "Você entendeu?",
    a opção errada *Bonsoir, monsieur. Vous allez bien ?* tem o mesmo sentido da certa. Recomendação: trocar uma das duas falas por cartão (ex.: *Je vais bien, merci. Et vous, madame ?*)
    e trocar a opção errada por uma de sentido diferente (ex.: *Bonne soirée, monsieur !*).
16. **"Essencial" pode ser cobrada antes de a palavra ser ensinada.** Contexto: quatro frases essenciais têm palavra de cartão que vem depois: *Bonjour, madame !* e *Bonsoir, monsieur !*
    (o cartão *monsieur / madame* vem logo depois), *Merci, madame !* (*merci* só na lição 3) e *Salut ! Ça va bien ?* (*ça va* na lição 2). Na ficha é permitido (decisão 211).
    Mas "essencial" hoje quer dizer "pode ser cobrada em qualquer lugar", então o "Praticando" da lição 1 poderia montar exercício com *merci* antes do cartão. Recomendação:
    definir que frase essencial só entra em exercício depois que todas as palavras dela foram ensinadas (regra na mesma função pura do papel), sem mudar as frases escolhidas.
17. **A nota de tônicos e a nota "Tu ou vous?" de "Dizer o nome e a nacionalidade" (2ª unidade do módulo) ficam repetidas.** Contexto: *et toi ? / et vous ?* agora é cartão na 1ª unidade,
    e a nota "Como perguntar 'tudo bem?'" já explica com quem usar o formal e o informal (desconhecidos, chefes, pessoas idosas...). Não é conflito da regra 14 (a 2ª unidade não tem
    cartão *toi*), mas a nota "*Moi, je m'appelle Ana. Et toi ? Et vous ?*: moi, toi, vous são tônicos" apresenta *Et toi ?* como novidade, e a N05 "Tu ou vous?" repete a lista de
    contextos. A regra 9 do `15` também diz que *moi, toi, vous* entram na 2ª unidade. Recomendação: no piloto da 2ª unidade, a nota de tônicos parte de "você já usa *et toi ?*"
    e acrescenta só o *moi*; a N05 fica com o que é novo (*vous* também é "vocês"; na dúvida, *vous*); ajustar o texto da regra 9.
18. **"Consigo" do módulo promete *Moi aussi*.** Contexto: o "Consigo..." do módulo "Apresentar-se" diz "reagir (*Et toi ? Moi aussi.*)", mas a decisão 320 tirou *moi aussi* da 1ª unidade;
    no módulo ele só aparece na frase publicada *Moi aussi, je suis française !* ("Dizer o nome e a nacionalidade"); a nota *moi aussi / moi non plus* é de "Gostos e pedidos no café"
    (módulo "Comer e beber"). Recomendação: "reagir (*Et toi ? Et vous ?*)" no "Consigo", ou decidir onde *moi aussi* é ensinado no módulo.
19. **Cartão publicado `A1-1-v3` muda de sentido.** Contexto: era *salut* = "oi / tchau (informal)"; vira *salut / coucou* = "oi (informal) / oi (entre amigos e família)" com a
    mesma chave (decisão 294). A regra da pasta diz "mesmo sentido mantém `k`, sentido novo = `k` novo"; aqui o sentido encolheu e entrou uma forma nova. Quem já estudou passa a ver,
    no lado português, duas traduções quase iguais ("oi / oi") e precisa lembrar das duas formas. Recomendação: manter a chave (o sentido "oi" continua) e diferenciar a tradução de
    *coucou* (ex.: "oi (bem próximo, família e amigos)"); registrar a troca em `DELIBERATE_PT_CHANGES`.

## Ok (conferido)

- **Coerência rascunho x mapa x 08 x 12 x 15 x 00**: 16 cartões na ordem do mapa; lições 4, 4, 5 e 3 + Revisão da unidade; 9 notas com momento e exemplos iguais aos do `mapa.json`;
  diálogo informal novo no fim da lição 2 no `mapa.json` e no `A1-1.json` (falas só com cartões das lições 1 e 2: *Salut ! Tu vas bien ?* / *Je vais bien, et toi ?* / *Ça va !*);
  formal no fim da lição 4. As contagens do `00` e do `08` (366 cartões, 725 A/B, 66 no módulo, ~3h55) batem com o script. Exceções: os itens 6 a 10 acima.
- **Regra 13 nova (decisão 319)**: as quatro lições ficam entre 3 e 5 cartões; a unidade (16) fica abaixo do aviso de ~18.
- **Regra 11**: diálogos, "Você entendeu?", V/F da unidade, ordenar, lacunas, cenários e o ditado candidato sem palavra não vista (o validador e a leitura manual concordam).
  As frases só exemplo (*Je m'appelle*, *beaucoup*, *je ne comprends pas*, *Comment allez-vous ?*, *demain*, *c'est normal*, *café*, *pouvez répéter*) ficam fora da Revisão da unidade.
- **Regra 1 (formal e informal juntos)**: quatro pares no mesmo cartão (*tu vas bien ? / vous allez bien ?*, *et toi ? / et vous ?*, *s'il te plaît / s'il vous plaît*,
  *excuse-moi / excusez-moi*), com o informal primeiro; *salut / coucou* x *bonjour*, *monsieur / madame*; a lacuna *Vous ___ bien ?* tem a isca *vas* e o ordenar tem a isca *tu vas*.
- **Regra 14**: nenhum dos 6 cartões novos é cartão em outra unidade do A1 ou do A2 (*monsieur / madame*, *bonne journée / bonne soirée*, *je vais bien*, *et toi ? / et vous ?*,
  *tu vas bien ? / vous allez bien ?*, *excuse-moi / excusez-moi*); *désolé / désolée* fica só na nota aqui e é cartão em "Convidar, aceitar, recusar e se desculpar" (módulo
  "Lazer, convites e passado"); *aller* ("Verbos muito usados", módulo "Comer e beber") é outro item (as formas aqui são fórmulas).
- **Francês**: todas as frases e falas estão corretas e naturais. A fonte da nota de *mademoiselle* (circular do primeiro-ministro de 21/02/2012) confere.
- **Notas**: 9, cada uma com tipo, confiança (todas alta, menos a meia frase do item 11) e V/F; texto aprovado pela dona (315). Sem "pra" e sem "--" no rascunho.
- **Progresso dos alunos**: as 10 chaves publicadas de palavra e as 9 frases `-p` ficam; os 4 ids de lição publicados continuam (`ola-e-tchau`, `cortesia-e-como-vai`,
  `informal-agradecer`, `checkpoint`) e só entra `despedir-se`, então `RETIRED_LESSON_IDS` não muda. Cartão que já passou pelo portão continua na Revisão mesmo se a palavra
  for para uma lição posterior (marca `released` em `isCardLessonCompleted`). Opção (a) aprovada (315). Nada muda de nível nem de módulo: Desafios (`moduleId` A1-m1) e ditados
  ficam onde estão. Atenção conhecida e aceita: quem estava na lição 2 antiga pula a lição 2 nova (as 3 notas e o diálogo informal ficam só na 💡 da Revisão da unidade).
- **Grátis x Premium (regra 12)**: a unidade não tem gramática; tudo é grátis. Ela até ganha papel de versão grátis: *Vous allez bien ?* para "Gramática: perguntar sim ou não"
  (decisão 285) e *je vais / tu vas / vous allez* como primeiro contato com *aller*.
- **Desafios** (Premium): lista de afetados completa no rascunho; a revisão é por módulo (281) e arquivar no banco precisa de autorização da dona.

## O que exige código (lista para a implementação, com autorização própria)

`exampleK`; diálogo por lição (dois na unidade); papel essencial / só exemplo no app (lição, Revisão da unidade, Ponto de verificação do módulo, Teste de Nível); itens fixos
da Revisão da unidade (cenários sem frase, lacunas com opções); V/F depois de cada nota; cenários das frases só exemplo dentro das lições (D10 da 273); notas presas ao cartão
por chave (`afterKey`) no lugar da posição; `A1-1-d3` em `STUDY_RETIRED_KEYS`; `DELIBERATE_PT_CHANGES` (traduções de `v1`, `v3`, `v4`, `v6`, `p7`); áudios novos (~50, o diálogo formal com
duas vozes); `node scripts/gerar_mapa_cron.js` e novo deploy do `notification-cron` (a ordem das palavras nas lições muda).

## Sugestões (não decididas)

- **Contar formas, não só cartões, na regra 13**: a lição 3 tem 5 cartões mas 7 formas (dois pares); a lição 2 tem 4 cartões e 6 formas. Talvez o aviso considere par = 1,5.
- ***coucou* sem frase**: aparece só no cartão (a "Na frase" do par usa *salut*, decisão 313). Uma fala do diálogo informal (*Coucou ! Tu vas bien ?*) daria uso real sem cartão novo.
- **Hugo não cumprimenta de volta** no diálogo informal (*Salut ! Tu vas bien ?* / *Je vais bien, et toi ?*). *Salut ! Je vais bien, et toi ?* soa mais natural e usa o cartão.
- **Coluna "Versão grátis" da futura gramática de *aller***: citar esta unidade (*je vais bien*, *tu vas / vous allez*) como menção breve (decisão 285).
- **Revisão dos cortes (decisão 308)**: com a regra 13 por lição, *très bien* (usado duas vezes no diálogo formal) é o primeiro candidato a voltar a cartão nesta unidade.
