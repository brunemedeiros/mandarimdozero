# Mensagem para a sessão da Conjugação (francês)

Copie tudo abaixo da linha e cole numa sessão nova do Claude Code neste repositório.

---

Você vai trabalhar na **Conjugação do francês** do site "Idiomas com Prof. Brune" (repo `mandarimdozero`). Leia antes o `CLAUDE.md` da raiz e
as regras de `.claude/rules/` que carregarem (em especial `frontend-fr-zh.md`, `i18n.md`, `testes.md`, `conteudo-trilha.md`). Responda e
escreva em português do Brasil coloquial (sem "--" e sem "pra" em texto visível). Não abra PR, não faça merge nem publique sem pedido
explícito da dona; outras sessões editam o mesmo repo: em conflito, mantenha os dois lados.

## Contexto

- A Conjugação é a prática de verbos do app de francês: banco em `fr/conjugation-data.js` (241 verbos hoje, gerados offline do dataset
  Verbiste; o cabeçalho explica o formato: `g` = grupo `core|g1|g2|g3ir|g3re|g3oir`, `f` = formas por tempo, 6 posições
  `[je, tu, il, nous, vous, ils]`, impératif só em tu/nous/vous). Pronominais funcionam pondo o pronome objeto dentro da forma
  (ex.: `s'asseoir` → `"m'assieds/assois"`, PC `"me suis assis"`).
- Tela e lógica: `fr/app.js`, bloco a partir de `const CONJ_TENSES` (linha ~5112) até os Jogos (~5540). Jogos: motor em
  `shared/conj-games.js`, dados do francês em `fr/conj-games.js` (hoje 1 jogo, "Passé composé ou Imparfait?").
- Textos em português (rótulos de grupo, traduções dos verbos, frases de exemplo dos tempos): `courses/fr-pt-BR/layer.js`, chave
  `"conjugation"` (linha ~2186). Em inglês: `fr/content.en.js`. **O site em inglês não pode ter nada em português**: todo texto novo
  vai nas duas camadas; tradução nova entra com nível de confiança (alta/média/baixa).
- Grátis x Premium (regra do projeto, responder sempre): a **prática da Conjugação é grátis**; os **Jogos são Premium** com cadeado,
  paywall desligado (`CONJ_GAMES_PAYWALL_ENABLED = false`, `fr/app.js:5537`). Não ligar paywall nenhum.
- A dona vai **ampliar bastante a tabela de verbos** (faltam muito mais que os 13 abaixo). A trilha de Estudo está sendo replanejada em
  outra frente (`docs/i18n/curriculo/04-lacunas-e-propostas-fr.md`, versão 2); esta sessão cuida só da Conjugação.

## Achados (conferidos no código em 2026-10-16)

1. **O filtro "Top N" não é por frequência.** `fr/app.js:5144`:
   `const CONJ_VERB_RANK = Object.fromEntries(Object.keys(CONJUGATION_VERBS).map((name, i) => [name, i + 1]));`
   O comentário logo acima diz que a ordem do arquivo "já é do mais comum para o mais raro", mas o arquivo está **ordenado por grupo**:
   `core` nas posições 1 a 4, `g1` de 5 a 133, depois `g3ir`, `g3re`, `g2`, `g3oir` (228 a 241). Resultado: o **Top 50 = 4 verbos `core` + 46
   verbos do 1º grupo**; *prendre* é o 186º, *venir* 166º, *dire* 193º, *pouvoir* 228º, *vouloir* 229º, *devoir* 230º, *savoir* 231º, *voir* 232º.
   Quem escolhe "Top 10/25/50/100" nunca vê os irregulares mais usados da língua.
   Correção proposta: lista explícita de frequência (`CONJ_FREQ_ORDER`) e a ordem do arquivo só como desempate. Conferir a lista com uma
   fonte de frequência (ex.: Lexique 3, coluna de frequência de lemas verbais); a sugestão de memória (confiança média) para os 50
   primeiros é: *être, avoir, faire, aller, dire, pouvoir, vouloir, savoir, voir, venir, devoir, prendre, mettre, falloir, parler, passer,
   trouver, donner, comprendre, connaître, partir, croire, demander, penser, aimer, rester, sortir, attendre, entendre, vivre, arriver, entrer,
   écrire, lire, chercher, appeler, boire, jouer, finir, travailler, manger, ouvrir, écouter, regarder, habiter, acheter, payer, choisir, dormir,
   essayer*. Corrigir também o comentário.
