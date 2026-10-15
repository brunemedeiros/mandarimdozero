# Unidade-piloto do curso `portugues@en`: A1-1 "Greetings and introductions"

> Status: **needs_review** em tudo. Rascunho para a professora revisar; nada está ligado ao app (sem pasta `pt/`, sem
> registro, sem áudio). Versão estruturada: `unidade-1.json` (mesmo formato de uma unidade de `fr/content.js` em `base`
> e da camada do curso em `en`).
>
> Revisado em 2026-10-15 depois da verificação externa do catálogo (`revisao-pos-verificacao.md`) e de novo com as decisões
> da dona, rodada 3. Antes x depois de cada mudança: `CHANGELOG-pos-verificacao.md`.

## Para a unidade de origem (realocado, decisão da dona, rodada 3)

Saiu desta unidade e vai para uma futura unidade de origem/nacionalidade com preposições:

- vocabulário "de onde você é?" (where are you from?) e "eu sou de" (I'm from);
- frases "De onde você é?", "Eu sou de Chicago.", "Eu sou dos Estados Unidos.";
- fala do Lucas "Você é de onde?" e fala da Emily "Eu sou de Chicago." no diálogo; checagem "Where is Emily from?";
- nota `eu-sou-de-do-da` (cidade = de; país com artigo = do/da/dos);
- nota `voce-e-de-onde` (ordem falada "Você é de onde?"). A parte de "cê" saiu da unidade por completo (ajuste da dona) e foi
  para a lista de reconhecimento futuro do catálogo (seção 13);
- pergunta sobre um marcador de país do aluno com a contração (do/da/dos + país).

## Decisões que faltam

1. **Oblíquos por nível** (decisão 4 do catálogo). A unidade não usa pronome oblíquo; se a dona aprovar "me chamo" como expressão
   frequente do A1, ele pode entrar ao lado de "meu nome é". Nada foi acrescentado.
2. **Tamanho da unidade**: agora são 19 palavras e 11 notas (o A1-1 do francês tem 12 palavras). Cortar alguma coisa? Sugestão do
   Claude: se for preciso, tirar `francês / francesa` do vocabulário (fica como exemplo na nota) e a nota `som-de-boa-tarde`.
3. **Marcador `{nacionalidade}`**: o app já tem o marcador (fr: nacionalidade no idioma estudado, com gênero do perfil). A unidade
   NÃO o usa (decisão 6: sem marcador de gênero do aluno). Usar no pt quando o marcador ganhar o português? Sem pressa.

Fechadas na rodada 3 (antes estavam aqui): título ("Greetings and introductions", confirmado pela dona; título como frase
aprendida não é critério), variedade dos áudios (vozes próximas da paulista; notas comparam Rio x SP), gírias ("valeu", "e aí",
"beleza" entram como expressões, confirmado; "cê" fora da unidade por completo), pronomes ("você" no A1, "tu" em nota curta sem regiões;
tabela Eu / Você, ele, ela, a gente / Nós / Vocês, eles, elas).

## Como foi feito

- Curso: português do Brasil para quem fala inglês (EN-US, decisão de 2026-10-03). Texto em **português** = língua-alvo
  (o que o aluno estuda, ouve e digita). Texto em **inglês** = explicações, traduções, cenários e perguntas (o site do
  `/pt` é todo em inglês).
- Escrito de propósito para falante de inglês, não traduzido do curso de francês: as notas atacam as dificuldades de
  quem vem do inglês (som nasal, d/t antes de "i", r de "tarde" no Rio x SP, "tudo bem" como pergunta e resposta,
  obrigado/obrigada, você x tu, nacionalidade com gênero, é x e).
- Estrutura igual à A1-1 do francês: 4 lições com vocabulário + ponto de verificação, notas (`concepts`) disparadas logo
  depois da palavra que explicam, verdadeiro/falso, frases com blocos (exercício de ordenar), diálogo com 3 checagens
  (`fill`, `listen`, `understand`). Os demais exercícios o app gera a partir do vocabulário e das frases.
- Só um marcador de perfil: `{nome}`. Sem marcador de gênero e de país do aluno (decisões 3 e 6).
- Cartões com duas formas ("obrigado / obrigada", "tudo bem / tudo bom", nacionalidades) seguem o padrão do francês
  ("français / française"): no exercício de digitar, qualquer uma das formas vale (`acceptedForms` divide por "/").
- Faltou só acento ou hífen na resposta digitada = **"Quase"** (decisão 9; mesmo critério do módulo da família latina).
- Pronúncia para o aluno: **sem IPA**, só respelling para quem fala inglês ("JEE-ah", "NOY-chee", "oh-bree-GAH-doo") e nasais
  descritas em palavras. As vozes do curso soam próximas da paulista; quando o som muda, a nota compara Rio x SP.
- Áudio do diálogo: duas vozes alternando por fala, Emily = `pt-BR-Chirp3-HD-Achernar` (feminina) e Lucas =
  `pt-BR-Chirp3-HD-Charon` (masculina). No `.json`, campo `voice` em cada fala (o app e o gerador de áudio ainda não leem
  esse campo; ver `.claude/rules/audio-tts.md`). Falas soltas usam só a Achernar.
- Fontes aceitas pela dona: só SAMBA 1 e 2 e Novo Avenida Brasil. Nenhum livro foi consultado nesta revisão; nada aqui cita
  outro livro como fonte.
- Confiança: **alta** = forma e uso que qualquer brasileiro confirma, regra de norma-padrão ou decisão da dona; **média-alta** =
  muito provável, mas sem fonte aberta verificada (a professora confirma); **média** = correto, mas um detalhe (região,
  frequência, melhor tradução, pronúncia aproximada) merece o seu olho; **baixa** = dúvida real ou sem fonte.

## Título, objetivo e lições

| chave | inglês (aparece no site) | confiança |
|---|---|---|
| título | Greetings and introductions | alta (decisão da dona) |
| objetivo | Greet someone, ask how they are, say thank you and goodbye, and introduce yourself with your name and nationality. | alta |
| lição `oi-e-bom-dia` | Hi and good morning | alta |
| lição `tudo-bem` | How are you? | alta |
| lição `obrigado-e-tchau` | Thanks and bye | alta |
| lição `nome-e-nacionalidade` (com o diálogo) | Your name and nationality | alta |
| lição `checkpoint` | Checkpoint | alta |

## Vocabulário (19 palavras)

| # | português | inglês | lição | confiança | conferir |
|---|---|---|---|---|---|
| 0 | oi | hi | 1 | alta | sem nota (decisão 1) |
| 1 | olá | hello | 1 | alta | sem nota (decisão 1) |
| 2 | bom dia | good morning | 1 | alta | |
| 3 | boa tarde | good afternoon | 1 | alta | |
| 4 | boa noite | good evening / good night | 1 | alta | |
| 5 | tudo bem / tudo bom | how are you? / I'm good | 2 | alta | um cartão, normal com reverso (decisão 2) |
| 6 | e você? | and you? | 2 | alta | novo: gatilho da nota `voce-e-tu` |
| 7 | e aí? | hey! / what's up? (casual) | 2 | alta | expressão (decisão 2); tradução média-alta |
| 8 | beleza | all good? / cool! (casual) | 2 | média-alta | expressão (decisão 2); melhor tradução curta a confirmar |
| 9 | obrigado / obrigada | thank you | 3 | alta | um cartão; digitar aceita as duas (decisão 3) |
| 10 | valeu | thanks! (casual) | 3 | alta | expressão (decisão 2) |
| 11 | tchau | bye | 3 | alta | |
| 12 | meu nome é | my name is | 4 | alta | |
| 13 | prazer | nice to meet you | 4 | alta | |
| 14 | eu sou | I am | 4 | alta | |
| 15 | americano / americana | American (man / woman) | 4 | alta | "estadunidense" não entra no A1 |
| 16 | canadense | Canadian (man or woman) | 4 | alta | |
| 17 | francês / francesa | French (man / woman) | 4 | alta | o acento some no feminino |
| 18 | brasileiro / brasileira | Brazilian (man / woman) | 4 | alta | |

Ficaram de fora de propósito: "de nada" (entra na nota de obrigado), "o senhor / a senhora" (unidade futura), "estar" (o
rascunho não tinha), tudo o que foi para a unidade de origem (lista no topo).

## Frases (exercício de ordenar e de tradução)

| # | português (blocos separados por ·) | inglês | cenário (inglês) | confiança |
|---|---|---|---|---|
| 0 | Oi! · Meu nome é · {nome}. | Hi! My name is {nome}. | 🎉 You meet someone new at a party and want to introduce yourself. What do you say? | alta |
| 1 | Bom dia! · Tudo bem? | Good morning! How are you? | 🌅 It's 9 a.m. and you walk into your Portuguese class. How do you greet your teacher? | alta |
| 2 | Tudo bem, · e você? | I'm good, and you? | 🙂 A friend asks you "Tudo bem?". You want to say you're fine and ask back. What do you say? | alta |
| 3 | E aí? · Beleza? | Hey! All good? | 🏖️ You run into a friend at the beach. How do you say hi the casual way? | alta (tradução média-alta) |
| 4 | Obrigada! · Tchau! | Thank you! Bye! | ☕ Ana is leaving a café in Rio. She thanks the server and says goodbye. What does she say? | alta (personagem, sem marcador de gênero do aluno) |
| 5 | Valeu, · tchau! | Thanks, bye! (casual) | | alta |
| 6 | Eu sou · americano. | I'm American. (said by a man) | | alta |
| 7 | Eu sou · canadense. | I'm Canadian. | | alta |
| 8 | Muito · obrigado! | Thank you very much! (said by a man) | | alta ("muito" fora do vocabulário, como "beaucoup" no francês) |
| 9 | Boa noite, · tchau! | Good night, bye! | | alta |

Todas usam só vocabulário da unidade (exceto "muito", como já estava).

## Diálogo: "Meeting at a welcome party"

Cena (inglês): *Friday night, at a welcome party for exchange students in São Paulo: Lucas meets Emily, who just arrived from the US.*
Personagens: Lucas 👨 (A, brasileiro, voz Charon) e Emily 👩 (B, americana, voz Achernar).

| # | quem | voz | português | inglês | confiança |
|---|---|---|---|---|---|
| 0 | Lucas | Charon | Oi! Tudo bem? | Hi! How are you? | alta |
| 1 | Emily | Achernar | Tudo bem, e você? | I'm good, and you? | alta |
| 2 | Lucas | Charon | Tudo bem! Meu nome é Lucas. Eu sou brasileiro. | I'm good! My name is Lucas. I'm Brazilian. | alta |
| 3 | Emily | Achernar | Prazer, Lucas! Meu nome é Emily. Eu sou americana. | Nice to meet you, Lucas! My name is Emily. I'm American. | alta |
| 4 | Lucas | Charon | Prazer, Emily! Bem-vinda! | Nice to meet you, Emily! Welcome! | alta (decisão 4; nota `bem-vinda` logo depois) |
| 5 | Emily | Achernar | Obrigada! Boa noite, tchau! | Thank you! Good night, bye! | alta |

Checagens do diálogo:
- **fill** (lacuna na fala 5): certa "Obrigada! Boa noite, tchau!"; erradas "Eu sou canadense. Tchau!" (Emily é americana) e
  "Bom dia! Tudo bem?" (é noite). Saiu o distrator "Obrigado! ..." porque, com a decisão 3, não é erro. Confiança alta.
- **listen** (ouve a fala 0 e escolhe a resposta = fala 1 "Tudo bem, e você?"): erradas "Obrigada! Tchau!" e
  "Eu sou americana.". Confiança alta.
- **understand**: "What is Emily's nationality?" → **American** / Brazilian / Canadian. Confiança alta.

## Verdadeiro ou falso

| frase | afirmação (inglês) | resposta | explicação (inglês) | confiança |
|---|---|---|---|---|
| 🙏 Obrigada! | Men usually say this to thank someone. | falso | Not quite: **obrigada** is the form women use. Men say **obrigado**. The ending matches the person speaking, not the person being thanked. | alta |
| 🌙 Boa noite! | You can say this both when you arrive somewhere at night and when you leave. | verdadeiro | Correct: **boa noite** means both "good evening" and "good night". | alta |

O antigo "Obrigado! / A woman says this / falso" saiu: contradiz a decisão 3 (mulheres às vezes dizem "obrigado").

## Notas (11): explicação em inglês, resumo em português, confiança

Ordem em que aparecem na trilha. "R" = nota de realidade, "C" = nota cultural, sem letra = explicação comum.

### 1. `som-de-bom-dia` (pronúncia), depois de "bom dia" (vocab 2). Confiança: **média-alta** (não verificada)
Resumo: "bom" é nasal (não rima com "bomb", o "m" final não é um "m" completo); em SP e no Rio d/t antes de som de "i" viram
"dj"/"tch" ("JEE-ah", "NOY-chee"); "e" final muitas vezes soa "i"; em outras regiões pode haver d e t "duros". Vozes próximas da paulista.
> **How do you say "bom dia"?** Two sounds trip up English speakers here. First, **bom** is nasal: the vowel goes out through
> your nose, and the **m** at the end is not a full "m". It does not rhyme with English "bomb". Second, in São Paulo and in Rio,
> a **d** before an "ee" sound sounds like the "j" in "jeep": **dia** sounds like "JEE-ah". The same happens with **t**, which
> sounds like the "ch" in "cheese": **noite** sounds like "NOY-chee" (a final **e** often sounds like "ee"). In some other
> regions you may hear a plain d and t. The audio in this course sounds close to São Paulo speech: listen and copy it.
> - bom dia: good morning (sounds like "bom JEE-ah", with bom said through your nose)
> - boa noite: good evening / good night (sounds like "BOH-ah NOY-chee")

Confiança por parte: "bom" nasal e não rima com "bomb": média-alta. d/t palatalizados em SP e no Rio: média-alta (não verificada;
sem nomear as regiões que não fazem). Respellings: média-alta (a professora confirma ouvindo a voz). As transcrições voltaram
porque a dona fechou a variedade (vozes próximas da paulista).

### 2. `som-de-boa-tarde` (pronúncia, Rio x SP), depois de "boa tarde" (vocab 3). Confiança: **média** ⚠ (nova)
Resumo: o r de "tarde" muda: em SP costuma ser um toque rápido de língua (como o "tt" de "butter" americano) ou um som próximo do
r do inglês; no Rio, um "h" aspirado do fundo da garganta. Nas duas cidades o "de" final soa "dji".
> **"Boa tarde" in São Paulo and in Rio** Here's a sound that changes from city to city: the **r** in **tarde**. In São Paulo,
> it's usually a quick tap of the tongue, like the "tt" in American "butter", and some speakers use a sound closer to the English
> r: roughly "TAR-jee". In Rio, it sounds more like a breathy "h" from the back of the throat: roughly "TAHH-jee". Both are
> correct, and in both cities the **de** at the end sounds like "jee". The audio in this course sounds close to São Paulo speech.
> - boa tarde: good afternoon (São Paulo: roughly "BOH-ah TAR-jee"; Rio: roughly "BOH-ah TAHH-jee")

⚠ Sem fonte aberta; a professora confirma as duas aproximações. Candidata a sair se a unidade ficar com notas demais.

### 3. `bom-dia-tarde-noite`, depois de "boa noite" (vocab 4). Confiança: **média-alta** (não verificada; sem mudança)
Resumo: horários aproximados (bom dia até o almoço, boa tarde até escurecer, boa noite depois); "boa noite" serve para
chegar e para sair (o inglês separa "good evening" e "good night"); bom x boa porque dia é masculino.
> **"Bom dia", "boa tarde" or "boa noite"?** Use **bom dia** in the morning, until about lunchtime. From noon until it
> gets dark, it's **boa tarde**. After dark, it's **boa noite**. One big difference from English: **boa noite** is both
> "good evening" (when you arrive) and "good night" (when you leave). And why **bom** in one and **boa** in the others?
> Because **dia** is a masculine word and **tarde** and **noite** are feminine. For now, just learn the three as fixed chunks.
> - boa tarde: good afternoon (from noon until dark)
> - boa noite: good evening (arriving) / good night (leaving)

### 4. `voce-e-tu` (R, `informal`), depois de "e você?" (vocab 6). Confiança: **média**
Resumo: "você" é o "you" do dia a dia e não é formal; "tu" existe, mas na maior parte do país é bem menos comum que "você", então o
curso usa "você". Nota curta: sem regiões, sem "tu é / tu és", sem "cê" (ajuste da dona: "cê" fora da unidade).
> **"Você" or "tu"?** **Você** (roughly "voh-SAY") is the everyday word for "you" in Brazil. It is not formal: you use it with
> friends, family and strangers alike. You may also hear **tu**, but in most of the country it's much less common than **você**,
> so this course uses **você**.
> - E você?: And you?

Confiança por parte: "você" padrão e não formal: média-alta. "Tu" bem menos comum na maior parte do país: média (afirmação da dona,
sem fonte, sem lista de regiões). Respelling: média-alta. Substitui a `voce-e-tu` antiga.

### 5. `tudo-bem-pergunta-e-resposta` (R, `informal`), depois de "beleza" (vocab 8). Confiança: **média-alta**
Resumo: a mesma expressão é pergunta e resposta, só a entonação muda; é cumprimento, não pergunta de verdade. Formas de perguntar:
Tudo bem? / Tudo bom? / Como vai? (um pouco mais educado) / Tudo certo? / E aí? / Beleza? (as duas últimas, casuais). Formas de
responder: Tudo bem! E você? / Tudo ótimo! / Tudo certo! / Tudo tranquilo! / Beleza! / Vou bem sim, e você?. Fica depois de
"beleza" para cobrir todas as formas que a lição ensina.
> **"Tudo bem?" "Tudo bom?"** **Tudo bem** (roughly "TOO-doo bayn", with the end of **bem** going through your nose) literally
> means "all well". It works as both the question and the answer: only your voice changes. Going up at the end, it's a
> question; going down, it's the answer. Just like "How are you?" in English, it's a greeting more than a real question.
> **Tudo bom?** means the same thing. Here are other common ways to ask. **E aí?** ("ee ah-EE") and **Beleza?**
> ("beh-LEH-zah") are casual: use them with friends and in relaxed situations.
> - Tudo bem?: How are you?
> - Tudo bom?: How are you? (same thing)
> - Como vai?: How are you doing? (a little more polite)
> - Tudo certo?: All good?
> - E aí?: Hey! What's up? (casual)
> - Beleza?: All good? (casual)
>
> **How to answer** Most of the time, people answer with something positive, even on an average day, and then ask back with
> **e você?** To a casual **E aí?** or **Beleza?**, a casual answer like **Beleza!** or **Tudo certo!** fits best.
> - Tudo bem! E você?: I'm good! And you?
> - Tudo ótimo!: Everything's great!
> - Tudo certo!: All good!
> - Tudo tranquilo!: All good, no stress!
> - Beleza!: All good! / Cool! (casual)
> - Vou bem sim, e você?: I'm doing well, and you?

Confiança por parte: pergunta e resposta iguais, entonação: média-alta (não verificada). Lista de formas: alta (decisão da dona);
"Tudo certo?" e "Tudo tranquilo!" acrescentadas por mim como "outras": média-alta. "Como vai?" mais educado: média-alta.
Respellings: média-alta.

### 6. `obrigado-obrigada`, depois de "obrigado / obrigada" (vocab 9). Confiança: **alta** (regra); **média-alta** (uso)
Resumo: concorda com quem FALA, não com quem recebe o agradecimento; mas algumas mulheres também dizem "obrigado" e não é mal
visto, por isso o cartão mostra as duas formas e o exercício aceita qualquer uma. Resposta "de nada".
> **"Obrigado" or "obrigada"?** In Portuguese, "thank you" usually changes with the person who is **speaking**, not the person
> you're thanking. A man says **obrigado** (roughly "oh-bree-GAH-doo"); a woman says **obrigada** ("oh-bree-GAH-dah"), even
> when she's thanking a man. You'll also hear some women say **obrigado**, and it isn't seen as a mistake. That's why this card
> shows both forms, and either one counts as correct when you type. The word literally means "obliged". The usual answer is
> **de nada**: "you're welcome".
> - obrigado: thank you (men; some women too)
> - obrigada: thank you (women)
> - de nada: you're welcome

Confiança por parte: concordância com quem fala (norma-padrão): alta. Mulheres dizendo "obrigado" sem ser mal visto: média-alta
(afirmação da dona, sem fonte). Respellings: média-alta. Pessoas não binárias: fora do A1 (como sugerido antes).

### 7. `valeu` (R, `informal`), depois de "valeu" (vocab 10). Confiança: **média-alta** (nova)
Resumo: "valeu" é o obrigado casual (amigos, mensagem, alguém que segura a porta), igual para homem e mulher; em situação formal,
obrigado/obrigada; na saída, "valeu" sozinho pode ser "obrigado, tchau".
> **"Valeu!"** **Valeu** (roughly "vah-LAY-oo") is a casual "thanks!": with friends, in text messages, with someone who holds
> the door for you. It's the same for everyone, man or woman. In a formal situation, stick with **obrigado** or **obrigada**.
> When you're leaving, **valeu** can also work as "thanks, bye!" all by itself.
> - Valeu!: Thanks! (casual)
> - Valeu, tchau!: Thanks, bye! (casual)

Confiança por parte: obrigado informal e invariável: alta. "Valeu" como "obrigado, tchau" na saída: média-alta. Respelling: média-alta.

### 8. `abraco` (C, `costume`), depois de "tchau" (vocab 11). Confiança: **média-alta** (substitui `beijo-e-abraco`)
Resumo: em e-mail e mensagem, o brasileiro muitas vezes se despede com "Abraço!" (ou "Abraços!"), amistoso sem ser íntimo,
inclusive com colegas de trabalho. A parte do beijo no rosto saiu (decisão 5).
> **"Abraço!"** In emails and text messages, Brazilians often sign off with **Abraço!** (roughly "ah-BRAH-soo"), literally
> "a hug". It's friendly without being too personal, so you'll see it in emails to coworkers too, a bit like "Best" or
> "Cheers" in English. You'll also see the plural, **Abraços!**
> - Abraço!: a hug (a friendly sign-off)
> - Abraços!: hugs (same thing)

Confiança por parte: despedida de e-mail/mensagem: alta (decisão da dona). E-mail de trabalho: média-alta. Comparação com
"Best"/"Cheers": média. "Beijo!" como despedida saiu junto com a nota antiga (pode voltar numa unidade de família/amigos).

### 9. `ser-eu-sou`, depois de "eu sou" (vocab 14). Confiança: **alta** (nova)
Resumo: "eu sou" = I am, do verbo ser (quem você é: nome, nacionalidade, profissão). Tabela do curso com quatro formas: Eu /
Você, ele, ela, a gente / Nós / Vocês, eles, elas. Atenção ao acento: é (is) x e (and).
> **"Eu sou": the verb ser** **Eu sou** means "I am". It comes from **ser** (to be), the verb you use to say who you are: your
> name, your nationality, your job. In this course, every verb is shown in four forms. **Você** (you), **ele** (he), **ela**
> (she) and **a gente** (we, very common in everyday speech) all share one form, and so do **vocês** (you, plural), **eles**
> and **elas** (they). Watch the accent: **é** means "is", while **e** means "and".
> - Meu nome é Lucas.: My name is Lucas. (é = is)

| ser | |
|---|---|
| eu | sou |
| você / ele / ela / a gente | é |
| nós | somos |
| vocês / eles / elas | são |

Confiança por parte: formas de ser: alta. "A gente" muito comum na fala: média-alta. Só ser: o rascunho não tinha estar.

### 10. `nacionalidade-genero`, depois de "americano / americana" (vocab 15). Confiança: **alta** (nova)
Resumo: nacionalidade muda com a pessoa (-o homem, -a mulher); algumas não mudam (canadense); outras mudam do seu jeito (francês,
francesa, sem acento no feminino); em português, nacionalidade com minúscula.
> **"Americano" or "americana"?** Most nationalities change with the person: **-o** for a man, **-a** for a woman. Some stay the
> same for everyone, like **canadense** (Canadian). Others change in their own way, like **francês** and **francesa** (the accent
> goes away). One more difference from English: in Portuguese, nationalities start with a lowercase letter.
> - Ele é americano.: He's American.
> - Ela é americana.: She's American.
> - Eu sou canadense.: I'm Canadian. (the same for a man or a woman)

### 11. `bem-vinda`, depois do diálogo. Confiança: **alta** (regra); **média-alta** (uso) (nova)
Resumo: Lucas diz "Bem-vinda!" porque a Emily é mulher; para homem, "bem-vindo", que é comum no dia a dia e o aluno talvez já
conheça; os dois com hífen.
> **"Bem-vinda!"** Lucas says **Bem-vinda!** ("welcome!") because Emily is a woman. To a man, it's **bem-vindo**. You may
> already know **bem-vindo**: it's everywhere in daily life, from welcome signs to people greeting their guests. Notice the
> hyphen in both: **bem-vindo**, **bem-vinda**.
> - Bem-vinda!: Welcome! (to a woman)
> - Bem-vindo!: Welcome! (to a man, and very common in general)

Confiança por parte: concordância e hífen: alta (decisão da dona). "Bem-vindo" comum e talvez já conhecido: média-alta (afirmação
da dona). "Welcome signs": média-alta.

### Notas que saíram nesta rodada
`oi-ou-ola` (decisão 1), `eu-sou-de-do-da` e `voce-e-de-onde` (unidade de origem, decisão 6), `beijo-e-abraco` (virou `abraco`,
decisão 5). `voce-e-tu` foi reescrita como nota curta (decisão 7), sem "cê".

## Resumo de confiança

| item | confiança |
|---|---|
| 19 palavras | 18 alta, 1 média-alta ("beleza": melhor tradução curta) |
| 10 frases | 10 alta (traduções de "E aí? Beleza?": média-alta) |
| 6 falas do diálogo | 6 alta |
| 3 checagens + 2 verdadeiro/falso | alta |
| 11 notas | 4 alta (`ser-eu-sou`, `nacionalidade-genero`, `obrigado-obrigada` e `bem-vinda` na regra), 5 média-alta (`som-de-bom-dia`, `bom-dia-tarde-noite`, `tudo-bem-pergunta-e-resposta`, `valeu`, `abraco`), 2 média (`som-de-boa-tarde`, `voce-e-tu`) |
| detalhes em baixa | nenhum (os que estavam em baixa saíram junto com o beijo no rosto) |

## Perguntas para a professora

1. **Tamanho**: 19 palavras e 11 notas é muito para a primeira unidade? (ver "Decisões que faltam", item 3)
2. **"beleza" em inglês**: "all good? / cool! (casual)" serve, ou prefere outra tradução curta?
3. **R de "tarde"**: as aproximações "TAR-jee" (SP) e "TAHH-jee" (Rio) soam certas para a senhora?
4. **Respellings** ("JEE-ah", "NOY-chee", "TOO-doo bayn", "oh-bree-GAH-doo", "vah-LAY-oo", "voh-SAY", "ah-BRAH-soo"): conferir
   ouvindo a voz do curso.
5. **"Tudo certo?" e "Tudo tranquilo!"**: entram como "outras" na nota de tudo bem (acrescentadas por mim)?
6. **"Beijo!" como despedida de mensagem**: saiu junto com a nota do beijo no rosto. Volta numa unidade futura?

Saíram (respondidas pela dona na rodada 3): tradução de "tudo bem", obrigado/obrigada em um ou dois cartões, "Bem-vinda ao Brasil"
e o hífen, beijos por cidade, "Abraço" em e-mail de trabalho, quem diz "obrigado", marcador de gênero, marcador de país,
personagens, título.

## Grátis x Premium
Unidade 1 da trilha: grátis, como a A1-1 do francês.

## Fora do escopo deste rascunho (não feito)
Pasta `pt/`, `languages/registry.json`, áudio `pt-BR` (inclusive ler o campo `voice` das falas), Desafios e Ditados desta unidade
(entram depois, pela skill `criar-desafios`), integração com o app.
