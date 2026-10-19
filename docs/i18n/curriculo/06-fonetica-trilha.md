# Fonética do francês na trilha: inventário, currículo A1/A2 e formatos (exploração)

Data: 2026-10-17. Documento de **exploração e proposta**, pedido pela dona na decisão 3 da seção 0.1 do `04-lacunas-e-propostas-fr.md`
("uma nota de som por unidade pode ser coisa demais, mas o tema é importante: explorar formatos antes de decidir").
**Nenhum arquivo do site foi alterado.** Nada aqui está decidido: as escolhas ficam para as perguntas da seção 7.

Base: `01-auditoria-fr-atual.md` (6.1), `02-referencia-livros-fr.md` (2.1 Alter Ego+, 3 Défi 1, 7 Défi 2, 9.3 tabela-síntese de fonética,
14 Défi Actuel 2, 15 Défi Actuel 1), `03-delf-cefr-a1-a2.md`, `04-lacunas-e-propostas-fr.md` (E8, seções 6.3, 9 e 11) e `04-v1` (8.3, 10).
Conferências no código feitas nesta sessão, com arquivo e linha. Siglas das fontes como no `04`: **AE** Alter Ego+ 1, **D1** Défi 1,
**D2** Défi 2, **DA1/DA2** Défi Actuel 1/2 (cápsulas de fonética do "Tableau des contenus").

Confiança: **alta** = conferido no código ou em duas fontes concordantes; **média** = uma fonte ou memória estável de fonética contrastiva;
**baixa** = memória sem fonte aberta, ou dado de produto/preço que muda.

---

## 0. Resumo em uma tela

- **Hoje** o francês do site treina o ouvido só de forma indireta (exercícios de escuta, ditados, Acentuação) e **não explica nenhum som**:
  zero nota sobre liaison, nasais, [y], *e* mudo ou entonação. A única nota de pronúncia é *tu es → t'es* (A1-2).
- **Os livros** convergem em ~10 pontos para o A1 e ~10 para o A2 (seção 2). O DELF cobra fonética em dois lugares: compreensão oral
  (segmentar a fala ligada, ouvir números e plural) e o critério de "sistema fonológico" da produção oral.
- **Recomendação (seção 5):** não fazer "uma nota de som por unidade". Fazer **um "Som do módulo"** (lição curta de 3 a 4 minutos com
  pares mínimos, dentro da trilha, grátis), mais **notas de som curtas só onde a palavra ensinada tem o som difícil**, mais, depois,
  **Desafios "Ouça e escolha"** (Premium como os outros) e **gravar e comparar sem nota automática**. Total: 8 sons no A1, 10 no A2.
- **Sem IPA** no texto do aluno por padrão; cada som ganha um **nome por palavra-chave francesa** ("o som de *tu*", "o som de *pain*"),
  que funciona igual nos sites em português e em inglês (seção 5.4). IPA opcional fica como pergunta (Q-4).

---

## 1. Inventário: o que o site tem hoje de fonética

### 1.1 Francês: explicações (conteúdo)

| O que | Onde | Situação | Confiança |
|---|---|---|---|
| Nota de realidade *tu es → t'es* (queda de vogal na fala) | A1-2, `courses/fr-pt-BR/layer.js:173-174` | única nota que fala de pronúncia | alta |
| "Uma exceção sonora": *mon amie* (evitar duas vogais seguidas) | A1-g2, `layer.js:421-422` | fala de som, mas **não** nomeia a liaison [n] que o aluno ouve (*mon‿amie*) | alta |
| *manger → mangeons* "para manter o som suave do g" | A1-g3, `layer.js:628-629` | relação letra-som pontual (g + e) | alta |
| Letras mudas das terminações *-e, -es, -ent* | A1-g3 | **não existe hoje**: é proposta (`04` seção 11, "+ letras mudas"; `04-v1` 8.3). A tela atual só lista as terminações (`layer.js:623-624`) | alta |
| Liaison, enchaînement, nasais, [y], *e* mudo, entonação | toda a camada | **nada** (grep sem resultado; `01` 6.1) | alta |
| Acentos gráficos (é, è, ê, à, ç) | nenhuma explicação | só cobrados pelo Desafio de Acentuação e pela correção "quase certo" | alta |

### 1.2 Francês: prática que já treina o ouvido (motor)

| Recurso | Onde no código | O que treina | Confiança |
|---|---|---|---|
| Exercício `listen` (ouvir a palavra e escolher o significado) | `fr/app.js:3129` (`renderMultipleChoiceExercise`) | compreensão de palavra isolada; as opções são **traduções**, não grafias | alta |
| Exercício `type` (ouvir e escrever a palavra) | `fr/app.js:2969` (`renderVocabTypeExercise`, com teclado de acentos) | relação som-grafia (o mais próximo de "phonie-graphie" que existe) | alta |
| `meaning` com autoplay, `cloze`, `reorder`, `scenario`, `trueFalse`, `fullsentence` | `fr/app.js:2960-2972` | áudio de apoio | alta |
| Diálogo com checagem de escuta; Ponto de verificação e Teste de Nível com itens `listen` (ouvir e digitar) | `fr/app.js:4655`, `:4812` | compreensão de frase | alta |
| Ditados (21 publicados, 1 grátis + 2 Premium por módulo), velocidade 0,75x / 1x / 1,5x | `fr/dictations.js`; velocidade em `fr/app.js:6096` | segmentar fala ligada e escrever; é o treino de liaison mais real que existe hoje, mas sem explicação | alta |
| Classificação de erro de ditado "homófono" (ex.: *a / à*, *parle / parles*) | `shared/core/familias/latina.js:490-519` | nomeia a troca, não a regra de som | alta |
| Desafio de Acentuação (ouvir palavra curta e escrever com acento; 46 publicados) | `fr/app.js:8447`; tipos em `fr/app.js:6528` | grafia de vogais com acento (é/è) | alta |
| Desafio Ouça e traduza | `fr/app.js:8317` | compreensão de frase | alta |
| Revisão (FSRS) com modo de escuta | `shared/core/exercicios-licao.js:150-154` | sorteia `listen` / `type` / `meaning` | alta |
| Exemplos com botão de áudio dentro de notas e telas de gramática | `fr/app.js:2014-2021` | qualquer nota já pode tocar exemplos: **base pronta** para notas de som | alta |

### 1.3 Áudio e TTS

- **Áudios pré-gerados**: 898 mp3 em `fr/audio/`, voz Chirp 3 HD Achernar (fr-FR); chave do manifest = texto exibido (`.claude/rules/audio-tts.md`).
  Sem mp3, cai no Web Speech do aparelho com `rate = 0.9` (`fr/app.js:138`), cuja qualidade varia muito por aparelho. Alta.
