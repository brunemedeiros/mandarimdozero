# Preview do módulo 1 (A1 M1 · Apresentar-se) e análise da M1.7 (g)

Data: 2026-10-18. Documento de **preview e análise**. **Nenhum arquivo do site nem dos documentos 00 a 08 foi alterado.**
Base: `08-revisao-por-funcao-comunicativa.md` (2.1 inteira, 2.2, 4.1, 6.1, 7, 9), `07-atividades-finais-defi.md` (1, 2, 3, 4.1, 5, 8),
`06-fonetica-trilha.md` (2.2, 3, 4, 5), `04-lacunas-e-propostas-fr.md` (2.3, 7, 9, 13), `02-referencia-livros-fr.md` (2, 3, 4, 5, 13.1, 15)
e o código real da trilha, conferido nesta sessão: `fr/app.js`, `fr/content.js`, `courses/fr-pt-BR/layer.js`, `shared/core/*.js`,
`shared/checkpoint-exam.js`, `shared/core/familias/latina.js`, `shared/profile-placeholders.js`, `shared/i18n/pt-BR.js` e `en.js`.

> **Legenda de cada tela**
> - **[existe hoje]**: o motor atual mostra isso sem mudar código (só conteúdo na base `fr/content.js` e nas camadas pt-BR e en).
> - **[ajuste pequeno]**: poucas linhas num ponto conhecido (um campo, uma chave de texto, uma regra de comparação).
> - **[código novo]**: tela, exercício ou motor que não existe.
>
> Textos de interface abaixo estão em português (site pt-BR); quando a tela é nova, vem uma linha **EN:** com a versão do site em inglês.
> O francês é o mesmo nos dois sites. Os banners do site têm um ícone antes do texto; aqui o ícone foi omitido.
> Posição (M1.3) é a ordem na trilha; o id interno (`A1-3`) é só a chave do progresso (`08`, quadro inicial).

---

## Resumo em uma tela

- **Parte A** mostra o M1 do mapa v3 tela por tela: 5 unidades de vocabulário (M1.1 a M1.4, M1.6), 2 de gramática (M1.5, M1.7),
  a lição "Som do módulo" (A1-S1), o Ponto de verificação do módulo e o *défi* "Bienvenue au club !" com uma aluna exemplo.
  Quase tudo das lições **já existe no motor**; o que é novo está no som (exercício "ouça e escolha", linha que não bloqueia, gravação)
  e no *défi* (turnos encadeados, texto guiado com peças, persona). Tabela de esforço em A.12.
- Três achados do código mudam o desenho: (1) item em par (*le vendeur / la vendeuse*) **não ganha "Na frase"** no cartão e **fica fora**
  do Ponto de verificação (`fr/app.js:1852`, `shared/checkpoint-exam.js:37`); (2) nota de explicação **não tem exercício** e não alimenta
  o Ponto de verificação nem os Desafios; (3) unidade de gramática hoje = **4 a 5 telas + 6 a 8 exercícios de digitar**.
- **Parte B**: a M1.7 do `08` junta 7 assuntos; caberia em ~9 telas e ~12 exercícios (o dobro de qualquer gramática do site), e **só 2 deles**
  são cobrados pelo *défi* do M1. Os livros e as gramáticas **nunca** juntam tudo num lugar. Recomendo a **opção C (híbrida)**:
  M1.7 (g) enxuta "Masculino e feminino: nacionalidades e profissões" (`A1-g11`), notas curtas de contato em M1.2 e M1.3, e
  "Artigos e plural" como unidade nova no M2 (`A1-g17`, logo depois da família); *des → de* vai para a negação (M2).
- Outras gramáticas suspeitas de excesso: M2.6, M3.2, M5.4, M6.2, M6.6 (alta); M2.5 (média); M2.2 (baixa a média).
- 24 perguntas de verificação no fim, cada uma com a minha recomendação.

---

# PARTE A · Preview concreto do módulo 1

## A.0 O que toda unidade já faz hoje (conferido no código)

### A.0.1 O M1 na Trilha

```
 MÓDULO 1 · Apresentar-se                                        (id A1-m1)
 ┌──────────────────────────────────────────────────────────────┐
 │ M1.1  Cumprimentar e se despedir            4 lições  ✓      │ [existe hoje]
 │ M1.2  Dizer o nome e a nacionalidade        4 lições         │ [existe hoje] (lições reordenadas)
 │ M1.3  Dizer a idade: de 1 a 29              5 lições         │ [existe hoje] (palavras novas e reordenadas)
 │ M1.4  Perguntar a idade dos outros: até 69  4 lições         │ [existe hoje] (unidade nova, só conteúdo)
 │ M1.5  être e avoir, pronomes tônicos   (gramática)           │ [existe hoje]
 │ M1.6  Dizer a profissão                     4 lições         │ [existe hoje] (unidade nova, só conteúdo)
 │ M1.7  Masculino e feminino...          (gramática)           │ [existe hoje] (ver Parte B)
 │ ── Som do módulo: ritmo e entonação     opcional, ~4 min     │ [código novo]
 │ ── Ponto de verificação                 12 itens, 70%        │ [existe hoje]
 │ ── Desafios do Módulo 1   Premium · opcional                 │ [existe hoje] (linha) + [código novo] (défi)
 │      Défi: Bienvenue au club !  · Ditados · Desafios         │
 └──────────────────────────────────────────────────────────────┘
```
A ordem "unidades → Ponto de verificação → Desafios do Módulo N" é a de hoje (`fr/app.js:1533-1538`). A linha "Desafios do Módulo 1"
diz "Pratique o que você estudou de novas formas. Opcional." (`trail.moduleChallenges.goal`). A unidade nova nasce aberta e não concluída
(regra 2.10 do `04`). A Etapa 0a (chave estável por item) **já está no repositório** (commit `1e77b46`); o script de operações
(`fr/scripts/curriculo_ops.js`, Etapa 0b) **ainda não existe**, e é ele que reordena palavras, lições e `afterVocabIdx` juntos.

### A.0.2 Uma lição de vocabulário, tela por tela (exemplo real: M1.1, lição 3 "Pedir por favor e perguntar como vai")

Cada unidade de vocabulário tem lições de 3 ou 4 palavras e uma lição final chamada "Ponto de verificação" (`fr/content.js`, `lessons`).
Fluxo de uma lição (`shared/core/estado-trilha-desafios.js:569`): ponte com a lição anterior (da 2ª lição em diante) → apresentação de cada
palavra → notas que essa leva de palavras libera → checagem rápida → prática → (se a lição tem diálogo) diálogo e "Você entendeu?" → "Lição concluída!".

**Tela 1 · Ponte** [existe hoje] (banner "Lembrando da lição anterior"; 1 ou 2 palavras da lição anterior em "O que significa?")

**Tela 2 · Cartão da palavra** [existe hoje] (`renderBlockIntroCard`, `fr/app.js:1876`; o áudio toca sozinho)
```
 ● ● ○ ○
 ┌──────────────────────────────────────┐
 │  s'il vous plaît   (alto-falante)    │
 │  por favor (formal)                  │
 │  [ Já sei? ]                         │
 └──────────────────────────────────────┘
 Na frase
   Un café, s'il vous plaît.  (alto-falante)
   Um café, por favor.
                          [ Próxima palavra → ]
```
"Na frase" busca uma frase ou fala que contenha a palavra (`findMatchingPhrase`, `fr/app.js:1852`). **Limite real:** a busca procura o texto
inteiro do item; num item em par (*français / française*, *le vendeur / la vendeuse*) nunca acha nada, e o cartão fica **sem frase**. Ajuste em A.6.

**Tela 3 · Nota de explicação** [existe hoje] (`renderConceptStep`, `shared/core/quase-iguais-pinyin.js:6`)
```
 [banner] Na vida real
 ┌──────────────────────────────────────────────────────────┐
 │ "S'il vous plaît" no dia a dia                            │
 │ Na fala informal ou em mensagens de texto, s'il vous      │
 │ plaît quase sempre encolhe: com amigos vira s'il te plaît │
 │ (a forma "tu", não "vous"), e por escrito é comum ver só  │
 │ STP. A forma completa com "vous" continua sendo a mais    │
 │ segura com desconhecidos.                                 │
 │ ─────────────────────────────────────                     │
 │ s'il te plaît (alto-falante)  por favor (informal...)     │
 │ STP (alto-falante)            abreviação de texto...      │
 └──────────────────────────────────────────────────────────┘
                                        [ Continuar → ]
```
Banner por tipo: "Vale entender isso" (explicação), "Na vida real", "Variação regional", "Assim também se fala", "Costume real"...
A nota dispara depois da palavra que a motiva (`trigger.afterVocabIdx`) ou depois do diálogo (`trigger.after: "dialogue"`).
Uma nota pode ter **vários blocos** ("1 de 3", "2 de 3"...), com exemplos que tocam áudio. **Ela não tem exercício** e não entra no Ponto de verificação.

**Tela 4 · Checagem rápida** [existe hoje] (1 "O que significa?" por palavra nova, 4 opções em português, "Não sei")
```
 [banner] Checagem rápida                         Exercício 1 de 4
 O que significa?
     s'il vous plaît  (alto-falante)
 [ tudo bem ]            [ por favor (formal) ]
 [ desculpe / com licença ]  [ até breve ]
                     Não sei
```
**Tela 5 · Praticando** [existe hoje] ("Praticando o que você acabou de ver"; cada palavra em "O que significa?", "Ouça e escolha o significado certo"
ou "Digite o que ouviu", com teclado de acentos; erro guarda a palavra para a revisão do fim da unidade)

