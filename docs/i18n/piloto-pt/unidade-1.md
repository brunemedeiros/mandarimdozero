# Unidade-piloto do curso `portugues@en`: A1-1 "Hi! How are you?"

> Status: **needs_review** em tudo. Rascunho para a professora revisar; nada está ligado ao app (sem pasta `pt/`, sem
> registro, sem áudio). Versão estruturada: `unidade-1.json` (mesmo formato de uma unidade de `fr/content.js` em `base`
> e da camada do curso em `en`).
>
> Revisado em 2026-10-15 depois da verificação externa do catálogo, com a autorização da dona: correções propostas em
> `revisao-pos-verificacao.md`, aplicadas aqui e no `.json`. Antes x depois de cada mudança: `CHANGELOG-pos-verificacao.md`.

## Decisões que faltam

Decisões da dona que ainda não existem. Até elas saírem, o texto ficou neutro (sem escolher por ela):

1. **Variedade dos áudios** (decisão 1 do catálogo: qual sotaque urbano vai nos áudios?). Afeta a nota `som-de-bom-dia`: hoje ela
   fala em "many Brazilian accents" e "not every accent does this", sem transcrição. As transcrições aproximadas ("bõ JEE-ah",
   "BOH-ah NOY-chee") saíram e só voltam se a professora confirmar que soam certas na variedade escolhida. A confiança da nota
   fica **média** até lá. Afeta também o áudio de todas as palavras, frases e falas da unidade.
2. **Gírias e formas de fala** (decisão 5 do catálogo: quais entram, em qual unidade, cada uma classificada à parte). Nesta unidade
   só aparece "cê" (nota `voce-e-de-onde`), já como reconhecimento; "valeu", "e aí" e "beleza" continuam de fora.
3. **Oblíquos por nível** (decisão 4 do catálogo). A unidade não usa pronome oblíquo; se a dona aprovar "me chamo" como expressão
   frequente do A1, ele pode entrar ao lado de "meu nome é". Nada foi acrescentado.
4. **Pronomes** (decisão 3 do catálogo: só "você" + verbo na 3ª pessoa no A1, nota de "tu" sem lista de regiões). A unidade já
   segue a recomendação; falta a dona confirmar.

## Como foi feito

- Curso: português do Brasil para quem fala inglês (EN-US, decisão de 2026-10-03). Texto em **português** = língua-alvo
  (o que o aluno estuda, ouve e digita). Texto em **inglês** = explicações, traduções, cenários e perguntas (o site do
  `/pt` é todo em inglês).
- Escrito de propósito para falante de inglês, não traduzido do curso de francês: as notas atacam as dificuldades de
  quem vem do inglês (som nasal, d/t antes de "i", "tudo bem" como pergunta e resposta, obrigado/obrigada, você x tu,
  de/do/da com país, ordem "Você é de onde?").
- Estrutura igual à A1-1 do francês: 3 lições com vocabulário + ponto de verificação, notas (`concepts`) disparadas logo
  depois da palavra que explicam, verdadeiro/falso, frases com blocos (exercício de ordenar), diálogo com 3 checagens
  (`fill`, `listen`, `understand`). Os demais exercícios o app gera a partir do vocabulário e das frases.
- Só um marcador de perfil: `{nome}`. Não usei `{nacionalidade}` porque a frase "Eu sou de..." pede o nome do país com
  do/da/dos, e o app ainda não tem esse marcador (ver perguntas).
- Confiança: **alta** = forma e uso que qualquer brasileiro confirma, ou regra de norma-padrão; **média-alta** = muito
  provável, mas sem fonte aberta verificada (a professora confirma); **média** = correto, mas um detalhe (região,
  frequência, melhor tradução, variedade dos áudios) merece o seu olho; **baixa** = dúvida real ou sem fonte.
  **Não verificada** = nenhuma fonte aberta apoia nem contradiz. Depois da verificação, alguns detalhes ficaram em "baixa"
  (ver "Resumo de confiança"). Itens marcados com ⚠ pedem conferência.

## Título, objetivo e lições

