# Revisão geral do A1 (9 módulos) e do A2 (10 módulos) depois do refinamento da regra 11

Data: 2026-10-23 (depois das decisões 1 a 217 do `12` e das regras 1 a 15 do `15`). Agente: `auditor-curricular`. **Só relata: nada foi editado no mapa nem no código.**
Rodadas anteriores (histórico): `2026-10-19-a1-a2-rodada-saude-modais.md`, `2026-10-21-a1-a2-rodada-equidade.md`, `2026-10-22-a1-a2-auditoria-final.md`.

**Pergunta da dona:** "se o refinamento da regra 11 (decisão 211: palavra nova pode aparecer nas frases "Na frase" antes de ser ensinada) fosse aplicado ao que já fizemos, o que
mais seria desfeito ou alterado?"

**Fontes conferidas:** `08-mapa-final-a1-a2-v2.md` (inteiro), `12` (decisões 196 a 217), `15`, `16`, `00`, as três auditorias anteriores; conteúdo publicado por script
(`scripts/lib/course-content.js`, `load('fr')`): frases `-p`, falas `-d`, opções do diálogo e do "Você entendeu?", V/F, exemplos e texto das notas, telas e exercícios das
10 gramáticas publicadas; `fr/dictations.js` (21 ditados); `fr/scripts/challenges_import/lote-a1-*.json` (Desafios); e o código que usa as frases: `fr/app.js`
(`renderBlockIntroCard`, `buildExerciseSet`, `renderReorderExercise`, `renderScenarioExercise`, `renderClozeExercise`, `buildCheckpointQueue`),
`shared/checkpoint-exam.js` e `shared/study-trail-model.js` (`findStudyExamplePhrase`, cartões "Na frase").

**Método:** cada uso publicado das palavras do inventário foi localizado por expressão regular (formas conjugadas incluídas) e posto na **posição nova** (unidade
publicada → posição do mapa; frases que mudam de unidade com a chave, conforme a seção 7 do `08 v2`; ditados na proposta da tabela "Ditados: para onde vão";
Desafios pela `unitId`). Depois, uma varredura geral de diálogos, opções, V/F, gramáticas, ditados e Desafios contra a lista de cartões do mapa por posição (resultado
triado à mão; nomes próprios, números e palavras funcionais descartados). Scripts de apoio ficaram no rascunho da sessão (não versionados).

Quem resolve: **[dona]** decisão; **[editor]** o editor do mapa corrige sem perguntar (aplica regra ou decisão já tomada); **[impl.]** vai para a lista de implementação.

---

## 0. Resposta curta

1. **Quase nada pode ser desfeito.** Das 13 palavras que viraram cartão pelas decisões 197, 209 e 212, só ***l'enfant*** aparece apenas em "Na frase" (e num exercício que
   já seria reescrito). As outras 12 estão em diálogo, opção, V/F, exercício, nota, ditado, Desafio ou gancho de versão grátis, ou são a própria função da unidade. A unidade
   **A1 M4.1 "Verbos muito usados" (`A1-36`) continua necessária inteira** (os 6 verbos estão em diálogos do M4 em diante, em Desafios, em ditados ou em ganchos grátis), e
   os 4 verbos do A2 também (ganchos grátis das gramáticas A2 M4.4, M6.4 e M7.3, regra 12). As notas de vocabulário (*adorer, se coucher, la boisson, la chemise, l'échange,
   la faute, se faire mal*) foram para nota por **limite de palavras**, não pela regra 11: a decisão 211 não libera espaço para nenhuma delas.
2. **O que dá para desfazer:** o cartão *l'enfant* no A1 (a A1 M2.1 volta a 10), as 2 frases do `A1-3` que a decisão 53 mandou para a M2.1, e talvez 2 ganchos de nota
   (depende de a dona dizer se exemplo de nota conta como "Na frase").
3. **O contrário pesa mais:** do jeito que o código está, **nenhuma frase `-p` é só "Na frase"**. A mesma frase alimenta exercícios de produção e de escolha na lição, na
   Revisão da unidade, no Ponto de verificação do módulo e no Teste de Nível (Bloqueia 1). Sem uma marca "frase só de exemplo" no conteúdo, as 49 frases que a decisão 211
   tirou da lista de reescrita continuam violando a regra 11 pelos exercícios.

---

## Bloqueia