- **Regras de texto falado do fr** (versão 5, `fr/scripts/challenges_pipeline/spoken_text.py:59-104`): 4 regras, e duas delas existem
  **porque o TTS errou elisão** (*l'œuf*, *l'âge* lidos como duas palavras). Ou seja: a voz sintética **pode errar exatamente os
  fenômenos que a fonética ensina** (elisão, liaison, *e* mudo). Alta.
- **Laboratório de escuta** (`fr/scripts/audio_lab.py`): gera variantes de escrita e uma página para ouvir e escolher. É a ferramenta
  certa para validar cada par mínimo antes de publicar. Alta.
- **TTS por Field** (Edge Function `tts-generate`) e **gravador de áudio** do editor de cartões (`shared/flashcard-field-audio-recorder.js`,
  MediaRecorder + getUserMedia): existem para cartões da professora e do aluno, não para a trilha. Alta.
- **Reconhecimento de fala**: **nenhum** uso no código (grep por `SpeechRecognition`/`webkitSpeech`: zero). Alta.

### 1.4 Contraste: como o chinês trata o som

O zh trata o som **pela escrita fonética**: o pinyin com tom é parte da resposta digitada. Há teclinha de tons (`zh/app.js:3448-3475`,
`pinyinTonePickerHTML`), correção que separa "errou só o tom" com feedback próprio ("Quase! O tom não é esse" / "Faltou o tom",
`zh/app.js:3143`, `:3173-3175`), pinyin acima do hanzi e destacado nos diálogos. Não achei unidade ou nota que **explique** os tons
(grep por "tom/tons/tone" na camada zh: só "sintomas"; confiança média: pode haver texto fora da camada).
Lição para o fr: o francês **não tem** uma transcrição que o aluno escreva, então o som só pode ser treinado **pelo ouvido** (escolher o que
ouviu) ou **pela grafia** (escrever o que ouviu). O zh mostra que um feedback específico de som ("quase, só o som") funciona bem no site.

### 1.5 O que falta, segundo livros e DELF

| Falta | Por que importa | Fonte | Confiança |
|---|---|---|---|
| Discriminação de pares mínimos (*tu/tout*, *le/les*, *bon/bonne*) | sem ela o aluno não ouve a diferença que muda o sentido ou o plural | AE e D1 em toda lição; DA1 un. 7 e 8; `04` E8 | alta |
| Liaison e enchaînement explicados | CO do DELF: *les‿enfants*, *deux‿euros*, *vingt‿et un* viram "palavras desconhecidas" se o aluno não segmenta | AE 1.1, 1.3, 3.3, 4.1; D1 P2, P5, P9, P11; DA1 un. 3, 4, 6; D2 U1, U2, U8 | alta |
| Entonação da pergunta | PO A1 parte 2 (fazer perguntas ao examinador): a pergunta por entonação é a forma mais usada | AE 1.1, 2.2, 5.1; D1 P3, P4, P6; DA1 un. 2 | alta |
| Letras mudas e *e* mudo (ortografia-som) | ditado, produção escrita, leitura em voz alta | AE 1.3, 2.2, 4.1; D1 P7; DA1 un. 5 | alta |
| Nasais | sentido (*bon/bonne*, *vin/vingt/vent*) e preços (*trente, cent*) | AE 4.2, 5.2, 8.1, 8.2; D2 U1, U5, U8; DA2 [ɛ̃], [ɑ̃] | alta |
| Número e gênero que só se ouvem no artigo ou na consoante final | no francês falado o plural quase sempre se ouve **só** no artigo (*le livre / les livres*) | AE 3.2, 3.3; DA1 un. 8 | alta |
| Produção (falar) com algum retorno | PO do DELF A1/A2 avalia o "sistema fonológico" (pronúncia compreensível, articulação clara) | grade oficial de PO, critério "Maîtrise du système phonologique" (France Éducation international); pontuação exata não conferida | média |
| Controle fonológico do CEFR CV 2020 (articulação e prosódia descritas à parte) | A1: compreensível com esforço; A2: claro o bastante, com sotaque | `03` linha 99 | média |

---

## 2. Currículo de fonética do francês para A1 e A2

### 2.1 Critérios de ordem