**Tela 6 · Diálogo** [existe hoje] (balões, áudio fala por fala, palavras da unidade em cor e negrito)
```
 Encontro na rua
 De manhã, na rua do bairro: Léa encontra o vizinho Hugo.
 Léa:  Bonjour !                        Olá!
 Hugo: Bonjour ! Ça va ?                Olá! Tudo bem?
 Léa:  Ça va bien, merci ! Et toi ?     Vou bem, obrigada! E você?
 Hugo: Ça va. À bientôt !               Tudo bem. Até breve!
```
**Tela 7 · Você entendeu?** [existe hoje] (3 checagens: completar a fala que falta, ouvir uma fala, pergunta de compreensão
"Como Léa e Hugo se despedem no final?")

**Tela 8 · Lição concluída!** [existe hoje] (XP ganho, pontuação, vocabulário desta lição)

### A.0.3 A lição final "Ponto de verificação" de cada unidade [existe hoje]

Banner "Ponto de verificação" (ou antes "Revisão dos erros", se o aluno errou 3 palavras ou mais nas lições). Mistura (`buildExerciseSet`,
`fr/app.js:2805`): uma rodada por palavra, até 4 frases para ordenar ou traduzir com blocos-isca, frases com cenário, verdadeiro ou falso e 2 lacunas.
```
 Exercício 7 de 18
 Alguém fala muito rápido em francês e você não entendeu nada. O que você diz?
        (cena)
 1  Merci beaucoup !
 2  Pardon, je ne comprends pas.          ✓
 3  Ça va bien, et toi ?
```
Observação: o nome "Ponto de verificação" vale para **duas coisas** diferentes (a última lição de cada unidade e a prova do módulo). Pergunta 22.

### A.0.4 Unidade de gramática [existe hoje]

Telas de explicação ("Passo 1 de 4", título, texto, exemplos com áudio, tabela no último passo; botão "Ir para os exercícios →") e
exercícios **só de digitar** ("Frase 1 de 6", lacuna, dica, "Digite a forma correta", `fr/app.js:2142`). Hífen, espaço e apóstrofo valem igual;
acento errado = "Quase!" e meio ponto. **Tamanho real hoje:** 4 telas e 6 exercícios em quase todas; `A1-g10` 5 telas; `A1-g6` e `A1-g9`, 8 exercícios.
Unidade de gramática não gera cartão de revisão (`shared/core/quase-iguais-chaves.js:175`).

### A.0.5 Ponto de verificação do módulo [existe hoje]

Prova de 12 itens digitados (`shared/checkpoint-exam.js`): 3 "Ouça e escreva", 3 "Escreva em francês: '...'", 2 de gramática (tirados dos
exercícios das unidades de gramática do módulo) e o resto "Como se diz '...' em francês?". Aprovação com 70% (`CHECKPOINT_PASS_THRESHOLD`).
**Limite real:** palavra em par (`' / '`) **nunca** vira item (linha 37), então os pares de nacionalidade e de profissão só aparecem por frase ou por gramática.

---

## A.1 M1.1 · Cumprimentar e se despedir (`A1-1`, 10 cartões, ~30 min)

| Lição | Palavras | Notas (gatilho) | Fecho |
|---|---|---|---|
| 1 Dizer olá e até logo | *bonjour, bonsoir, au revoir* | "Bonjour" ou "Bonsoir"? (existe) | |
| 2 Cumprimentar informalmente e agradecer | *salut, merci, de rien* | **nova: letras caladas no fim** (depois de *salut*) · **nova: *bienvenue* no Quebec** (depois de *de rien*) | |
| 3 Pedir por favor e perguntar como vai | *s'il vous plaît, pardon, ça va, à bientôt* | *s'il vous plaît* no dia a dia, *à plus* (existem) · beijinhos (depois do diálogo, existe) | diálogo Léa e Hugo |
| 4 Ponto de verificação | | | revisão da unidade com a **frase nova** |

**Frase nova** [existe hoje] (chave nova; consigo 5 do `08`):
```
 Exercício 4 de 18
 A Léa disse o nome da cidade dela rápido demais. Você quer que ela repita. O que você diz?
 EN: Léa said the name of her city too fast. You want her to repeat it. What do you say?
 1  Pardon ? Vous pouvez répéter ?        ✓
 2  De rien, c'est normal.
 3  Au revoir, à demain !
```
Blocos para ordenar: [Pardon ?] [Vous pouvez] [répéter ?]. *vous pouvez* entra como fórmula (*pouvoir* é do M6.6).

**Nota nova 1 · som** [existe hoje] (tipo explicação; com selo próprio de som = [ajuste pequeno], ver A.8.4). Confiança **alta**.
```
 [banner] Vale entender isso
 Letras que ficam caladas no fim
 Em francês, muitas consoantes do fim da palavra não soam: o t de salut, o s de vous,
 o t de plaît, o p de beaucoup. Escreva todas, mas não pronuncie. Mais adiante você
 vai ver quando algumas delas "acordam".
   salut (alto-falante)            oi / tchau (informal)
   s'il vous plaît (alto-falante)  por favor (formal)
   Merci beaucoup ! (alto-falante) Muito obrigada!
 EN: Letters that stay silent at the end
```
**Nota nova 2 · variação regional** [existe hoje] (`kind: reality`, `category: regional`). Confiança **alta**.
```
 [banner] Variação regional
 Bienvenue: no Quebec, também é "de nada"
 Na França, a resposta a merci é de rien. No Quebec é muito comum responder
 bienvenue, que no resto do mundo francófono quer dizer "bem-vindo(a)".
   Merci ! · Bienvenue ! (alto-falante)
 EN: Bienvenue: in Quebec, it also means "you're welcome"
```
A frase "bem-vindo(a)" na nota já prepara o título do *défi* "Bienvenue au club !" (pergunta 19).

**Nota de instruções de aula** (*écoutez, répétez*, pedida no `08`): **nenhuma palavra da M1.1 a motiva** (regra "nunca forçar nota"); o
único gancho seria *pardon* com a frase nova, mas o cartão de *pardon* mostra hoje a frase *Pardon, je ne comprends pas.* (a 1ª que contém
a palavra). Fixar a frase-exemplo do cartão (`exampleK`, item 11 da 2.3 do `04`) = [ajuste pequeno]. Pergunta 6.

## A.2 M1.2 · Dizer o nome e a nacionalidade (`A1-2`, 10 cartões, ~30 min)

Lições reordenadas (anomalia 28 do `01`: hoje *la France* cai na lição do nome) [existe hoje, via script de operações]:

| Lição | Palavras | Notas |
|---|---|---|
| 1 Eu, você e o seu nome | *je, tu, s'appeler, le nom* | "Tu" ou "vous"? (existe) · *Tu t'appelles comment ?* (existe) |
| 2 Dizer a nacionalidade | *être, français / française, brésilien / brésilienne* | **nova (opção C da Parte B): o feminino que se ouve** |
| 3 Falar do país | *la France, le Brésil, le pays* | *t'es* (depois do diálogo, existe) · diálogo "Primeiro encontro" (Léo e Ana) |
| 4 Ponto de verificação | | frase com cenário *Je suis {nacionalidade}.* (resolve o gênero pelo perfil, `shared/profile-placeholders.js`) |

**Cartão em par** [ajuste pequeno]:
```
 ┌──────────────────────────────────────────┐
 │ brésilien / brésilienne  (alto-falante)  │
 │ brasileiro / brasileira                  │
 └──────────────────────────────────────────┘
 Na frase   (hoje fica vazio: a busca procura "brésilien / brésilienne" inteiro)
 Com o ajuste (buscar por qualquer das duas formas):
   Oui, je suis brésilienne !  (alto-falante)
```
**Nota nova (opção C)** [existe hoje]. Confiança **alta**.
```
 [banner] Vale entender isso
 Français, française: o feminino que se ouve
 A nacionalidade muda com a pessoa. Léo é français; Ana é française. Repare no som:
 em français o s do fim é mudo; em française ele soa (como um z). Em brésilien o
 fim é nasal; em brésilienne o n soa. A regra completa vem na unidade
 "Masculino e feminino".
   Léo est français. (alto-falante)    Ana est française. (alto-falante)
   Léo est brésilien. (alto-falante)   Ana est brésilienne. (alto-falante)
 EN: Français, française: the feminine you can hear
```
Os nomes Léo e Ana são os do diálogo da própria unidade (o aluno ainda não viu *il / elle*, que vem na M1.5).

## A.3 M1.3 · Dizer a idade: de 1 a 29 (`A1-3`, 14 cartões, ~35 min)

Muda: entram *quatre, cinq, six, sept, huit, neuf*; saem *zéro, combien* (para M5.1); a nota regional *septante / nonante* sai (para M5.2 (g));
título e objetivo novos. 14 palavras pedem **5 lições** (o motor aceita: `A1-10` já tem 6) [existe hoje]. Os gatilhos das notas usam a posição
(`afterVocabIdx`): ao reordenar, o script de operações tem de reescrevê-los junto.

| Lição | Palavras | Notas | Ao fim, o aluno já diz |
|---|---|---|---|
| 1 Dizer quantos anos você tem | *l'âge, avoir, ans, vingt* | *J'ai vingt ans*: por que *ai* e não *suis* (existe) · *T'as quel âge ?* (existe) | *J'ai vingt ans.* |
| 2 De um a quatro | *un / une, deux, trois, quatre* | **nova (som): a letra muda acorda** | *J'ai vingt-deux ans.* |
| 3 De cinco a sete | *cinq, six, sept* | | *J'ai vingt-sept ans.* |
| 4 De oito a dez | *huit, neuf, dix* | **nova: de 21 a 29** (2 blocos: regra e som) | qualquer idade de 1 a 10 e de 20 a 29 |
| 5 Ponto de verificação | | | |

