# Falas na voz da professora: os 3 jogos e as 120 Expressões (para a revisão da autora)

Pedido da autora (2026-11-24): "Aprovo o piloto. Aplique nos outros jogos e escreva as falas das outras Expressões." Modelo: `docs/voz-piloto-jogos-expressoes.md`.

Como foi feito: um redator por lote, depois uma revisão independente (agente revisor de conteúdo) que corrigiu francês, uso, nível e inglês; checagem automática (até 110 caracteres visíveis, francês entre chaves, sem "pra" nem travessão, neutro em gênero com a aluna).

## Situação

- **Jogos** (Passé composé: avoir ou être?, Tu ou vous?, Passé composé ou imparfait?, mais o Être ou avoir do piloto): textos já em `fr/conj-games.js` na branch `claude/affectionate-fermi-w2s41y`; só chegam ao site com o PR.
- **Expressões**: pt-BR gravado no **Staging** em 2026-11-24 (120 linhas, hash `f7dd55b43542790ed3b178c2fcf1785d`); inglês em `docs/i18n/challenges-en.json` (campo `profNote`). **Produção: aguarda autorização da autora.** Lote: `docs/i18n/lote-profnote-expressoes/` (`falas-final.json`, `aplicar-profnote-compacto.sql`, `gerar.py`).

## Para a autora decidir

Problemas que os revisores acharam e que não são da fala (dados antigos, gênero das frases). Nada disso foi mudado.


### Jogo Passé composé: avoir ou être?

- Frases em 1a pessoa com particípio no masculino: 'Je suis venu en bus.', 'Hier, je suis allé au cinéma.', 'Je suis resté à la maison tout le week-end.', 'Je suis né à Rio.', 'Samedi, je suis sorti avec des amis.', 'Ce matin, je me suis levé à six heures.', 'Hier soir, je me suis couché à minuit.' O guia diz que frase em 1a pessoa é dita pela professora (venue, allée, née...), mas o jogo usa masculino de propósito para não entrar na concordância (A2). Manter assim, ou trocar o sujeito (il/mon frère) nessas frases?

### Jogo Tu ou vous?

- 'Madame, vous pouvez répéter, s'il vous plaît ?' está traduzida como 'Professora, pode repetir, por favor?' (en 'Ma'am'). Nada na frase diz que é uma professora. A fala nova funciona com as duas leituras. Manter 'Professora' ou trocar por 'Senhora, pode repetir, por favor?'

### Jogo Passé composé ou imparfait?

- Frases em 1a pessoa no masculino, com tradução no masculino: 'Quand j'étais petit, j'allais à l'école à pied tous les jours.' (en, 'Quando eu era pequeno'), 'Quand j'étais petit, je jouais dans la rue tous les jours.' ('Quando eu era pequeno'), 'Quand je suis rentré, mon frère dormait.', 'Quand je suis arrivé, il pleuvait depuis une heure.', 'Je lisais un livre quand mon amie m'a appelé.' (o 'appelé' sem e diz que quem fala é homem). Pelo guia, 1a pessoa é a professora: manter no masculino ou passar para o feminino (petite, rentrée, arrivée, appelée; 'Quando eu era pequena')?

### Expressões (lotes 1 e 2)

- Aviso de registro colado no sentido (vale para os dois lotes): em "Quoi de neuf ?" (expr-a1m6-004), "n'importe quoi" (expr-lote1-001), "en avoir marre" (expr-lote1-002), "c'est nul" (expr-lote3-006) e em todas as B1 informais, vulgares e gírias, o sentido_pt/sentido_en termina com " Registro: familiar — use com amigos..." (ou " ⚠️ Registro: vulgar — ..."). O texto vem de fr/scripts/challenges_import/build_lote_expressoes.py (linhas 50 a 52) e tem travessão, emoji e "familiar" em vez de "informal", contra as regras do site. Se ele aparece na tela logo acima da fala nova, fica repetido (a fala já diz o registro). Decidir: tirar o aviso do sentido (e deixar o registro só na fala ou num selo) ou reescrevê-lo sem travessão e com "informal".
- "Je vous en prie" (expr-a1m3-002): o sentido_en "please, make yourself at home" está errado para esta expressão (isso é "fais comme chez toi"). Sugestão: "You're welcome; please, go ahead." No pt, "fique à vontade" também é discutível; "de nada; por favor, pode passar" fica mais fiel.
- "Bonne soirée !" (expr-a1m6-002): sentido_pt "Boa noite!" leva a usar no lugar de {bonsoir} (chegada) e de {bonne nuit} (dormir). Sugestão: só "Tenha uma boa noite!" (a fala nova já explica os três).
- "n'importe quoi" (expr-lote1-001): registro "familiar" vale só para o sentido "bobagem" ({tu dis n'importe quoi}). No sentido "qualquer coisa" ({je mange n'importe quoi}) é neutro. A fala nova já separa os dois; o selo de registro do item generaliza.
- "coup de main" (expr-a2-001) x "passer un coup de fil" (expr-lote1-015): os dicionários marcam os dois como familiares, mas no uso de hoje os dois cabem no trabalho. Hoje um está "familiar" e o outro "neutral": escolher o mesmo registro para os dois (minha sugestão: neutro, ou "informal leve"). A fala nova de coup de main diz "serve até com colegas".
- "faire la queue" (expr-lote1-016): a fala antiga avisava que {queue} sozinho soa vulgar e mandava evitar {prendre}. Tirei os dois: {il y a la queue} e {prendre la queue} são franceses normais. Se a autora quiser mencionar o duplo sentido de {queue}, seria melhor numa nota do B1, não no A2.
- "Bienvenue !" (expr-a1m5-003): exemplo_pt "Bem-vindo à minha casa!" no masculino (sugestão neutra: "Que bom ter você na minha casa!" ou "Bem-vindo(a) à minha casa!"); explicacao_fr "arrivée bienvenue" é circular (sugestão: « Bienvenue » ne change pas au masculin ou au féminin quand il est seul.).
- "Ça fait longtemps !" (expr-a1m6-005): explicacao_fr "depuis combien de temps quelque chose arrive" está mal formulada. Sugestão: « Ça fait » + durée, pour dire combien de temps a passé : ça fait deux ans.
- "Je vous en prie" (expr-a1m3-002): exemplo_pt "Muito obrigado!" no masculino. Tudo bem se for um personagem; se for a fala da professora, fica "Muito obrigada!". Baixa prioridade.
- "Quel temps !" (expr-a1m4-005): a fala nova diz que "quase sempre é reclamação" (uso real, confiança média). Se a autora preferir não afirmar isso, volta a versão neutra sem as chaves penduradas.
- "c'est génial" (expr-lote3-007): registro "familiar" é forte demais; "génial" cabe com qualquer pessoa, até no trabalho (concordo com o redator). Sugestão: neutro. A fala nova já tirou o "com amigos".
- "s'en foutre" (expr-lote1-003): registro "vulgar" no campo e "très familier" na explicacao_fr. No uso real {je m'en fous} é muito comum entre amigos, grosseiro mas não um palavrão pesado: sugiro "muito informal/gíria" (o mesmo de foutre le camp). A alternativa mais leve {je m'en fiche} poderia entrar na explicação.
- "se casser" (expr-lote2-002): registro "familiar" no campo e "très familier" na explicacao_fr; escolher um (sugiro "muito informal/gíria", como {dégage}).
- "casser les pieds" (expr-002): sentido_pt começa com "Significa" e o en com "Means" (contra a decisão de 2026-10-30 de tirar o "significa"). Sugestão: "Incomodar ou irritar muito alguém; encher o saco." / "To bother or really irritate someone; to get on someone's nerves."
- "avoir la gueule de bois" (expr-001): sentido_pt longo e sem a palavra do dia a dia. Sugestão: "Estar de ressaca." (en "To be hungover.").
- "foutre le camp" (expr-lote1-008): literal "jogar o acampamento" é discutível ({foutre} aqui é um verbo vulgar de "pôr/meter"; a ideia vem de "levantar acampamento"). Sugestão: tirar o literal ou "levantar acampamento (com verbo vulgar)". E o exemplo_en "Get the hell out" é mais forte que o sentido "clear off": combinar os dois.
- "avoir le cafard" (expr-lote1-014): "estar na fossa" lembra mais tristeza de amor e soa um pouco antigo; "estar para baixo" (já no sentido) e, no exemplo, "bate uma tristeza" seriam mais naturais. Baixa prioridade.
- "être crevé" (expr-lote2-005): a fala usa "eu digo {je suis crevée}", no mesmo molde do "Eu escrevo enchantée" aprovado. Concordo que pode, mas a autora confirma.
- "faire exprès" (expr-lote4-002): exemplo com « dit Léa » no presente e tradução "disse": aceitável como narração; « a dit Léa » combinaria melhor. Baixa prioridade.
- "ça craint" (expr-lote1-005): a fala mantém "muito usado pelos jovens", que vem da explicacao_fr. Hoje é usado por gente de todas as idades; se a autora concordar, a fala pode trocar por "Muito comum no dia a dia." (não mudei).