| chave | inglês (aparece no site) | confiança |
|---|---|---|
| título | Hi! How are you? | média ⚠ (alternativa: "Greetings and introductions") |
| objetivo | Greet someone, ask how they are, say your name and where you're from, and say goodbye. | alta |
| lição `oi-e-bom-dia` | Hi and good morning | alta |
| lição `tudo-bem-e-tchau` | How are you, thank you and bye | alta |
| lição `nome-e-origem` (com o diálogo) | Your name and where you're from | alta |
| lição `checkpoint` | Checkpoint | alta |

## Vocabulário (12 palavras)

| # | português | inglês | lição | confiança | conferir |
|---|---|---|---|---|---|
| 0 | oi | hi / hello | 1 | alta | |
| 1 | bom dia | good morning | 1 | alta | |
| 2 | boa tarde | good afternoon | 1 | alta | |
| 3 | boa noite | good evening / good night | 1 | alta | |
| 4 | tudo bem | how are you? / I'm good | 2 | média | ⚠ no francês a senhora aprovou "all good? / all good." para "ça va"; usar o mesmo padrão? |
| 5 | obrigado | thank you (said by a man) | 2 | alta | ⚠ dois cartões (5 e 6) ou um só "obrigado / obrigada"? |
| 6 | obrigada | thank you (said by a woman) | 2 | alta | |
| 7 | tchau | bye | 2 | alta | |
| 8 | meu nome é | my name is | 3 | alta | |
| 9 | prazer | nice to meet you | 3 | alta | |
| 10 | de onde você é? | where are you from? | 3 | alta | |
| 11 | eu sou de | I'm from | 3 | alta | |

Ficaram de fora de propósito: "olá" (entra só na nota de realidade), "de nada" (entra na nota de obrigado), "e aí?",
"beleza?", "valeu" (gíria: o projeto só libera `familiar-giria` a partir do A2), "o senhor / a senhora" (unidade futura).

## Frases (exercício de ordenar e de tradução)

| # | português (blocos separados por ·) | inglês | cenário (inglês) | confiança |
|---|---|---|---|---|
| 0 | Oi! · Meu nome é · {nome}. | Hi! My name is {nome}. | 🎉 You meet someone new at a party and want to introduce yourself. What do you say? | alta |
| 1 | Bom dia! · Tudo bem? | Good morning! How are you? | 🌅 It's 9 a.m. and you walk into your Portuguese class. How do you greet your teacher? | alta |
| 2 | Tudo bem, · e você? | I'm good, and you? | 🙂 A friend asks you "Tudo bem?". You want to say you're fine and ask back. What do you say? | alta |
| 3 | Obrigada! · Tchau! | Thanks! Bye! | ☕ Ana is leaving a café in Rio. She thanks the server and says goodbye. What does she say? | alta ⚠ (cenário com personagem mulher porque o app não sabe o gênero do aluno nesta frase) |
| 4 | De onde · você é? | Where are you from? | | alta |
| 5 | Eu sou · de Chicago. | I'm from Chicago. | | alta |
| 6 | Eu sou · dos Estados Unidos. | I'm from the United States. | | alta (contração "dos" explicada como bloco pronto) |
| 7 | Muito · obrigado! | Thank you very much! (said by a man) | | alta ("muito" fora do vocabulário, como "beaucoup" no francês) |
| 8 | Boa noite, · tchau! | Good night, bye! | | alta |

## Diálogo: "Meeting at a welcome party"

Cena (inglês): *Friday night, at a welcome party for exchange students in São Paulo: Lucas meets Emily, who just arrived from the US.*
Personagens: Lucas 👨 (A, brasileiro) e Emily 👩 (B, americana, para o aluno se ver no diálogo).