Diálogo "No parque" (Sophie e Marc, idades dos filhos) **fica** (decisão do `08`), na lição 4. Ele já usa *fille* e *fils*, que só viram
cartão na M2.1; como o diálogo traz a tradução fala a fala, aceito como entrada (mesma situação de hoje).

**Frases** [existe hoje]. Ficam: *Quel âge as-tu ?*, *J'ai vingt ans.*, *Il a dix ans.*, *Nous sommes dix.* Novas (só com palavras vistas):
*J'ai vingt-quatre ans.* · *J'ai vingt et un ans, et toi ?* · *Léa a vingt-neuf ans.*
```
 Exercício 9 de 20
 No clube de conversa, perguntam a sua idade. Você tem 24 anos. O que você diz?
 EN: At the conversation club, someone asks your age. You are 24. What do you say?
 1  J'ai vingt-quatre ans.     ✓
 2  Je suis vingt-quatre ans.
 3  J'ai vingt-quatre.
```
Saem com as palavras que vão embora: *Combien ça coûte ?* (para M5.1) e *Il fait zéro degré dehors.* (pergunta 8). Duas frases que já estão no
`A1-3` usam palavras que o aluno só vê na família (M2.1): *J'ai deux frères et trois sœurs.* e *Quel est l'âge de ton père ?* (pergunta 7).

**Nota nova (lição 2) · som** [existe hoje]. Confiança **alta**.
```
 [banner] Vale entender isso
 Deux ans, trois ans: a letra muda acorda
 O s de deux e de trois é mudo... até vir uma vogal. Antes de ans, ele soa como z
 e "gruda" na palavra seguinte: deux‿ans, trois‿ans. O s de ans continua mudo:
 o plural não se ouve no fim da palavra.
   deux ans (alto-falante)       dois anos
   trois ans (alto-falante)      três anos
 EN: Deux ans, trois ans: the silent letter wakes up
```
O sinal ‿ fica **só no texto da nota**; o exemplo com áudio é *deux ans*, que já é a chave do áudio. Assim não é preciso regra nova de texto
falado (o `‿` no texto exibido viraria chave nova de áudio e regra nova no `spoken_text.py` e no `tts_core.mjs`). O TTS precisa fazer a ligação:
conferir no laboratório (`fr/scripts/audio_lab.py`) antes de publicar [ajuste pequeno de processo].

**Nota nova (lição 4) · regra e som, 2 blocos** [existe hoje]. Confiança **alta**.
```
 [banner] Vale entender isso                                        1 de 2
 De 21 a 29
 21 é vingt et un (com et). De 22 em diante, hífen e sem et: vingt-deux,
 vingt-trois... vingt-neuf.
   vingt et un ans (alto-falante)   vinte e um anos
   vingt-quatre ans (alto-falante)  vinte e quatro anos
                                                    [ Entendi → ]
 ---------------------------------------------------------------------- 2 de 2
 Vingt‿et un: o t de vingt aparece
 Sozinho, vingt termina em som nasal e o t é mudo. De 21 a 29 o t soa:
 vingt‿et un, vingt-deux. Antes de ans, as letras mudas acordam: six‿ans e dix‿ans
 (x soa como z), vingt‿ans (t), e neuf ans soa "neuv ans".
   six ans · dix ans · vingt ans · neuf ans (alto-falante em cada)
 EN: 1/2 From 21 to 29 · 2/2 Vingt‿et un: the t of vingt shows up
```
*neuf ans* com som de v não estava no `08` (que cita *deux‿ans, trois‿ans, vingt‿et un, six‿ans*): proposta minha (pergunta 11).

## A.4 M1.4 · Perguntar a idade dos outros: até 69 (`A1-21`, nova, 10 cartões, ~30 min)

| Lição | Palavras | Notas |
|---|---|---|
| 1 De 11 a 13 | *onze, douze, treize* | |
| 2 De 14 a 16 | *quatorze, quinze, seize* | |
| 3 As dezenas até 60 | *trente, quarante, cinquante, soixante* (movidas das roupas) | **nova: 17 a 19 e as dezenas** · diálogo novo |
| 4 Ponto de verificação | | |

**Frases novas** [existe hoje]: *Quel âge avez-vous ?* (fórmula; *avez* vem na M1.5) · *Hugo a quel âge ? Il a quarante-six ans.* ·
*Elle a seize ans.* · *Sophie a trente et un ans.* O `08` sugeria *Ta mère a quel âge ?*: *mère* só chega na M2.1, então troquei por nomes.

**Diálogo novo "No clube de conversa"** [existe hoje] (Léa e Hugo falam de outras pessoas):
```
 Léa:  Hugo, Paul a quel âge ?                    Hugo, quantos anos o Paul tem?
 Hugo: Il a trente et un ans.                     Ele tem trinta e um anos.
 Léa:  Et Sophie ?                                E a Sophie?
 Hugo: Sophie a quarante-six ans. Et toi, tu as quel âge ?
 Léa:  Moi, j'ai vingt-neuf ans.
 Você entendeu? Quantos anos tem a Sophie?  [Quarenta e seis] [Cinquenta e seis] [Trinta e seis]
```
**Nota nova** [existe hoje]. Confiança **alta**.
```
 [banner] Vale entender isso
 17, 18, 19 e as dezenas
 De 17 a 19 é só somar: dix-sept (10 + 7), dix-huit, dix-neuf. Nas dezenas, o 1
 leva et (trente et un, quarante et un); os outros levam hífen: trente-deux,
 quarante-cinq, soixante-neuf.
   dix-sept · trente et un · quarante-cinq · soixante-neuf (alto-falante em cada)
 EN: 17, 18, 19 and the tens
```
*dix-sept, dix-huit, dix-neuf* não viram cartão (decisão do `08`); aparecem nas frases e no ditado de números.

## A.5 M1.5 (g) · *être* e *avoir*, pronomes tônicos (`A1-g1`, ~18 min)

Hoje: 4 telas ("Avoir e être", "Nenhum padrão pra deduzir", "Uma pegadinha comum", "Très bien!" com as tabelas) e 6 exercícios [existe hoje].
Muda: **+1 tela** (antes da tabela) e **+2 exercícios** (fica com 5 telas e 8 exercícios, o tamanho de `A1-g6`).
```
 Passo 4 de 5
 Moi, toi: para reforçar e para reagir
 Os pronomes tônicos reforçam quem fala (Moi, je suis brésilienne.) e aparecem
 sozinhos nas reações curtas: Et toi ? Moi aussi. Moi non plus.
 moi, toi, lui, elle, nous, vous, eux, elles.
   Moi, je m'appelle Carla. Et toi ? (alto-falante)
   Je suis brésilienne. · Moi aussi ! (alto-falante)
   Je ne suis pas française. · Moi non plus. (alto-falante)
 EN: Moi, toi: for emphasis and for reacting
```
Exercícios novos: *___, je m'appelle Carla.* (dica: eu, com força) → *Moi* · *Je suis brésilienne. Moi ___ !* (dica: também) → *aussi*.
**Achado:** o exercício atual *Je ___ étudiante.* usa *étudiante*, que no v3 só chega na M1.6 (depois desta unidade). Trocar por
*Je ___ brésilienne.* (pergunta 10).

## A.6 M1.6 · Dizer a profissão (`A1-22`, nova, 10 cartões, ~30 min)

| Lição | Palavras | Notas |
|---|---|---|
| 1 Estudar e ensinar | *le professeur / la professeure, l'étudiant / l'étudiante, le travail* | **nova: profissão sem artigo** (depois do 1º item) |
| 2 Saúde e direito | *le médecin, l'infirmier / l'infirmière, l'avocat / l'avocate* | |
| 3 Comércio e escritório | *le vendeur / la vendeuse, le serveur / la serveuse, l'ingénieur / l'ingénieure, le bureau* | **nova: *Qu'est-ce que vous faites dans la vie ?*** (depois do diálogo) |
| 4 Ponto de verificação | | |

