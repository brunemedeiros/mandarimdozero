# Mudanças na unidade-piloto depois da verificação externa

Data: 2026-10-15. Autorização: a dona aprovou aplicar as correções de `revisao-pos-verificacao.md`. Arquivos alterados:
`unidade-1.md` e `unidade-1.json` (base, camada `en` e bloco `review`). Nada de código, registry ou pasta `pt/` foi mexido.

Conferências rodadas depois das mudanças: `JSON.parse` sem erro; base x camada `en` com o mesmo tamanho em vocabulário (12),
frases (9), falas do diálogo (6), falantes (6), checagens (3), verdadeiro/falso (2), lições (4), notas (9) e exemplos/variantes de
cada nota; o texto em inglês de cada nota no `.md` é idêntico ao do `.json`; nenhum "--" nem "pra" na camada `en`.

## Texto que aparece no site (camada `en`, igual no `.md`)

| # | onde | antes | depois | motivo (item da revisão) |
|---|---|---|---|---|
| 1 | `som-de-bom-dia`, corpo | "the **m** at the end is not really pronounced" | "the **m** at the end is not a full "m"" | 1.3: dica sem fonte |
| 2 | `som-de-bom-dia`, corpo | "in most of Brazil a **d** before an "ee" sound becomes the "j" of "jeep", so **dia** sounds like "JEE-ah"" | "in many Brazilian accents a **d** before an "ee" sound sounds like the "j" of "jeep", as in **dia**" | 1.3: fenômeno variável; transcrição depende da variedade |
| 3 | `som-de-bom-dia`, corpo | "The same happens with **t**: **noite** sounds like "NOY-chee" (a final **e** usually sounds like "ee")" | "The same happens with **t**, which sounds like the "ch" of "cheese", as in **noite** (a final **e** often sounds like "ee")" | 1.3: sem transcrição até a escolha da variedade; "usually" virou "often" |
| 4 | `som-de-bom-dia`, corpo | "In some parts of the Northeast you'll hear a plain d and t instead." | "Not every accent does this, so you may hear a plain d and t from some speakers." | 1.3: "Nordeste" sem apoio |
| 5 | `som-de-bom-dia`, exemplos | "good morning (sounds like "bõ JEE-ah")" / "good evening / good night (sounds like "BOH-ah NOY-chee")" | "good morning" / "good evening / good night" | 1.3 e 5: sem a escolha da variedade, só o áudio |
| 6 | `voce-e-tu`, corpo | "In some regions, people say **tu** in casual speech instead, usually with the same verb form as **você** (**tu é**, not the textbook **tu és**)." | "In some parts of the country, people also say **tu** in casual speech, often with the same verb form as **você** (**tu é**, **tu vai**). The traditional form is **tu és**, **tu vais**; **tu é** is what you often hear, but it is not the standard conjugation. How common **tu** is depends on the region and on the person." | 1.1 e 1.2: sem regiões; norma-padrão x uso real; sai "textbook" |
| 7 | `voce-e-tu`, variante 1 | "Most of Brazil (for example São Paulo and Minas Gerais)" | "The form this course uses" | 1.1: lista de regiões removida |
| 8 | `voce-e-tu`, variante 2 | "Rio Grande do Sul and parts of the North and Northeast, in casual speech" | "Often heard in casual speech where tu is used" | 1.1 |
| 9 | `voce-e-tu`, variante 3 | "Portugal (and the Brazilian textbook form of "tu")" | "The traditional conjugation of tu (also normal in Portugal)" | 1.1 e 1.2 |
| 10 | `beijo-e-abraco`, corpo | "women usually greet women and men with a **beijo**" | "women often greet women and men with a **beijo**" | 1.5: sem fonte sobre cumprimento |

Sem mudança de texto (só de confiança): `oi-ou-ola`, `bom-dia-tarde-noite`, `tudo-bem-pergunta-e-resposta`, `obrigado-obrigada`,
`eu-sou-de-do-da`, `voce-e-de-onde` (o inglês já dizia "often shrinks to cê" e "cê is for recognizing"), vocabulário, frases,
diálogo, checagens e verdadeiro/falso. O exemplo "a hug (bye, a little more neutral; also in work emails)" ficou, marcado como
opcional no `review` e no `.md`.

## Confiança (bloco `review` do `.json` e `.md`)