1. **"Na frase" não é um tipo de item no código: a frase `-p` também vira exercício de produção, de escolha e de ditado [dona: aprovar a regra técnica; impl.].**
   Evidência:
   - `fr/app.js` `buildExerciseSet` (linhas ~2792 a 2849): toda frase `-p` com `blocks` vira exercício de **montar a frase** (metade no modo "traduzir", que parte do
     português e o aluno monta o francês: produção; metade no modo "ordenar"), de **cenário** ("O que você responde?", escolha entre 3 frases em francês sem tradução)
     e de **completar** (cloze). Os blocos-isca e as opções do cloze vêm de `UNITS.flatMap(...)`, ou seja, **de qualquer unidade, inclusive das posteriores**.
   - `shared/checkpoint-exam.js` (linhas 39 a 41): todas as `u.phrases` entram no Ponto de verificação do módulo e no Teste de Nível como "Escreva em francês: <tradução>"
     (produção da frase inteira) e "Ouça e escreva o que você ouviu" (ditado).
   - `shared/study-trail-model.js` (`findStudyExamplePhrase`): "Na frase" é a **primeira** frase da unidade (frases `-p`, depois falas `-d`, depois unidades anteriores) que
     contém a palavra. Hoje **30 das 182 frases `-p` nunca aparecem como "Na frase"** de palavra nenhuma: só existem como exercício (ex.: `A1-9-p3` *Je viens du Portugal.*,
     `A1-5-p3` *L'addition, s'il vous plaît.*, `A1-7-p0` *Quel jour sommes-nous ?*, `A1-10-p2` *Je peux essayer ce pantalon ?*, `A1-19-p2` *On va au cinéma ce soir ?*).
     E **15 falas de diálogo** (`-d`) aparecem como "Na frase" (ex.: `A1-7-d1` *Mardi, ça te va ?*).
   - O cartão de revisão "Na frase" mostra o francês na frente e a tradução **só no verso**.
   - Consequência: das 49 frases da decisão 211, todas viram exercício; e duas delas nem são "Na frase": `A1-9-p3` *Je viens du Portugal.* (fica na M2.5, *le Portugal* é
     cartão da M8.1) e `A1-3-p5` *Il fait zéro degré dehors.*, que na posição nova (M8.5) não é exemplo de nenhuma palavra (o cartão *zéro* fica na M5.1, antes) e tem
     *degré, dehors* sem cartão.
   - **Recomendação:** marcar no conteúdo, **por script** (o validador calcula, ninguém marca à mão), a frase `-p` que tem palavra ainda não ensinada na posição como
     "só exemplo"; essa frase aparece no cartão de apresentação e na Revisão, mas fica **fora** de `buildExerciseSet`, do Ponto de verificação, do Teste de Nível e do
     banco de blocos-isca; e o banco de iscas passa a usar só unidades anteriores. Sem isso, a decisão 211 não vale na prática.
2. **"Só reconhecimento" (A1 M4.1 e os 4 verbos do A2) não existe no motor [dona: confirmar o que significa; impl.].** Hoje toda palavra da trilha gera **2 cartões
   (A e B)**; o B parte do português e pede o francês (produção). A lição faz exercícios de vocabulário e de "traduzir" com as frases da unidade, e o Ponto de verificação
   pergunta "Como se diz *ir* em francês?" (`checkpoint-exam.js`, item `word`): tudo produção. A decisão 216 e a regra 12 prometem "o grátis reconhece; o Premium produz",
   e o `08 v2` diz que "o Ponto de verificação do M4 cobra só reconhecimento desses verbos". **Recomendação:** marca por unidade e por palavra `recognitionOnly`: cartão
   só A (francês → significado), exercícios só de reconhecer e ouvir, Ponto de verificação só com reconhecimento e escuta; função pura em `shared/core/` com teste. Efeito
   na conta: 10 palavras com 1 cartão em vez de 2 (A1: 357 palavras, **708** cartões A/B em vez de 714; A2: 4 palavras a menos no dobro).

---

## Parte 1. Inventário: o que foi feito só por causa da regra antiga

Critério: **continua necessário** se a palavra aparece, na posição nova, em diálogo, opção, V/F, exercício de gramática, nota, ditado, Desafio ou gancho de versão grátis
(publicado ou previsto no mapa), ou se ela é a própria função da unidade; **pode ser desfeito** se só aparece em "Na frase".

### 1.1 Cartões criados (decisões 197, 209, 212)