| # | quem | português | inglês | confiança |
|---|---|---|---|---|
| 0 | Lucas | Oi! Tudo bem? | Hi! How are you? | alta |
| 1 | Emily | Tudo bem, e você? | I'm good, and you? | alta |
| 2 | Lucas | Tudo bem! Meu nome é Lucas. Você é de onde? | I'm good! My name is Lucas. Where are you from? | média-alta (ordem falada de propósito; a nota `voce-e-de-onde` explica logo depois; "muito comum na conversa" não verificada) |
| 3 | Emily | Prazer, Lucas! Meu nome é Emily. Eu sou de Chicago. | Nice to meet you, Lucas! My name is Emily. I'm from Chicago. | alta |
| 4 | Lucas | Prazer, Emily! Bem-vinda ao Brasil! | Nice to meet you, Emily! Welcome to Brazil! | média ⚠ "bem-vinda" é palavra nova; alternativa sem palavra nova: "Prazer, Emily! Tchau, boa noite!". Se ficar, conferir a grafia com hífen no VOLP da ABL antes de publicar |
| 5 | Emily | Obrigada! Boa noite, tchau! | Thank you! Good night, bye! | alta |

Checagens do diálogo:
- **fill** (lacuna na fala 5): certa "Obrigada! Boa noite, tchau!"; erradas "Obrigado! Boa noite, tchau!" (distrator de
  gênero de propósito: Emily é mulher) e "Bom dia! Tudo bem?" (é noite). Confiança alta.
- **listen** (ouve a fala 0 e escolhe a resposta = fala 1 "Tudo bem, e você?"): erradas "Obrigada! Tchau!" e
  "Eu sou de Chicago.". Confiança alta.
- **understand**: "Where is Emily from?" → **Chicago** / São Paulo / Lisbon. Confiança alta.

## Verdadeiro ou falso

| frase | afirmação (inglês) | resposta | explicação (inglês) | confiança |
|---|---|---|---|---|
| 🙏 Obrigado! | A woman says this to thank someone. | falso | Not quite: a woman says **obrigada**. **Obrigado** is what a man says. The ending matches the person speaking, not the person being thanked. | alta |
| 🌙 Boa noite! | You can say this both when you arrive somewhere at night and when you leave. | verdadeiro | Correct: **boa noite** means both "good evening" and "good night". | alta |

## Notas (9): explicação em inglês, resumo em português, confiança

Ordem em que aparecem na trilha. "R" = nota de realidade, "C" = nota cultural, sem letra = explicação comum.

### 1. `oi-ou-ola` (R, `informal`), depois de "oi" (vocab 0). Confiança: **média-alta** (não verificada)
Resumo: os livros começam com "olá", mas na fala o brasileiro diz "oi" para quase todo mundo e a qualquer hora; "olá"
soa escrito (e-mail, placa, apresentador de TV).
> **"Oi" or "olá"?** Many textbooks start with **olá**, but in everyday speech Brazilians say **oi** to almost everyone,
> at any time of day: friends, the cashier at the supermarket, even your teacher. **Olá** is correct, but it sounds more
> like writing: emails, signs, a TV host greeting the audience. If you're not sure, **oi** is the safe choice in conversation.
> - oi: hi (in speech, with almost anyone)
> - olá: hello (more common in writing or on TV)

### 2. `som-de-bom-dia` (pronúncia), depois de "bom dia" (vocab 1). Confiança: **média** ⚠ (até a dona escolher a variedade dos áudios)
Resumo: "bom" é nasal (não rima com "bomb", e o "m" final não é um "m" completo); em muitos sotaques brasileiros d/t antes
de som de "i" viram "dj"/"tch"; "e" final muitas vezes soa "i". Nem todo sotaque faz isso: alguns falantes dizem d e t
"duros". Ouvir o áudio e imitar.
> **How do you say "bom dia"?** Two sounds trip up English speakers here. First, **bom** is a nasal sound: the air goes
> out through your nose, and the **m** at the end is not a full "m". It does not rhyme with English "bomb".
> Second, in many Brazilian accents a **d** before an "ee" sound sounds like the "j" of "jeep", as in **dia**. The same
> happens with **t**, which sounds like the "ch" of "cheese", as in **noite** (a final **e** often sounds like "ee").
> Not every accent does this, so you may hear a plain d and t from some speakers. Listen to the audio and copy it.
> - bom dia: good morning
> - boa noite: good evening / good night