| # | item | antes | depois | motivo |
|---|---|---|---|---|
| 11 | legenda | alta / média / baixa; "Não ficou nenhum item em baixa" | acrescenta "média-alta" e "não verificada"; alta inclui "regra de norma-padrão"; o `.md` deixa de dizer que nada está em baixa | 4 |
| 12 | `oi-ou-ola` | alta | média-alta, não verificada | 3 |
| 13 | `som-de-bom-dia` | alta (detalhe regional: média) | média até a escolha da variedade; "bom" nasal: média-alta; d/t variável: média; "most of Brazil" e "Nordeste": removidos | 1.3 |
| 14 | `bom-dia-tarde-noite` | alta | média-alta, não verificada | 3 |
| 15 | `tudo-bem-pergunta-e-resposta` | alta | média-alta, não verificada | 3 |
| 16 | `obrigado-obrigada` | alta | alta como norma-padrão, não verificada; "erro frequente do anglófono": baixa | 1.6 |
| 17 | `voce-e-tu` | média (partes alta: "você" padrão, "tu é" no Sul e Norte/Nordeste, "tu és" em Portugal) | média; "você" padrão: média-alta; "tu" + verbo de "você": média; tradicional x fala: média-alta; Portugal: média; regiões: removidas | 1.1 e 1.2 |
| 18 | `eu-sou-de-do-da` | alta | alta como norma-padrão; "a maioria dos países pede artigo": média-alta | 3 |
| 19 | `voce-e-de-onde` | alta ("cê" muito comum no Sudeste/Centro-Oeste) | média-alta; menção a Sudeste/Centro-Oeste removida; ordem "Você é de onde?": média | 1.4 |
| 20 | `beijo-e-abraco` | média (partes alta: costume e despedida) | média; costume e despedida: média, não verificada; número de beijos: baixa; "Abraço" em e-mail de trabalho: baixa e opcional | 1.5 |
| 21 | fala 2 do diálogo ("Você é de onde?") | alta | média-alta (ordem "muito comum" não verificada) | 1.4 e 4 |
| 22 | fala 4 do diálogo ("Bem-vinda ao Brasil!") | média (palavra nova) | média; acrescenta conferir o hífen de "bem-vinda" no VOLP | 2 |
| 23 | resumo de confiança (`.md`) | notas: 7 alta, 2 média; falas: 5 alta, 1 média | notas: 2 alta, 4 média-alta, 3 média; falas: 4 alta, 1 média-alta, 1 média; linha nova com os detalhes em baixa e os removidos | 4 |

Nota: a tabela 4 da revisão dizia "5 alta, 1 média" para as falas e, ao mesmo tempo, "fala 2 = média-alta". Apliquei a fala 2 como
média-alta, então a contagem ficou 4 alta, 1 média-alta, 1 média.

## Resumos em português e perguntas (só no `.md`)

| # | onde | antes | depois |
|---|---|---|---|
| 24 | topo do `.md` | (não havia) | aviso da revisão e seção "Decisões que faltam": variedade dos áudios, gírias, oblíquos por nível, pronomes |
| 25 | resumo de `som-de-bom-dia` | "na maior parte do Brasil d/t... viram dj/tch ("JEE-ah", "NOY-chee")... Em partes do Nordeste d e t ficam duros" | "em muitos sotaques brasileiros d/t... viram dj/tch... Nem todo sotaque faz isso", sem transcrições; ⚠ trocado por pendência da decisão 1 |
| 26 | resumo de `voce-e-tu` | "em algumas regiões se diz tu, quase sempre com o verbo de você" | "tu aparece em parte do país, muitas vezes com o verbo de você ("tu é"); a concordância tradicional é "tu és", e em Portugal é a forma informal normal" |
| 27 | tabela de `voce-e-tu` | coluna "região" com Most of Brazil / Rio Grande do Sul... / Portugal | coluna "situação" sem regiões (igual às variantes do `.json`) |
| 28 | resumo de `voce-e-de-onde` | "é muito comum Você é de onde?" | "é comum Você é de onde?"; "cê é só para reconhecer"; parágrafo de confiança por parte |
| 29 | resumo de `beijo-e-abraco` | "mulher cumprimenta mulher e homem com beijo" | "mulher muitas vezes cumprimenta..." |
| 30 | perguntas | 10 perguntas; a 5 era "incluir o Rio na linha do tu?" | 12 perguntas, uma linha cada, com sugestão do Claude quando há; sai a do Rio; entram "bem-vinda" no VOLP, "Abraço" em e-mail de trabalho e quem diz "obrigado" (antes só no `review`) |

## Decisões da dona, rodada 3 (2026-10-15)

Todas fechadas pela dona. Arquivos alterados: `unidade-1.md`, `unidade-1.json` (base, camada `en`, `review`, com a lista
`review.decisoesDaDona`) e `docs/i18n/catalogo-erros-en-pt.md` (seção nova "Decisões da dona, rodada 3", R1 a R12).

