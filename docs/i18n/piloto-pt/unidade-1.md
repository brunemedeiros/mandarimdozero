# Unidade-piloto do curso `portugues@en`: A1-1 "Hi! How are you?"

> Status: **needs_review** em tudo. Rascunho para a professora revisar; nada está ligado ao app (sem pasta `pt/`, sem
> registro, sem áudio). Versão estruturada: `unidade-1.json` (mesmo formato de uma unidade de `fr/content.js` em `base`
> e da camada do curso em `en`).

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
- Confiança: **alta** = forma e uso que qualquer brasileiro confirma; **média** = correto, mas um detalhe (região,
  frequência, melhor tradução) merece o seu olho; **baixa** = dúvida real. Não ficou nenhum item em "baixa".
  Itens marcados com ⚠ pedem conferência.

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
| 2 | Lucas | Tudo bem! Meu nome é Lucas. Você é de onde? | I'm good! My name is Lucas. Where are you from? | alta (ordem falada de propósito; a nota `voce-e-de-onde` explica logo depois) |
| 3 | Emily | Prazer, Lucas! Meu nome é Emily. Eu sou de Chicago. | Nice to meet you, Lucas! My name is Emily. I'm from Chicago. | alta |
| 4 | Lucas | Prazer, Emily! Bem-vinda ao Brasil! | Nice to meet you, Emily! Welcome to Brazil! | média ⚠ "bem-vinda" é palavra nova; alternativa sem palavra nova: "Prazer, Emily! Tchau, boa noite!" |
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

### 1. `oi-ou-ola` (R, `informal`), depois de "oi" (vocab 0). Confiança: **alta**
Resumo: os livros começam com "olá", mas na fala o brasileiro diz "oi" para quase todo mundo e a qualquer hora; "olá"
soa escrito (e-mail, placa, apresentador de TV).
> **"Oi" or "olá"?** Many textbooks start with **olá**, but in everyday speech Brazilians say **oi** to almost everyone,
> at any time of day: friends, the cashier at the supermarket, even your teacher. **Olá** is correct, but it sounds more
> like writing: emails, signs, a TV host greeting the audience. If you're not sure, **oi** is the safe choice in conversation.
> - oi: hi (in speech, with almost anyone)
> - olá: hello (more common in writing or on TV)

### 2. `som-de-bom-dia` (pronúncia), depois de "bom dia" (vocab 1). Confiança: **alta** (detalhe regional: média ⚠)
Resumo: "bom" é nasal (não rima com "bomb"); na maior parte do Brasil d/t antes de som de "i" viram "dj"/"tch"
("JEE-ah", "NOY-chee"); "e" final soa "i". Em partes do Nordeste d e t ficam "duros".
> **How do you say "bom dia"?** Two sounds trip up English speakers here. First, **bom** is a nasal sound: the air goes
> out through your nose, and the **m** at the end is not really pronounced. It does not rhyme with English "bomb".
> Second, in most of Brazil a **d** before an "ee" sound becomes the "j" of "jeep", so **dia** sounds like "JEE-ah". The
> same happens with **t**: **noite** sounds like "NOY-chee" (a final **e** usually sounds like "ee"). In some parts of the
> Northeast you'll hear a plain d and t instead. Listen to the audio and copy it.
> - bom dia: good morning (sounds like "bõ JEE-ah")
> - boa noite: good evening / good night (sounds like "BOH-ah NOY-chee")

⚠ Conferir: as transcrições aproximadas ajudam ou atrapalham? A frase sobre o Nordeste está genérica de propósito.

### 3. `bom-dia-tarde-noite`, depois de "boa noite" (vocab 3). Confiança: **alta**
Resumo: horários aproximados (bom dia até o almoço, boa tarde até escurecer, boa noite depois); "boa noite" serve para
chegar e para sair (o inglês separa "good evening" e "good night"); bom x boa porque dia é masculino.
> **"Bom dia", "boa tarde" or "boa noite"?** Use **bom dia** in the morning, until about lunchtime. From noon until it
> gets dark, it's **boa tarde**. After dark, it's **boa noite**. One big difference from English: **boa noite** is both
> "good evening" (when you arrive) and "good night" (when you leave). And why **bom** in one and **boa** in the others?
> Because **dia** is a masculine word and **tarde** and **noite** are feminine. For now, just learn the three as fixed chunks.
> - boa tarde: good afternoon (from noon until dark)
> - boa noite: good evening (arriving) / good night (leaving)