2. **Verbos usados na trilha que faltam no banco** (lista completa para a trilha atual, conferida por script; ver "Como reconferir"):

   | Verbo | Onde aparece na trilha (frase real) |
   |---|---|
   | *adorer* | A1-4 *Les parents adorent leurs enfants.*; A1-19 *J'adore écouter de la musique.* |
   | *briller* | A1-13 *Le soleil brille aujourd'hui.* |
   | *blesser* (*se blesser*) | A1-15 *La main est blessée.* |
   | *cuire* | A1-11 *L'œuf est cuit.* |
   | *désirer* | A1-5 diálogo *Bonjour, vous désirez ?* |
   | *détester* | A1-5 vocabulário e *je déteste le poisson* |
   | *excuser* (*s'excuser*) | A1-8 e A1-14 *Excusez-moi, ...* |
   | *garer* (*se garer*) | A1-14 *La voiture est garée devant la maison.* |
   | *lever* (*se lever*) | A1-6 vocabulário; *Tu te lèves à quelle heure ?*; A1-g3; A1-g9 *Je me suis levé tôt.* |
   | *neiger* | A1-13 vocabulário *il neige* |
   | *reposer* (*se reposer*) | A1-15 *Vous devez vous reposer.*; A1-g6 |
   | *réveiller* (*se réveiller*) | A1-6 vocabulário; A1-g3 *Tu te réveilles tôt ?* |
   | *visiter* | A1-20 *Hier, j'ai visité un musée.* |

   Também: *s'appeler* (A1-2) existe só como *appeler*, sem a forma pronominal; *coucher, habiller, promener, amuser* (*se coucher*...) não
   aparecem na trilha hoje mas são a rotina do A1 em todos os livros; a reorganização do A1 vai pôr *se coucher* e *habiter* como vocabulário e
   *essayer* no A1-10. Nos Desafios e ditados (`fr/dictations.js`, `fr/scripts/challenges_import/*.json`) aparecem muitos outros verbos fora
   do banco (*monter, rencontrer, déménager, promener, traverser, ajouter, arrêter, inquiéter, énerver, éviter, retrouver, proposer*...): rode o
   script com esses arquivos para a lista completa e filtre o que é verbo de verdade (o lematizador pega também nomes como *mer*).
   Pronominais novos seguem o formato de `s'asseoir` (pronome objeto dentro da forma; PC com *être*).
3. ***éteindre* está no grupo errado:** `fr/conjugation-data.js:6042` tem `"g": "g1"`; é verbo em *-re* do 3º grupo → `"g3re"`.
4. **Tempos sem nível:** `CONJ_TENSES` (`fr/app.js:5112`) mostra Présent, Passé composé, Imparfait, Plus-que-parfait, Futur simple,
   Conditionnel présent, Subjonctif présent e Impératif sem dizer o nível. Proposta: selo só informativo (não tranca nada) ao lado do nome:
   Présent, Passé composé, Impératif = **A1**; Imparfait, Futur simple, Conditionnel présent = **A2**; Plus-que-parfait = **B1**;
   Subjonctif présent = **B1** (no fim do A2 só aparece em fórmula, *il faut que / je veux que*). A dona ainda vai decidir se quer o selo
   (decisão 15 do `04` v2; alternativa: não mostrar nada). **Implemente atrás de uma constante `CONJ_LEVEL_BADGES_ENABLED = false`** e
   deixe registrado como ligar.
5. **Jogos:** só existe 1 jogo, e ele é de nível A2 (alternância PC x imperfeito). O mesmo selo do item 4 vale para o jogo (constante).
   Propostas de jogos A1 (Premium, mesmo motor de 2 opções `a/b` de `shared/conj-games.js`, frases a aprovar pela dona antes de publicar,
   entrando como rascunho com `.md` de revisão): **"Être ou avoir?"** (auxiliar do passé composé: *Je ___ allé au cinéma* → *suis* / *ai*),
   **"Agora ou depois?"** (presente x futuro próximo: *Demain, je ___ au cinéma* → *vais aller* / *vais*). Use só vocabulário do A1.
6. **Ligação unidade → verbos** (opcional, só se sobrar tempo e sem mexer na trilha): um link "Praticar os verbos desta unidade" que abre a
   Conjugação com filtro pronto precisa de um mapa unidade → verbos **mantido do lado da Conjugação** (ex.: `fr/conj-unit-verbs.js`), não no
   `fr/content.js`.

## O que NÃO fazer

- **Não mexer na trilha de Estudo**: nada em `fr/content.js`, `courses/fr-pt-BR/layer.js` fora da chave `"conjugation"`, `fr/content.en.js`
  fora da parte da Conjugação, lições, notas, ditados, Desafios, decks ou progresso dos alunos. A trilha vai mudar de ids e ordem numa etapa
  própria (Etapa 0 do `04` v2).
- Não mudar a ordem de exibição dos tempos (pedida pela dona em 2026-10-13: por modo) nem trazer de volta o futur proche para a prática.
- Não ligar paywall (`CONJ_GAMES_PAYWALL_ENABLED`, `CHALLENGE_PAYWALL_ENABLED`).
- Não gravar texto em português em lugar que o site em inglês mostra.
- Não inventar forma conjugada à mão para verbo novo: gerar pela mesma fonte (Verbiste / pacote `conjugation-fr`, como diz o cabeçalho do
  arquivo; o script de geração não está no repo: se for recriar, versione-o em `fr/scripts/`) e conferir por amostragem.

## Arquivos

`fr/conjugation-data.js` · `fr/app.js` (bloco da Conjugação) · `fr/conj-games.js` · `shared/conj-games.js` · `courses/fr-pt-BR/layer.js`
(chave `conjugation`) · `fr/content.en.js` (parte da Conjugação) · `tests/conjugacao/test_playwright.js`.

## Como reconferir a lista de verbos (script usado no achado 2)

1. Num diretório temporário: `python3 -m venv venv && venv/bin/pip install simplemma`.
2. Com Node, exporte para JSON todo `f` (francês) de cada unidade de `fr/content.js` (vocabulário, frases, diálogos, gramática) e as formas
   de `CONJUGATION_VERBS`.
3. Em Python, tokenize, lematize com `simplemma.lemmatize(palavra, lang='fr')`, fique com lemas terminados em *-er/-ir/-re/-oir* que não são
   chave do banco, e confira à mão o que é verbo (a lista bruta traz nomes como *chambre*, *frère*).
   Resultado de 2026-10-16 na trilha: os 13 verbos da tabela do achado 2.

## Testes

- `node tests/conjugacao/test_playwright.js` (regressão; relatar números reais) + testes novos para: ordem do Top N (Top 25 contém
  *prendre, pouvoir, vouloir, venir, dire, voir*), presença dos verbos novos e das formas pronominais, *éteindre* em `g3re`, selo desligado
  por padrão e ligado pela constante, jogos novos (se feitos) no modo rascunho.
- `tests/i18n` (nenhum texto em português no site em inglês; mudança de português existente só com `DELIBERATE_PT_CHANGES`).
- Teste no navegador da Conjugação nos 4 cenários (fr × claro/escuro, celular), skill `teste-navegador`.

## Ao terminar

Registre a entrega com a skill `registrar-entrega` (em `docs/historico/`, não no `CLAUDE.md`), diga o que é grátis e o que é Premium,
liste os passos manuais da dona (se houver) e as pendências acumuladas.