**Cartão em par** [ajuste pequeno]: os 7 pares desta unidade ficariam todos **sem "Na frase"** com a busca de hoje. Ajuste: em
`findMatchingPhrase`, procurar por cada forma do par (o `split(' / ')` que `dlgVocabTerms` já faz, `fr/app.js:2346`). No "Digite o que ouviu",
o áudio lê o par inteiro e a correção aceita qualquer das formas (`formasAceitas`, `latina.js:42`) [existe hoje]; tocar só uma forma sorteada = [ajuste pequeno].
```
 ┌──────────────────────────────────────────────┐
 │ l'infirmier / l'infirmière  (alto-falante)   │
 │ o enfermeiro / a enfermeira                  │
 │ [ Já sei? ]                                  │
 └──────────────────────────────────────────────┘
 Na frase
   Elle est infirmière.  (alto-falante)
   Ela é enfermeira.
```
**Frases novas** [existe hoje] (só palavras vistas; *il / elle* chegaram na M1.5): *Qu'est-ce que vous faites dans la vie ?* · *Je suis étudiant.* ·
*Elle est infirmière.* · *Il est médecin.* · *Je suis vendeuse.* · *Tu es avocat ?* · *Je suis infirmière. J'aime mon travail.* (modelo do E6, achado 14 do `08`).
```
 Exercício 6 de 18
 No clube, você quer saber a profissão de alguém que acabou de conhecer. O que você pergunta?
 EN: At the club, you want to know the job of someone you just met. What do you ask?
 1  Qu'est-ce que vous faites dans la vie ?   ✓
 2  Quel âge avez-vous ?
 3  Comment tu t'appelles ?
```
**Diálogo novo "Na festa do clube"** (Hugo e Léa):
```
 Hugo: Qu'est-ce que vous faites dans la vie ?
 Léa:  Je suis ingénieure. Et vous ?
 Hugo: Moi, je suis serveur. Et je suis étudiant aussi.
 Léa:  Serveur et étudiant ? Beaucoup de travail !
 Você entendeu? O que a Léa faz?  [É engenheira] [É garçonete] [É estudante]
```
**Nota nova 1** [existe hoje]. Confiança **alta**.
```
 [banner] Vale entender isso
 Je suis professeur: sem artigo
 Para dizer a profissão depois de je suis, il est, elle est, o francês não usa
 artigo: Je suis professeur. Elle est médecin. Nunca "je suis un professeur".
 (Com c'est é diferente: isso vem no módulo 2.)
   Je suis professeure. (alto-falante)   Eu sou professora.
   Il est étudiant. (alto-falante)       Ele é estudante.
 EN: Je suis professeur: no article
```
**Nota nova 2** (`kind: reality`, `category: gramatica-coloquial`). Confiança **alta**.
```
 [banner] Assim também se fala
 "Qu'est-ce que vous faites dans la vie ?"
 É a pergunta mais comum sobre profissão (ao pé da letra, "o que você faz na
 vida?"). Entre amigos, a fala encurta: Tu fais quoi dans la vie ?
   Tu fais quoi dans la vie ? (alto-falante)   E você, faz o quê?
```
O porquê de *vendeur → vendeuse* fica para a M1.7 (decisão do `08`); o cartão só mostra o par.

## A.7 M1.7 (g) · Masculino e feminino, artigos e plural (`A1-g11`), como está no `08`

Contando o que o `08` põe nesta unidade, o desenho mínimo seria este (detalhe e alternativa na Parte B):

| Passo | Tela | Exemplos vistos pelo aluno? |
|---|---|---|
| 1 | *le, la, l', les* | sim (*le nom, la France, l'âge*) |
| 2 | *un, une, des* | parcial (*un / une* como número; nenhum substantivo feminino com *une*) |
| 3 | O gênero não segue o português | **não**: no vocabulário do M1 só *l'âge* (masc.) x "a idade" serve, e o artigo elidido esconde o gênero |
| 4 | Plural: o *-s* é mudo | sim (*ans, frères* em frase) |
| 5 | Feminino das nacionalidades: *-ais / -aise, -ien / -ienne* | parcial: só 2 pares vistos (os outros 6 chegam na M2.4) |
| 6 | Feminino das profissões: *-eur / -euse, -ier / -ière, -ant / -ante, -at / -ate* | sim (M1.6) |
| 7 | Iguais e só na escrita: *médecin*; *professeure, ingénieure*; nota de feminização | sim |
| 8 | *des → de* na negação | **não** (gancho para M2.6 e M4.5; no M1 só *je ne comprends pas*) |
| 9 | Quadro-resumo | |

9 telas e uns 12 exercícios (~30 min): o **dobro** de qualquer gramática do site (A.0.4), na 7ª unidade de um aluno que começou há ~3 horas,
logo antes do *défi*. É a base da Parte B.

---

## A.8 Som do módulo · A1-S1 ritmo e entonação (~4 min, grátis, não bloqueia)

### A.8.1 Onde aparece
Linha própria na Trilha, depois da última unidade e antes do Ponto de verificação ("Som do módulo · opcional"), como recomenda o `06` (5.1).
**[código novo]**: tipo de unidade `sound` (ou gramática com selo) que **não entra** na regra de desbloqueio da unidade seguinte; id proposto `A1-s1`
(pergunta 12). As telas de explicação reaproveitam `renderGrammarExplanationStep` [existe hoje].

### A.8.2 Telas
**Tela 1 · Ouça** [existe hoje] (tela de explicação com exemplos tocáveis)
```
 Som do módulo                                                 Passo 1 de 3
 A força vai no fim
 Em português cada palavra tem a sua sílaba forte (obriGAdo, BOM dia). Em francês,
 a força cai na última sílaba do grupo: merCI, bonJOUR, je m'appelle LÉa.
 Não acentue cada palavra: diga o grupo inteiro de uma vez.
   merci (alto-falante)  bonjour (alto-falante)  Je m'appelle Léa. (alto-falante)
 EN: The stress goes at the end
```
**Tela 2 · Compare** [existe hoje] (+ botão "Ouvir devagar" (tartaruga), que já existe nos Desafios: `slowAudioBtnHTML`, `fr/app.js:207` = [ajuste pequeno] para pôr aqui)
```
 Passo 2 de 3
 Pergunta sobe, afirmação desce
 Na fala, a pergunta quase sempre é a própria frase com a voz subindo no fim.
   Ça va ?  ↗  (alto-falante)          Ça va.  ↘  (alto-falante)
   Tu es française ?  ↗ (alto-falante) Tu es française.  ↘ (alto-falante)
 EN: Questions go up, statements go down
```
**Tela 3 · Com a sua voz** [existe hoje] ("deixe a voz subir só no fim da pergunta; não pare entre as palavras do grupo").

**Exercícios (6 a 8)** **[código novo]**: "ouça e escolha" com o **texto escondido** e opções que são rótulos ou grafias. Hoje o `listen`
mostra traduções (`fr/app.js:3151`) e o verdadeiro ou falso mostra a frase escrita (o ponto de interrogação entregaria a resposta).
```
 Exercício 1 de 6
 Pergunta ou afirmação?
        (alto-falante grande)   toque para ouvir de novo   (tartaruga)
 [ ↗ Pergunta ]          [ ↘ Afirmação ]
 ...
 Exercício 5 de 6
 Onde cai a força?
        (alto-falante grande)
 [ MER-ci ]              [ mer-CI ]     ✓
 Errou: toca as duas formas em seguida e mostra "mer-CI".
 EN: Question or statement? · Where does the stress fall?
```
Itens (só com o que o M1 ensinou): *Ça va ? / Ça va.* · *Vous êtes brésilienne ? / Vous êtes brésilienne.* · *Tu as vingt ans ? / Tu as vingt ans.* ·
força em *merci, bonjour, pardon, professeur*. Os áudios de pergunta e de afirmação são chaves diferentes no manifest (o texto exibido muda:
`?` x `.`) e saem como mp3 separados; **conferir no laboratório** se a voz sobe de verdade nas frases curtas; frase em que não sobe não entra (`06` 4).

**Tela opcional · Grave e compare** **[código novo pequeno]** (ligar `shared/flashcard-field-audio-recorder.js` a um passo; a gravação fica
**só no aparelho**, sem nota): "Diga: *Ça va ?* e *Ça va.*" [Gravar] [Ouvir a minha] [Ouvir o modelo]. EN: "Record and compare".

### A.8.3 Notas de som dentro das lições (letras mudas e ligação na idade)
Já mostradas: M1.1 "Letras que ficam caladas no fim"; M1.3 "a letra muda acorda" (*deux‿ans, trois‿ans*) e "*vingt‿et un*" (com *six‿ans,
dix‿ans, vingt‿ans, neuf ans*). Todas [existe hoje] como nota de explicação; banner próprio "Som" (`kind: 'sound'`, chave nova em pt-BR e en) = [ajuste pequeno].

### A.8.4 Selo de som nas palavras **[código novo]**
Campo opcional `sound` no item da base + catálogo de sons por camada + folha curta ao tocar (`06` formato e).
```
 ┌──────────────────────────────────────┐
 │ ans  (alto-falante)  [som]           │   toque em [som]:
 │ anos                                 │   ┌─────────────────────────────────┐
 └──────────────────────────────────────┘   │ Ligação: deux‿ans, trois‿ans    │
                                            │ deux ans (alto-falante)          │
                                            │ Ver a lição "Som do módulo"      │
                                            └─────────────────────────────────┘
```
No M1 o som do módulo (S1) é de ritmo e melodia, que vale para **toda** palavra: selo em tudo seria ruído. Proponho selo só em 4 itens-gancho:
*ça va* (melodia), *ans* e *vingt* (ligação), *salut* (letra calada). Pergunta 13.

### A.8.5 No Ponto de verificação **[código novo pequeno]**
1 item "Pergunta ou afirmação?" por módulo (`06` 5.1 item 5): cota nova `sound: 1` em `CHECKPOINT_EXAM_QUOTAS`, com o renderer do exercício novo.

---

## A.9 Ponto de verificação do M1 [existe hoje]

12 itens sorteados das 7 unidades (exemplo de uma rodada):
```
 Ponto de verificação · Módulo 1                         Item 3 de 12
 Escreva em francês: "Eu tenho vinte e quatro anos."
 [ J'ai vingt-quatre ans_________ ]            [ Verificar ]
 ✓ (pontuação e maiúscula não descontam; acento faltando = meio ponto)

 Item 7 de 12 · Ouça e escreva o que você ouviu    (alto-falante)
 Item 9 de 12 · Como se diz "a idade" em francês?   → l'âge
 Item 11 de 12 · Elle est ___ (vendeur)             → vendeuse   (item de gramática da M1.7)
```
Aprovado (70% ou mais): "Agora você já sabe, na vida real:" + os objetivos (`goal`) de cada unidade. Reprovado: "Quase lá!" e a nota mínima.
Os pares *le vendeur / la vendeuse* nunca aparecem como palavra (filtro `' / '`): gênero só entra por frase (*Elle est infirmière.*) ou pelos
exercícios da gramática. Se a M1.7 virar só notas (opção B da Parte B), o M1 fica com itens de gramática só da M1.5.