| # | decisão | antes | depois |
|---|---|---|---|
| 31 | 1. Oi / olá | "oi" = "hi / hello"; "olá" só na nota `oi-ou-ola` | "oi" = hi e "olá" = hello, dois cartões, **sem nota** (sai `oi-ou-ola`) |
| 32 | 2. Tudo bem | cartão "tudo bem"; nota curta com "tudo bom?" e "tudo!" | cartão "tudo bem / tudo bom" (how are you? / I'm good); nota `tudo-bem-pergunta-e-resposta` reescrita com 2 blocos: perguntar (Tudo bem? / Tudo bom? / Como vai? / Tudo certo? / E aí? / Beleza?) e responder (Tudo bem! E você? / Tudo ótimo! / Tudo certo! / Tudo tranquilo! / Beleza! / Vou bem sim, e você?), com respelling; gatilho passa para depois de "beleza" |
| 33 | 2. Gírias | "valeu", "e aí", "beleza" fora | entram como expressões: cartões "e aí?", "beleza", "valeu"; nota nova `valeu`; frases novas "E aí? Beleza?" e "Valeu, tchau!" |
| 34 | 2 (ajuste). "Cê" | reconhecimento na nota `voce-e-de-onde` | **sai da unidade 1 por completo**, nem como reconhecimento (ajuste da dona durante a rodada); vai para a lista de reconhecimento futuro do catálogo (seção 13) |
| 35 | 3. Obrigado / obrigada | dois cartões; nota só com a regra; V/F "Obrigado! / A woman says this / falso"; distrator "Obrigado!" no diálogo | um cartão "obrigado / obrigada" (digitar aceita as duas, `acceptedForms`); nota diz que algumas mulheres dizem "obrigado" e não é mal visto; V/F trocado para "Obrigada! / Men usually say this / falso"; distrator trocado para "Eu sou canadense. Tchau!"; nenhum marcador de gênero do aluno |
| 36 | 4. Bem-vinda | "Bem-vinda ao Brasil!" (palavra nova, hífen a conferir) | "Bem-vinda!" com hífen, sem "ao Brasil"; nota nova `bem-vinda` (bem-vindo comum no dia a dia, talvez já conhecido) |
| 37 | 5. Beijo e abraço | nota cultural `beijo-e-abraco` (beijo no rosto, número de beijos, "Beijo!/Abraço!") | sai o beijo no rosto; nota `abraco` só com "Abraço!" como despedida de e-mail e mensagem (gatilho: "tchau") |
| 38 | 6. Origem | "de onde você é?", "eu sou de", frases com Chicago/Estados Unidos, falas "Você é de onde?"/"Eu sou de Chicago.", notas `eu-sou-de-do-da` e `voce-e-de-onde`, checagem "Where is Emily from?" | **realocado para a futura unidade de origem** (lista "Para a unidade de origem" no topo do `.md`). No lugar: "eu sou", nacionalidades com as duas formas no mesmo cartão (americano / americana, canadense, francês / francesa, brasileiro / brasileira), frases "Eu sou americano." e "Eu sou canadense.", falas "Eu sou brasileiro." e "Eu sou americana.", checagem "What is Emily's nationality?", notas novas `ser-eu-sou` (com tabela) e `nacionalidade-genero`. Sem marcador de país e de gênero do aluno; Lucas e Emily ficam |
| 39 | 7. Pronomes | nota `voce-e-tu` longa (tu é x tu és, Portugal, tabela de variantes) | nota curta `voce-e-tu` (você não é formal; tu bem menos comum na maior parte do país; sem regiões), gatilho no cartão novo "e você?"; tabela de ser em 4 linhas: Eu / Você, ele, ela, a gente / Nós / Vocês, eles, elas (só ser: o rascunho não tinha estar). Registrado no catálogo (R3) para o módulo de Conjugação |
| 40 | 8. Título | "Hi! How are you?" | "Greetings and introductions", confirmado pela dona (pergunta fechada; frase aprendida como título não é critério). Lições: `tudo-bem` "How are you?", `obrigado-e-tchau` "Thanks and bye", `nome-e-nacionalidade` "Your name and nationality" |
| 41 | 9. Pronúncia e fontes | sem transcrição até a escolha da variedade | respelling de volta em `som-de-bom-dia` ("JEE-ah", "NOY-chee"), com SP e Rio; nota nova `som-de-boa-tarde` (r de "tarde": SP x Rio); sem IPA; "Quase" para acento/hífen; fontes só SAMBA 1 e 2 e Novo Avenida Brasil (no catálogo, gramáticas de memória viraram "SL", sem livro-fonte) |
| 42 | 10. Vozes do diálogo | sem campo de voz | campo `voice` em cada fala: Lucas = `pt-BR-Chirp3-HD-Charon`, Emily = `pt-BR-Chirp3-HD-Achernar` (o app ainda não lê) |
| 43 | catálogo | decisões pendentes | R1 a R12 fechadas: sem IPA para o aluno, Rio x SP, tabela de pronomes, artigo antes de nome mantido, "ir ao / ir pro" no A1 com nota e "chegar em"/"assistir o" usado x gramática, falsos amigos/cognatos/armadilhas iguais, lição de diminutivo e aumentativo ("pãezinhos" confirmado), gírias como expressões, perfeito composto no A2 sem cobrança, "Quase", fontes, título |

Contagens novas: 19 palavras, 10 frases, 6 falas, 3 checagens, 2 verdadeiro/falso, 5 lições, 11 notas. Conferido: `JSON.parse` sem
erro; base x camada `en` com o mesmo tamanho em tudo (inclusive exemplos e tabela de cada nota); nenhum "--", "pra" ou IPA na camada
`en`. Nenhum teste em `tests/` lê estes arquivos.
