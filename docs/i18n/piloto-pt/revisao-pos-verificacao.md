# Revisão do rascunho da unidade-piloto depois da verificação externa

Data: 2026-10-15. Insumos: `docs/i18n/catalogo-erros-en-pt-verificacao.md` (verificação feita por outra IA) e o catálogo já
corrigido, `docs/i18n/catalogo-erros-en-pt.md`. Rascunho conferido: `unidade-1.md` e `unidade-1.json` (nada neles foi alterado;
este arquivo só PROPÕE).

Como ler: cada item traz o que o rascunho diz hoje, o que a verificação enfraquece, a correção de texto proposta e a confiança
nova. Os textos propostos em inglês são os que apareceriam no site (que não tem nada em português além das palavras-alvo).
"Não verificada" = nenhuma fonte aberta apoia nem contradiz; a verificação NÃO trouxe fonte nova sobre tu por região, beijo no
rosto, "cê" nem "obrigado/obrigada".

## 1. Itens enfraquecidos pela verificação (corrigir antes de qualquer revisão final)

### 1.1 Nota `voce-e-tu`: lista de regiões do "tu"

- **Rascunho**: tabela com "Most of Brazil (for example São Paulo and Minas Gerais)" = você; "Rio Grande do Sul and parts of the
  North and Northeast" = tu; no resumo, "Rio de fora de propósito"; no `.json`, linha 302 (`Rio Grande do Sul and parts of the North
  and Northeast, in casual speech`) e a conferência da linha 380.
- **Por que enfraquece**: não há lista definitiva de regiões sem corpus citado. As fontes sobre tu/você (Arctico 2016; Scherre,
  Yacovenco e Naro) só tiveram o resumo lido, também pela verificação. A pergunta 5 do rascunho ("incluir o Rio?") perde o sentido:
  qualquer lista de regiões fica sem apoio.
- **Correção proposta**: tirar os nomes de regiões da nota e da tabela. Texto (EN):
  > In Brazil, the everyday word for "you" is **você**. It is not formal: you use it with friends, family and strangers alike.
  > In some parts of the country, people also say **tu** in casual speech, often with the same verb form as **você** (**tu é**,
  > **tu vai**). The traditional form is **tu és**, **tu vais**; **tu é** is what you often hear, but it is not the standard
  > conjugation. How common **tu** is depends on the region and on the person. In Portugal, **tu** with **és** is the normal informal
  > form. In this course we use **você**: everyone in Brazil understands it.

  Tabela proposta (sem regiões):

  | situação (inglês) | forma |
  |---|---|
  | The form this course uses | Você é de onde? |
  | Often heard in casual speech where **tu** is used | Tu é de onde? |
  | The traditional conjugation of **tu** (also normal in Portugal) | Tu és de onde? |

  Resumo em português a trocar: "no Brasil o 'you' do dia a dia é 'você'; 'tu' aparece em parte do país, muitas vezes com o verbo de
  'você' ('tu é'); a concordância tradicional é 'tu és', e em Portugal é a forma informal normal. O curso usa 'você'."
- **Confiança nova**: nota inteira **média** (era média); "você" padrão e não formal: média-alta (sem fonte verificada);
  "tu" + verbo de "você" existir na fala: média; qualquer lista de regiões: **removida** (sem apoio); "tu és" em Portugal: média
  (a verificação não tocou; fonte W6/W13 não verificada). Os trechos "alta" do `.json` (linha 380) devem cair para média.

### 1.2 "tu é" x "tu és"

- **Rascunho**: "(tu é, not the textbook tu és)".
- **Por que enfraquece**: a verificação separa duas coisas. "Tu és/tu vais" é a concordância **tradicional**; "tu é/tu vai" ocorre na
  fala, mas **não é a conjugação padrão**. "Textbook" no rascunho sugere que "tu és" é só coisa de livro; a formulação correta é
  norma-padrão x uso real.
- **Correção proposta**: ver o texto do item 1.1 ("The traditional form is tu és...; tu é is what you often hear, but it is not the
  standard conjugation"). Tirar a palavra "textbook" dessa frase.
- **Confiança nova**: média-alta (a distinção em si, que a verificação confirma); sem região.

### 1.3 Nota `som-de-bom-dia`: "in most of Brazil", Nordeste e transcrições

- **Rascunho**: "in most of Brazil a d before an 'ee' sound becomes the 'j' of 'jeep'"; "In some parts of the Northeast you'll
  hear a plain d and t"; "a final e usually sounds like 'ee'"; "the m at the end is not really pronounced"; transcrições "bõ
  JEE-ah" e "BOH-ah NOY-chee"; confiança da nota "alta".
- **Por que enfraquece**: a palatalização de t/d antes de i é fenômeno **variável** (a verificação manteve só isso). "Most of Brazil"
  é uma generalização sem fonte aberta; "Nordeste" também. A verificação pede: escolher UMA variedade urbana para os áudios (decisão
  da dona, pendente), ensinar as outras como reconhecimento, não tratar transcrições como universais, e não exigir IPA estreito no A1.
  As respelings em inglês ("JEE-ah", "NOY-chee") são aproximações didáticas dependentes da variedade escolhida.
- **Correção proposta** (EN), com a ressalva de que a nota só fecha depois de a dona escolher a variedade dos áudios:
  > **How do you say "bom dia"?** Two sounds trip up English speakers here. First, **bom** is a nasal sound: the air goes out
  > through your nose, and the **m** at the end is not a full "m". It does not rhyme with English "bomb". Second, in many Brazilian
  > accents a **d** before an "ee" sound sounds like the "j" of "jeep", so **dia** sounds like "JEE-ah". The same happens with **t**:
  > **noite** sounds like "NOY-chee" (a final **e** often sounds like "ee"). Not every accent does this, so you may hear a plain
  > d and t from some speakers. Listen to the audio and copy it.

  Exemplos: manter "sounds like..." apenas se a professora confirmar na variedade escolhida; senão, tirar as respelings e deixar só o
  áudio.
- **Confiança nova**: nota **média** (era alta); "t/d variável": média; "most of Brazil" e "Nordeste": **removidos** (sem apoio);
  respelings: **média, dependente da decisão da variedade**. "Bom" nasal e não rima com "bomb": média-alta (fonte M7/M8 não verificada).
  Dica "the m is not really pronounced": **hipótese didática sem fonte**, trocada por "is not a full m".

### 1.4 Nota `voce-e-de-onde`: "cê"

- **Rascunho**: "In fast, casual speech, você often shrinks to cê"; confiança alta; no `.json` (linha 382), "'Cê' é muito comum
  no Sudeste/Centro-Oeste; frequência em outras regiões: média".
- **Por que enfraquece**: "cê" entra na lista de formas de fala que a verificação manda ensinar como **reconhecimento e interação
  informal**, classificada à parte. A frase sobre frequência por região não tem apoio verificado.
- **Correção proposta**: o texto em inglês pode ficar ("often shrinks to cê", "keep writing the full word você: cê is for recognizing
  when you hear it"). No `.json` e no resumo, **tirar a menção a Sudeste/Centro-Oeste**.
- **Confiança nova**: nota **média-alta** (era alta; "cê" existir como redução falada: média-alta; frequência por região: removida).
  A ordem "Você é de onde?" como muito comum na conversa: não tratada pela verificação, sem fonte aberta: média.

### 1.5 Nota `beijo-e-abraco` (cultural): beijo no rosto

- **Rascunho**: "women usually greet women and men with a beijo"; "one or two, depending on the region and the person"; "Abraço!"
  também em e-mail de trabalho; confiança média, com partes "alta".
- **Por que enfraquece**: a verificação não trouxe nenhuma fonte sobre cumprimento. Ou seja, as partes marcadas "alta" no rascunho
  não têm apoio verificado; o próprio rascunho já dizia que "um ou dois, conforme a região" e "Abraço em e-mail de trabalho" eram
  médias.
- **Correção proposta**: trocar "usually" por "often" ("women often greet women and men with a **beijo**"); manter "one or two,
  depending on the region and the person" sem citar cidades (como o rascunho já fazia); marcar "Abraço em e-mail de trabalho" como
  opcional para tirar se a professora não confirmar.
- **Confiança nova**: nota **média**; o costume em si e "Beijo!/Abraço!" na despedida: média (era alta; **não verificada**); número
  de beijos por região: baixa (sem fonte); "Abraço" em e-mail de trabalho: baixa. Esta nota é cultural: passa pela professora e pelo
  nível de confiança reportado no chat, como pede a skill `notas-de-realidade`.

### 1.6 `obrigado` / `obrigada`: vocabulário, nota, frases e verdadeiro/falso

- **Rascunho**: concordância com quem fala (nota `obrigado-obrigada`, vocab 5 e 6, frases 3 e 7, checagens e verdadeiro/falso);
  confiança alta.
- **O que a verificação diz**: nada. Não há correção nem confirmação desse ponto. A concordância é regra de **norma-padrão**
  amplamente aceita, mas a verificação não abriu fonte sobre ela, e a afirmação do catálogo de que este é um "erro frequente" do
  anglófono é de ensino, sem fonte.
- **Correção proposta**: nenhuma mudança de texto. Registrar a categoria: norma-padrão (concordância com quem fala); uso efetivo
  de mulheres que dizem "obrigado" e de falantes não binários: não coberto (a ⚠ do rascunho continua); decisão do curso (dois cartões
  ou um só): continua pergunta 2 do rascunho.
- **Confiança nova**: **alta** para a regra como norma-padrão (**não verificada**, rótulo obrigatório); **baixa** para "erro frequente
  do anglófono" (afirmação de ensino sem fonte, que o rascunho não faz).

## 2. Itens que o rascunho NÃO contém (nada a mudar, só registro)

Os pontos que a verificação mais mexeu no catálogo e que o usuário pediu para checar:

| Ponto da verificação | Está no rascunho? | Observação |
|---|---|---|
| "a gente" x "nós" (muito frequente, não "de longe a mais usada") | **Não**: a unidade 1 não usa "a gente" nem "nós" | vale para unidades futuras: "a gente vai" e "nós vamos" lado a lado desde o A1, a confirmar pela dona |
| "vi ele" x "o vi" | **Não** | o rascunho só usa "Eu sou de", "Meu nome é", sem objeto direto pronominal |
| "ir no" / "ir ao" / "pro" | **Não** | idem; fica para a unidade de preposições (A2) |
| Perfeito composto, diminutivos, gírias | **Não** (as gírias "valeu", "e aí", "beleza" ficaram de fora de propósito) | quando "beleza?" e "valeu" entrarem, classificá-las uma a uma (catálogo, seção 13) |
| Artigo com possessivo | Não há afirmação "o meu é europeu" | "Meu nome é" fica como está; as duas formas existem no Brasil |
| Hífen | Há uma palavra com hífen: **"bem-vinda"** (fala 4 do diálogo) | conferir a grafia "bem-vinda" no VOLP/ABL (V1) antes de publicar; a verificação diz que o hífen não tem regra única |

## 3. Itens do rascunho não tocados pela verificação, mas sem fonte verificada

Não são enfraquecidos, mas o rascunho os marca "alta" por serem frases que "qualquer brasileiro confirma". Sem fonte aberta, o
rótulo honesto é "não verificada, a professora confirma":

- `oi-ou-ola` ("olá" soa mais escrito): **média-alta**, não verificada. O rascunho dizia alta.
- `tudo-bem-pergunta-e-resposta` (a mesma expressão pergunta e resposta; "tudo bom?"; resposta "tudo!"; subida e descida da entonação):
  **média-alta**, não verificada (o catálogo, seção 13, também só tem a prática de ensino como apoio).
- `eu-sou-de-do-da` (cidade = de; país com artigo: do, da, dos): **alta** (norma-padrão), mas a regra "a maioria dos países pede
  artigo" não foi verificada: **média-alta**.
- `bom-dia-tarde-noite` (horários aproximados; "boa noite" para chegar e sair): **média-alta**, não verificada.
- Título "Hi! How are you?" e escolha de "tudo bem" em inglês: decisões do curso (perguntas 1 e 10 do rascunho), sem relação com a
  verificação.

## 4. Tabela de confiança proposta (substitui o "Resumo de confiança" do rascunho)

O rascunho dizia "Não ficou nenhum item em baixa". Depois da verificação, a afirmação precisa mudar: os itens abaixo caem ou ficam com
partes em baixa.

| item | confiança antes | confiança nova |
|---|---|---|
| 12 palavras | 11 alta, 1 média | 11 alta, 1 média (sem mudança; "bem-vinda" na fala 4 pede conferência de hífen) |
| 9 frases | 9 alta | 9 alta (sem afirmação enfraquecida) |
| 6 falas do diálogo | 5 alta, 1 média | 5 alta, 1 média (sem mudança; "Você é de onde?" na fala 2 = média-alta) |
| checagens e verdadeiro/falso | alta | alta |
| 9 notas | 7 alta, 2 média | 2 alta (`eu-sou-de-do-da`, com a ressalva do item 3, e `obrigado-obrigada`, alta só como norma e não verificada), 4 média-alta (`oi-ou-ola`, `bom-dia-tarde-noite`, `tudo-bem-pergunta-e-resposta`, `voce-e-de-onde`), 3 média (`som-de-bom-dia`, `voce-e-tu`, `beijo-e-abraco`) |
| detalhes dentro das notas | nenhum em baixa | em **baixa**: lista de regiões do "tu" (removida), "Nordeste" no som de d/t (removido), número de beijos por região, "Abraço" em e-mail de trabalho |

## 5. Perguntas do rascunho que mudam ou somem

- Pergunta 5 (incluir o Rio na linha do "tu"): **some**, porque a lista de regiões sai.
- Pergunta 6 (beijos por cidade): continua, com a recomendação de manter "um ou dois, conforme a região e a pessoa".
- Pergunta 3 (nove notas é muito?): continua; a verificação não a afeta.
- **Nova**: a nota `som-de-bom-dia` depende da variedade escolhida para os áudios (decisão 1 do catálogo). Sem essa escolha, ficar só
  com "Listen and copy the audio" e tirar as respelings.
- **Nova**: conferir "bem-vinda" no VOLP/ABL.

## 6. O que NÃO foi feito

Nenhum arquivo do rascunho (`unidade-1.md`, `unidade-1.json`) foi editado. Nenhuma fonte nova foi buscada: as únicas fontes citadas
neste documento são as que a verificação abriu (lista em `catalogo-erros-en-pt.md`, seção "Situação das fontes").