---

## A.10 *Défi* "Bienvenue au club !" (Premium, ~15 a 20 min)

**Onde:** na linha "Desafios do Módulo 1", depois do Ponto de verificação; não bloqueia o M2 (`07` 4.1 e `04` 7.1). A linha já existe
[existe hoje]; o *défi* dentro dela é [código novo] (`07` pergunta 2: arquivo `fr/module-tasks.js` + camada, sem migration).
**Grátis x Premium:** *défi* Premium; com o paywall desligado (`CHALLENGE_PAYWALL_ENABLED = false`) todos fazem, com o selo Premium.
Correção automática e por peças vem junto. Professora: grátis para aluno vinculado (fase 0 pelo Mural, sem código; fila na fase 2).
**Peças obrigatórias (`08` 2.1 d):** cumprimento, nome, nacionalidade **com concordância**, idade (até 69), profissão **sem artigo**,
*et toi ? / et vous ?*, despedida.

**Aluna exemplo:** Carla escolhe criar uma personagem: Carla, 34 anos, brasileira, enfermeira.

**Tela 1 · Abertura** [código novo]
```
 Défi do módulo 1 · Bienvenue au club !        Premium · cerca de 15 a 20 min
 Você chega ao clube de conversa de Lyon. A Léa recebe você. Responda a ela e depois
 escreva a sua mensagem de apresentação para o grupo.
 Vous arrivez au club de conversation de Lyon. Léa vous accueille.
 O que você vai fazer: 1. conversar com a Léa · 2. escrever a mensagem · 3. gravar (opcional)
                                                          [ Começar ]
 EN: You arrive at the Lyon conversation club. Léa welcomes you. Answer her, then write
 your introduction message for the group.
```
O enunciado em francês é **só para ouvir e ler** (tem palavras fora do M1: *arrivez, accueille*); a instrução vale pela linha na língua do site.

**Tela 2 · Quem é você no défi?** [código novo] (privacidade: decisão 22 do `04`, pergunta 4 do `07`)
```
 [ Usar os meus dados ]     nome e nacionalidade do perfil; você digita só a idade e a profissão
 [ Criar um personagem ]    Nome: [Carla]   Ele / Ela: [Ela]
                            Nacionalidade: [brasileira ▼]   (só as que o módulo ensinou + a do seu perfil)
                            Idade: [34]   Profissão: [enfermeira ▼]  (as 8 da M1.6)
 EN: Who are you in this challenge? · Use my details · Create a character
```
O gênero vem do perfil quando existe (`profile_private`, `shared/profile-placeholders.js`); quem marcou "Outro" ou não preencheu escolhe a forma
só para este *défi* (pergunta 15). A idade não existe no perfil e não é guardada fora do *défi*.

**Tela 3 · Conversa com a Léa** (F4: turnos fechados encadeados, áudio pré-gerado da Léa) [código novo P a M: encadear o renderer de cenário, que existe]
```
 T1  Léa: Bonsoir ! Comment allez-vous ?   (alto-falante)
     1 Ça va bien, merci. Et vous ?                  ✓
     2 Salut ! Ça va, et toi ?                       ⚠ aceito com aviso
     3 De rien.                                      ✗
 Carla escolhe 2 → "A Léa usou vous. Com quem você não conhece, responda com vous: Et vous ?" (o turno conta, com aviso)

 T2  Léa: Moi, c'est Léa. Et vous ?
     1 Je m'appelle Carla.    ✓   2 J'ai Carla.   ✗   3 Je suis vingt ans.  ✗

 T3  Léa fala rápido, de propósito: Vous habitez où ?   (frase que o M1 não ensinou)
     1 Pardon ? Vous pouvez répéter ?                ✓
     2 Oui, merci !                                  ✗ "Você não entendeu: peça para repetir."
     Léa: Oh, pardon ! Vous êtes française ?

 T4      1 Non, je suis brésilienne.   ✓
         2 Non, je suis brésilien.     ⚠ "A sua personagem é mulher: brésilienne." (M1.7)
         3 Oui, je suis le Brésil.     ✗
 (opções montadas pela persona: com persona homem, a certa é "brésilien")

 T5  Léa: Quel âge avez-vous ?   → turno livre curto (digitar, com teclado de acentos)
     Carla digita: Je suis trente-quatre ans.
     ⚠ "Para a idade, o francês usa avoir: J'ai trente-quatre ans." (M1.3)   [Tentar de novo]
     Carla digita: J'ai trente quatre ans.   ✓ (sem hífen aceito: avaliarComSeparadores)
     Pista (botão "Precisa de uma pista?"): 1º toque "J'ai ___ ans."; 2º toque "J'ai t____-q_____ ans."

 T6  Léa: Qu'est-ce que vous faites dans la vie ?
     1 Je suis infirmière.         ✓
     2 Je suis une infirmière.     ⚠ "Profissão depois de je suis vai sem artigo." (M1.6)
     3 Je suis infirmier.          ⚠ "A sua personagem é mulher: infirmière." (M1.7)
 T7  Agora pergunte a profissão da Léa:  1 Et vous ? ✓  2 Et toi ? ⚠ (Léa usa vous)  3 De rien. ✗
     Léa: Moi, je suis professeure.
 T8  Léa: Très bien ! À bientôt !   1 Au revoir, à bientôt ! ✓  2 Bonjour ! ✗  3 Merci beaucoup ! ✗
```
Erro de sentido (✗) mostra o porquê e repete o turno; aviso (⚠) explica e deixa seguir. Correção **automática**. "Não sei" mostra a resposta.