### 4. `tudo-bem-pergunta-e-resposta`, depois de "tudo bem" (vocab 4). Confiança: **alta**
Resumo: a mesma expressão é pergunta e resposta, só a entonação muda; é cumprimento, não pergunta de verdade (como
"How are you?"); variantes "Tudo bom?" e a resposta curta "Tudo!".
> **"Tudo bem?" "Tudo bem!"** **Tudo bem** literally means "all well", and it works as both the question and the answer:
> only your voice changes. Going up at the end, it's a question; going down, it's the answer. Just like "How are you?" in
> English, it's a greeting more than a real question, so people answer **tudo bem** even on an average day, and then ask
> back: **e você?** You'll also hear **tudo bom?**, which means the same thing, and the short answer **tudo!**
> - Tudo bem? — Tudo bem!: How are you? — I'm good!
> - Tudo bom? — Tudo, e você?: How's it going? — Good, and you?

### 5. `obrigado-obrigada`, depois de "obrigada" (vocab 6). Confiança: **alta**
Resumo: concorda com quem FALA, não com quem recebe o agradecimento; significa "obrigado(a)" no sentido de "grato,
em dívida"; resposta "de nada".
> **"Obrigado" or "obrigada"?** In Portuguese, "thank you" changes with the person who is **speaking**, not the person
> you're thanking. A man says **obrigado**; a woman says **obrigada**, even when she's thanking a man. The word literally
> means "obliged". The usual answer is **de nada**: "you're welcome".

⚠ Conferir: deixei de fora pessoas não binárias e o uso de "obrigado" por algumas mulheres (existe, mas não sei medir).

### 6. `voce-e-tu` (R, `regional`), depois de "de onde você é?" (vocab 10). Confiança: **média** ⚠
Resumo: no Brasil o "you" do dia a dia é "você", e não é formal; em algumas regiões se diz "tu", quase sempre com o verbo
de "você" ("tu é"); em Portugal "tu és" é o informal normal. O curso usa "você".
> **"Você" or "tu"?** In Brazil, the everyday word for "you" is **você**. It is not formal: you use it with friends,
> family and strangers alike. In some regions, people say **tu** in casual speech instead, usually with the same verb form
> as **você** (**tu é**, not the textbook **tu és**). In Portugal, **tu** with **és** is the normal informal form. In this
> course we use **você**: everyone in Brazil understands it.

| região (inglês) | forma |
|---|---|
| Most of Brazil (for example São Paulo and Minas Gerais) | Você é de onde? |
| Rio Grande do Sul and parts of the North and Northeast, in casual speech | Tu é de onde? |
| Portugal (and the Brazilian textbook form of "tu") | Tu és de onde? |

Confiança por parte: "você" padrão e não formal: alta. "Tu" + verbo de "você" no Sul e em partes do Norte/Nordeste:
alta. Lista exata de regiões: **média** (deixei o Rio de fora de propósito, embora lá também se ouça "tu"; a senhora
quer incluir?). "Tu és" em Portugal: alta.

### 7. `eu-sou-de-do-da`, depois de "eu sou de" (vocab 11). Confiança: **alta**
Resumo: cidade = "de"; a maioria dos países pede artigo, então vira do/da/dos; aprender o próprio país como bloco.
> **"De", "do" or "da"?** With a city, it's just **de**: **Eu sou de Chicago.** With most countries, **de** joins the word
> for "the" that the country carries: **do** (masculine), **da** (feminine) or **dos** (plural). So: **do Canadá**,
> **da Inglaterra**, **dos Estados Unidos**, and of course **do Brasil**. No need to memorize the rule now: just learn
> your own country as one chunk.
> - Eu sou de Chicago. / Eu sou do Canadá. / Eu sou da Inglaterra. / Eu sou dos Estados Unidos.