| Palavra (posição nova) | Usos fora de "Na frase" (evidência) | Veredito | Ganho se desfizer |
|---|---|---|---|
| *aimer* (M4.2) | nota N24 (texto "verbos de gosto, *aimer*"), diálogo negativo do `16` na M4.2, ditados `d6`, `d6-p2`, Desafios `lt-a1m6-001`, `lt-a1m6-005`; função "gostos" | **fica** | nenhum |
| *parler* (M2.5) | gancho grátis da M2.7 (*Est-ce que tu parles anglais ?*), diálogo negativo do `16` na M2.5; função "que línguas fala" | **fica** | nenhum |
| *l'enfant* (M2.1) | só "Na frase" (`A1-4-p8`, `A1-19-p7`, frase nova *J'ai deux enfants.*) e o exercício `A1-g1` *Ils ___ deux enfants.*, que já é reescrito (decisão 202) | **pode ser desfeito** (volta para a A2 M1.1) | A1 M2.1 volta a **10** (sai uma exceção "a revisar"), M2 −10 min (~3h35), A1 **356** cartões, ~30h05, lições ~147; A2 M1.1 volta a 12, A2 **429** (419 + 10) |
| *le jour* (M3.3) | fala nova *C'est quel jour ?* (diálogo, chave nova da decisão 202); função "dizer o dia" (*Quel jour sommes-nous ?*) | **fica** | nenhum (M3.3 continua com 12) |
| *l'anniversaire* (M3.5) | só "Na frase" (`A1-7-p2`, `p7`); mas a função está no título da unidade e no "Consigo" do M3 | tecnicamente desfazível; **fica** pela função | nenhum: a M3.5 é conjunto fechado e a M9.3 iria a 11 |
| *l'addition* (M4.6) | **V/F `A1-5-tf0`** *L'addition, s'il vous plaît.* (exercício de escolha); "Consigo" do M4 "pedir a conta" | **fica** | nenhum |
| *acheter* (M5.3) | fala `A1-11-d0` (já trocada) e **Desafio `lt-a1m3-005`** *J'achète des légumes et du riz.* (M4.3); função do M5 "Compras" | **fica** | nenhum |
| *la saison* (M8.5) | fala `A1-13-d2` *Tu préfères quelle saison ?* | **fica** | nenhum |
| *l'après-midi* (M3.1) | falas `A1-6-d3`, `A1-20-d1`, opção `A1-6-chk1`, exercício `A1-g3-ex3` | **fica** | nenhum |
| *l'ami / l'amie* (M9.3) | falas `A1-19-d1` (vai para a M9.3), `A1-20-d3` e opções; **ditado `d1-p1`** (*Mon amie s'appelle Julie.*, M1) | **fica** | nenhum |
| *coûter* (M5.1) | 4 falas (M5.3, M6.5), 3 opções, nota N30/*combien*, 2 exemplos da M5.2, 3 ditados, 1 Desafio | **fica** | nenhum |
| *préférer* (M4.2) | falas `A1-13-d2`, `d3` e opção (M8.5) | **fica** | nenhum |
| *le prix* (M5.1, decisão 214) | não veio da regra 11 (a dona recusou a nota) | fora do escopo | nenhum |

### 1.2 Unidade nova A1 M4.1 "Verbos muito usados" (`A1-36`) e os verbos do A2 (decisão 216)

| Verbo | Primeiro uso fora de "Na frase" depois da M4.1 | Veredito |
|---|---|---|
| *aller* | falas `A1-14-d0` (M6.5), `A1-19-d1/d2` (M9.1); opções; ditados `d3`, `d4`, `d6`; Desafio `lt-a1m6-002`; gancho grátis da M6.4 e da M8.3 (*Je vais réserver*) | **fica** |
| *faire* | fala `A1-5-d4` *Voilà, ça fait cinq euros.* (M4.2), `A1-10-d1/d2` (M5.3), `A1-13-d0` (M8.5), `A1-20-d0` (M9.4); fórmula *je fais les courses* (M4.3) | **fica** |
| *vouloir* | falas `A1-11-d2` *Tu veux un dessert ?* (M4.3), `A1-12-d0` (M4.4); ditado `d2`; Desafio `lt-a1m2-001`; gancho grátis da M9.1 | **fica** |
| *pouvoir* | nota N29 (*Je voudrais* ou *je peux*?, M5.3); gancho grátis da M9.1 (*Je ne peux pas*); diálogo previsto da M9.3 (*Désolée, je ne peux pas, je dois travailler.*) | **fica** |
| *devoir* | gancho grátis da M9.1 e diálogo previsto da M9.3 | **fica** |
| *voir* | fala `A1-19-d2` *Quel film vous allez voir ?* (M9.1) e opção | **fica** (o cartão precisa estar na M9.1 ou antes; a M4.1 serve) |
| *savoir, connaître* (A2 M6.3), *dire* (A2 M7.2), *donner* (A2 M4.2) | ganchos grátis das gramáticas A2 M6.4, M7.3, M4.4 (regra 12); o motivo veio da equidade (Bloqueia 1 da auditoria final), não só da regra 11 | **ficam** |

A decisão 211 **não muda a posição** da `A1-36`: o que a pôs no começo do M4 foram os diálogos (`A1-5-d4`, `A1-11-d2`, `A1-12-d0`), e diálogo continua sob a regra.
Correção do texto da decisão 216 [editor]: "do M1 ao M3 nenhum diálogo usa esses verbos" não é exato: a fala `A1-7-d1` *Mardi, ça te va ?* (M3.3, também opção do diálogo
e "Na frase" de *mardi*) usa *aller*. Registrar como fórmula do cartão *ça va* (M1.1) ou trocar (ver "A dona precisa decidir").

### 1.3 Palavras que foram para nota de vocabulário (decisões 197, 199, 213, 216)

*adorer* (M4.2), *se coucher* (M3.1), *la boisson* (M4.6), *la chemise* (M5.3), *se faire mal* (A2 M4.2), *l'échange, la faute* (A2 M6.3): **nada a desfazer**. Saíram por
limite de palavras (regra 13), não pela regra 11; quem entrou no lugar delas continua necessário (1.1 e 1.2). Uso publicado: *se coucher, la boisson, la chemise, l'échange,
la faute*: nenhum; *adorer*: 3 frases "Na frase" e o **ditado `d6-p2`** (*J'adore le week-end !*), ver Atenção 2; *se faire mal*: nenhum (as frases *Le ventre me fait mal*
são *faire mal à*, outra construção).

### 1.4 Frases trocadas ou movidas antes da decisão 211 e que ela não reviu

| Item | Origem | Veredito |
|---|---|---|
| `A1-3-p6` *J'ai deux frères et trois sœurs.* e `A1-3-p7` *Quel est l'âge de ton père ?* (M1.3 → M2.1) | decisão 53, pergunta 20 (*frère, sœur, père* só na M2.1) | **pode ser desfeito**: hoje são "Na frase" de cartões da M1.3 (*deux, trois*; *l'âge*); a `p7` é do tema idade. A `p6` pode ir pelo tema família (a M2.1 já tem *J'ai deux frères.*). Ganho: 2 movimentos a menos no `ops.json` |
| Gancho da A1 M8.1 sem *les vacances* e gancho da A2 M2.2 *quand on est partis* no lugar de *arrivés* (decisão 202) | exemplo de nota | desfazível **só se** a dona disser que exemplo de nota conta como "Na frase" (ver Parte 2.4) |
| As 31 trocas e as 18 movimentações desfeitas pela 211 | decisões 132, 136, 202 | ficam desfeitas **desde que** a marca "só exemplo" do Bloqueia 1 exista; menos `A1-9-p3` e `A1-3-p5` (Bloqueia 1), que voltam a precisar de troca ou movimento [editor] |

### 1.5 Exercícios reescritos e ganchos de versão grátis

Exercícios de gramática (`A1-g1`, `g2`, `g3`, `g4`, `g6`, `g7`, `g8`, `g9`), falas e opções trocadas (*On se voit quel jour ?*, *Qu'est-ce qu'on achète ?*, *Je cherche une robe*,
*On ne sait pas encore !*, *Oui, avec des amis.*), ganchos e diálogos novos de versão grátis: **nada a desfazer** (continuam sob a regra 11 pela própria decisão 211).

### 1.6 Unidades que passaram de 10

| Unidade | Por quê | Com a 211 |
|---|---|---|
| A1 M2.1 (11) | *l'enfant* | **volta a 10** se *l'enfant* sair |
| A1 M3.3 (12) | *le jour* | fica (diálogo e função) |
| A1 M8.5 (11) | *la saison* | fica (diálogo) |
| A1 M2.5 (11), M4.2 (12), M5.1 (11) | *parler*, *aimer + préférer*, *coûter* | ficam (já aceitas pela dona) |

**Ganho total máximo:** 1 cartão a menos no A1 (vai para o A2), 1 unidade de volta a 10, −10 min no M2, 2 frases sem mudar de unidade.

---

## Parte 2. Revisão geral

### 2.1 A1, módulo a módulo

| Módulo | Tema e função | Carga (mapa) | Ordem | Achados |
|---|---|---|---|---|
| M1 Apresentar-se | um tema, ok | 60 cartões, ~3h35 | ok | ditado `d1-p1` usa *amie* (cartão só na M9.3); V/F `A1-1-tf0` *Merci beaucoup !* (fórmula); Desafio `lt-a1m1-002` *Un café, s'il vous plaît.* (*le café* é da M4.2) |
| M2 Família | um tema; "onde mora e línguas" (M2.5) puxa para identidade, aceito | 33, ~3h45 | ok | M2.1 com 11 (ver 1.1); diálogo da M2.5 com *maintenant* (cartão do A2 M1.3) além de *en Allemagne / au Portugal*, já na reescrita |
| M3 Rotina e calendário | um tema | 50, ~3h35 | ok | `A1-7-d1` *Mardi, ça te va ?* (*aller*); `A1-7-d3` *Parfait, à mercredi alors !* (*parfait, alors* sem cartão) |
| M4 Comer e beber | duas funções (reconhecer verbos + comer); aceito pela 216 | 48, ~3h45 | ok | diálogo do café `A1-5`: *vous désirez ?*, *un croissant*, *Autre chose ?* sem cartão; **V/F `A1-5-tf0`** (*l'addition*) fica na M4.2, longe do cartão (M4.6); Desafio `lt-a1m3-005` (*acheter*, M4.3) e `lt-a1m3-006` *Je prends un kilo de pommes.* (*prendre* é cartão da M6.5) |
| M5 Compras | um tema | 31, ~3h05 | ok | *chercher* sem cartão: a fala da M5.3 é trocada, mas o Desafio `lt-a1m3-004` e os ditados `d3-p1`, `d3-p2`, `r2` ficam com *je cherche* |
| M6 Na cidade | um tema | 30, ~3h05 | ok | *Excusez-moi* em falas da M6.1 e da M6.5 (sem cartão; só nota na M9.3); *cinq minutes*, *la bonne direction* |
| M7 Casa e moradia | um tema | 34, ~2h50 | ok | diálogo `A1-17` com ***le balcon*** (fala, opção ×2; sem cartão) e *beau* (só nota da M2.3); diálogo `A1-18` *Où est mon sac ? Et mes clés ?* (*le sac* só em nota; *la clé* sem cartão); Desafios da `A1-17` `lt-a1m5-003` (*à côté du*, cartão da M7.5) e `lt-a1m5-004` (*fenêtre, dans*, cartões da M7.4 e da M7.5) com `unitId` antigo |
| M8 Viagem e férias | um tema | 41, ~3h15 | ok | nada novo além da lista do mapa |
| M9 Lazer, convites e passado | um tema | 30, ~3h20 | ok | ***le restaurant*** sem cartão em lugar nenhum, usado em `A1-g9` (exemplo), Desafios `lt-a1m6-003` e `cloze-a1m6-001`, ditados `d6`, `d6-p1`, `d6-p2`, `r3`; *le marché* (só nota cultural N27) no ditado `d6` e no Desafio `cloze-a1m6-004`; *écouter* sem cartão no Desafio `lt-a1m6-005` |

Duplicatas (regra 14): nenhuma nova; os cartões das decisões 197 a 216 não são cartão em outra unidade (conferido de novo).
Versão grátis (regra 12): todas as 23 gramáticas têm a coluna preenchida. Atenção: ***prendre* é cartão da M6.5, depois da gramática M4.7 *faire* e *prendre***; a versão
grátis de *prendre* antes dela é só a fórmula *je vais prendre* (M4.2). A gramática sistematiza um verbo que o gratuito só vê como cartão dois módulos depois.

### 2.2 A2, módulo a módulo

| Módulo | Tema | Carga | Achados |
|---|---|---|---|
| M1 Lembranças | um tema | 47, ~3h05 | M1.1 com 11 (volta a 12 se *l'enfant* voltar) |
| M2 Contar uma experiência | um tema | 36, ~3h15 | ok |
| M3 Objetos e consumo | um tema | 34, ~3h15 | ok |
| M4 Saúde | um tema | 47, ~3h30 | diálogo publicado da `A1-15` usa *depuis* (fórmula com nota, ok) e *Vous devez vous reposer* (reescrita prevista); sugestão menor: pelo critério da 211, *La main est blessée.* ilustra *la main* (cartão da M4.1) e poderia ficar na M4.1 (hoje vai para a M4.3 pelo tema, decisão 162; fica como está se a dona preferir o tema) |
| M5 À mesa | um tema | 36, ~2h50 | ok |
| M6 Estudos e projetos | um tema | 36, ~3h15 | ok |
| M7 Trabalho, dinheiro e papelada | três funções num módulo (aceito, decisões 121 e 142) | 48, ~3h05 | ok |
| M8 Moradia e cidade | dois temas (aceito) | 48, ~3h30 | ok |
| M9 Comunicar | um tema | 48, ~3h30 | *confirmer* a revisar |
| M10 Opinião, cultura e mundo | um tema | 48, ~3h55 (acima de 3h45, aceito pela decisão 195) | ok |

### 2.3 Contagens recalculadas do zero

| | Recontado | Mapa (seção 1, cabeçalhos, `00`, `12` 216) |
|---|---|---|
| A1 módulos / unidades | 9 / 57 (34 + 23) | igual |
| A1 cartões por módulo | 60, 33, 50, 48, 31, 30, 34, 41, 30 = **357** | igual |
| A1 lições (3 + Revisão; 4 + Revisão acima de 10; M1.2 com Pronúncia) | 23 + 15 + 19 + 21 + 13 + 12 + 16 + 17 + 12 = **148** | igual |
| A2 unidades | 58 (36 + 22) | igual |
| A2 cartões por módulo | 47, 36, 34, 47, 36, 36, 48, 48, 48, 48 = **428** (418 + 10) | igual |
| Tempo A1 | ~30h15 (soma dos módulos) | seção 1 e `12` 216 iguais; **o Resumo do `08 v2` diz "357 cartões ... ~30h15 ... ~30h00 estimadas"** na mesma frase [editor] |

Notas do A1 (~132) e do A2 (~76) não foram recontadas unidade a unidade nesta rodada (as decisões 207 a 216 só mexeram em notas de vocabulário e a conta bate com elas).

**Posições obsoletas (renumeração do A1 M4) fora dos trechos históricos** [editor]: `08 v2` seção 4.1, linha `A1-g1`: "*avoir faim* vira nota **M4.1**" → M4.2. Nos trechos
que o próprio `08 v2` declara históricos (seção 1 "Antes", seções 6 e 8, Resumo, decisões até a 215), "M4.1" e "M4.5" antigos ficam como estão. `15`, `16` e `00`: limpos.

**Teto de 3h45**: a decisão 216 usa "teto de 3h45 por módulo", mas nenhuma decisão da dona fixa esse teto, e o cabeçalho do A1 M2 ainda diz "passa de 3h30, a revisar
pela dona". Quatro módulos do A1 passam de 3h30 (M1, M2, M3, M4) [dona].

### 2.4 O que o texto da regra 11 do `15` ainda diz de errado ou ambíguo

1. "frases 'Na frase' (exemplos `-p` com a tradução visível logo abaixo)": a tradução só fica visível no **cartão de apresentação**; a mesma frase vira exercício de
   produção, de escolha e de ditado (Bloqueia 1), e o cartão de revisão mostra a tradução só no verso.
2. Nem toda frase `-p` é "Na frase" (30 de 182 hoje nunca são) e algumas falas `-d` são (15).
3. Não diz o que vale para **exemplo de nota** e **exemplo de tela de gramática** (os dois mostram a tradução e não são exercício; a regra original citava "notas").
4. Não diz se **palavra de nota de vocabulário** (*adorer, le sac, la chemise, beau, le marché*) conta como ensinada para diálogo, ditado e Desafio.
5. "Antes de cada lote ... nas frases 'Na frase', conferir que a tradução está visível": a conferência é vazia (o código sempre mostra); o que precisa ser conferido é
   se a frase com palavra nova **ficou fora dos exercícios**.

**Definição proposta (para a dona aprovar):** "Na frase" = frase `-p` da unidade, exibida como exemplo no cartão de apresentação da palavra, com a tradução logo abaixo.
Se ela tiver palavra ainda não ensinada naquela posição, o script a marca como "só exemplo" e ela não vira exercício (lição, Revisão da unidade, Ponto de verificação,
Teste de Nível) nem bloco-isca. Exemplo de nota e de tela de gramática seguem a mesma regra da "Na frase" (podem ter palavra nova, com tradução); V/F, exercícios,
opções, diálogos, ditados e Desafios não. Palavra de nota de vocabulário conta como vista para diálogo com tradução (🌐), mas não para ditado nem Desafio.

---

## Parte 3. O que a implementação precisa fazer e riscos novos

Já registrado no `08 v2` (seção 5) e conferido: `curriculo_ops.js` (não existe ainda), unidade que muda de nível (`A1-15`), reordenar `UNITS`, `moduleUnlocked`, conclusão e
desbloqueio por plano, revisão de todos os Pontos de verificação, Desafios com `moduleId` antigo, ditados, `STUDY_ITEM_GATE` e deploy do `notification-cron`.

**Novo nesta rodada:**
1. **Marca "só exemplo" nas frases** (Bloqueia 1), calculada pelo validador do `curriculo_ops.js`, e banco de iscas só com unidades anteriores [impl.].
2. **`recognitionOnly`** para a `A1-36` e para *savoir, connaître, dire, donner* (Bloqueia 2): sem cartão B, sem exercício de produção, Ponto de verificação só de reconhecimento
   e escuta. Recontar cartões A/B (714 → 708 no A1) [impl.].
3. **Cartões novos em unidades já concluídas**: *l'enfant* (`A1-4`), *l'après-midi* (`A1-6`), *le jour* (`A1-7`), *aimer, préférer* (`A1-5`), *acheter* (`A1-10`),
   *la saison* (`A1-13`), *parler, la ville* (`A1-9`), *quatre... neuf* (`A1-3`) e outras. A tela "Novidades desta unidade" (decisão 50) **não está implementada**: hoje
   esses cartões ficam presos numa lição nova que o aluno nunca abre numa unidade concluída. Precisa de função pura e teste ("aluno que concluiu a `A1-5` recebe *aimer*
   e *préférer* na Revisão ou vê a tela de novidades") [impl.].
4. **`A1-36` no começo do `A1-m3` (novo M4)**: vira a 1ª unidade do módulo. Como `moduleUnlocked` olha só a 1ª unidade, testar que o M4 continua aberto para quem já
   estava nele ou depois; e que `moduleCompleted` / `levelCompleted` não "desconcluem" o A1 de quem já tinha concluído (unidade nova nasce aberta e não concluída, regra
   2.10, mas a conclusão do módulo exige todas as unidades) [impl.].
5. **Herança do Ponto de verificação do `A1-m3`**: o módulo ganha a `A1-36` (6 cartões que ninguém estudou); entra na decisão da herança (decisão 201) [dona, na implementação].
6. **Desafios e ditados fora da lista do mapa** (Atenção 1 e 2): dado de produção, só com autorização (pergunta 55) [impl.].
7. **Teste "frase só com palavras vistas"** (pergunta 25) precisa ler a marca "só exemplo" e a lista de exceções formais da regra 11 (*pour la santé, délicieux, cuit,
   sucrée, prochain, le projet, garée, l'euro*, diálogo "No parque"), numa lista no código, não no texto [impl.].

---

## Atenção

1. **Diálogos, opções, V/F e Desafios com palavra sem cartão, fora da lista de reescrita do mapa [editor, exceto onde marcado dona]:**
   - V/F `A1-5-tf0` *L'addition, s'il vous plaît.* fica na M4.2 (`A1-5`) e o cartão está na M4.6: ir com a chave para a M4.6, junto da frase.
   - Desafios: `lt-a1m1-002` *Un café* (M1; trocar ou mudar para o `A1-m3`); `lt-a1m3-005` *J'achète* (M4.3; mudar para a M5.3); `lt-a1m3-006` *Je prends un kilo de pommes.*
     (M4.4; *prendre* só na M6.5); `lt-a1m3-004` *Je cherche une robe.* (M5.3); `lt-a1m5-003` e `lt-a1m5-004` (`unitId: A1-17` → `A1-18`, M7.5); `lt-a1m5-006` *Le sac*
     (M7.5); `lt-a1m6-005` *J'aime écouter* (M9.1); `lt-a1m6-003`, `cloze-a1m6-001` (*restaurant*), `cloze-a1m6-004` (*marché*).
   - Diálogos: `A1-17` *le balcon* (M7.1, 1 fala + 2 opções) e *beau*; `A1-18` *mon sac, mes clés* (M7.5); `A1-5` *vous désirez, un croissant, autre chose* (M4.2);
     `A1-7-d3` e `A1-10-d4` *Parfait*; `A1-8-d0` e `A1-14-d0` *Excusez-moi* [dona: fórmulas ou troca, ver abaixo].
2. **Ditados fora da tabela "Ditados: para onde vão"** [editor]: `d1-p1` *Mon amie* (M1; tabela diz "nenhum problema"); `d3-p1`, `d3-p2`, `r2` *je cherche*; `d6-p2`
   *J'adore*; `d6` *au marché*; `d6`, `d6-p1`, `d6-p2`, `r3` *au restaurant*; `d5-p2` *Mon sac*; `d2` *un croissant*. Rodar `check_dictation_vocab.py` com o mapa novo.
3. **`A1-3-p5`** *Il fait zéro degré dehors.* (M8.5) e **`A1-9-p3`** *Je viens du Portugal.* (M2.5): não são "Na frase" de nenhuma palavra; voltam a precisar de troca ou
   de movimento (Bloqueia 1) [editor].
4. **N33 *à vélo* x *en vélo*** (A1 M6.5, "alta, fonte a dona"): "*en vélo* é considerado incorreto" é forte demais; a recomendação normativa é *à vélo*, mas *en vélo* é
   muito usado e aceito por vários dicionários. Confiança real: **média**. Texto sugerido: "a forma recomendada é *à vélo*; *en vélo* é muito comum na fala" [dona].
5. **Notas sem confiança**: *très / super / hyper* (A1 M7.1, Real, n/r) precisa de confiança antes de escrever; *Professeure, autrice* (M1.6, Cult, média) já está marcada para
   revisão da dona [editor].

---

## Ok

- Contagens de cartões, unidades e lições do A1 e do A2 batem com a seção 1, os cabeçalhos, o `00` e o `12` (só o Resumo traz o "~30h00" velho).
- `15`, `16` e `00` já usam a numeração nova do A1 M4.
- Regra 14: nenhum cartão novo das decisões 197 a 216 repete cartão de outra unidade.
- Regra 12: todas as gramáticas do A1 e do A2 têm versão grátis indicada; os verbos irregulares têm cartão de reconhecimento antes da gramática (menos *prendre*, Parte 2.1).
- Exceções formais da regra 11 já aceitas (*pour la santé, délicieux, cuit, sucrée, prochain, le projet, garée, l'euro*, diálogo "No parque") conferidas: continuam nas
  posições citadas.
- Fatos culturais conferidos (alta): *huitante* em Vaud, Valais e Fribourg; *la fête des voisins* em 29/05/2026 e 28/05/2027 (sextas-feiras); 14 de julho; *carte Vitale*;
  *les soldes*; *le RIB*; *Il fait frette*; *courriel*; *déjeuner / dîner / souper*.

---

## Sugestões (para a dona decidir; nada decidido)

1. Aprovar a definição de "Na frase" da Parte 2.4 e a marca "só exemplo" calculada por script (Bloqueia 1).
2. Confirmar que "só reconhecimento" = cartão só francês → significado, sem produção na lição nem no Ponto de verificação (Bloqueia 2).
3. *l'enfant*: desfazer (volta para a A2 M1.1) ou manter na A1 M2.1 pela função "família". Recomendação: **manter** (palavra das mais frequentes e central em "apresentar
   a família"), aceitando a M2.1 com 11 como exceção; o ganho de desfazer é pequeno.
4. *le restaurant*: cartão na A1 M4.6 "Pedir no restaurante" (vai a 11) ou exceção formal (cognato transparente). Recomendação: **cartão** (é o tema da unidade e aparece em 7
   itens sob a regra).
5. Fórmulas sem cartão em diálogo (*Ça te va ?, Excusez-moi, Parfait, Vous désirez ?, Autre chose ?, Merci beaucoup*): lista fechada de fórmulas aceitas, no código, como as
   exceções formais. Recomendação: aceitar *Ça te va ?* (deriva do cartão *ça va*), *Merci beaucoup*, *Parfait*, *Vous désirez ?*, *Autre chose ?*; para *Excusez-moi*, já que
   a regra 1 pede formal e informal juntos, adiantar a nota *Excusez-moi / Excuse-moi* para a M6.1 (primeiro diálogo que usa).
6. *prendre*: levar o cartão publicado `A1-14-v6` da M6.5 para a A1 M4.1 "Verbos muito usados" (7 verbos; chave igual), para vir antes da gramática M4.7. Recomendação: **sim**.
7. *chercher, écouter, le balcon, la clé, le sac, le marché, un croissant*: trocar nas falas, Desafios e ditados, sem cartão novo. Recomendação: **trocar**.
8. Fixar por decisão o teto de tempo por módulo (3h30 ou 3h45). Recomendação: **3h45**, que é o que o mapa já pratica.
9. Frases da decisão 53 (`A1-3-p6`, `p7`): ficam na M1.3. Recomendação: `p7` fica (tema idade); `p6` vai para a M2.1 (tema família).

---

## A dona precisa decidir (resumo)

1. Definição de "Na frase" e a marca "só exemplo" (Bloqueia 1).
2. O que é "só reconhecimento" (Bloqueia 2).
3. *l'enfant* no A1 ou no A2 (Sugestão 3).
4. *le restaurant* (Sugestão 4).
5. Fórmulas aceitas sem cartão e a nota *Excusez-moi* (Sugestão 5).
6. *prendre* na M4.1 (Sugestão 6).
7. Teto de tempo por módulo (Sugestão 8).
8. Exemplo de nota e palavra de nota de vocabulário contam como "Na frase" / como vistas? (Parte 2.4, itens 3 e 4).
9. Texto da nota N33 (*à vélo*) (Atenção 4).

## O editor corrige sem perguntar

- V/F `A1-5-tf0` vai com a chave para a M4.6; Desafios e ditados da Atenção 1 e 2 entram na lista de reescrita da seção 7 e na tabela de ditados do `08 v2`.
- `A1-9-p3` e `A1-3-p5` voltam para a lista de troca ou movimento.
- Texto da decisão 216 sobre "nenhum diálogo do M1 ao M3" (exceto `A1-7-d1`).
- Resumo do `08 v2`: tirar o "~30h00 estimadas"; seção 4.1, linha `A1-g1`: "nota M4.1" → M4.2.
- Confiança da nota *très / super / hyper* (A1 M7.1).
- Regra 11 do `15`: trocar "conferir que a tradução está visível" por "conferir que a frase com palavra nova está marcada como só exemplo", depois da decisão 1 acima.