**Tela 4 · Mensagem para o grupo** (F1: texto guiado) [código novo M]
```
 Escreva a sua mensagem de apresentação para o grupo do clube (20 a 40 palavras).
 A sua mensagem precisa ter: cumprimento · nome · nacionalidade · idade · profissão ·
 uma pergunta ao grupo (Et vous ?) · despedida
 [ Bonsoir ! Je m'appelle Carla. Je suis brésilien. J'ai trente-quatre ans.
   Je suis une infirmière. Et vous ? Au revoir !                             ]
 18 de 20 a 40 palavras        (teclado de acentos)        [ Precisa de uma pista? ]
                                                           [ Enviar ]
 EN: Write your introduction message for the club group (20 to 40 words).
```
**Tela 5 · Retorno por peças** [código novo] (base: `mustInclude`, `fr/app.js` 8180 a 8223 [existe hoje])
```
 Peças: 7 de 7
   cumprimento: Bonsoir · nome: Je m'appelle Carla · nacionalidade: Je suis brésilien
   idade: J'ai trente-quatre ans · profissão: Je suis une infirmière
   pergunta: Et vous ? · despedida: Au revoir
 Tamanho: 18 palavras. Faltam 2 (mínimo 20). Ideia: diga do que você gosta (J'aime...).
 Confira 2 pontos:
   · brésilien → a sua personagem é mulher: brésilienne.            (M1.7)
   · une infirmière → profissão depois de je suis vai sem artigo.   (M1.6)
 Este retorno confere as peças e os erros mais comuns; não é uma correção completa.
                            [ Corrigir o meu texto ]   [ Ver o modelo ]
```
Como o sistema acha (regras do *défi*, teto de 5 a 8 por módulo, `07` pergunta 11): peças por listas de formas (cumprimento: *bonjour, bonsoir,
salut*; despedida: *au revoir, à bientôt, salut, à plus, à demain*; idade: *j'ai* + número por extenso ou algarismo + *ans*); erros previsíveis:
(1) *je suis* + número + *ans* → *avoir*; (2) *je suis un / une* + profissão → sem artigo; (3) forma masculina de nacionalidade ou profissão com
persona mulher, e o contrário (lista dos pares `' / '` das unidades M1.2 e M1.6); (4) idade em algarismo → aceita, com sugestão de escrever por
extenso (pergunta 17); (5) *vingt-et-un* e *vingt et un* aceitos (os dois existem). O que **não** é pego: ordem estranha, palavra certa no lugar errado.

Carla corrige: *Bonsoir ! Je m'appelle Carla. Je suis brésilienne. J'ai trente-quatre ans. Je suis infirmière. J'aime la France ! Et vous ? Au revoir !*
→ "Peças: 7 de 7 · 21 palavras · nenhum ponto a conferir."

**Tela 6 · Modelo lado a lado** [código novo] (peças coloridas nos dois textos)
```
 Modelo: Bonsoir ! Je m'appelle Inès. Moi, je suis française. J'ai vingt-neuf ans et
 je suis avocate. J'aime le travail ! Et vous ? Au revoir, à bientôt !
```
O modelo é de uma personagem fixa (Inès), com áudio **pré-gerado**: texto com o nome do aluno não bate o manifest e cairia na voz do aparelho (pergunta 21).

**Tela 7 · Gravar (opcional, F10)** [código novo pequeno] "Grave a sua apresentação (até 30 s)." [Gravar] [Ouvir a minha] [Ouvir o modelo];
rubrica oral: "respondi a tudo? dá para entender? a voz subiu na pergunta?" (liga com o Som do módulo). Fica **só no aparelho**.

**Tela 8 · Autoavaliação e fecho** [código novo] (F9: 4 itens de 0 a 2: fiz o que a tarefa pedia · usei palavras do módulo · dá para entender ·
ortografia e acentos) → "Défi concluído: conversa 8/8 · mensagem 7/7 peças" → [Guardar no meu Carnet] (fase 1: só a última versão, no progresso,
com teto) · [Enviar para a professora] (só com vínculo ativo; fase 0 = post no Mural). Conclusão registrada em `completedChallenges` [existe hoje].

---

## A.11 Tempo do módulo e grátis x Premium

| Parte | Tempo (confiança baixa, não medido) | Grátis x Premium |
|---|---|---|
| M1.1, M1.2, M1.4, M1.6 | ~30 min cada | grátis |
| M1.3 (5 lições) | ~35 min | grátis |
| M1.5 (g) | ~18 min | grátis |
| M1.7 (g) | ~30 min como no `08`; ~15 min na opção C | grátis |
| Som do módulo | ~4 min | grátis (gravar e comparar também) |
| Ponto de verificação | ~10 min | grátis |
| *Défi* | 15 a 20 min | Premium (aberto com o paywall desligado); professora grátis para vinculado |
| **Total da trilha** | **~3h30 a 3h45** (sem o *défi*) | |

## A.12 Esforço técnico do que é novo

P = pequeno (dados + renderer existente, ajuste localizado), M = médio (renderer novo, sem banco), G = grande (banco, migration, Edge Function).

| # | Item | Onde | Esforço | Depende de |
|---|---|---|---|---|
| 1 | Script de operações (reordenar palavras e lições, mover *zéro, combien, trente...*, reescrever `afterVocabIdx`) | `fr/scripts/curriculo_ops.js` (Etapa 0b) | M | Etapa 0a (feita) |
| 2 | "Na frase" para item em par (buscar por cada forma) | `findMatchingPhrase`, `fr/app.js:1852` | P | |
| 3 | Áudio de uma só forma no "Digite o que ouviu" de item em par | `renderVocabTypeExercise` | P | |
| 4 | Banner "Som" para nota (`kind: 'sound'`) | `renderConceptStep` + chaves pt-BR/en | P | |
| 5 | Exercício "ouça e escolha" com texto escondido e opções-rótulo (+ "ouvir devagar"; erro toca as duas) | `shared/core/exercicios-licao.js` + `fr/app.js` (`06` estima 80 a 150 linhas) | P a M | |
| 6 | Linha "Som do módulo" que não bloqueia (tipo `sound`) | Trilha + `currentStepDefs` + estado | M | Etapa 0 |
| 7 | Gravar e comparar num passo (sem envio) | ligar `shared/flashcard-field-audio-recorder.js` | P | |
| 8 | Selo de som na palavra (campo `sound`, catálogo por camada, folha) | base + camadas + componente | M (baixo) | catálogo de sons |
| 9 | Item de som no Ponto de verificação | `shared/checkpoint-exam.js` | P | item 5 |
| 10 | *Défi*: casa do *défi* (`fr/module-tasks.js` + camada pt-BR e en), linha "Desafios do Módulo 1", conclusão | arquivo novo + `buildModuleChallengesRow` | M | `07` pergunta 2 |
| 11 | *Défi*: persona (meus dados ou personagem, gênero, idade) | tela nova | P a M | |
| 12 | *Défi*: turnos encadeados (F4) com aviso x erro e turno livre curto | encadear `renderScenarioExercise` | P a M | |
| 13 | *Défi*: texto guiado (F1: peças, contagem, erros previsíveis, pistas, modelo) + rubrica (F9) | renderer novo, em `shared/` (pt herda) | M | |
| 14 | *Défi*: gravação local (F10) | item 7 | P | |
| 15 | Testes: `tests/defis/` (peças, falso positivo), `tests/curriculo-ids`, `check_grammar_input.js`, `tests/camada-curso`, `tests/i18n`, navegador nos 4 cenários | | M | |
| 16 | Conteúdo: 2 unidades novas, 2 alteradas, ~12 frases, 2 diálogos, ~9 notas (pt-BR e en), mp3 novos (skill `audio-tts`), laboratório de áudio para ligações e entonação, Desafios e ditados do M1 | `fr/content.js`, camadas, `fr/audio/` | M (conteúdo) | item 1 |

Nada aqui pede migration nem Edge Function (a fila da professora e o Carnet com tabela são a fase 2 do `07`).

---

# PARTE B · Análise da M1.7 (g) "Masculino e feminino, artigos e plural" (`A1-g11`)

## B.1 O que a unidade junta, e para que serve cada parte

| # | Assunto | O *défi* do M1 cobra? | Outro "consigo" do M1 pede? | Quem precisa de verdade |
|---|---|---|---|---|
| 1 | *le, la, l', les* | não | não (o cartão já mostra o artigo com a palavra) | M2.1 família (*le père, les parents*), M2.2 *c'est / il est* |
| 2 | *un, une, des* | não (pede **ausência** de artigo) | não | *c'est un professeur* (M2), partitivos (M4.5) |
| 3 | O gênero não segue o português | não | não | primeiro contraste claro: *le pantalon, la robe* (M5.3) e a concordância do adjetivo (M5.4) |
| 4 | *-s* do plural mudo | não | sim, de leve: *ans* (M1.3) | M1.3 (como som) e M2 (*les* x *le*) |
| 5 | Feminino das nacionalidades | **sim** (*brésilienne*) | sim (consigo 2) | M1.2 (2 pares) e M2.4 (os outros 6) |
| 6 | Feminino das profissões | **sim** (*infirmière*) | sim (consigo 4) | M1.6 |
| 7 | *des → de* na negação | não | não | M2.6 (g) e M4.5 (g) |

Só **2 dos 7** assuntos são pré-requisito do *défi*. Os itens 2, 3 e 7 não têm exemplo visto no M1 que os motive, o que bate de frente com a
regra do projeto de coerência pedagógica (explicar o que o aluno vê na tela) e com a regra da casa "entrada antes da gramática" (`check_grammar_input.js`).

## B.2 Como os livros e as gramáticas dosam isso (`02`)

| Fonte | Gênero de pessoas (nacionalidade, profissão) | Artigos | Plural | *pas de* |
|---|---|---|---|---|
| **Alter Ego+ 1** | nacionalidade no D0; profissões no D3 L1 (com a fonética *-eur / -euse*) | definidos D0; indefinidos D1 L2; os dois juntos D2 L1 | adjetivos gênero e número D3 L2 | D7 L1 |
| **Défi 1** | profissões U1 D2; nacionalidades no feminino U3 D2 | definidos U1 D1; indefinidos U2 D2 | (não destacado) | negação U2 D2 |
| **Défi Actuel 1** | concordância das profissões U1; feminino das nacionalidades U3 | definidos U1; indefinidos U2 | | U2 (negação) |
| **Grammaire Progressive A1** | cap. 1 a 3 (unidade 1: apresentação, adjetivo masc./fem., plural do adjetivo) | cap. 10 a 12 (unidade 2) | cap. 11 | cap. 20 |
| **Grammaire Essentielle** | cap. 2 (masc./fem. dos nomes) | cap. 4 | cap. 3 | cap. 6 |

Conclusão (confiança **alta**, são sumários e quadros lidos): **nenhuma fonte junta os 7 assuntos num lugar.** Todas separam o gênero das
**pessoas** (que vem com a apresentação) dos **artigos** (que vêm com os objetos e a família), e espalham isso por 2 a 4 unidades. A GP faz
exatamente a divisão da opção C: gênero de pessoas na unidade 1, artigos e plural dos nomes na unidade 2.

## B.3 Carga cognitiva

- **Tamanho:** 9 telas e ~12 exercícios contra 4 a 5 telas e 6 a 8 exercícios das gramáticas de hoje (A.0.4). Seria a maior gramática do A1.
- **Momento:** 7ª unidade, 2ª gramática do módulo, ~3 horas depois do primeiro *bonjour*, logo antes do *défi*. O aluno ainda está montando
  o básico (números, *être / avoir*).
- **Mistura de tipos:** regras de escrita (*-euse, -ière*), de som (*-s* mudo, feminino que se ouve), de uso (sem artigo) e um gancho para o
  futuro (*des → de*). Sete regras novas sem exercício de cada uma = o aluno lembra a última tela.
- **Exercício único:** o motor só tem "digite a forma"; 12 lacunas para 7 assuntos dão menos de 2 por assunto.

## B.4 O que o aluno precisa ter ao chegar ao *défi*

| Peça do *défi* | Onde aprende | Precisa de prática com correção antes? |
|---|---|---|
| nacionalidade com concordância | M1.2 (2 pares + a do perfil) | **sim** (é alerta do *défi*) |
| profissão no feminino | M1.6 (pares no cartão) | **sim** (alerta do *défi*) |
| profissão sem artigo | nota da M1.6 | sim (alerta do *défi*); cabe em 1 tela + 1 ou 2 exercícios |
| idade até 69 com *avoir* | M1.3, M1.4, M1.5 | já tem |
| artigos, plural, *des → de* | | **não** |

## B.5 Nota de explicação x unidade de gramática (mecanismo real)

| | Nota de explicação (`concepts`) | Unidade de gramática (`type: "grammar"`) |
|---|---|---|
| Telas | 1 ou mais blocos ("1 de N"); hoje todas as notas do fr têm 1 | 4 a 5 hoje (sem teto no código) |
| Exemplos com áudio | sim | sim |
| Exercício | **nenhum** | 6 a 8 de digitar (sem teto no código) |
| Entra no Ponto de verificação do módulo | não | **sim** (2 itens de gramática por prova) |
| Desafios "Complete a frase" | não (planejados por unidade de gramática, `04` 8) | sim |
| Gera cartão de revisão | não | não |
| Aparece | no meio da lição, colada à palavra | como nó próprio na Trilha |
| Custo para criar | conteúdo | conteúdo + entrada no `grammar_input_map.json` |

Uma variante com código resolveria parte da diferença: **nota com 2 ou 3 exercícios de digitar logo depois** (reaproveitando
`renderGrammarExerciseStep`) = [código novo P a M]. Ela não está em nenhuma opção abaixo como base, porque a opção C dispensa.

## B.6 Ids estáveis

`A1-g11` **nunca foi publicada** (não existe em `fr/content.js`): pode mudar de título e de escopo sem nenhum efeito em aluno. O id `A1-g17`
está livre (busca no repositório inteiro: zero ocorrências). Gramática não gera cartão, então criar, dividir ou mover gramática nova não toca
no FSRS. Notas novas em unidades existentes (`A1-1`, `A1-2`, `A1-3`) são só conteúdo (id de nota por unidade). Na opção B, `A1-g11` ficaria
sem uso, como o `A2-g4` (`08` 7.7). Em qualquer opção: entrada no `grammar_input_map.json`, camada pt-BR e en e o livro-razão (`ids_publicados.js`).

## B.7 Opções

### Opção A · Dividir em duas gramáticas, as duas no M1

| Pos. | Unidade (id) | Notas novas |
|---|---|---|
| M1.1 | Cumprimentar e se despedir (`A1-1`) | letras caladas; *bienvenue* |
| M1.2 | Dizer o nome e a nacionalidade (`A1-2`) | |
| M1.3 | Dizer a idade: de 1 a 29 (`A1-3`) | ligação *deux‿ans*; 21 a 29 |
| M1.4 | Perguntar a idade dos outros: até 69 (`A1-21`) | 17 a 19 e dezenas |
| M1.5 (g) | *être* e *avoir*, tônicos (`A1-g1`) | |
| M1.6 | Dizer a profissão (`A1-22`) | sem artigo; *Qu'est-ce que vous faites...* |
| M1.7 (g) | Masculino e feminino: nacionalidades e profissões (`A1-g11`) | |
| M1.8 (g) | Artigos e plural (`A1-g17`) | |

*des → de* vai para M2.6 (g). **Prós:** tudo do `08` continua no M1; cada gramática no tamanho normal. **Contras:** M1 com 8 unidades e 3
gramáticas (~3h50, o mais longo do A1); a M1.8 ensina artigos sem entrada no M1 e sem uso no *défi*; duas gramáticas seguidas no fim do módulo.

### Opção B · Só notas (a proposta da dona, ao pé da letra)

| Pos. | Unidade (id) | Notas novas |
|---|---|---|
| M1.1 | `A1-1` | letras caladas; *bienvenue* (artigo aqui: **não cabe**, a unidade não tem substantivo com artigo, só *un café* numa frase) |
| M1.2 | `A1-2` | **feminino das nacionalidades** (2 pares); *le, la* |
| M1.3 | `A1-3` | ligação e *-s* mudo; 21 a 29; *un / une* (fraco: não há substantivo feminino visto para *une*) |
| M1.4 | `A1-21` | 17 a 19 e dezenas |
| M1.5 (g) | `A1-g1` | |
| M1.6 | `A1-22` | sem artigo; **feminino das profissões em 3 blocos** (*-e*; *-eur / -euse, -ier / -ière*; iguais e feminização) |
| (sem M1.7) | `A1-g11` sem uso | |

Depois: M2.1 nota de artigos e plural (2 blocos); M2.4 nota do feminino das outras nacionalidades; M2.6 (g) *pas de*; M5.3 nota "o gênero
não segue o português". **Prós:** M1 mais curto (6 unidades, ~3h15); cada regra colada à palavra que a motiva; zero unidade nova.
**Contras:** o gênero, que é **o alerta principal do *défi***, nunca é praticado com correção antes dele (nota não tem exercício); o Ponto
de verificação do M1 fica com itens de gramática só da M1.5; os Desafios "Complete a frase" de gênero ficam sem unidade-âncora; os artigos
ficam picados em 3 notas e nunca têm um lugar para revisar (a GP e a GEF dão capítulo próprio). Só fica de pé com a nota com exercícios (B.5), que é código novo.

### Opção C · Híbrida (recomendada)

| Pos. | Unidade (id) | O que tem | Notas |
|---|---|---|---|
| M1.1 | Cumprimentar e se despedir (`A1-1`) | como no `08` | letras caladas no fim (som); *bienvenue* no Quebec |
| M1.2 | Dizer o nome e a nacionalidade (`A1-2`) | lições reordenadas | **"Français, française: o feminino que se ouve"** (contato, sem regra) |
| M1.3 | Dizer a idade: de 1 a 29 (`A1-3`) | 14 cartões, 5 lições | ligação *deux‿ans* (inclui o *-s* mudo de *ans*); 21 a 29 + *vingt‿et un* |
| M1.4 | Perguntar a idade dos outros: até 69 (`A1-21`) | como no `08` | 17 a 19 e dezenas |
| M1.5 (g) | *être* e *avoir*, tônicos (`A1-g1`) | 5 telas, 8 exercícios | |
| M1.6 | Dizer a profissão (`A1-22`) | como no `08` | sem artigo; *Qu'est-ce que vous faites dans la vie ?* |
| M1.7 (g) | **Masculino e feminino: nacionalidades e profissões** (`A1-g11`, escopo menor) | 5 telas, 8 exercícios, ~15 min | |
| | Som do módulo, Ponto de verificação, *défi* | | |

E no M2 (proposta; a ordem é a pergunta 2):

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M2.1 | Apresentar a família (`A1-4`) | igual ao `08` (recebe as 2 frases do `A1-3` com *frères, sœurs, père*, pergunta 7) |
| M2.2 (g) | **Artigos e plural** (`A1-g17`, nova) | *le, la, l', les*; *un, une, des*; o plural se ouve no artigo (*le / les*, A1-S4); o gênero vem com a palavra (*l'âge* é masculino: por isso *quel âge*, sem *e*) |
| M2.3 | Descrever pessoas: cores e aparência (`A1-16`) | igual |
| M2.4 (g) | Possessivos e apresentar alguém (`A1-g2`) | igual (vem depois da descrição: *il est* + adjetivo já visto) |
| M2.5 | Dizer de onde é e onde mora (`A1-9`) | + nota: o feminino das outras 6 nacionalidades, "o mesmo molde da M1.7" |
| M2.6 (g) | Preposições com cidades e países (`A1-g4`) | igual |
| M2.7 (g) | Frase negativa e perguntas (`A1-g12`) | **+ *pas de*** (*des → de*), vindo da M1.7 |