1. **Carga funcional**: o som muda sentido ou gramática? (*le/les* = singular/plural; *je mange / j'ai mangé* = presente/passado) vem antes.
2. **Frequência no vocabulário do módulo**: o som entra quando as palavras do módulo estão cheias dele (nasais nos números 30 a 100).
3. **Convergência dos livros** (`02` 9.3 e DA1/DA2): pontos que todos trazem no A1 ficam no A1.
4. **Dificuldade para os dois públicos** (pt-BR e en): som difícil para os dois sobe na prioridade; som fácil para um deles vira nota curta só
   na camada daquele idioma do site.
5. **Não repetir a gramática**: o som se apoia no ponto de gramática do mesmo módulo (plural no artigo, passé composé), não compete com ele.

### 2.2 Lista ordenada (A1)

| # | Ponto | Por que nesta posição | Livros | Confiança |
|---|---|---|---|---|
| A1-S1 | **Ritmo e entonação**: o francês fala em grupos com a força na **última sílaba**; pergunta sobe, afirmação desce (*Ça va ?* ↗ / *Ça va.* ↘) | é o que o aluno usa desde a 1ª frase; pergunta por entonação é a forma da fala | AE D0, 1.1; D1 P1, P3, P4, P8; DA1 un. 2 | alta |
| A1-S2 | **Letras finais mudas** (*salut, comment, vous, s'il vous plaît*) e **liaison nos números** (*deux‿ans, trois‿ans, vingt‿et un, six ans* [z]) | a idade (*j'ai vingt‿ans*) está no módulo 1; letras mudas explicam por que a grafia "sobra" | AE 1.1, 1.2; D1 P2 | alta |
| A1-S3 | **O som de *tu*** [y] x **o som de *tout*** [u] (*tu/tout, rue/roue, du/doux*), com o alfabeto (letra U) | o mais citado por todas as fontes como difícil; endereço (*rue*) e soletrar entram no módulo 2 | AE 1.1; D1 P15; DA1 un. 7 | alta |
| A1-S4 | **Plural que se ouve no artigo**: *le* x *les*, *de* x *des* ([ə] x [e]); liaison [n] e [z] (*mon‿ami, les‿amis*) | sem isso o aluno não ouve singular x plural; casa com artigos e possessivos (A1-g11, A1-g2) | DA1 un. 3, 6, 8; D1 P5, P11; AE 7.1 | alta |
| A1-S5 | **Terminações mudas dos verbos** (*parle, parles, parlent* soam igual) + *e* mudo (*samedi* = "sam'di", *je me lève*) + **enchaînement** (*il‿habite, elle‿aime*) | A1-g3 é a gramática do módulo 3; DA1 un. 4 (*tu habites où ?*) | AE 1.3, 4.1; D1 P7, P9; DA1 un. 4, 5 | alta |
| A1-S6 | **O r francês** [ʁ] (*rue, droite, tourner, prendre, gare*) | vocabulário de direções está cheio de r; difícil para o anglófono, meio caminho para o brasileiro | D1 P12; D2 U6 | alta (posição: média) |
| A1-S7 | **As três nasais** (*pain* [ɛ̃], *blanc / cent* [ɑ̃], *bon* [ɔ̃]) e **nasal x vogal + n** (*bon/bonne, un/une, américain/américaine*) | números 30 a 100 (*trente, quarante, cinquante, cent*), preços, *combien* e partitivos (*du pain, du vin*) | AE 8.1, 8.2 (compras!); D2 U1, U5, U8; DA2 | alta |
| A1-S8 | **O som de *deux*** [ø] x **o som de *heure*** [œ] (*deux, il pleut, peu / heure, sœur, docteur*) | clima (*il pleut*) e saúde (*docteur*) no módulo; vogal ausente nas duas línguas de origem | AE 4.2; D2 U4, U7; DA1 un. 8 | alta (posição: média) |
| A1-S9 | **Feminino que se ouve**: consoante final que aparece (*petit/petite, grand/grande, blanc/blanche*) + nota curta do som de *huit / cuisine* [ɥ] | módulo de descrição e casa (*la cuisine*) | AE 3.2, 3.3, 9.2 | alta (S9), média ([ɥ] no A1) |
| A1-S10 | **Presente x passé composé no ouvido**: *je mange* x *j'ai mangé* ([ə] x [e]); *ils sont* x *ils ont* ([z] x [s]) | o passé composé fecha o A1 (decisão 2 da seção 0.1 do `04`); sem ouvir a diferença o aluno não entende relato no passado | AE 4.3; D2 U1 | alta |

Fica para o A2 (ver 2.3): [e] x [ɛ], [o] x [ɔ], [ɔ̃] x [ɑ̃] a fundo, [s] x [z] em palavras (*poisson / poison*), semivogais, *h* aspirado,
-ill-, [ɡ]/[ʒ]/[ɲ], entonação expressiva.

### 2.3 Lista ordenada (A2)

| # | Ponto | Gancho no A2 | Livros | Confiança |
|---|---|---|---|---|
| A2-S1 | [e] x [ɛ]: *j'ai mangé* x *je mangeais*; *-ais, -ait, -aient* soam igual | imperfeito (A2-g1) | AE 8.3; D1 P13 | alta |
| A2-S2 | [s] x [z]: *poisson / poison, dessert / désert*; revisão de *ils sont / ils ont* | relato de experiências | AE 1.3, 6.1; D2 U7; DA2 [s] | alta |
| A2-S3 | [ɔ̃] x [ɑ̃]: *rond / rang, long / lent, on / en* | objetos (*rond, en plastique*) | D2 U1; AE 6.3 | alta |
| A2-S4 | *h* mudo x *h* aspirado (*l'hôpital* x *le haricot*; *les‿hommes* x *les / héros*) e liaison em [t] (*comment‿allez-vous, quand‿il*) | saúde (hospital) | D2 U2 | alta |
| A2-S5 | letras *c* e *g*: [k]/[s], [ɡ]/[ʒ] (*gâteau / manger*) e o som de *champignon* [ɲ] | receitas e mesa | AE 5.1; D2 U3; DA2 [ɡ] | alta |
| A2-S6 | [ɛ] x [ɛ̃] (*prochaine / prochain, américaine / américain*) + entonação de enumeração | estudos e projetos | D2 U5; DA2 [ɛ̃] | alta |
| A2-S7 | -ill- e [j] (*travail, conseil, famille*; *fille* x *ville*) + o som de *travail* [ʒ]/[j] | trabalho | D2 U6; DA2 [ʒ] | alta |
| A2-S8 | semivogais [w], [ɥ], [j] (*louer, nuit, lumineux, bien*) | moradia | AE 9.2 | alta |
| A2-S9 | entonação expressiva (surpresa, irritação, felicitação, ordem) | sentimentos, telefone | AE 7.2, 8.2; D1 P14; D2 U6 | alta |
| A2-S10 | revisão: as três nasais e [ø] x [œ] (*œuvre*); liaisons facultativas e registro | cultura e opinião | D2 U8; DA2 [œ], [ɑ̃] | média |

**Ponto fora de propósito para estes públicos:** a cápsula [b] x [v] do DA2 (un. 4) é pensada para hispanofalantes; português e inglês
distinguem *b* e *v*. Não entra (confiança alta).

### 2.4 Dificuldade específica: falante de português do Brasil

| Ponto | Dificuldade | Tipo | Confiança |
|---|---|---|---|
| [y] (*tu*) | não existe; sai [u] ou [i]. Pior: o brasileiro **palataliza t/d antes de i e de [y]**: *tu* vira "tchu", *petit* vira "petchí", *dire* vira "djire" | ausência + transferência | alta (palatalização: conhecida e citada no `catalogo-erros-en-pt.md` 1.4 para o pt; para o francês, memória) |
| [ø] / [œ] | não existem; saem [e]/[o] ou "éu" | ausência | alta |
| Nasais | **existem**, mas com diferenças: o pt nasaliza vogal antes de *n/m* seguido de vogal, então *bonne, femme, ami, Anne* saem nasais ("bõne"); o pt fecha o ditongo nasal ("bõw"); [ɑ̃] francês é mais aberto e posterior que o *ã* | transferência | alta (que é dificuldade: estudo da UFSC, Seara, Menezes e Góes 2018; detalhes: média) |
| *e* mudo e letras finais | o brasileiro pronuncia tudo o que vê e acrescenta vogal depois de consoante final (*avec* → "avéqui", *Marc* → "Marqui") | transferência ortográfica e silábica | alta |
| *ou, oi, eu, au, ai* | lidos como em português: *moi* → "mói", *vous* → "vôus", *aussi* → "auçi" | transferência ortográfica | alta |
| Acento | o pt tem acento lexical (maioria paroxítona); o brasileiro põe força na penúltima (*Paris* → "PÁris") | prosódia | alta |
| [ʁ] | o *r* forte brasileiro ([h], [x]) é **meio caminho** no início de palavra; o problema é o *r* entre vogais e em grupos (*Paris, très, prendre*), que sai como tepe | transferência parcial | média |
| *l* final | vira *u* (*il* → "iu", *mal* → "mau", *avril* → "avriu") | transferência | alta |
| Liaison e enchaînement | **facilidade**: o pt-BR já liga (*os‿amigos* = "uzamigus"). O risco é ligar onde é proibido (depois de *et*, antes de *h* aspirado) | transferência positiva | média |
| Entonação da pergunta | facilidade: o pt também pergunta só com entonação | positiva | alta |
| [ʒ], [ʃ], [ɲ], [e]/[ɛ], [o]/[ɔ] | existem em pt (*já, chá, banho, ê/é, ô/ó*); a dificuldade é só de distribuição (quando o francês abre ou fecha) | quase positiva | alta |

### 2.5 Dificuldade específica: falante de inglês (site em inglês)

| Ponto | Dificuldade | Confiança |
|---|---|---|
| [y] | não existe; sai [u] ou "yoo" (*tu* → "too", *du* → "dew") | alta |
| [ø] / [œ] | não existem (o inglês não tem vogal anterior arredondada) | alta |
| Nasais | não existem como fonemas; o anglófono acrescenta [n] ou [ŋ] (*bon* → "bawn", *vin* → "van") | alta |
| [ʁ] | o mais difícil: sai o *r* inglês [ɹ] | alta |
| Vogais puras | o inglês ditonga: *café* → "ca-fay", *beau* → "boh-oo"; francês exige vogal parada | alta |
| [i] e [u] tensos | o inglês tem [ɪ] e [ʊ] frouxos (*petit* com o *i* de "bit") | alta |
| p, t, k aspirados | o inglês sopra depois de p/t/k no início; o francês não | alta |
| Ritmo | o inglês tem ritmo acentual e reduz vogais átonas a [ə]; o francês dá peso parecido às sílabas e força no fim do grupo | alta |
| Liaison e enchaînement | o inglês separa palavras (às vezes com pausa de glote); segmentar *les‿amis* é difícil | alta |
| *l* final escuro, [ʒ] no início de palavra | [ʒ] existe só no meio (*measure*): *je* custa um pouco; *l* escuro em *il, belle* | média |
| Entonação da pergunta | facilidade relativa (o inglês também sobe em sim/não); o difícil é a subida de **continuação** no meio da frase francesa | média |
| Letras mudas | o anglófono também é treinado a pronunciar finais; dificuldade parecida com a do brasileiro | média |

**Consequência para o texto**: a mesma lição de som tem **explicações diferentes por idioma do site** (o brasileiro precisa ouvir
"não nasalize o *bonne*", o anglófono precisa ouvir "não ponha *n* no *bon*"). Isso cabe exatamente na camada por par
(`courses/fr-pt-BR/layer.js` x `fr/content.en.js`, `docs/i18n/decisao-cursos-por-par.md`): o francês (pares, áudio) mora na base, a
explicação mora na camada.

### 2.6 Fontes usadas e confiança

| Fonte | Uso | Confiança |
|---|---|---|
| AE, D1, D2, DA1, DA2 (via `02` seções 2, 3, 7, 9.3, 14, 15) | ordem e convergência dos pontos | alta (títulos e tópicos), média (pontos miúdos do DA2) |
| CEFR Companion Volume 2020, controle fonológico (via `03`) | o que A1/A2 esperam | média |
| Grade de PO do DELF A1/A2, critério "Maîtrise du système phonologique" ([France Éducation international, exemplos de sujets A1](https://www.france-education-international.fr/diplome/delf-tout-public/niveau-a1/exemples-sujets)) | que a pronúncia é avaliada; **pontos do critério não conferidos** | média |
| Seara, Menezes e Góes (UFSC, 2018), nasais em aprendizes brasileiros ([PDF no projeto PFC](https://www.projet-pfc.net/wp-content/uploads/2019/01/2018_Seara_Menezes_Goes.pdf)) | nasais como dificuldade do brasileiro por diferença de sistema | média (achado na busca; não li o artigo inteiro) |
| Barbosa (UFCG, 2020), nasais e "surdez fonológica" de brasileiros, análise de 3 livros ([PDF](https://bdtd.ufcg.edu.br/jspui/bitstream/riufcg/17889/1/EDV%c3%82NIA%20AGUIAR%20BARBOSA%20-%20TCC%20LETRAS%20-%20L%c3%8dNGUA%20PORTUGUESA%20E%20L%c3%8dNGUA%20FRANCESA%202020.pdf)) | livros tratam fonética quase só com pares mínimos de reconhecimento | média (resumo da busca) |
| Fonética contrastiva de manual (Lauret, *Enseigner la prononciation du français*, Hachette 2007; Charliac e Motron, *Phonétique progressive du français*, CLE) | dificuldades do anglófono e do lusófono | **memória, não abertos nesta sessão**: média para os pontos marcados "alta" acima por serem clássicos; baixa para detalhes |
| `docs/i18n/catalogo-erros-en-pt.md` seção 1 | palatalização de t/d e *l* final no pt-BR (vale como transferência para o francês) | média |

---

## 3. Opções de formato

Motor atual (conferido): tipos de exercício da lição `meaning`, `listen`, `type`, `cloze`, `reorder`, `scenario`, `trueFalse`, `fullsentence`
(`fr/app.js:2960-2972`); telas de gramática com blocos, exemplos com áudio e exercícios só de digitar (`fr/content.js`, `"exercises": [{ "answer": ... }]`);
notas em `concepts` com gatilho `afterVocabIdx` e exemplos com áudio; Desafios com 4 tipos travados no banco por `check (type in (...))`
(`fr/scripts/supabase_migrations/007_allow_cloze_grammar_type.sql:36`) e no front (`CHALLENGE_VALID_TYPES`, `fr/app.js:6528`).
**Não existe** hoje: múltipla escolha em que o áudio é o estímulo e as opções são **grafias francesas**; unidade de tipo "som"; nenhum
reconhecimento de fala.

### (a) Uma nota curta de som por unidade (a ideia questionada)

- **Na tela:** depois da palavra que motiva, uma nota "Som: *tu* não é *tout*" com 2 ou 3 exemplos tocáveis, como as notas de explicação de hoje.
- **Esforço:** baixo de código (zero: `concepts` já toca áudio; `04-v1` 8.3 já previa que entram como nota de explicação, sem mexer na
  taxonomia `REALITY_NOTE_*`); **alto de conteúdo** (28 unidades de vocabulário no A1 revisado + 34 no A2 = 62 notas × 2 camadas).
- **Motor:** pronto.
- **Grátis x Premium:** grátis (trilha).
- **Prós:** nada de código; o som aparece colado à palavra.
- **Contras:** (1) **não treina**: ler sobre [y] não ensina a ouvir [y]; nota sem exercício é esquecida. (2) Força nota onde não há som
  novo (contraria a regra "nunca forçar nota sem relação com a palavra" da skill `notas-de-realidade`). (3) Disputa espaço com as notas de
  explicação, realidade e cultura; a unidade fica com cara de leitura. (4) Os livros fazem **um ponto por lição**, mas com 4 a 6
  atividades de escuta cada; a nota sozinha copia a frequência e perde a prática. **Não recomendado como formato principal.**

### (b) Um módulo ou unidade de fonética a cada N unidades

- **Na tela:** um nó novo na trilha, "Sons: *tu* x *tout*", como as unidades de gramática: 2 a 3 telas curtas (ouvir, comparar, entender),
  depois 6 a 8 exercícios de pares mínimos. Com N = 1 por módulo: 8 no A1, 10 no A2.
- **Esforço:** médio. (1) Tipo de unidade `type:"sound"` (ou reaproveitar `type:"grammar"` com um selo), renderizador de telas = o da gramática
  (`renderGrammarExplanationStep`, `fr/app.js:2008`), que já toca exemplos. (2) **Exercício novo** "ouça e escolha a grafia": é o
  `renderMultipleChoiceExercise` com as opções em francês e o áudio do item certo (estimo 80 a 150 linhas + i18n + testes). (3) Precisa da
  **Etapa 0** do `04` (ids estáveis) porque é unidade nova na trilha; nasce aberta e não concluída (regra 2.10 do `04`).
- **Motor:** 80% pronto (telas e áudio); falta o exercício de par mínimo.
- **Grátis x Premium:** grátis (trilha).
- **Prós:** prática de verdade (escuta + escolha), com feedback; aparece para todo mundo no caminho; casa com o módulo e com o Ponto de
  verificação (pode ganhar 1 item de som por módulo).
- **Contras:** mais nós na trilha (a trilha do A1 revisado já tem 44 unidades); se bloquear a próxima unidade, quem não liga para pronúncia
  sente atrito (resolver: **não bloquear**, ver Q-3).

### (c) Uma "trilha de Sons" paralela (aba própria)

- **Na tela:** uma área "Sons" (como Conjugação e Desafios) com a lista dos ~20 sons, cada um com escuta, pares mínimos e um placar.
- **Esforço:** alto. Tela nova, estado de progresso próprio em `progress.data`, i18n, entrada no menu, analytics, PWA; espelhar no zh ou
  esconder lá; testes de navegador nos 4 cenários.
- **Motor:** quase nada pronto além do áudio.
- **Grátis x Premium:** poderia ser Premium (como os Jogos da Conjugação), mas fonética básica é pré-requisito de compreensão: **não
  recomendo** trancar o básico.
- **Prós:** aluno que quer pronúncia acha tudo num lugar; fácil de revisar; serve também para o professor indicar ("treine o som 5").
- **Contras:** o que não está no caminho da trilha é pouco usado (a mesma razão pela qual a dona pôs a atividade final dentro da trilha);
  duplica a lógica de progresso; separa o som da palavra que o motiva.

### (d) Integração aos Desafios: novo tipo "Ouça e escolha o som"

- **Na tela:** card nos Desafios do módulo: toca *la rue*, opções *la rue* / *la roue*; série de 6 a 10; erro toca as duas em seguida.
  Variante de ditado de par: ouvir e escrever (*le* ou *les*?).
- **Esforço:** médio. Migration para trocar o `check` de `type` (tem `DROP CONSTRAINT`, então vai pelo **SQL Editor da autora**, skill
  `migration-supabase`; Staging antes), `CHALLENGE_VALID_TYPES`, player novo, telas de revisão e edição no admin
  (`fr/app.js:8943-8960`), textos `chT()`, builder em `fr/scripts/challenges_import/`, lote `.md` para revisão, áudio pela Action
  "Áudio TTS". Entra `needs_review`.
- **Motor:** a infraestrutura dos Desafios (níveis, revisão, publicação, áudio) está pronta; falta o tipo.
- **Grátis x Premium:** pela política atual (`shared/challenge-policy.js`), categoria nova = Premium (paywall desligado: todos usam).
- **Prós:** reaproveita pipeline de revisão e áudio; ótimo como **reforço** e revisão espaçada do som.
- **Contras:** os Desafios são opcionais e Premium por padrão: **não pode ser o único lugar** do som. Só o fr tem aba Desafios (o pt vai
  herdar pela família latina, o zh não).

### (e) Som embutido nas lições de vocabulário

- **Na tela:** na apresentação da palavra, um selinho "🔊 som" **só** quando a palavra tem um som difícil do catálogo (*rue*, *pain*,
  *deux*). Tocar abre uma folha curta: "O som de *tu*: lábios de *u*, língua de *i*" + par tocável (*rue / roue*) + "ver a lição do som".
  Depois que o aluno passou pela lição do som (b), o selo só lembra.
- **Esforço:** médio-baixo. Campo opcional no item da base, ex. `sound: 'y'` (chave de um catálogo de sons do curso), e o catálogo com o
  texto por camada (pt-BR e en). Componente de folha pequena e emoji novo no MAP de `shared/emoji-icons.js` se for ícone novo.
- **Motor:** áudio e notas prontos; falta o campo, o catálogo e a folha.
- **Grátis x Premium:** grátis.
- **Prós:** o som aparece **no momento em que importa** (coerência pedagógica da regra do projeto) sem virar nota obrigatória; zero tela
  a mais no caminho; reaproveita o mesmo catálogo de (b), (c) e (d).
- **Contras:** opcional demais se estiver sozinho (quem não toca, não aprende); cuidado para não pôr selo em metade das palavras (o
  francês tem *r* em quase tudo): regra "só o som do módulo e os já vistos".

### (f) Prática de pronúncia com gravação do aluno

O que **funciona de verdade** hoje, e o que não:

| Caminho | Funciona? | Detalhes | Confiança |
|---|---|---|---|
| **Gravar, ouvir a própria voz e comparar com o modelo** (sem nota) | **sim** | MediaRecorder + getUserMedia em Chrome, Edge, Firefox e Safari recentes (iOS incluso); o site **já tem** o gravador em `shared/flashcard-field-audio-recorder.js` (escolha de MIME por aparelho). Áudio fica no aparelho: sem custo, sem privacidade em jogo | alta |
| Autoavaliação guiada ("deu para ouvir a diferença entre *tu* e *tout*?") | sim | é o que o `04` E6 já propõe | alta |
| Envio da gravação para a professora (aluno vinculado) | sim, com trabalho | bucket no Storage + tabela + RLS + migration + fila na aba Professora + aviso no sino no idioma de quem recebe; mesma fase 2 da atividade final (`04` 7.3) | alta |
| **Web Speech API** (`SpeechRecognition`) no navegador | **parcialmente; não serve para nota de pronúncia** | Chrome e Safari têm (Safari 14.5+ no iOS); **Firefox não tem** (atrás de flag). No Chrome o áudio **vai para os servidores do Google**, no Safari para a Apple: o aluno manda a voz para terceiros. O reconhecedor devolve a **palavra mais provável**, com modelo de língua que "corrige" para algo plausível: pode aceitar *roue* dito como *rue* em contexto, e recusar uma pronúncia boa com ruído. Não dá nota por som. Serve, no máximo, para um jogo "o celular entendeu você?" com aviso de que não é correção | média (comportamento), média-baixa (detalhes de suporte mudam: conferir MDN antes) |
| Avaliação de pronúncia em servidor (ex.: Azure Speech "Pronunciation Assessment") | funciona, com custo e cuidado | dá nota por palavra e por fonema; **fr-FR suportado**; pt-BR **não conferido**; cobrado como fala para texto (preço por hora de áudio, ver a página oficial). Exige Edge Function, chave em Secrets, cota por conta, texto de privacidade (voz é dado pessoal, LGPD), e só faria sentido como Premium **depois** do paywall | média (fr-FR e cobrança), baixa (pt-BR e valores) |
| Modelo de reconhecimento rodando no próprio aparelho (WebAssembly) | possível, não recomendado agora | download pesado (dezenas de MB), lento em celular simples, mesma limitação de "palavra provável" | baixa |

- **Esforço:** gravar e comparar = baixo (componente existe); professora = alto; servidor = médio + custo contínuo.
- **Grátis x Premium:** gravar e comparar grátis; correção da professora grátis para aluno vinculado; nota automática Premium com cota.
- **Prós:** fecha o ciclo ouvir → produzir; prepara a PO do DELF.
- **Contras:** sem retorno de verdade, parte dos alunos pula; nota automática dá falsa confiança ou frustra.

### (g) Combinações

| Combinação | O que dá | Esforço total |
|---|---|---|
| **(b) + (e)** | lição do som por módulo + selo na palavra | médio |
| **(b) + (e) + (d)** | + reforço espaçado nos Desafios | médio-alto |
| **(b) + (e) + (d) + (f) gravar** | + produção com autoavaliação | médio-alto |
| (a) + (d) | barato, mas o som da trilha fica só em leitura | baixo-médio |
| (c) sozinho | lugar próprio, longe da trilha | alto |

### 3.1 Quadro comparativo

| Formato | Treina o ouvido? | Na trilha? | Esforço | Código novo | Grátis x Premium |
|---|---|---|---|---|---|
| (a) nota por unidade | não | sim | baixo (código) / alto (texto) | nenhum | grátis |
| (b) unidade por módulo | **sim** | **sim** | médio | exercício de par mínimo, tipo de unidade | grátis |
| (c) trilha paralela | sim | não | alto | tela, estado, menu | grátis ou Premium |
| (d) Desafio | sim | não (aba) | médio | tipo + migration + admin | Premium (política) |
| (e) selo na palavra | pouco (lembra) | sim | médio-baixo | campo + catálogo + folha | grátis |
| (f) gravação | produz | sim (dentro de b) | baixo (sem nota) | quase nenhum | grátis; nota automática Premium |

---

## 4. O que o motor suporta x o que exige código novo

| Necessidade | Hoje | Novo |
|---|---|---|
| Tocar exemplo dentro de uma explicação | sim (`fr/app.js:2014-2021`) | |
| Ouvir e escrever (som → grafia) | sim (`type`, ditado, Acentuação) | |
| Ouvir e escolher **entre grafias** (par mínimo) | **não** (`listen` só oferece traduções) | variante de `renderMultipleChoiceExercise`; erro toca as duas formas |
| Tocar mais devagar | só no ditado (0,75x) | levar o seletor de velocidade para o par mínimo |
| Unidade de som na trilha | não | `type:"sound"` ou gramática com selo; depende da Etapa 0 |
| Campo de som no item de vocabulário + catálogo | não | `sound` na base + catálogo por camada |
| Desafio de som | não | migration (SQL Editor, `DROP CONSTRAINT`), tipo, player, admin, builder |
| Gravar e ouvir a própria voz | sim (gravador do editor de cartões) | ligar o componente a um exercício |
| Item de som no Ponto de verificação | não (só digitar) | 1 item de par mínimo por módulo |
| Garantia de que a voz diferencia o par | parcial (`audio_lab.py`) | rodar o laboratório com cada par; par que a voz não diferencia não entra (`04` E8) |
| Entonação (pergunta x afirmação) | o TTS faz se a pontuação vier certa (`?` x `.`) | conferir no laboratório; exercício "pergunta ou afirmação?" = escolha com 2 opções |

---

## 5. Recomendação

### 5.1 Desenho

1. **"Som do módulo"** (formato b): **uma** lição curta por módulo, no fim do módulo, **antes do Ponto de verificação**, que **não bloqueia**
   nada. 3 telas (ouça; compare; o que fazer com a boca, na língua do site) + 6 a 8 pares mínimos + 1 tela opcional "grave e compare"
   (formato f, sem nota). ~3 minutos. Grátis.
2. **Selo de som na palavra** (formato e): só nas palavras do vocabulário do módulo que têm o som do módulo ou um som já visto. Grátis.
3. **Notas de som soltas** (formato a, com moderação): só para fenômenos que não são "um som" e aparecem numa palavra antes do módulo do
   som (ex.: *t'es*, *vingt‿et un*, *mon‿amie*). Estimo 6 a 8 no A1, não 28.
4. **Desafios "Ouça e escolha"** (formato d): depois, Premium como os outros; reaproveitam os pares das lições para revisão espaçada.
5. **Ponto de verificação**: 1 item de som por módulo (o par do módulo).
6. **Gravação com nota automática**: não agora. Reavaliar com o paywall (Q-7).

### 5.2 Ordem de execução

| Passo | O que | Depende de | Esforço |
|---|---|---|---|
| 1 | Catálogo de sons (chaves, palavra-chave, pares) e textos pt-BR e en dos 8 sons do A1; laboratório de áudio com todos os pares | nada | médio (conteúdo) |
| 2 | Exercício "ouça e escolha a grafia" (+ velocidade 0,75x) e testes | nada | baixo-médio |
| 3 | Notas de som soltas do A1 (*mon‿amie*, letras mudas do A1-g3, liaison nos números) | Etapa 1 do `04` (texto e gramática) | baixo |
| 4 | Lições "Som do módulo" do A1 na trilha | **Etapa 0** do `04` (ids estáveis) e a recomposição dos módulos | médio |
| 5 | Selo de som na palavra | passo 1 | médio-baixo |
| 6 | Desafios "Ouça e escolha" | migration pelo SQL Editor; passo 2 | médio |
| 7 | Sons do A2 junto com cada módulo do A2 (Etapa 7 do `04`) | A2 | médio por módulo |
| 8 | Gravação para a professora | fase 2 da atividade final (`04` 7.3) | alto |

No plano de etapas do `04` (seção 14): passos 1 e 2 cabem na Etapa 5 (exercícios na trilha; o E8 já está lá); passo 3 na Etapa 1; passo 4
junto com a Etapa 2 ou 3; passo 6 na Etapa 6.

### 5.3 Mapa: qual som entra em qual módulo

**A1 revisado** (`04` seção 11):

| Módulo | Som do módulo (lição) | Notas soltas e selos | Palavras-gancho |
|---|---|---|---|
| 1 · A1-m1 Primeiros contatos | **A1-S1 Ritmo e entonação** (pergunta ↗, afirmação ↘) | A1-S2: letras finais mudas (A1-1); liaison nos números (A1-21: *deux‿ans, vingt‿et un*); *t'es* (já existe, A1-2) | *bonjour, ça va ?, merci, au revoir, j'ai vingt‿ans* |
| 2 · A1-m7 Quem é você | **A1-S3 O som de *tu*** (+ letra U do alfabeto em A1-23; para pt-BR: "sem 'tchu'") | A1-S4 em notas: *le / les* no A1-g11 (o plural se ouve no artigo); *mon‿ami* no A1-g2 (nota "Uma exceção sonora" ganha o nome do som) | *tu, la rue, une, du, numéro, bureau* |
| 3 · A1-m2 Rotina e calendário | **A1-S5 Terminações mudas e *e* mudo** | tela "letras mudas" no A1-g3; *samedi* (A1-7); enchaînement *il‿habite* | *je parle / ils parlent, samedi, je me lève* |
| 4 · A1-m3 Na cidade | **A1-S6 O r francês** | liaison [z] em *vous‿allez, nous‿allons* (A1-g13) | *la rue, à droite, tourner, la gare, prendre* |
| 5 · A1-m8 Compras | **A1-S7 As três nasais e nasal x vogal + n** | selo em *trente, quarante, cinquante, cent, combien, pantalon, pain, vin* | *cent, combien, bon / bonne, un / une* |
| 6 · A1-m4 Viagem, tempo e saúde | **A1-S8 O som de *deux* x o som de *heure*** | | *il pleut, deux, heure, docteur, sœur* |
| 7 · A1-m5 Casa e descrição | **A1-S9 Feminino que se ouve** | selo [ɥ] em *la cuisine, huit* | *petit / petite, grand / grande, blanc / blanche* |
| 8 · A1-m6 Lazer, convites e passado | **A1-S10 Presente x passé composé no ouvido** | *ils sont / ils ont* (A1-g16) | *je mange / j'ai mangé, ils sont allés / ils ont mangé* |

**A2** (`04` seção 6.3):

| Módulo | Som do módulo | Gancho |
|---|---|---|
| A2-m1 Lembranças | A2-S1 [e] x [ɛ] | imperfeito (*-ais, -ait*) |
| A2-m2 Contar uma experiência | A2-S2 [s] x [z] | *poisson / poison*, relatos |
| A2-m3 Objetos e consumo | A2-S3 [ɔ̃] x [ɑ̃] | *rond, en plastique, long / lent* |
| A2-m4 Saúde | A2-S4 *h* mudo x aspirado; liaison em [t] | *l'hôpital, comment‿allez-vous* |
| A2-m5 À mesa | A2-S5 letras *c/g* e o som de *champignon* | *manger, gâteau, champignon* |
| A2-m6 Estudos e projetos | A2-S6 [ɛ] x [ɛ̃] + entonação de enumeração | *prochain / prochaine* |
| A2-m7 Trabalho e dinheiro | A2-S7 -ill- e [j] | *travail, conseil* |
| A2-m8 Moradia e cidade | A2-S8 semivogais | *louer, nuit, lumineux* |
| A2-m9 Comunicar | A2-S9 entonação expressiva | *Allô ? Félicitations !* |
| A2-m10 Opinião e cultura | A2-S10 revisão das nasais e de [ø]/[œ]; liaisons facultativas | *œuvre, monument* |

Confiança do mapa: **média** (posições escolhidas por gancho de vocabulário; a ordem dos livros diverge entre si, `02` 9.3).

### 5.4 IPA, respelling ou palavra-chave?

Regra existente: para o **português estudado**, a dona decidiu **sem IPA** para o aluno, só respelling para quem fala inglês e nasais
descritas em palavras (`docs/i18n/catalogo-erros-en-pt.md` R1; piloto em `docs/i18n/piloto-pt/unidade-1.md:51`). Para o francês não há
decisão. Análise:

| Opção | Funciona para o fr? | Prós | Contras |
|---|---|---|---|
| IPA visível ([y], [ɑ̃]) | só para quem já conhece | preciso; é o que os livros usam nos títulos das cápsulas | assusta iniciante; exige ensinar o alfabeto fonético |
| Respelling por idioma do site ("too" para *tout*) | **mal**: os sons difíceis do francês ([y], [ø], [œ], nasais, [ʁ]) **não existem** em inglês nem em português, então qualquer respelling ensina o erro | familiar | engana justamente onde importa; serve só para consoantes, sílaba forte e letras mudas ("*samedi* = sam-DI") |
| **Palavra-chave francesa** ("o som de *tu*", "o som de *pain*") + descrição da boca na língua do site + áudio | **sim** | igual nos dois sites; o aluno aprende o som pela palavra que já conhece; os livros também nomeiam sons por palavra (DA1: "le son [y] (du sucre)") | precisa de áudio confiável (laboratório) |

**Proposta:** palavra-chave + descrição + áudio como padrão; respelling **só** para letras mudas e sílaba forte (os dois sites); IPA como
**opção** ("mostrar símbolo fonético", desligada por padrão, para quem já estudou fonética e para a professora). Decisão em Q-4.

### 5.5 Grátis x Premium (resposta explícita)

| Parte | Grátis ou Premium |
|---|---|
| Lição "Som do módulo", notas de som, selos na palavra, item de som no Ponto de verificação | **grátis** (trilha) |
| Gravar e comparar sem nota | **grátis** |
| Desafios "Ouça e escolha" | **Premium** pela política atual (paywall desligado: todos usam); alternativa em Q-6 |
| Gravação enviada à professora | grátis para aluno vinculado (como a fila da atividade final) |
| Nota automática de pronúncia (servidor) | Premium com cota, só depois do paywall |

---

## 6. Francês x reaproveitável para o português

### 6.1 O que é específico do francês

Liaison, enchaînement e elisão; *e* mudo; letras finais mudas e terminações verbais mudas; [y], [ø], [œ], [ɥ]; três nasais com
denasalização (*bon / bonne*); [ʁ] uvular; acento fixo no fim do grupo; *h* aspirado; plural ouvido só no artigo; os pares mínimos e as
palavras-chave do catálogo.

### 6.2 O que é reaproveitável (independe do idioma)

- O **formato**: lição de som por módulo, selo na palavra, nota só onde a palavra pede, par mínimo com áudio, item no Ponto de verificação,
  Desafio de som, gravar e comparar.
- O **exercício** "ouça e escolha a grafia" e o seletor de velocidade: deveriam nascer em `shared/core/` (família latina), como as funções
  extraídas na E4, para o pt usar sem copiar.
- O **catálogo de sons por curso** (chave, palavra-chave, pares, texto por camada) e a regra "explicação diferente por idioma do site".
- O **laboratório de áudio** (`audio_lab.py --lang pt` já existe) como porta de entrada de todo par mínimo.
- A política de **sem nota automática** de pronúncia até o paywall.

### 6.3 Português do Brasil estudado por falantes de inglês: pontos a mapear

Base: `catalogo-erros-en-pt.md` seção 1 (confiança média) e o piloto da unidade 1 (notas `som-de-bom-dia`, `som-de-boa-tarde`).

| Ponto | Par mínimo candidato | Observação |
|---|---|---|
| Vogais nasais (ã, em, im, om, um) | *lá / lã*, *vi / vim*, *só / som* | o anglófono põe [n]; parecido com o francês em espírito, diferente nos sons |
| Ditongos nasais *ão, ãe, õe* | *mão / mau*, *pão / pau* | específico do pt; o `04-v1` 10.2 já cita *pão/pau* |
| R forte x r fraco | *caro / carro*, *muro / murro* | variação regional; áudios próximos da paulista (R2) |
| *lh*, *nh* | *mola / molha*, *mana / manha* | |
| t/d antes de i (palatalização) | (não muda sentido) | só reconhecimento e imitação; nota já existe no piloto |
| *l* final = u | *mal / mau* (quase iguais) | |
| Vogais abertas x fechadas | *avó / avô*, *pode / pôde*, *sede (ê) / sede (é)* | acento gráfico ajuda: liga com o Desafio de Acentuação do pt |
| Vogais átonas finais | *-e* soa "i", *-o* soa "u" | |
| Ditongos orais | *pais / país* (hiato), *mas / mais* | |
| Sílaba tônica | *sábia / sabia / sabiá* | o Desafio de Acentuação do pt já tem *pais / país*, *esta / está* (catálogo, tabela final) |

### 6.4 Perguntas para a futura pesquisa de livros de PLE

1. Os livros de PLE para iniciantes (ex.: *Muito Prazer*, *Novo Avenida Brasil*, *Bem-Vindo!*, *Brasil Intercultural*, a conferir quais a
   dona tem) têm uma seção de pronúncia **por lição**, como os de francês? Em que ordem apresentam os sons?
2. As nasais vêm todas juntas ou espalhadas (ã, depois *ão*, depois *ãe/õe*)?
3. Que variedade de pronúncia os livros adotam (paulista, carioca, "neutra") e como tratam a variação do *r* e do *t/d*?
4. Usam IPA, respelling ou palavra-chave para o aluno?
5. Quais pares mínimos aparecem com frequência (para conferir os da 6.3)?
6. Como tratam a sílaba tônica e o acento gráfico juntos (regra de acentuação no A1 ou só reconhecimento)?
7. Há trabalho de redução de vogais átonas e de juntura na fala (*vou te ligar* = "vô-tchi-li-gá")?
8. O Celpe-Bras avalia pronúncia como critério separado na parte oral? Com que descrição?
9. Que sons os livros tratam como "erro que atrapalha a compreensão" x "sotaque aceitável"?

---

## 7. Perguntas para a dona

| Nº | Pergunta | Recomendação |
|---|---|---|
| Q-1 | Formato principal: **"Som do módulo"** (uma lição curta por módulo) + selo na palavra + poucas notas soltas, em vez de uma nota por unidade? | **sim**: 8 sons no A1, 10 no A2 |
| Q-2 | Onde fica a lição: no fim do módulo, antes do Ponto de verificação? Ou no meio, logo depois da unidade com mais palavras do som? | fim do módulo, antes do Ponto de verificação |
| Q-3 | A lição de som **bloqueia** o avanço (como unidade comum) ou é aberta e opcional? | **não bloqueia**; conta para a conclusão do módulo como as outras |
| Q-4 | Francês: **sem IPA** para o aluno (palavra-chave + descrição + áudio), com IPA opcional desligado por padrão? Respelling só para letras mudas e sílaba forte? | sim às duas; IPA opcional pode ficar para depois |
| Q-5 | Aprovar o mapa da 5.3 (qual som em qual módulo), em especial: [y] no módulo 2 com o alfabeto, nasais em Compras, presente x passé composé no módulo 8? | aprovar; ajustar só se a dona preferir a ordem de um livro específico (o DA1 é o mais próximo) |
| Q-6 | Desafio "Ouça e escolha": Premium como os outros, ou 1 série grátis por módulo como o Ditado? | 1 grátis por módulo + o resto Premium (som é base de compreensão) |
| Q-7 | Gravação: começar com "gravar e comparar" sem nota (grátis, nada sai do aparelho)? Reconhecimento de fala do navegador fica **fora** (manda a voz para Google/Apple e não avalia som)? | sim; nota automática só com paywall e piloto comparado com a sua correção |
| Q-8 | A explicação de cada som é **diferente por idioma do site** (brasileiro: "não nasalize o *bonne*", "não diga 'tchu'"; anglófono: "não ponha *n* no *bon*", "não sopre no *p*")? | sim; cabe na camada por par |
| Q-9 | Incluir as notas soltas já no texto do A1 atual (Etapa 1 do `04`: letras mudas no A1-g3, liaison nos números, nome do som em *mon‿amie*) antes de existir a lição de som? | sim; custo baixo e não depende da Etapa 0 |
| Q-10 | Item de som no Ponto de verificação (1 por módulo, conta na nota de 70%)? | sim, 1 item; não mais que isso |
| Q-11 | Os pares mínimos que a voz Chirp não diferenciar no laboratório: tirar o par ou gravar com voz humana (a sua)? | tirar no início; voz humana só se a senhora quiser gravar (gravações viram mp3 do manifest) |
| Q-12 | Levar o mesmo formato para o português (sons do pt na 6.3) e para o chinês (tons, que hoje só aparecem na correção)? | pt sim, na ordem do piloto; zh avaliar depois (tons já têm feedback próprio) |

---

## Resumo

- Hoje: nenhum som explicado no francês (só *t'es*); prática indireta por escuta, ditado e Acentuação; TTS que já errou elisão; nenhum
  reconhecimento de fala; o zh trata som pela correção do pinyin com tom.
- Currículo: 10 pontos no A1 e 10 no A2, ordenados por carga funcional, gancho no módulo e convergência dos livros, com dificuldades
  separadas para quem fala português (palatalização em *tu*, nasalizar *bonne*, ler *oi/ou* como em pt, força na penúltima) e inglês (*r*,
  nasais com *n*, vogais ditongadas, aspiração, ritmo).
- Formatos: nota por unidade não treina o ouvido; recomendação = "Som do módulo" + selo na palavra + poucas notas + Desafio de som depois
  + gravar e comparar sem nota. Código novo principal: exercício "ouça e escolha a grafia" e o tipo de lição; Desafio pede migration
  pelo SQL Editor.
- Sem IPA por padrão: palavra-chave francesa + descrição na língua do site + áudio. Tudo da trilha é grátis.
- Arquivo criado: `docs/i18n/curriculo/06-fonetica-trilha.md`. Nenhum arquivo existente foi alterado.