### Expressões (lotes 3 e 4)

- arrête ton char (expr-lote2-009): literal_pt "pare com o seu exagero" / literal_en "stop your exaggeration" não são literais. Ao pé da letra: "para com a sua carroça (biga)" / "stop your chariot". Concordo com o redator.
- arrête ton char (expr-lote2-009) e pas de bol (expr-lote3-002): o exemplo_pt/exemplo_en dos diálogos usa travessão (—) no começo das falas; o padrão do site proíbe travessão em texto visível. Trocar por aspas, como no exemplo francês.
- ça vaut le coup (expr-lote3-001): registro neutral, mas a explicacao_fr termina com "Registre familier : à utiliser entre amis". Na minha opinião é corrente, cabe com qualquer pessoa: tirar a frase de registro da explicacao_fr (a fala já trata como comum com qualquer um). Confiança média.
- ferme-la (expr-lote3-013): "familiar" está certo no dicionário, mas o aviso colado ao sentido ("use com amigos e pessoas próximas") sugere que entre amigos é tranquilo; é grosseiro mesmo entre amigos. Sugiro registro slang (aviso ⚠️) ou trocar o texto do aviso por "grosseiro: evite". A fala já diz isso.
- bordel (expr-lote3-016): sentido_pt "caramba / droga" é suave demais; o exemplo_pt "Merda" está mais perto do peso real. Sugiro alinhar o sentido para cima ("droga / que merda") em vez de suavizar o exemplo. Na expressão "c'est quoi ce bordel ?" o equivalente é "que zona é essa?". Confiança média.
- espèce de con (expr-lote3-018): sentido_pt "seu idiota" e exemplo_pt "Seu idiota" ficam abaixo do exemplo_en "You dumbass" e do peso de "con"; sugiro "seu babaca / seu imbecil" no pt.
- connard (expr-lote3-019): sentido_en "jerk" é mais fraco que o real; "asshole" (do exemplo_en) é o equivalente certo. Sugiro sentido_en "jerk / asshole". No pt, "babaca" está bom.
- être bourré (expr-lote2-006): explicacao_fr diz "surtout entre jeunes", mas a gíria é de todas as idades; sugiro "On l'entend souvent après une soirée". Confiança média.
- tirer la gueule (expr-lote4-013): registro "familiar", mas a explicacao_fr diz "Registre vulgaire" e o sentido_pt tem ⚠️. Na minha opinião é familiar (o dicionário marca "fam."; gueule aqui não é palavrão): tirar o "Registre vulgaire" da explicacao_fr e o ⚠️ do sentido_pt. Confiança alta.
- se foutre de la gueule de quelqu'un (expr-lote4-014): "slang" com aviso ⚠️ é aceitável (dicionário: "très familier"); não chega a vulgar como putain ou connard. Eu manteria slang. Confiança média.
- tu m'emmerdes (expr-lote4-011): sentido_en "you're driving me crazy / pain in the neck" é bem mais leve que o exemplo_en "you're pissing me off" e que o vulgar do francês. Sugiro sentido_en "you're pissing me off / you're a pain in the ass". Confiança alta.
- mettre les points sur les i (expr-b2-001): explicacao_fr "finaliser les choses" está errada; o sentido é "s'expliquer clairement, sans ambiguïté, souvent avec fermeté". Sugiro sentido_pt "pôr os pingos nos is, deixar tudo bem claro" e sentido_en "to set the record straight / to dot the i's". Confiança alta.
- il pleut des cordes (expr-lote4-016): concordo com o redator, é corrente, cabe em qualquer conversa; sugiro registro neutral. Confiança média (alguns dicionários marcam "fam.").
- ne pas y aller de main morte (expr-b2-003): concordo, é corrente (aparece na imprensa); neutral. Também: sentido_pt "virulenta" pesa demais, "sem pegar leve" basta. Confiança média.
- va te faire voir (expr-lote4-012): o aviso de registro diz "só com pessoas próximas", mas é um jeito grosseiro de mandar alguém embora, e não algo para usar com quem é próximo. A fala diz "evite até com amigos". Sugiro trocar o texto do aviso para "grosseiro: pode ofender". Confiança alta.
- avoir les boules (expr-lote4-007): exemplo_pt "Estou chateado" trata quem fala no masculino, mas j'ai les boules não tem gênero; se a frase for dita pela professora, "Que chato" ou "Fiquei chateada" ficaria melhor. Decisão de estilo da autora.
- Geral (lotes 3 e 4): o aviso "Registro: familiar — use com amigos..." colado ao sentido_pt/sentido_en tem travessão e diz "familiar" (o guia pede "informal" ou "gíria"); e o aviso dos itens neutral/familiar às vezes não tem o ⚠️ e às vezes tem. Limpar ao gravar. Concordo com o redator.

## Jogos: falas novas


### Passé composé: avoir ou être? (`pc-auxiliaire`)