E no M5.3 (Comprar roupas): nota "o gênero nem sempre bate com o português" com *le pantalon* (a calça) e *la robe* (o vestido), os primeiros
contrastes claros do A1, que a concordância da M5.4 (g) vai cobrar.

**A M1.7 da opção C, tela por tela** [existe hoje]:
```
 Passo 1 de 5 · Ele ou ela: o feminino ganha -e
   Léo est français. / Ana est française.   Il est étudiant. / Elle est étudiante.
   Il est avocat. / Elle est avocate.
   Repare no som: a consoante do fim, muda no masculino, passa a soar no feminino.
 Passo 2 de 5 · Terminações que mudam mais
   -ien → -ienne: brésilien, brésilienne · -ier → -ière: infirmier, infirmière
   -eur → -euse: vendeur, vendeuse; serveur, serveuse
 Passo 3 de 5 · Iguais, ou diferentes só na escrita
   Elle est médecin. · professeure, ingénieure: o -e só aparece na escrita, o som é o mesmo.
   Nota: no Quebec essas formas são as de sempre; na França ficaram comuns há poucos anos,
   e ainda se ouve "elle est professeur".
 Passo 4 de 5 · Profissão: sem artigo depois de je suis, il est, elle est
   Je suis infirmière. · Elle est vendeuse. (nunca "je suis une infirmière")
 Passo 5 de 5 · Resumo (tabela masculino | feminino | o que muda) + [Ir para os exercícios →]
 EN: Masculine and feminine: nationalities and jobs
```
Exercícios (8, digitar, formato atual): *Ana est ___. (français)* → *française* · *Elle est ___. (serveur)* → *serveuse* · *Elle est ___. (brésilien)* → *brésilienne* ·
*Il est ___. (étudiante)* → *étudiant* · *Elle est ___. (médecin)* → *médecin* · *Elle est ___. (avocat)* → *avocate* · *Il est ___. (infirmière)* → *infirmier* ·
*Je suis ___. (professeur; quem fala é a Léa)* → *professeure* (aceita também *professeur*, campo `alt`, pergunta 24).
Confiança da nota de feminização: **alta** para o Quebec; **média** para "comuns há poucos anos" na França (a Académie française aceitou a
feminização dos nomes de profissão em 2019; o uso varia). É a decisão 14 do `04` (categoria explicação).

**Prós:** o que o *défi* cobra é praticado com correção logo antes dele; a M1.7 cabe no tamanho normal (~15 min); cada parte do resto vai para
onde há palavras que a motivam (artigos com a família, *pas de* com a negação, "gênero ≠ português" com as roupas); segue a divisão da GP;
nenhum id publicado muda. **Contras:** o M2 ganha uma gramática (7 unidades, 4 de gramática, ~3h20); a nota do *-s* mudo e a do feminino que
se ouve antecipam um pouco da regra; *l'âge* como único contraste de gênero no M2 é sutil.