Confiança por parte: "bom" nasal e não rima com "bomb": média-alta (não verificada). d/t antes de "i" como fenômeno
variável: média. "Most of Brazil" e a menção ao Nordeste: **removidas** (sem fonte). "The m is not really pronounced" era
hipótese didática sem fonte: virou "is not a full m".

⚠ Pendente da decisão 1 (variedade dos áudios): as transcrições "bõ JEE-ah" e "BOH-ah NOY-chee" saíram dos exemplos e do
texto; voltam só se a professora confirmar que soam certas na variedade escolhida.

### 3. `bom-dia-tarde-noite`, depois de "boa noite" (vocab 3). Confiança: **média-alta** (não verificada)
Resumo: horários aproximados (bom dia até o almoço, boa tarde até escurecer, boa noite depois); "boa noite" serve para
chegar e para sair (o inglês separa "good evening" e "good night"); bom x boa porque dia é masculino.
> **"Bom dia", "boa tarde" or "boa noite"?** Use **bom dia** in the morning, until about lunchtime. From noon until it
> gets dark, it's **boa tarde**. After dark, it's **boa noite**. One big difference from English: **boa noite** is both
> "good evening" (when you arrive) and "good night" (when you leave). And why **bom** in one and **boa** in the others?
> Because **dia** is a masculine word and **tarde** and **noite** are feminine. For now, just learn the three as fixed chunks.
> - boa tarde: good afternoon (from noon until dark)
> - boa noite: good evening (arriving) / good night (leaving)

### 4. `tudo-bem-pergunta-e-resposta`, depois de "tudo bem" (vocab 4). Confiança: **média-alta** (não verificada)
Resumo: a mesma expressão é pergunta e resposta, só a entonação muda; é cumprimento, não pergunta de verdade (como
"How are you?"); variantes "Tudo bom?" e a resposta curta "Tudo!".
> **"Tudo bem?" "Tudo bem!"** **Tudo bem** literally means "all well", and it works as both the question and the answer:
> only your voice changes. Going up at the end, it's a question; going down, it's the answer. Just like "How are you?" in
> English, it's a greeting more than a real question, so people answer **tudo bem** even on an average day, and then ask
> back: **e você?** You'll also hear **tudo bom?**, which means the same thing, and the short answer **tudo!**
> - Tudo bem? — Tudo bem!: How are you? — I'm good!
> - Tudo bom? — Tudo, e você?: How's it going? — Good, and you?

### 5. `obrigado-obrigada`, depois de "obrigada" (vocab 6). Confiança: **alta** como regra de norma-padrão (não verificada)
Resumo: concorda com quem FALA, não com quem recebe o agradecimento; significa "obrigado(a)" no sentido de "grato,
em dívida"; resposta "de nada".
> **"Obrigado" or "obrigada"?** In Portuguese, "thank you" changes with the person who is **speaking**, not the person
> you're thanking. A man says **obrigado**; a woman says **obrigada**, even when she's thanking a man. The word literally
> means "obliged". The usual answer is **de nada**: "you're welcome".

⚠ Conferir: deixei de fora pessoas não binárias e o uso de "obrigado" por algumas mulheres (existe, mas não sei medir).
Categoria: norma-padrão (concordância com quem fala). A verificação externa não tratou este ponto, então a regra fica
"alta, não verificada". A ideia de que é "erro frequente do anglófono" (só do catálogo, a nota não a faz) é **baixa**.

### 6. `voce-e-tu` (R, `regional`), depois de "de onde você é?" (vocab 10). Confiança: **média** ⚠
Resumo: no Brasil o "you" do dia a dia é "você", e não é formal; "tu" aparece em parte do país, muitas vezes com o verbo
de "você" ("tu é"); a concordância tradicional é "tu és", e em Portugal é a forma informal normal. O curso usa "você".
> **"Você" or "tu"?** In Brazil, the everyday word for "you" is **você**. It is not formal: you use it with friends,
> family and strangers alike. In some parts of the country, people also say **tu** in casual speech, often with the same
> verb form as **você** (**tu é**, **tu vai**). The traditional form is **tu és**, **tu vais**; **tu é** is what you often
> hear, but it is not the standard conjugation. How common **tu** is depends on the region and on the person. In Portugal,
> **tu** with **és** is the normal informal form. In this course we use **você**: everyone in Brazil understands it.