| Item | pt-BR | en |
|---|---|---|
| opts.a.tl | {avoir}: a grande maioria dos verbos | {avoir}: the vast majority of verbs |
| opts.b.tl | {être}: ir e vir, entrar e sair, chegar e ir embora, nascer, ficar, cair... e todo verbo com {me}/{se} | {être}: come and go, in and out, arrive and leave, be born, stay, fall... and every verb with {me}/{se} |
| f1 | {Tomber} está na lista curta dos verbos com {être}: {il est tombé}. | {Tomber} is on the short list of verbs that take {être}: {il est tombé}. |
| f2 | {Venir} pede {être}: {je suis venu}. Cuidado, {j'ai venu} é um erro muito comum. | {Venir} takes {être}: {je suis venu}. Watch out, {j'ai venu} is a very common mistake. |
| f3 | {Manger} não está na lista do {être} nem tem {se}, então vai com {avoir}: {il a mangé}. | {Manger} isn't on the {être} list and has no {se}, so it takes {avoir}: {il a mangé}. |
| f4 | Nascer e morrer ({naître}, {mourir}) vão com {être}: {il est né}. | Being born and dying ({naître}, {mourir}) take {être}: {il est né}. |
| 1 | {Aller} pede {être}: {je suis allé}. O {j'ai allé} é um dos erros mais comuns no começo. | "I have gone" makes {avoir} tempting, but {aller} takes {être}: {je suis allé}, never {j'ai allé}. |
| 2 | {Venir} é o par de {aller} e também vai com {être}: {il est venu}. | {Venir} is {aller}'s partner and also takes {être}: {il est venu}. |
| 3 | Chegar e partir ({arriver}, {partir}) formam um par do {être}: {il est arrivé}. | Arriving and leaving ({arriver}, {partir}) are a pair that takes {être}: {il est arrivé}. |
| 4 | Ir embora é {partir}, um verbo da lista do {être}: {il est parti}. | {Partir} (to leave) is on the {être} list: {il est parti}. |
| 5 | Repare: {rester} não tem movimento nenhum, mas está na lista do {être}: {je suis resté}. | Notice: {rester} involves no movement, yet it's on the {être} list: {je suis resté}, not {j'ai resté}. |
| 6 | {Tomber} é um dos verbos que pedem {être}: {il est tombé}. | {Tomber} (to fall) is one of the verbs that take {être}: {il est tombé}. |
| 7 | Em português "nasci" não tem auxiliar, aí dá vontade de pôr {avoir}. Mas {naître} vai com {être}: {je suis né}. | Like the English "was born", French uses {être} here: {je suis né}, never {j'ai né}. |
| 8 | Voltar para casa é {rentrer}, e ele pede {être}: {il est rentré}. | {Rentrer} (to get back home) takes {être}: {il est rentré}. |
| 9 | Entrar e sair ({entrer}, {sortir}) formam um par do {être}: {je suis sorti}. | Going in and going out ({entrer}, {sortir}) are a pair that takes {être}: {je suis sorti}. |
| 10 | {Entrer} está na lista do {être}: {il est entré}. | {Entrer} (to go in) is on the {être} list: {il est entré}. |
| 11 | Subir e descer ({monter}, {descendre}) formam um par do {être}: {il est monté}. | Going up and down ({monter}, {descendre}) are a pair that takes {être}: {il est monté}. |
| 12 | {Descendre} é o par de {monter} e vai com {être}: {il est descendu}. | {Descendre} (to go down, get off) is {monter}'s partner and takes {être}: {il est descendu}. |
| 13 | Todo verbo com {me}, {te}, {se} vai com {être}: {je me suis levé}. {Je m'ai levé} não existe. | Every reflexive verb (with {me}, {te}, {se}) takes {être}: {je me suis levé}. {Je m'ai levé} doesn't exist. |
| 14 | {Se coucher} tem {se}, então vai com {être}: {je me suis couché}. O "fui dormir" esconde esse {me}. | {Se coucher} has a {se}, so it takes {être}: {je me suis couché}. "Went to bed" hides that {me}. |
| 15 | Viajar parece movimento, mas {voyager} não está na lista do {être}: {j'ai voyagé}. | Traveling sounds like movement, but {voyager} isn't on the {être} list: {j'ai voyagé}. |
| 16 | O {être} é para ir de um lugar a outro, não para o jeito de se mover: {nous avons marché}. | {Être} goes with getting from one place to another, not the way you move: {nous avons marché}. |
| 17 | Correr é jeito de se mover, não ir de um lugar a outro: por isso {avoir}, {il a couru}. | Running is a way of moving, not getting somewhere, so it takes {avoir}: {il a couru}. |
| 18 | Nadar é jeito de se mover, e jeito de se mover vai com {avoir}: {j'ai nagé}. | Swimming is a way of moving, and that takes {avoir}: {j'ai nagé}. |
| 19 | {Devenir} é da família de {venir} e vai com {être}: {il est devenu}. Nunca {il a devenu}. | {Devenir} is part of {venir}'s family and takes {être}: {il est devenu}. Never {il a devenu}. |
| 20 | Visitar lembra ir a algum lugar, mas {visiter} não está na lista do {être}: {ils ont visité}. | Visiting feels like going somewhere, but {visiter} isn't on the {être} list: {ils ont visité}. |
| 21 | {Quitter} vai com {avoir}: {il a quitté Paris}. Com {partir} seria {il est parti}. Mesmo sentido, outro auxiliar. | {Quitter} takes {avoir}: {il a quitté Paris}. With {partir} it's {il est parti}. Same idea, different auxiliary. |
| 22 | O próprio {être} vai com {avoir}: {il a été}. Cuidado, {il est été} não existe. | {Être} itself takes {avoir} in the {passé composé}: {il a été}, like the English "has been". |
| 23 | O verbo no {passé composé} é {prendre}, que vai com {avoir}: {il a pris}. O {aller} está no infinitivo. | The verb in the {passé composé} is {prendre}, which takes {avoir}: {il a pris}. {Aller} is just an infinitive. |
| 24 | {Manger} vai com {avoir}, como a maioria dos verbos: {j'ai mangé}. Na dúvida, aposte no {avoir}. | Like most verbs, {manger} takes {avoir}: {j'ai mangé}. When in doubt, {avoir} is the safest bet. |

### Tu ou vous? (`tu-vous`)

| Item | pt-BR | en |
|---|---|---|
| opts.a.tl | {tu}: uma pessoa só, próxima (amigo, família, criança) | {tu}: one person you're close to (friend, family, child) |
| opts.b.tl | {vous}: formal (desconhecido, cliente, chefe) ou mais de uma pessoa | {vous}: formal (stranger, customer, boss) or more than one person |
| f1 | Com uma desconhecida, ainda mais com {madame} e {s'il vous plaît}, vai {vous}: {vous pouvez}. | With a stranger you call {madame}, it's {vous}, and {s'il vous plaît} confirms it: {vous pouvez}. |
| f2 | Com o pai ou a mãe sozinhos, é {tu}. Mas aqui são dois, e mais de uma pessoa é sempre {vous}. | Each parent alone gets {tu}, but here there are two: more than one person is always {vous}. |
| f3 | Com um desconhecido, ainda mais chamado de {monsieur}, use {vous}: {vous habitez}. | A stranger you call {monsieur} gets {vous}, the polite "you": {vous habitez}. |
| f4 | Em francês, os filhos falam {tu} com os pais, mesmo onde no Brasil se diria "o senhor". {Vous} soa antiquado. | In France, children say {tu} to their parents. {Vous} with your dad sounds very old-fashioned. |
| 1 | {Salut} e o primeiro nome mostram intimidade: com amigo, é {tu}. | {Salut} and a first name show you're close: a friend gets {tu}. |
| 2 | Com adulto que você não conhece, ainda mais chamado de {madame}, comece sempre pelo {vous}. | English has one "you", French has two. With an adult stranger you call {madame}, start with {vous}. |
| 3 | {Monsieur} e {madame} quase sempre vêm com {vous}, como o nosso "o senhor" e "a senhora". | Calling someone {monsieur} or {madame} almost always means {vous}, the polite "you". |
| 4 | Criança ganha {tu}, mas aqui são várias: mais de uma pessoa é sempre {vous}, mesmo com intimidade. | Kids get {tu}, but there are several here. More than one person is always {vous}, however close. |
| 5 | Em francês, família é {tu}, inclusive pai e mãe. | In French, family gets {tu}, parents included. |
| 6 | No Brasil muita gente diz "a senhora" para a avó, mas na França família quase sempre é {tu}. | She's older, but grandma is family, and French families almost always use {tu}. |
| 7 | {Excusez-moi} já está no {vous} (no {tu} seria {excuse-moi}). O verbo combina: {vous parlez}. | {Excusez-moi} is the {vous} form ({excuse-moi} is the {tu} one), so the verb matches: {vous parlez}. |
| 8 | {Madame} e {s'il vous plaît} pedem {vous}. Na França, é assim que os alunos chamam a professora. | {Madame} and {s'il vous plaît} both call for {vous}. It's also how French students address a female teacher. |
| 9 | {S'il te plaît} é do {tu}, então o verbo também: {tu peux}. Misturar os dois é erro comum. | {S'il te plaît} is the {tu} form, so the verb is too: {tu peux}. Mixing the two is a common slip. |
| 10 | São amigos, mas são dois, e mais de uma pessoa é {vous}. Aqui o {vous} não tem nada de formal. | They're friends, but there are two of them, so it's {vous}. Here {vous} is plural, not formal. |
| 11 | Com desconhecido na rua, é {vous}. Entre jovens o {tu} pode aparecer, mas na dúvida fique no {vous}. | Asking a stranger for directions: {vous}. Young people may use {tu} with each other; when in doubt, {vous}. |
| 12 | {Coucou} é um oi carinhoso, de amigo ou família: {tu}. | {Coucou} is a very friendly hi, for friends and family: {tu}. |
| 13 | {Et toi} é a forma do {tu}, então o verbo combina: {tu t'appelles}. | {Et toi} is the {tu} form, so the verb has to match: {tu t'appelles}. |
| 14 | {Et vous} mostra que a conversa é no {vous}, então o verbo também: {vous êtes}. | {Et vous} shows the conversation is in {vous}, so the verb is too: {vous êtes}. |
| 15 | Em francês, adulto fala {tu} com criança, mesmo sem conhecer. | In French, adults say {tu} to children, even ones they don't know. |
| 16 | Entre colegas de turma o normal é {tu}, mesmo quando acabaram de se conhecer. | Classmates use {tu} with each other, even when they've just met. |
| 17 | {Monsieur} com sobrenome é sinal de distância e respeito: {vous}. Com chefe, em geral, também. | {Monsieur} plus a last name signals distance and respect: {vous}. Your boss usually gets {vous} too. |

### Passé composé ou imparfait? (`pc-imparfait`)

| Item | pt-BR | en |
|---|---|---|
| opts.a.tl | {passé composé}: um ponto, algo que começou e terminou | {passé composé}: a point, something that started and ended |
| opts.b.tl | {imparfait}: uma linha, algo em curso, um hábito ou uma descrição | {imparfait}: a line, something ongoing, a habit or a description |
| f1 | {Tous les jours} mostra um hábito no passado, então vai no {imparfait}: {j'allais}. | {Tous les jours} shows a past habit, so it takes the {imparfait}: {j'allais}, like "used to go". |
| f2 | Dia marcado ({samedi dernier}) e duração fechada ({toute la journée}): {passé composé}. {Imparfait} seria hábito. | A set day ({samedi dernier}) and a closed span ({toute la journée}): {passé composé}, not a habit. |
| f3 | Com {depuis une heure}, a chuva já estava em andamento {quand je suis arrivé}: {il pleuvait}. | With {depuis}, French uses the {imparfait} where English says "had been raining": {il pleuvait}. |
| f4 | Ações contadas ({trois fois}) num momento marcado ({hier soir}) pedem {passé composé}: {il a sonné}. | Counted actions ({trois fois}) at a set time ({hier soir}) call for the {passé composé}: {il a sonné}. |
| 1 | {Hier} e um encontro rápido, que aconteceu uma vez só: fato concluído, {passé composé}. | {Hier} plus a quick, one-time encounter: a finished event, so {passé composé}. |
| 2 | {Tous les jours} é hábito: o que se repetia no passado, sem começo nem fim marcados, vai no {imparfait}. | {Tous les jours} signals a habit. Where English often says "used to", French uses the {imparfait}. |
| 3 | A TV é o fundo em andamento: {imparfait}. O que interrompe, {quand le téléphone a sonné}, é {passé composé}. | The background ("was watching") is {imparfait}; the interruption, {quand le téléphone a sonné}, is {passé composé}. |
| 4 | Uma ação termina e vem a outra: {puis je suis allé me coucher}. Fatos em sequência pedem {passé composé}. | One action ends and the next begins: {puis je suis allé me coucher}. A chain of events takes {passé composé}. |
| 5 | {L'année dernière} é um período fechado, e a viagem aconteceu e terminou: {passé composé}. | {L'année dernière} is a closed period, and the trip happened and ended: {passé composé}. |
| 6 | {À cette époque} e {chaque été}: algo que se repetia num período. Hábito no passado é {imparfait}. | {À cette époque} and {chaque été}: something that kept happening, like "used to go". That's the {imparfait}. |
| 7 | {Quand je suis rentré} marca o momento, e o irmão já estava dormindo: ação em andamento, {imparfait}. | {Quand je suis rentré} sets the moment, and he was already asleep: an action in progress, so {imparfait}. |
| 8 | {Pendant huit heures} conta a duração, e o sono terminou: um bloco fechado, {passé composé}. | {Pendant huit heures} counts the length, and the sleep ended: a closed block, so {passé composé}. |
| 9 | Com {trois jours de suite}, a chuva é contada e acabou: um bloco fechado, {passé composé}. | With {trois jours de suite}, the rain is counted and over: a closed block, so {passé composé}. |
| 10 | {Presque tous les jours} descreve como era o clima numa fase da vida: repetição e descrição, {imparfait}. | {Presque tous les jours} describes what the weather was like back then: repetition and description, {imparfait}. |
| 11 | O cansaço já existia {quand il est arrivé au travail}. Estado físico ou emocional de fundo fica no {imparfait}. | He was already tired {quand il est arrivé au travail}. A background state, physical or emotional: {imparfait}. |
| 12 | {Tomber malade} é uma mudança: ele não estava doente e ficou. Mudança num ponto: {passé composé}. | {Tomber malade} is a change: he wasn't sick, then he was, {après le voyage}. One moment: {passé composé}. |
| 13 | Aqui {connaître} é o primeiro encontro, numa cena precisa ({à l'anniversaire d'un ami}): {passé composé}. | Here {connaître} means meeting for the first time, in one scene ({à l'anniversaire d'un ami}): {passé composé}. |
| 14 | Aqui {connaître} é um estado que já existia ({déjà}) e continuava. Estado de fundo: {imparfait}. | Here {connaître} is a state that already existed ({déjà}) and kept going. A background state: {imparfait}. |
| 15 | {Quand elle travaillait} abre uma fase, e {toujours} mostra o hábito dessa fase: {imparfait}. | {Quand elle travaillait} sets a period, and {toujours} shows a habit in it, like "would always": {imparfait}. |
| 16 | {Hier}: um café, uma vez só. Fato único e concluído pede {passé composé}. | {Hier}: one coffee, once. A single, finished event takes the {passé composé}. |
| 17 | A leitura estava em andamento: {imparfait}. O que interrompe, {quand mon amie m'a appelé}, é {passé composé}. | The background ("was reading") is {imparfait}; the interruption, {quand mon amie m'a appelé}, is {passé composé}. |
| 18 | {Tout le livre}: leitura completa, do começo ao fim. Ação concluída pede {passé composé}. | {Tout le livre}: the whole book, start to finish. A finished action takes the {passé composé}. |
| 19 | Dizer a hora e descrever a cena ({tout le monde dormait}) monta o cenário da história: {imparfait}. | Telling the time and describing the scene ({tout le monde dormait}) sets the stage: {imparfait}. |
| 20 | {Soudain} marca um acontecimento que corta o cenário. Fato pontual: {passé composé}. | {Soudain} marks an event that breaks into the scene. A one-off event: {passé composé}. |
| 21 | Com {pendant deux ans}, o tempo em Lyon tem começo e fim. Período fechado: {passé composé}. | With {pendant deux ans}, the time in Lyon has a start and an end. A closed period: {passé composé}. |
| 22 | Repare em {je prenais le métro tous les jours}: hábito de uma fase. A fase também vai no {imparfait}: {j'habitais}. | Look at {je prenais le métro tous les jours}: a habit in a period of life. So {imparfait} here too: {j'habitais}. |

## Expressões: falas novas (120)

| Expressão | pt-BR | en |
|---|---|---|
| avoir faim (`expr-a1-001`) | Em francês a fome se tem, com {avoir}: {j'ai faim}. Nunca {je suis faim}. | In French you have hunger, with {avoir}: {j'ai faim}, never {je suis faim}. |
| avoir soif (`expr-a1-002`) | Igual à fome: sede se tem. {J'ai soif} serve em qualquer situação, com amigos ou desconhecidos. | Just like hunger: you have thirst. {J'ai soif} works anywhere, with friends or strangers. |
| avoir raison (`expr-a1-003`) | Como em português, razão se tem: {avoir raison}. O contrário também vai com {avoir}: {avoir tort}. | French says you "have reason": {avoir raison}. The opposite also takes {avoir}: {avoir tort}, to be wrong. |
| Enchanté ! (`expr-a1m1-001`) | Homem escreve {enchanté}, mulher escreve {enchantée}, e o som é o mesmo. Eu escrevo {enchantée}. | Men write {enchanté}, women write {enchantée}, and they sound the same. I write {enchantée}. |
| Pas mal (`expr-a1m1-003`) | Resposta comum a {ça va ?}. Apesar do "nada mal", é positivo: quer dizer "até que bem". | A common answer to {ça va ?}. Like "not bad" in English, it means "pretty good". |
| Ça marche ! (`expr-a1m1-004`) | É informal, mas muito comum: com amigos, colegas e até o garçom. Numa situação formal, evite. | It's casual but everywhere: friends, coworkers, even waiters. In formal settings, pick something else. |
| Pas de problème ! (`expr-a1m1-005`) | Serve para responder a um {pardon !} ou a um pedido de ajuda, com qualquer pessoa. | Use it to answer a {pardon !} or a request for help, with anyone. |
| Bon appétit ! (`expr-a1m2-001`) | Vale à mesa, antes de comer. Para responder: {merci, vous aussi !} ou {toi aussi !} | Said at the table, right before eating. To answer: {merci, vous aussi !} or {toi aussi !} |
| À table ! (`expr-a1m2-002`) | É o chamado quando a comida está pronta, bem caseiro: {les enfants, à table !} | It's the call that the meal is ready, very much a family thing: {les enfants, à table !} |
| À tout à l'heure ! (`expr-a1m2-003`) | Só para quem você vai ver de novo no mesmo dia. Para outro dia, diga {à demain} ou {à bientôt}. | Only for someone you'll see again the same day. For another day, say {à demain} or {à bientôt}. |
| Tout de suite (`expr-a1m2-004`) | Serve para responder a um chamado: {oui, tout de suite !} Não confunda com {tout à l'heure}. | The go-to reply when someone calls you: {oui, tout de suite !} Don't mix it up with {tout à l'heure}. |
| Bonne journée ! (`expr-a1m2-005`) | É a despedida de dia, com qualquer pessoa: na padaria, no trabalho. À noite, troque por {bonne soirée}. | A daytime goodbye you can say to anyone, even the cashier. In the evening, switch to {bonne soirée}. |
| Excusez-moi ! (`expr-a1m3-001`) | Vem com {vous}: é o jeito educado de abordar quem você não conhece. Com amigos: {excuse-moi}. | It uses {vous}, so it's the polite way to stop a stranger. With friends, say {excuse-moi}. |
| Je vous en prie (`expr-a1m3-002`) | É o {de rien} mais educado, com {vous}. Com amigos: {je t'en prie}. Também cede a vez, como "pode passar". | A politer {de rien}, with {vous}. With friends: {je t'en prie}. It can also mean "go ahead" or "after you". |
| Ça fait combien ? (`expr-a1m3-003`) | Na hora de pagar o total, no caixa. Para saber o preço de uma coisa só, pergunte {c'est combien ?} | For the total at the checkout. To ask the price of just one thing, say {c'est combien ?} |
| C'est trop cher ! (`expr-a1m3-004`) | Repare no {trop}: quer dizer "demais". Para só "muito caro", diga {c'est très cher}. | Watch the {trop}: it means "too much". If it's just "very expensive", say {c'est très cher}. |
| Et avec ça ? (`expr-a1m3-005`) | É a pergunta do vendedor na feira ou na padaria. Se não quiser mais nada: {c'est tout, merci}. | What the seller asks at the market or bakery. If you're done, answer {c'est tout, merci}. |
| Bon voyage ! (`expr-a1m4-002`) | Para quem vai viajar, com qualquer pessoa. Antes das férias, também se diz {bonnes vacances !} | For anyone leaving on a trip. Before a holiday, French also says {bonnes vacances !} |
| Bon rétablissement ! (`expr-a1m4-003`) | Para quem está doente ou se recuperando, com qualquer pessoa. Com amigos, também: {soigne-toi bien !} | For anyone sick or recovering. With friends, you can also say {soigne-toi bien !} |
| À tes souhaits ! (`expr-a1m4-004`) | É com {tu}, para amigos e família. Com quem você não conhece, diga {à vos souhaits !} | This one uses {tu}, for friends and family. With people you don't know, say {à vos souhaits !} |
| Quel temps ! (`expr-a1m4-005`) | {Quel temps !} é exclamação, não pergunta. Quase sempre é reclamação, mas o tom pode virar elogio. | {Quel temps !} is an exclamation, not a question. It's usually a complaint, but tone can flip it. |
| Fais comme chez toi (`expr-a1m5-001`) | Com {tu}, para quem é próximo. Para uma visita mais formal, diga {faites comme chez vous}. | This is the {tu} version, for people you're close to. For a more formal guest: {faites comme chez vous}. |
| Chez moi (`expr-a1m5-002`) | {Chez} já quer dizer "na casa de": {chez moi}, {chez toi}, {chez Marie}. Não precisa de {maison}. | {Chez} already means "at the home of": {chez moi}, {chez toi}, {chez Marie}. No need for {maison}. |
| Bienvenue ! (`expr-a1m5-003`) | Em {bienvenue !} sozinho, a forma não muda para homem ou mulher. Para receber em casa: {bienvenue chez moi}. | On its own, {bienvenue !} stays the same for anyone. To welcome someone home: {bienvenue chez moi}. |
| Ça te va bien ! (`expr-a1m5-004`) | Para elogiar roupa, cor ou corte de cabelo, com {tu}. Com quem você trata por {vous}: {ça vous va bien}. | To compliment clothes, a color or a haircut, with {tu}. With someone you call {vous}: {ça vous va bien}. |
| Ça te plaît ? (`expr-a1m5-005`) | Cuidado: quem agrada é a coisa, não a pessoa. Para dizer que gosta, responda {oui, ça me plaît !} | Careful: the thing does the pleasing, not you. To say you like it, answer {oui, ça me plaît !} |
| Bon week-end ! (`expr-a1m6-001`) | É a despedida da sexta-feira, no trabalho ou na escola. Em francês se diz {week-end}, com hífen. | The Friday goodbye at work or school. Note the French spelling: {week-end}, with a hyphen. |
| Bonne soirée ! (`expr-a1m6-002`) | Serve na despedida; ao chegar, é {bonsoir}. Na hora de dormir, é {bonne nuit}. | It's for goodbyes; when you arrive, it's {bonsoir}. At bedtime, it's {bonne nuit}. |
| C'est parti ! (`expr-a1m6-003`) | {C'est parti !} dá a largada com animação: um jogo, uma viagem, uma lição. Serve com qualquer pessoa. | {C'est parti !} kicks things off with energy: a game, a trip, a lesson. Fine with anyone. |
| Quoi de neuf ? (`expr-a1m6-004`) | É informal, para amigos. Depois de um {salut}, cai bem. Sem novidades? Responda {rien de spécial}. | Casual, for friends, right after {salut}. Nothing to report? Just say {rien de spécial}. |
| Ça fait longtemps ! (`expr-a1m6-005`) | É o que se diz ao reencontrar alguém depois de muito tempo. Para medir o tempo: {ça fait deux ans}. | What you say when you run into someone after ages. To give the length: {ça fait deux ans}. |
| coup de main (`expr-a2-001`) | Bem do dia a dia, serve até com colegas. Quem ajuda {donne un coup de main}: {tu me donnes un coup de main ?} | Everyday French, fine even with coworkers. The helper {donne un coup de main}: {tu me donnes un coup de main ?} |
| avoir le trac (`expr-a2-002`) | É o nervoso de antes: prova, palco, entrevista. Não é medo em geral. Vai com {avoir}: {j'ai le trac}. | The nerves right before an exam, a show, an interview, not fear in general. It's {j'ai le trac}. |
| faire la grasse matinée (`expr-a2-003`) | Vai com {faire}: {je fais la grasse matinée}. É o programa clássico do domingo, com qualquer pessoa. | It takes {faire}: {je fais la grasse matinée}. The classic Sunday plan, fine to say to anyone. |
| n'importe quoi (`expr-lote1-001`) | Como "qualquer coisa", é neutro. Como "bobagem", é informal e direto: {tu dis n'importe quoi !} só entre amigos. | Meaning "anything", it's neutral. Meaning "nonsense", it's blunt: {tu dis n'importe quoi !} is for friends. |
| en avoir marre (`expr-lote1-002`) | Não esqueça o {en}: {j'en ai marre}. Para dizer do quê, use {de}: {j'en ai marre du bruit}. É informal. | Don't drop the {en}: {j'en ai marre}. Add what with {de}: {j'en ai marre du bruit}. It's casual. |
| passer un coup de fil (`expr-lote1-015`) | Serve com qualquer pessoa, até no trabalho. Para dizer para quem, use {à}: {passer un coup de fil à Paul}. | Fine anywhere, even at work. Say who with {à}: {passer un coup de fil à Paul}. |
| faire la queue (`expr-lote1-016`) | Vai com {faire}: {je fais la queue}. Para avisar que tem fila, diga {il y a la queue}. | Like British English, French uses {queue} for a line: {je fais la queue}, with {faire}. |
| avoir hâte (`expr-lote1-017`) | Vai com {de} + verbo: {j'ai hâte de partir}. Só para coisa boa que vai chegar, nunca para pressa. | It takes {de} + verb: {j'ai hâte de partir}. Despite looking like "haste", it's not about hurrying. |
| nuit blanche (`expr-lote2-013`) | O comum é com {passer}: {j'ai passé une nuit blanche}. Vale para festa, trabalho ou preocupação. | It usually goes with {passer}: {j'ai passé une nuit blanche}. Party, work or worry, any reason counts. |
| c'est nul (`expr-lote3-006`) | Informal, para coisas e situações. Com pessoa vira crítica: {il est nul en maths}, péssimo em matemática. | Casual, for things and situations. About a person it's a put-down: {il est nul en maths}, hopeless at math. |
| c'est génial (`expr-lote3-007`) | Vale para qualquer notícia boa: {c'est génial !} E também para pessoas: {il est génial}, "ele é incrível". | For any good news: {c'est génial !} It works for people too: {il est génial}, "he's amazing". |
| mince alors (`expr-lote3-008`) | É a versão educada de um palavrão: dá para dizer na frente de crianças. Muitas vezes sai só {mince !} | It's the polite stand-in for a swear word, fine in front of kids, like "darn". Often just {mince !} |
| tomber amoureux (`expr-lote3-012`) | Repare: é {de}, não "por": {tomber amoureux de Julie}. E no passado vai com {être}: {il est tombé}. | Note the {de}, where English says "with": {tomber amoureux de Julie}. In the past it takes {être}: {il est tombé}. |
| faire semblant (`expr-lote4-001`) | Diferente do nosso "finge que", o normal é {de} + verbo: {il fait semblant de dormir}. | Where English says "pretend that", French prefers {de} + verb: {il fait semblant de dormir}. |
| faire exprès (`expr-lote4-002`) | Muito comum na negativa, para pedir desculpas: {je n'ai pas fait exprès}. O {s} final é mudo. | Very common in the negative, to apologize: {je n'ai pas fait exprès}. The final {s} is silent. |
| avoir la gueule de bois (`expr-001`) | É informal e vai com {avoir}: {j'ai la gueule de bois}. Para o rosto de alguém, {gueule} é grosseira. | It's casual and takes {avoir}: {j'ai la gueule de bois}. For a person's face, {gueule} is rude. |
| casser les pieds (`expr-002`) | Quem se irrita entra antes do verbo: {tu me casses les pieds}. É informal, mas sem palavrão. | The annoyed person goes before the verb: {tu me casses les pieds}. Casual, but no swear word. |
| poser un lapin (`expr-003`) | Quem leva o bolo vem antes do verbo: {il m'a posé un lapin}. Informal, para encontro ou compromisso. | The person stood up goes before the verb: {il m'a posé un lapin}. Casual, for a date or any plan. |
| s'en foutre (`expr-lote1-003`) | Muito comum entre amigos, mas grosseiro: nunca com chefe ou desconhecidos. Neutro: {ça m'est égal}. | Very common among friends, but crude: never with your boss or strangers. Neutral: {ça m'est égal}. |
| être dans la merde (`expr-lote1-004`) | Vulgar: só com gente muito próxima, e de preferência falando de você mesmo: {je suis dans la merde}. | Vulgar: only with people you're very close to, ideally about yourself: {je suis dans la merde}. |
| ça craint (`expr-lote1-005`) | Muito usado pelos jovens. Também diz que um lugar é perigoso: {ce quartier craint}. | Young people use it a lot. It can also mean a place is sketchy: {ce quartier craint}. |
| avoir la flemme (`expr-lote1-006`) | Vai com {de} + verbo: {j'ai la flemme de cuisiner}. Bem informal: com o chefe, melhor não. | It takes {de} + verb: {j'ai la flemme de cuisiner}. Very casual, so not something to tell your boss. |
| c'est dingue (`expr-lote1-007`) | Serve para surpresa boa ou ruim, igual a {c'est fou}. Informal, para usar com amigos. | Works for good or bad surprises, just like {c'est fou}. Casual, for friends. |
| foutre le camp (`expr-lote1-008`) | No imperativo é bem agressivo: {foutez le camp !} Já {je fous le camp} é só "vou embora", mas grosso. | As an order it's aggressive: {foutez le camp !} {Je fous le camp} just means "I'm leaving", but crudely. |
| ta gueule (`expr-lote1-009`) | Ofende de verdade; só entre amigos muito próximos, brincando. Sem grosseria, mas ainda seco: {tais-toi}. | It truly offends; only among close friends, joking. Not crude, but still curt: {tais-toi}. |
| faire chier (`expr-lote1-010`) | É vulgar: o mais comum é {ça me fait chier}. Com quem você não conhece bem, evite totalmente. | It's vulgar: you'll mostly hear {ça me fait chier}. Avoid it with anyone you don't know well. |
| se prendre la tête (`expr-lote1-011`) | Muito comum no imperativo, para acalmar alguém: {ne te prends pas la tête}. Informal. | Very common as advice to calm someone down: {ne te prends pas la tête}. Casual. |
| tu parles ! (`expr-lote1-012`) | Tudo está no tom irônico: {tu parles !} não pede para a pessoa falar. É informal. | It's all in the ironic tone, like "yeah, right": {tu parles !} isn't asking anyone to talk. |
| c'est du gâteau (`expr-lote1-013`) | Repare no {du}, nunca {un}. Na negativa também é comum: {ce n'est pas du gâteau}, "não é moleza". | Like "a piece of cake", but with {du}, never {un}. The negative is common too: {ce n'est pas du gâteau}. |
| avoir le cafard (`expr-lote1-014`) | {Cafard} também é barata, mas aqui é só tristeza passageira. Vai com {avoir}: {j'ai le cafard}. | {Cafard} also means cockroach, but here it's a passing sadness. It takes {avoir}: {j'ai le cafard}. |
| dégage (`expr-lote2-001`) | É agressivo, coisa de briga. Em outros contextos, o verbo {dégager} quer dizer "liberar". | It's aggressive, the language of a fight. Elsewhere, the verb {dégager} means "to clear". |
| se casser (`expr-lote2-002`) | Cuidado: {se casser} também é quebrar, como em {le verre s'est cassé}. O contexto diz se alguém saiu. | Careful: {se casser} can also mean to break, as in {le verre s'est cassé}. Context tells you. |
| c'est chiant (`expr-lote2-003`) | É vulgar, mas muito ouvido. Dito de alguém, ofende: {il est chiant}. Com desconhecidos, evite. | It's vulgar but heard a lot. About a person it's insulting: {il est chiant}. Avoid it with strangers. |
| avoir la trouille (`expr-lote2-004`) | Igual a {avoir peur}, vai com {avoir} e {de}: {j'ai la trouille de prendre l'avion}. É informal. | Like {avoir peur}, it takes {avoir} and {de}: {j'ai la trouille de prendre l'avion}. Casual. |
| être crevé (`expr-lote2-005`) | É informal e concorda com quem fala: eu digo {je suis crevée}. Num pneu, {crevé} é furado. | It's casual and agrees with the speaker: I say {je suis crevée}. On a tire, {crevé} means flat. |
| être bourré (`expr-lote2-006`) | Gíria de festa, só com gente próxima. A palavra neutra é {ivre}. Mulher diz {je suis bourrée}. | Party slang, close friends only. The neutral word is {ivre}. A woman says {je suis bourrée}. |
| avoir la dalle (`expr-lote2-007`) | Gíria, entre amigos ou em casa. Como {avoir faim}, vai com {avoir}: {j'ai la dalle}. | Slang, with friends or family. Like {avoir faim}, it takes {avoir}: {j'ai la dalle}. |
| casser les bonbons (`expr-lote2-008`) | Gíria, só com gente próxima: versão suave de uma expressão grosseira. Repare no {me}: {tu me casses les bonbons}. | Slang, close friends only: a softened form of a cruder phrase. Note the {me}: {tu me casses les bonbons}. |
| arrête ton char (`expr-lote2-009`) | Informal, entre amigos, para uma história difícil de engolir. Com {vous}: {arrêtez votre char}. | Informal, among friends, when a story sounds too good to be true. With {vous}: {arrêtez votre char}. |
| tomber dans les pommes (`expr-lote2-010`) | Informal e muito comum. No passado, {tomber} vai com {être}: {elle est tombée dans les pommes}. | Informal and very common. In the past tense {tomber} takes {être}: {elle est tombée dans les pommes}. |
| donner sa langue au chat (`expr-lote2-011`) | Serve para charadas e adivinhas, entre amigos. O {sa} muda com a pessoa: {je donne ma langue au chat}. | For riddles and guessing games, among friends. {Sa} changes with the person: {je donne ma langue au chat}. |
| coûter les yeux de la tête (`expr-lote2-012`) | Quase igual ao português, mas em francês são os olhos {de la tête}. Serve em qualquer conversa. | English pays an arm and a leg; French pays {les yeux de la tête}. Fine in any conversation. |
| jeter l'éponge (`expr-lote2-014`) | Em português se joga a toalha; em francês, a esponja: {jeter l'éponge}. Cabe em qualquer conversa. | English throws in the towel, French throws the sponge: {jeter l'éponge}. Both come from boxing. |
| avoir la tête dans les nuages (`expr-lote2-015`) | Em português é o mundo da lua; em francês, as nuvens. Vai com {avoir}: {il a la tête dans les nuages}. | Same picture as in English, but with {avoir}: {il a la tête dans les nuages}. Fine in any setting. |
| avoir le cœur sur la main (`expr-lote2-016`) | Elogio que cabe em qualquer conversa. Cuidado com a preposição: o coração fica {sur la main}. | A compliment that works anywhere. Watch the preposition: the heart is {sur la main}, "on" the hand. |
| ça vaut le coup (`expr-lote3-001`) | Muito comum no dia a dia, com qualquer pessoa. Para dizer o contrário: {ça ne vaut pas le coup}. | Very common in everyday talk, with anyone. To say the opposite: {ça ne vaut pas le coup}. |
| pas de bol (`expr-lote3-002`) | Informal, para azar pequeno, como perder o ônibus. Diante de uma notícia triste, {pas de bol} soa leve demais. | Informal, for small mishaps like missing a bus. For truly sad news, {pas de bol} sounds far too light. |
| avoir du bol (`expr-lote3-003`) | Repare no {du}: {il a du bol}. Para o azar, diga {pas de bol}. As duas são informais, entre amigos. | Note the {du}: {il a du bol}. For bad luck it's {pas de bol}. Both are informal, among friends. |
| faire gaffe (`expr-lote3-004`) | Informal; num contexto formal, {faites attention}. Cuidado: {faire une gaffe}, com {une}, é cometer uma gafe. | Casual; in formal settings, {faites attention}. Careful: {faire une gaffe}, with {une}, means to make a blunder. |
| se planter (`expr-lote3-005`) | Informal. É verbo com {se}, então o passado vai com {être}: {je me suis planté}, ou {plantée} se for mulher. | Informal. It's a {se} verb, so the past takes {être}: {je me suis planté}, or {plantée} for a woman. |
| mort de rire (`expr-lote3-009`) | Informal. Concorda com quem ri: mulher diz {j'étais morte de rire}. Por escrito, vira {mdr}. | Informal. It agrees with whoever's laughing: a woman says {j'étais morte de rire}. In texts it's {mdr}. |
| être au top (`expr-lote3-010`) | Informal, e serve para pessoa, lugar ou coisa: {elle est au top}, {ce restaurant est au top}. | Informal, and it works for people, places or things: {elle est au top}, {ce restaurant est au top}. |
| perdre patience (`expr-lote3-011`) | Repare: em francês não tem artigo, é {perdre patience}, sem {la}. Serve em qualquer conversa. | No article, just like "lose patience" in English: {je perds patience}. Fine in any setting, formal or not. |
| ferme-la (`expr-lote3-013`) | Soa grosseiro, mesmo sem palavrão: o {la} é a boca. Mais neutro, mas ainda seco: {tais-toi}. | It's rude, even with no swear word: the {la} is the mouth. Still blunt but milder: {tais-toi}. |
| fous-moi la paix (`expr-lote3-014`) | Soa irritado e grosseiro, então só com gente muito próxima. Versão educada: {laisse-moi tranquille}. | It sounds angry and rude, so only with people you're very close to. Politer: {laisse-moi tranquille}. |
| tu te fous de moi ? (`expr-lote3-015`) | Gíria para reagir a algo absurdo, só com gente próxima. Mais leve, sem grosseria: {tu te moques de moi ?} | Slang for reacting to something outrageous, close friends only. Milder: {tu te moques de moi ?} |
| bordel (`expr-lote3-016`) | Pode chocar, então nada de usar com desconhecidos. Também quer dizer bagunça: {c'est le bordel ici}. | It can shock, so never with strangers. It also means a big mess: {c'est le bordel ici}. |
| putain (`expr-lote3-017`) | Serve para raiva, susto e até admiração, mas é grosseiro: reconheça {putain} e evite com desconhecidos. | It covers anger, shock, even awe, but it's crude: recognize {putain} and never use it with strangers. |
| espèce de con (`expr-lote3-018`) | Insulto de verdade, que pode gerar briga: melhor só reconhecer. Para mulher, vira {espèce de conne}. | A real insult that can start a fight: best to just recognize it. For a woman it becomes {espèce de conne}. |
| connard (`expr-lote3-019`) | Insulto forte, melhor só reconhecer. É masculino; para mulher, os franceses dizem {connasse}. | A strong insult, best kept for recognizing. It's masculine; for a woman French uses {connasse}. |
| tourner la page (`expr-lote4-003`) | Mesma imagem do português, e cabe em qualquer conversa, até no trabalho: {il faut tourner la page}. | Same image as in English, and fine anywhere, even at work: {il faut tourner la page}. |
| en vouloir à quelqu'un (`expr-lote4-004`) | Não tem nada a ver com querer algo. Repare no {en} e no {à}: {je t'en veux}, {elle en veut à son amie}. | Nothing to do with wanting. Don't drop the {en}: {je t'en veux} means "I hold it against you". |
| c'est foutu (`expr-lote4-005`) | Informal e um pouco grosseiro: evite no trabalho. Uma versão mais leve é {c'est fichu}. | Informal and a bit crude: skip it at work. A milder version is {c'est fichu}. |
| être fauché (`expr-lote4-006`) | Informal e bem comum. Concorda com quem fala: eu diria {je suis fauchée}, com o "e" do feminino. | Casual and very common. It agrees with the speaker: as a woman, I'd say {je suis fauchée}. |
| avoir les boules (`expr-lote4-007`) | Bem informal: fica para os amigos. Repare que vem com {avoir} e o artigo {les}: {j'ai les boules}. | Not "have the balls" (be brave): {j'ai les boules} means you're gutted. Very casual, friends only. |
| avoir la pêche (`expr-lote4-008`) | Informal e sempre com {avoir} e {la}: {j'ai la pêche}. Nada a ver com fruta na conversa, é pura energia. | Casual, and always with {avoir} and {la}: {j'ai la pêche}. Nobody's talking fruit here, it's all energy. |
| galérer (`expr-lote4-009`) | Verbo informal, conjugado como {parler}: {j'ai galéré}. Para algo difícil de fazer, diga {c'est la galère}. | A casual verb, conjugated like {parler}: {j'ai galéré}. For a hard task, say {c'est la galère}. |
| avoir du fric (`expr-lote4-010`) | {Le fric} é gíria para {l'argent}: com amigos, tudo bem; numa entrevista ou no banco, fique com {argent}. | {Le fric} is slang for {l'argent}: fine with friends, but at a job interview or the bank, stick to {argent}. |
| tu m'emmerdes (`expr-lote4-011`) | Vulgar e ofende: entenda quando ouvir, mas evite dizer. Sem palavrão, os franceses dizem {tu m'embêtes}. | Vulgar and hurtful: understand it, but don't say it. Without the swear word, French says {tu m'embêtes}. |
| être cinglé (`expr-lote4-020`) | Informal, com amigos. Concorda com a pessoa: {il est cinglé}, {elle est cinglée}. | Casual, for friends. It agrees with the person: {il est cinglé}, {elle est cinglée}. |
| mettre les points sur les i (`expr-b2-001`) | Igual ao nosso "pôr os pingos nos is". Em francês também soa firme: {je vais mettre les points sur les i}. | Like "dot the i's", but often firmer, close to "set the record straight": {mettre les points sur les i}. |
| avoir un poil dans la main (`expr-b2-002`) | Informal e meio brincalhona. Repare no {un}: é sempre {un poil}, um pelo só, nunca {des poils}. | Casual and a bit teasing. Note the {un}: it's always {un poil}, a single hair, never {des poils}. |
| ne pas y aller de main morte (`expr-b2-003`) | Sempre na negativa, e repare no {y}: {tu n'y vas pas de main morte !}, {il n'y est pas allé de main morte}. | Always negative, and watch the {y}: {tu n'y vas pas de main morte !}, {il n'y est pas allé de main morte}. |
| mon œil ! (`expr-lote1-018`) | Informal e irônico. Às vezes os franceses puxam a pálpebra com o dedo ao dizer {mon œil !} | Casual and ironic, for people you know well. The French sometimes pull down an eyelid while saying {mon œil !} |
| monter sur ses grands chevaux (`expr-lote1-019`) | O possessivo muda com a pessoa: {je monte sur mes grands chevaux}, {il monte sur ses grands chevaux}. | Close to "get on your high horse", and the possessive changes too: {je monte sur mes grands chevaux}. |
| avoir un coup de barre (`expr-lote1-020`) | Informal e bem comum depois do almoço. Vem com {avoir} e {un}: {j'ai un coup de barre}. | Casual and very common after lunch, like "I'm crashing". It takes {avoir} and {un}: {j'ai un coup de barre}. |
| avoir un verre dans le nez (`expr-lote2-017`) | Informal e bem-humorada, mais leve que {être bourré}. Serve para falar de alguém, não para ofender. | Casual and good-humored, much softer than {être bourré}. Use it to tease, not to insult. |
| coûter la peau des fesses (`expr-lote2-018`) | Versão mais informal de {coûter les yeux de la tête}: {la peau des fesses} é a pele do bumbum. Só entre amigos. | Cheekier than {coûter les yeux de la tête}, the everyday version. Keep {la peau des fesses} for friends. |
| en faire tout un fromage (`expr-lote2-019`) | Informal. Não esqueça o {en}: {ne va pas en faire tout un fromage !} Em francês o drama vira queijo. | Casual. Don't drop the {en}: {ne va pas en faire tout un fromage !} In French, the fuss becomes a cheese. |
| rire jaune (`expr-lote2-020`) | Igualzinho ao nosso "rir amarelo", e cabe em qualquer conversa. No passado: {il a ri jaune}. | Fine in any setting. {Jaune} never changes, and in the past it's {il a ri jaune}. |
| être à côté de la plaque (`expr-lote3-020`) | Informal, para quem está "viajando" no assunto. Costuma vir com {complètement}: {il est complètement à côté}. | Casual, for someone way off base. Often with {complètement} before it: {il est complètement à côté}. |
| va te faire voir (`expr-lote4-012`) | {Va te faire voir} é grosseira e corta a conversa com raiva. Suaviza um palavrão, mas evite até com amigos. | {Va te faire voir} is rude and ends the talk in anger. It softens a swear, but avoid it, even with friends. |
| tirer la gueule (`expr-lote4-013`) | {La gueule} é a boca de bicho, por isso soa grosseira. Entre amigos passa; com o chefe, diga {faire la tête}. | {La gueule} is an animal's mouth, so it sounds crude. Fine with friends; with your boss, say {faire la tête}. |
| se foutre de la gueule de quelqu'un (`expr-lote4-014`) | Bem grosseira por causa do {foutre}: só entre amigos. Repare no possessivo: {ils se foutent de notre gueule}. | Very crude because of {foutre}: friends only. The possessive changes: {ils se foutent de notre gueule}. |
| être sur les nerfs (`expr-lote4-015`) | Vem com {être} e o artigo {les}: {je suis sur les nerfs}. Informal, mas bem natural no dia a dia. | It takes {être} and {les}: {je suis sur les nerfs}. Casual, but very natural in everyday talk. |
| il pleut des cordes (`expr-lote4-016`) | Só funciona com {il}, como todo verbo de chuva: {il pleut des cordes}. Nunca diga {ça pleut}. | Like "it's pouring", it only works with {il}: {il pleut des cordes}, never {ça pleut}. |
| mettre le paquet (`expr-lote4-017`) | Informal e positiva: sempre {le paquet}, no singular. No passado: {il a mis le paquet}. | Casual and positive: always {le paquet}, singular. In the past: {il a mis le paquet}. |
| à fond la caisse (`expr-lote4-018`) | Informal, muito usada para carro e moto. {La caisse} é gíria para carro. Com amigos, só {à fond} já basta. | Casual, mostly about cars and bikes: {la caisse} is slang for a car. With friends, plain {à fond} works too. |
| ça ne casse pas des briques (`expr-lote4-019`) | Informal e sempre na negativa. Na fala, o {ne} costuma cair: {ça casse pas des briques}. | Casual and always negative. In speech, the {ne} often drops: {ça casse pas des briques}. |