### Quadro das três opções

| | A · dividir no M1 | B · só notas | C · híbrida |
|---|---|---|---|
| Unidades no M1 / tempo | 8 / ~3h50 | 6 / ~3h15 | 7 / ~3h20 |
| Unidades no M2 / tempo | 6 / ~3h00 | 6 / ~3h05 | 7 / ~3h20 |
| Gênero praticado antes do *défi* | sim | **não** | sim |
| Artigos com palavras que os motivam | não | parcial | sim |
| Itens de gramática do M1 no Ponto de verificação | M1.5, M1.7, M1.8 | só M1.5 | M1.5, M1.7 |
| Código novo | nenhum | nenhum (ou nota com exercício, P a M) | nenhum |
| Ids | `A1-g11` + `A1-g17` | `A1-g11` sem uso | `A1-g11` (escopo menor) + `A1-g17` |

## B.8 Recomendação: opção C

Ela é a única que cumpre as três condições ao mesmo tempo: (1) **pré-requisito do *défi*** praticado com correção (o que a opção B perde,
porque nota não tem exercício); (2) **tamanho normal** de gramática (o que a M1.7 do `08` estoura); (3) **cada regra perto da palavra que a
motiva** (o que a opção A perde ao ensinar artigos sem entrada). Também é a dosagem da Grammaire Progressive e não pede código.

Onde a ideia da dona **fica** na opção C: o feminino das nacionalidades começa como nota na M1.2 (como ela propôs) e se completa na M2.5;
o *-s* mudo vira nota de som na M1.3. Onde eu **discordo**: artigos na M1.1 não têm onde se apoiar (nenhum substantivo com artigo) e na M1.3
o *un / une* é número, sem um substantivo feminino visto para mostrar *une*; e o feminino das profissões como nota só na M1.6 deixaria a regra
mais cobrada pelo *défi* sem nenhum exercício.

## B.9 Outras gramáticas do A1 com o mesmo risco (só suspeitas, sem redesenho)

| Unidade (08) | Assuntos juntos | Sinal nas fontes | Suspeita |
|---|---|---|---|
| M2.6 (g) Frase negativa e perguntas (`A1-g12`) | *ne... pas*, entonação, *est-ce que*, inversão?, palavras interrogativas, "o jeito da rua"; + *pas de* na opção C | GP separa em cap. 5, 20, 51, 52; AE espalha D1 a D5 | **alta** |
| M3.2 (g) Verbos em *-er*, pronominais e *on* (`A1-g3`) | conjugação *-er*, letras mudas, pronominais, *on* | GP cap. 6 a 9 (4 caps.); *on* à parte em AE e DA1 | **alta** |
| M5.4 (g) Adjetivos e demonstrativos (`A1-g15`) | concordância, plural, posição do adjetivo, *ce / cet / cette / ces* | GP 2, 3, 15, 16; AE D2 L3 x D3 L2 | **alta** |
| M6.2 (g) *aller*, futuro próximo e contraídos (`A1-g13`) | *aller*, *futur proche*, *au / à la / aux*, *du / des* | GP 13, 42, 43; AE D2 (contraídos) x D4 (futuro próximo); o próprio `08` chama o M6 de "pico" | **alta** |
| M6.6 (g) Modais, *il faut* e imperativo (`A1-g6`) | *pouvoir, vouloir, devoir*, *il faut*, imperativo | hoje já tem 8 exercícios; AE D4 L1 x D4 L2 | **alta** |
| M2.5 (g) Preposições com cidades e países (`A1-g4`) | *à / en / au / aux* + procedência *de / d' / du / des* | GP 22 x AE D2 L3 (procedência à parte) | média |
| M2.2 (g) Possessivos e apresentar alguém (`A1-g2`) | possessivos + *c'est / il est* | DA1 U3 junta os dois | baixa a média |
| M1.5 (g) *être*, *avoir*, tônicos | 2 verbos + tônicos | DA1 U1 junta | baixa |

Ficam fora da suspeita (um assunto só): M3.5, M4.5, M5.2, M7.3, M8.4, M8.5. Conferir cada suspeita do mesmo jeito (telas x exercícios x o que o *défi* cobra) antes de escrever as unidades.

---

## Perguntas de verificação para a dona

1. Aprovar a **opção C** (M1.7 enxuta + "Artigos e plural" no M2)? *Recomendo sim.*
2. Ordem do M2: artigos (M2.2), descrever pessoas (M2.3), possessivos (M2.4), intercalados; ou artigos e possessivos seguidos (M2.2 e M2.3)? *Recomendo intercalados.*
3. Id novo **`A1-g17`** para "Artigos e plural" (livre no repositório)? *Recomendo sim.*
4. *pas de* (*des → de*) vai para a M2.7 (g) Frase negativa e perguntas? *Recomendo sim.*
5. "O gênero não segue o português": uma tela na `A1-g17` com *l'âge* e uma nota na M5.3 com *le pantalon, la robe*? *Recomendo sim.*
6. Nota de instruções de aula na M1.1: nenhuma palavra a motiva. Tirar da trilha (vira frase do *défi* ou material da aula) ou prender em *pardon* fixando a frase-exemplo? *Recomendo tirar.*
7. Frases do `A1-3` com palavras da família (*J'ai deux frères et trois sœurs.*, *Quel est l'âge de ton père ?*) mudam para a M2.1 (a chave vai junto)? *Recomendo sim.*
8. *Combien ça coûte ?* vai para M5.1 com *combien*; *Il fait zéro degré dehors.* vai para M7.6 (tempo) ou é aposentada? *Recomendo M7.6.*
9. M1.3 com 5 lições (4 + 4 + 3 + 3 palavras) em vez de 4? *Recomendo sim.*
10. Trocar o exercício *Je ___ étudiante.* da M1.5 por *Je ___ brésilienne.* (*étudiante* só chega na M1.6)? *Recomendo sim.*
11. Pôr *neuf ans* (som de v) na nota de ligação da M1.3, além de *deux‿ans, trois‿ans, six‿ans, vingt‿et un*? *Recomendo sim.*
12. Som do módulo como linha própria que não bloqueia, id `A1-s1` (e `A1-s2`... nos outros módulos)? *Recomendo sim.*
13. Selo de som no M1 só em 4 palavras (*ça va, ans, vingt, salut*)? *Recomendo sim.*
14. Item de som no Ponto de verificação já no M1, quando o exercício "ouça e escolha" existir? *Recomendo sim.*
15. *Défi*: quem não tem gênero no perfil (ou marcou "Outro") escolhe ele ou ela só para o *défi*? *Recomendo sim.*
16. *Défi*: nacionalidades oferecidas = as do M1 (*française, brésilienne*) + a do perfil? *Recomendo sim.*
17. *Défi*: idade por extenso obrigatória no turno falado; algarismo aceito na mensagem, com sugestão? *Recomendo sim.*
18. *Défi*: Léa começa com *vous* e há um turno de propósito rápido para o aluno pedir *Pardon ? Vous pouvez répéter ?*? *Recomendo sim.*
19. A nota do Quebec diz também que *bienvenue* é "bem-vindo(a)", para o título do *défi* não confundir? *Recomendo sim.*
20. Mensagem do *défi* com 20 a 40 palavras (o `07` dizia 20 a 30, mas agora são 7 peças)? *Recomendo 20 a 40.*
21. Modelo do *défi* com personagem fixa (Inès) e áudio pré-gerado, nunca com o nome do aluno? *Recomendo sim.*
22. "Ponto de verificação" é o nome da última lição de cada unidade **e** da prova do módulo. Renomear a lição (ex.: "Revisão da unidade")? Muda texto em português (`DELIBERATE_PT_CHANGES`). *Recomendo avaliar à parte.*
23. Diálogos da M1.6 e da M1.4 com Léa e Hugo (as personagens do M1.1), para o aluno reencontrar as mesmas pessoas no *défi*? *Recomendo sim.*
24. Na M1.7, aceitar *professeur* e *professeure* (e *ingénieur / ingénieure*) para mulher? *Recomendo aceitar as duas e explicar na tela 3.*

---

## Resumo

- Preview completo do M1 do mapa v3: 7 unidades, Som do módulo, Ponto de verificação e *défi*, com telas, texto real em francês, instruções
  em pt-BR (e EN nas telas novas) e a marca [existe hoje] / [ajuste pequeno] / [código novo] em cada tela.
- As lições cabem no motor de hoje; o novo é o som (exercício "ouça e escolha", linha que não bloqueia, gravação, selo) e o *défi* (persona,
  turnos encadeados, texto guiado com peças e erros previsíveis). Nada pede migration. Antes de tudo: a Etapa 0b (script de operações).
- Achados de código: item em par sem "Na frase" e fora do Ponto de verificação; nota sem exercício; gramática hoje com 4 a 5 telas e 6 a 8 exercícios.
- A M1.7 do `08` junta 7 assuntos (~9 telas, ~12 exercícios), e só 2 são cobrados pelo *défi*. Recomendo a opção C: M1.7 enxuta só com o
  feminino de nacionalidades e profissões (`A1-g11`), "Artigos e plural" no M2 (`A1-g17`), *pas de* na negação, notas de contato na M1.2 e M1.3.
- Outras gramáticas suspeitas de excesso: M2.6, M3.2, M5.4, M6.2, M6.6 (alta), M2.5 (média).