| situação (inglês) | forma |
|---|---|
| The form this course uses | Você é de onde? |
| Often heard in casual speech where tu is used | Tu é de onde? |
| The traditional conjugation of tu (also normal in Portugal) | Tu és de onde? |

Confiança por parte: "você" padrão e não formal: média-alta (não verificada). "Tu" + verbo de "você" na fala: média.
"Tu és/tu vais" = concordância tradicional e "tu é" = uso na fala, não a conjugação padrão: média-alta (distinção
confirmada pela verificação). Lista de regiões: **removida** (nenhuma fonte a apoia). "Tu és" em Portugal: média (não verificada).

### 7. `eu-sou-de-do-da`, depois de "eu sou de" (vocab 11). Confiança: **alta** (norma-padrão; "a maioria dos países pede artigo": média-alta, não verificada)
Resumo: cidade = "de"; a maioria dos países pede artigo, então vira do/da/dos; aprender o próprio país como bloco.
> **"De", "do" or "da"?** With a city, it's just **de**: **Eu sou de Chicago.** With most countries, **de** joins the word
> for "the" that the country carries: **do** (masculine), **da** (feminine) or **dos** (plural). So: **do Canadá**,
> **da Inglaterra**, **dos Estados Unidos**, and of course **do Brasil**. No need to memorize the rule now: just learn
> your own country as one chunk.
> - Eu sou de Chicago. / Eu sou do Canadá. / Eu sou da Inglaterra. / Eu sou dos Estados Unidos.

### 8. `voce-e-de-onde` (R, `informal`), depois do diálogo. Confiança: **média-alta**
Resumo: na conversa é comum "Você é de onde?" (pergunta no fim, como Lucas disse) e, na fala rápida, "Cê é de
onde?". "Cê" é só para reconhecer; nos exercícios, escrever "você".
> **"De onde você é?" or "Você é de onde?"** You learned **De onde você é?**, and it's correct. But in conversation
> Brazilians often keep the normal word order and put the question at the end: **Você é de onde?** That's exactly what
> Lucas said in the dialogue. In fast, casual speech, **você** often shrinks to **cê**: **Cê é de onde?** In the
> exercises, keep writing the full word **você**: **cê** is for recognizing when you hear it.

Confiança por parte: "cê" como redução falada, ensinada como reconhecimento: média-alta. Frequência de "cê" por região:
**removida** (sem apoio). Ordem "Você é de onde?" como muito comum na conversa: média (não verificada). A classificação de
"cê" acompanha a decisão da dona sobre gírias e formas de fala.

### 9. `beijo-e-abraco` (C, `costume`), depois do diálogo. Confiança: **média** ⚠
Resumo: entre amigos e conhecidos, mulher muitas vezes cumprimenta mulher e homem com beijo no rosto (encostar de bochechas com
som de beijo), um ou dois conforme região e pessoa; homens costumam dar aperto de mão ou abraço com tapinha; em
contexto formal, aperto de mão. Na despedida por mensagem ou telefone, "Beijo!" ou "Abraço!".
> **Why do Brazilians greet with a kiss on the cheek?** Greetings in Brazil are warm and physical. Among friends and
> acquaintances, women often greet women and men with a **beijo**: a light touch of the cheeks with a kiss sound, not
> a real kiss. It's one or two, depending on the region and the person. Men often greet each other with a handshake or a
> hug with a pat on the back. In a formal or work setting, a handshake is the safe start. The same warmth shows up when
> people say goodbye: in messages and on the phone, friends and family often finish with **Beijo!** or **Abraço!**
> instead of "bye".
> - Beijo!: a kiss (bye, with friends and family)
> - Abraço!: a hug (bye, a little more neutral; also in work emails)

Confiança por parte (nenhuma fonte verificada sobre cumprimento): o costume em si e "Beijo!/Abraço!" na despedida: média
(não verificada). "Um ou dois conforme a região e a pessoa": **baixa** (sem fonte; não citei cidades de propósito).
"Abraço" em e-mail de trabalho: **baixa**. ⚠ O trecho "also in work emails" é opcional: tirar se a professora não confirmar.
Nota cultural: passa pela professora, com a confiança reportada no chat (skill `notas-de-realidade`).