### 8. `voce-e-de-onde` (R, `informal`), depois do diálogo. Confiança: **alta** (frequência de "cê" fora do Sudeste/Centro-Oeste: média)
Resumo: na conversa é muito comum "Você é de onde?" (pergunta no fim, como Lucas disse) e, na fala rápida, "Cê é de
onde?". Nos exercícios, escrever "você".
> **"De onde você é?" or "Você é de onde?"** You learned **De onde você é?**, and it's correct. But in conversation
> Brazilians often keep the normal word order and put the question at the end: **Você é de onde?** That's exactly what
> Lucas said in the dialogue. In fast, casual speech, **você** often shrinks to **cê**: **Cê é de onde?** In the
> exercises, keep writing the full word **você**: **cê** is for recognizing when you hear it.

### 9. `beijo-e-abraco` (C, `costume`), depois do diálogo. Confiança: **média** ⚠
Resumo: entre amigos e conhecidos, mulher cumprimenta mulher e homem com beijo no rosto (encostar de bochechas com
som de beijo), um ou dois conforme região e pessoa; homens costumam dar aperto de mão ou abraço com tapinha; em
contexto formal, aperto de mão. Na despedida por mensagem ou telefone, "Beijo!" ou "Abraço!".
> **Why do Brazilians greet with a kiss on the cheek?** Greetings in Brazil are warm and physical. Among friends and
> acquaintances, women usually greet women and men with a **beijo**: a light touch of the cheeks with a kiss sound, not
> a real kiss. It's one or two, depending on the region and the person. Men often greet each other with a handshake or a
> hug with a pat on the back. In a formal or work setting, a handshake is the safe start. The same warmth shows up when
> people say goodbye: in messages and on the phone, friends and family often finish with **Beijo!** or **Abraço!**
> instead of "bye".
> - Beijo!: a kiss (bye, with friends and family)
> - Abraço!: a hug (bye, a little more neutral; also in work emails)

Confiança por parte: o costume em si e "Beijo!/Abraço!" na despedida: alta. "Um ou dois conforme a região": média (não
citei cidades de propósito para não arriscar). "Abraço" em e-mail de trabalho: média.

## Resumo de confiança

| item | confiança |
|---|---|
| 12 palavras | 11 alta, 1 média (tradução de "tudo bem") |
| 9 frases | 9 alta |
| 6 falas do diálogo | 5 alta, 1 média ("bem-vinda", palavra nova) |
| 3 checagens + 2 verdadeiro/falso | alta |
| 9 notas | 7 alta, 2 média (`voce-e-tu`, `beijo-e-abraco`) |

## Perguntas para a professora

1. **"tudo bem" em inglês**: "how are you? / I'm good" (como está) ou o padrão aprovado para "ça va", "all good? / all good."?
2. **obrigado / obrigada**: dois cartões separados (como está) ou um só com barra?
3. **Nove notas numa unidade de 12 palavras** é muito para um iniciante? Se for, candidatas a sair ou ir para a unidade 2: `voce-e-de-onde`, `eu-sou-de-do-da`.
4. **Fala 4 do diálogo**: manter "Bem-vinda ao Brasil!" (palavra nova, mas reforça o feminino) ou trocar pela alternativa sem palavra nova?
5. **você x tu**: incluir o Rio de Janeiro na linha do "tu"? Concorda com "Rio Grande do Sul e partes do Norte e do Nordeste"?
6. **Beijo no rosto**: quer citar número de beijos por cidade (ex.: São Paulo x Rio) ou manter "um ou dois, conforme a região"?
7. **Gênero do aluno**: o app não tem marcador para obrigado/obrigada; por isso a frase 3 usa uma personagem (Ana). Vale pedir um marcador novo (ex.: `{obrigado}` que vira obrigado/obrigada pelo gênero do perfil) para o aluno falar de si?
8. **País do aluno**: para "Eu sou do/da/dos + país" com o país do perfil seria preciso um marcador novo que já traga a contração. Pedir, ou deixar "Chicago/Estados Unidos" fixos?
9. **Personagens**: Lucas (brasileiro) e Emily (americana) estão bons, ou prefere dois brasileiros?
10. **Título**: "Hi! How are you?" ou "Greetings and introductions"?

## Grátis x Premium
Unidade 1 da trilha: grátis, como a A1-1 do francês.

## Fora do escopo deste rascunho (não feito)
Pasta `pt/`, `languages/registry.json`, áudio `pt-BR`, regras de texto falado, Desafios e Ditados desta unidade
(entram depois, pela skill `criar-desafios`), integração com o app.