## Resumo de confiança

Revisado depois da verificação externa (2026-10-15). Antes dela, o rascunho dizia que nenhum item estava em "baixa"; agora
alguns detalhes dentro das notas estão.

| item | confiança |
|---|---|
| 12 palavras | 11 alta, 1 média (tradução de "tudo bem") |
| 9 frases | 9 alta |
| 6 falas do diálogo | 4 alta, 1 média-alta (fala 2, "Você é de onde?"), 1 média (fala 4, "bem-vinda": palavra nova e hífen a conferir no VOLP) |
| 3 checagens + 2 verdadeiro/falso | alta |
| 9 notas | 2 alta (`eu-sou-de-do-da` como norma-padrão; `obrigado-obrigada` como norma-padrão, não verificada), 4 média-alta (`oi-ou-ola`, `bom-dia-tarde-noite`, `tudo-bem-pergunta-e-resposta`, `voce-e-de-onde`), 3 média (`som-de-bom-dia`, `voce-e-tu`, `beijo-e-abraco`) |
| detalhes em baixa | número de beijos por região; "Abraço" em e-mail de trabalho. Removidos por falta de apoio: lista de regiões do "tu", "Nordeste" e "most of Brazil" no som de d/t, frequência de "cê" por região |

## Perguntas para a professora

1. **"tudo bem" em inglês**: "how are you? / I'm good" (como está) ou o padrão do francês, "all good? / all good."? Sugestão do Claude: manter como está, que é como o inglês cumprimenta.
2. **obrigado / obrigada**: dois cartões separados (como está) ou um só com barra? Sugestão do Claude: dois cartões, para o exercício de digitar não exigir a barra.
3. **Nove notas numa unidade de 12 palavras** é muito para um iniciante? Sugestão do Claude: se for, levar `voce-e-de-onde` e `eu-sou-de-do-da` para a unidade 2.
4. **Fala 4 do diálogo**: manter "Bem-vinda ao Brasil!" (palavra nova, mas reforça o feminino) ou trocar pela alternativa sem palavra nova?
5. **Grafia "bem-vinda"**: se a fala 4 ficar, a senhora confere no VOLP da ABL antes de publicar? (o hífen não tem regra única)
6. **Beijo no rosto**: citar número de beijos por cidade ou manter "um ou dois, conforme a região e a pessoa"? Sugestão do Claude: manter sem cidades, porque não há fonte.
7. **"Abraço" em e-mail de trabalho**: a senhora confirma? Sugestão do Claude: se não confirmar, tirar "also in work emails" do exemplo.
8. **obrigado / obrigada e quem diz "obrigado"**: mencionar mulheres que dizem "obrigado" e pessoas não binárias? Sugestão do Claude: deixar fora do A1.
9. **Gênero do aluno**: vale pedir um marcador novo (ex.: `{obrigado}`, que vira obrigado/obrigada pelo gênero do perfil) para o aluno falar de si? Hoje a frase 3 usa uma personagem (Ana).
10. **País do aluno**: pedir um marcador novo que já traga a contração (do/da/dos + país) ou deixar "Chicago/Estados Unidos" fixos?
11. **Personagens**: Lucas (brasileiro) e Emily (americana) estão bons, ou prefere dois brasileiros?
12. **Título**: "Hi! How are you?" ou "Greetings and introductions"?

Saiu a antiga pergunta 5 (incluir o Rio na linha do "tu"): a lista de regiões foi removida. As decisões grandes (variedade dos
áudios, gírias, oblíquos, pronomes) estão em "Decisões que faltam", no topo.

## Grátis x Premium
Unidade 1 da trilha: grátis, como a A1-1 do francês.

## Fora do escopo deste rascunho (não feito)
Pasta `pt/`, `languages/registry.json`, áudio `pt-BR`, regras de texto falado, Desafios e Ditados desta unidade
(entram depois, pela skill `criar-desafios`), integração com o app.
