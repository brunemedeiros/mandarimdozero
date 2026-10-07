# Histórico: Áudio/mídia por Field (Fase 7a-7h) e Anki export/import (7i/7j)

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Fase 7 -- Auditoria e arquitetura de áudio/mídia por Field (SÓ AUDITORIA,
zero código funcional alterado)

Prompt-mestre de 25 seções, pedido logo após o fechamento da Fase 6D
(Legacy→Native), com restrição travada desde o título: **auditoria e
especificação, nenhuma implementação de código funcional nesta entrega**
-- exceção só pra um teste de leitura opcional, não obrigatório, sem
alterar comportamento (não escrito nesta entrega -- toda a auditoria foi
feita por leitura direta do código real já em produção, sem necessidade
de um teste novo pra confirmar nada). Renderers, motor, FSRS, Review,
Preview, editor, banco, Storage, TTS e upload foram lidos, nunca
alterados -- confirmado por `git status`/`git diff` vazios do início ao
fim desta entrega.

### A) Mapa do estado atual -- todo consumidor de áudio/imagem

**Modelo (`shared/flashcard-model.js`)**:
- `Field.audio`/`Field.image` (shape: `{url, source}`/`{url}`, ou `null`)
  já existem desde a Fase 6B, preservados sem transformação por
  `buildNativeRuntimeFields()` (linha 201-216).
- `resolveCardField(note, fieldIndex)` (linha 590) é o ÚNICO ponto que
  projeta um Field pra `{text, lang, pinyinText, audioUrl}` -- **resolve
  áudio (`field.audio.url`), mas NUNCA resolve imagem**. Um Field com
  `field.image` setado nunca produz nada usável a partir daqui -- achado
  confirmado por leitura direta, não presumido (mesmo gap já sinalizado
  na auditoria da Fase 6D, seção 6, ainda intocado).
- `fieldHasAudio(resolvedField, appKey)` (linha 622) -- construída na
  Fase 4a como candidata a decidir elegibilidade de TTS automático
  (`audioUrl` explícito OU `lang` bate com o idioma estudado). **Nunca
  chamada por nenhum renderer** -- confirmado por grep em `fr/app.js`/
  `zh/app.js`: os 4 renderers usam `isStudyLanguageField(field, appKey)`
  direto em vez dela. Continua no arquivo, testada (32 testes desde a
  Fase 4a cobrem ela), mas é código morto sem nenhum call site real hoje,
  mesma situação já registrada desde a Fase 6B.
- `resolveMultipleChoiceCardView` devolve `prompt`+`correct` (Fields
  resolvidos inteiros, cada um com seu `audioUrl`) mas `distractorTexts`
  é sempre STRING PURA (`.map(f => f.content.value)`, linha 269-271, e
  no ramo legado `row.choices` já são strings) -- um distrator nunca
  carrega áudio, mesmo que a Note nativa tenha um Field `role:'distractor'`
  com `field.audio` setado (a informação é descartada na geração do
  CardInstance, não no resolver).
- `resolveTypeAnswerCardView` resolve `answer = resolveCardField(...)`
  internamente, mas **devolve só `displayAnswerText`/`compareAnswerText`
  (strings) -- o objeto `answer` resolvido inteiro, com seu `audioUrl`,
  é descartado antes do `return`** (linha 667-684). Ou seja: mesmo que o
  Field de resposta tenha `field.audio` setado, isso nunca chega ao
  renderer -- achado confirmado por leitura, não presumido.
- `resolveClozeCardView` resolve `textField.audio.url` DIRETO (linha
  710, não passa por `resolveCardField()` -- inconsistência de caminho,
  ainda que o resultado funcional seja o mesmo) e resolve `translation =
  resolveCardField(...)` (com seu próprio `audioUrl` computado) -- mas o
  `translation.audioUrl` nunca é lido por nenhum renderer (ver abaixo).

**Renderers (`fr/app.js`/`zh/app.js`, os 4 da Fase 6C, estrutura
idêntica nos dois idiomas -- `speakChinese`/`hanzi` no lugar de
`speakFrench`/`french`):**
- **Normal** (`renderNormalCard`, fr:6539): `targetAudioUrl =
  view.front.audioUrl || view.back.audioUrl` (upload, fallback entre os
  dois lados) renderizado via `customAudioBtnHTML` **sempre visível**,
  junto do `frontHTML` (independente de `localState.revealed`) --
  **achado confirmado, não hipotético**: se o áudio pertence ao Field
  do VERSO (`view.back.audioUrl`, quando o front não tem áudio próprio),
  o botão 🎧 aparece de qualquer jeito, ANTES da revelação -- tocando-o
  reproduz o áudio do lado ainda oculto, um vazamento real de
  informação via áudio que o texto ainda esconde. TTS automático (🔊,
  `audioBtnHTML`+`speakFrench`) só toca quando `frenchVisibleNow` é
  true (`isReverse ? localState.revealed : true`) -- esse mecanismo
  está corretamente gated; só o botão de áudio CUSTOMIZADO (upload) não
  está.
- **Múltipla escolha** (`renderMultipleChoiceCard`, fr:6128):
  `customAudioUrl = view.prompt.audioUrl || (view.correct &&
  view.correct.audioUrl) || null`, sempre visível junto do prompt, ANTES
  de qualquer escolha ser feita -- **mesmo padrão de vazamento**: se o
  Field de resposta certa (`view.correct`) tem áudio próprio e o prompt
  não, o botão 🎧 toca a pronúncia da RESPOSTA CERTA antes da aluna
  escolher entre as opções, sem nenhum gate. TTS automático (🔊) só
  toca sobre `view.prompt.text`, nunca sobre `view.correct` -- esse não
  vaza (`promptSpeakable` calculado só sobre o prompt).
- **Digite a resposta** (`renderTypeAnswerCard`, fr:6306): só
  `view.prompt.audioUrl` é usado (nunca `view.correct`/`answer`, que nem
  chega ao renderer -- ver acima) -- sem vazamento aqui, mas também sem
  NENHUMA forma de ouvir o áudio da resposta depois de revelada, mesmo
  que o Field de resposta tenha um `field.audio` de verdade anexado (é
  descartado na resolução, não só não-mostrado).
- **Cloze** (`renderClozeCard`, fr:6236): `view.audioUrl` (áudio do
  Field de texto/frase) sempre visível, em qualquer estado
  (respondido ou não) -- aqui isso NÃO é vazamento (a frase inteira,
  lacuna incluída, é o mesmo conteúdo visível o tempo todo; o áudio é da
  frase, não da resposta específica). `view.translation.audioUrl`
  (calculado por `resolveCardField` dentro do resolver) nunca é lido
  pelo renderer -- mesmo padrão de "resolvido mas nunca consumido" do
  Type Answer.
- **Imagem**: `card.imageUrl` (Note-level, nunca Field-level -- ver
  `resolveCardField`) é a única fonte usada nos 4 renderers, idêntica
  nos dois idiomas, sempre no topo do `.flashcard`, sem nenhuma condição
  de revelação (correto -- é ilustração do conceito inteiro, nunca da
  resposta específica).

**TTS/pronúncia automática (motor pré-existente, não construído pra
Field -- reaproveitado por ele)**:
- `speakFrench(text, btnEl, isAutoplay)`/`speakChinese(...)` (fr:231,
  zh:221) são a ÚNICA porta de TTS do app inteiro -- chamadas por
  QUALQUER tela (trilha, exercícios, flashcards) igualmente. Fluxo:
  `AUDIO_MANIFEST[text]` (lookup por TEXTO LITERAL, não por Field/id) →
  se existir, toca o mp3 pré-gerado (Google Cloud TTS neural,
  `fr-FR-Chirp3-HD-Achernar`/`cmn-CN-Chirp3-HD-Achernar`, rate 0.9/0.85)
  via `playPregeneratedAudio`; senão, cai pro Web Speech API do
  navegador (`SpeechSynthesisUtterance`, `lang:'fr-FR'`/`'zh-CN'`, com
  retry de 800ms se `onstart` nunca disparar).
- **`AUDIO_MANIFEST` (`fr/audio-manifest.js`/`zh/audio-manifest.js`,
  764/428 linhas) é um mapa texto→arquivo.mp3, gerado por um pipeline
  OFFLINE** (`fr/scripts/regenerate_broken_audio.py`, que reaproveita
  `challenges_pipeline/tts.py` -- mesma voz, validação por
  Speech-to-Text + pico de amplitude via `miniaudio`) -- não é
  executado em runtime, não conhece Field/Note/CardInstance, só cobre
  vocabulário/frases da TRILHA que já existiam quando o pipeline rodou.
  **Achado importante**: como o manifest só tem texto de trilha, o texto
  de um Field autorado por professora/aluna (front/back/prompt digitado
  no editor) quase nunca bate uma chave do manifest -- na prática, o
  botão 🔊 de um flashcard SEMPRE cai pro Web Speech API ao vivo, nunca
  reaproveita a voz neural pré-gerada que a trilha usa. Isso não é um
  bug (o app já funciona assim, silenciosamente, desde a Fase 4a/6C) --
  é uma característica arquitetural que qualquer decisão futura de "TTS
  pra Field" precisa levar em conta: gerar/cachear um mp3 por Field
  seria uma peça NOVA, não uma extensão do manifest existente (que é
  estático, versionado no repositório, gerado por script Python
  offline, nunca por upload/geração em runtime).
- **`fieldHasAudio()` e `isStudyLanguageField()` são dois eixos
  DIFERENTES, confundíveis**: `isStudyLanguageField(field, appKey)` (o
  que os renderers realmente usam) decide só "o motor de pronúncia PODE
  tentar este Field" (idioma bate) -- nunca olha `field.audio`. Isso
  significa que a Seção 4 do prompt-mestre ("áudio não é automático por
  idioma") já é tecnicamente verdadeira para o conceito `Field.audio`
  (upload/TTS explícito) -- mas o botão 🔊 de pronúncia AUTOMÁTICA
  continua 100% automático por idioma, sempre existiu assim
  (pré-existente ao modelo Field, herdado da trilha) e roda em paralelo,
  nunca controlado por `field.audio`. São dois mecanismos ortogonais
  hoje: (1) pronúncia automática por idioma (🔊, sempre ligada quando
  `lang` bate, independe de `field.audio`); (2) áudio customizado (🎧,
  só existe quando `field.audio.url` está setado). Qualquer arquitetura
  futura de "escolha de fonte de áudio por Field" precisa decidir
  explicitamente se PASSA A CONTROLAR o mecanismo (1) também, ou se
  mantém os dois paralelos como hoje -- não é uma decisão que já está
  tomada em código, é uma pergunta em aberto criada por este achado.
- **`/` no texto lido por TTS -- bug já apontado, confirmado por
  leitura, não corrigido**: `acceptedForms(expected)`
  (`fr/app.js:7728`) usa `/` como separador de múltiplas formas aceitas
  (`"un/une".split('/')`) -- convenção usada em vários pontos do app
  pra exercícios digitados. `audioBtnHTML(text)`/`speakFrench(text)`
  (assim como o lookup `AUDIO_MANIFEST[text]`) usam o texto do Field
  CRU, sem nenhuma normalização/remoção de `/` antes de tentar falar ou
  procurar no manifest -- se um Field (trilha ou flashcard) tiver `/`
  no meio do texto, ele é lido literalmente pela Web Speech API (que
  varia por navegador -- alguns leem "barra", outros pulam) e nunca bate
  uma chave do manifest (que é sempre a forma "limpa"). Confirmado como
  problema estrutural real (a função de TTS nunca normaliza `/`, ponto),
  não confirmado com um exemplo ao vivo específico de qual Field hoje
  dispara isso -- não fui atrás disso porque corrigir/investigar mais
  fundo estaria fora do escopo desta fase (auditoria, não correção).

**Áudio próprio / upload (`shared/teacher-flashcards.js:223`,
`shared/own-flashcards.js:116`)**:
- `uploadFlashcardMedia(file, kind)`/`uploadOwnFlashcardMedia(file,
  kind)` -- único mecanismo de upload que existe hoje, pro bucket
  Supabase Storage `flashcard-media` (migration 032, leitura pública,
  escrita restrita à pasta `auth.uid()` de quem envia). Path:
  `{userId}/{kind}-{timestamp}-{random}.{ext}` (professora) ou
  `{userId}/self-{kind}-{timestamp}-{random}.{ext}` (aluna, mesmo
  bucket, só prefixo `self-` diferente). Devolve URL pública já pronta;
  nunca grava no banco sozinha (quem chama decide onde a URL vai).
  `kind` é só `'image'`/`'audio'` -- usado apenas pra nomear o path, sem
  nenhuma validação de tipo/tamanho de arquivo no cliente (confia 100%
  no limite que o próprio bucket aplica, mesmo critério já documentado
  desde a Fase 8a).
- **Nenhuma infraestrutura de GRAVAÇÃO existe** -- confirmado por grep
  no repositório inteiro: zero ocorrência de `MediaRecorder`,
  `getUserMedia`, `navigator.mediaDevices`. Hoje "áudio customizado" é
  estritamente "arquivo já gravado em outro lugar, enviado via
  `<input type="file">`" -- nunca gravado direto no navegador.
- **A editora nativa de Field (`shared/flashcard-field-editor.js`, Fase
  6D.3) só MOSTRA que um Field já tem áudio/imagem** (indicador
  textual, "🎧 tem áudio vinculado"/"🖼️ tem imagem vinculada", linha
  84-85) -- **não existe NENHUM controle nela pra ANEXAR áudio/imagem
  novos a um Field**. A única forma hoje de um Field ganhar
  `field.audio`/`field.image` é (a) via conversão Legacy→Native (Fase
  6D.8, `attachLegacyMediaToFields`, heurística por idioma) ou (b) via
  teste/construção manual do `editorState`. O upload real (arquivo
  `<input>` + `uploadFlashcardMedia`) só existe hoje no formulário
  LEGADO (`shared/admin-flashcards.js`/`shared/my-flashcards.js`,
  campos "Imagem"/"Áudio próprio" fora do editor nativo) -- grava
  `image_url`/`audio_url` na LINHA (não num Field), e só entra no
  modelo nativo se/quando essa linha for convertida.

**Speed Review / Combinar / export Anki (confirmado, não presumido, por
leitura direta -- nenhum dos 3 tem qualquer relação com áudio hoje)**:
- **Speed Review** (`buildSpeedQueue`/`buildSpeedOptions`/
  `renderSpeedReviewCard`, fr:5177-5886) -- usa só `cardPromptText`/
  `cardAnswerText` (strings puras, Fase 4c). Nenhum `audioBtnHTML`,
  nenhum `speakFrench`, nenhum `customAudioBtnHTML` em nenhum ponto do
  fluxo -- confirmado lendo o render completo (linha 5864-5876): é
  texto puro dos dois lados, sem áudio de espécie nenhuma, pra QUALQUER
  Card Type (inclusive os que teriam áudio anexado, se existisse).
- **Combinar** (`startMatchGame`/`renderMatchTiles`, fr:5593-5650) --
  mesmo padrão: `MATCH_STATE.tiles` guarda só `{cardId, side, text}`,
  renderizado como texto puro no tile. Zero áudio.
- **Export Anki** (`shared/anki-export.js` + `ANKI_EXPORT_CONFIG`,
  fr:7488-7526) -- `noteFields(card)` devolve só `[cardPromptText(card),
  cardAnswerText(card)]` (2 strings). O empacotador do `.apkg`
  (`shared/anki-export.js:157`) escreve `zip.file("media",
  JSON.stringify({}))` -- **manifesto de mídia SEMPRE vazio,
  incondicionalmente** -- confirmado por leitura direta do código de
  empacotamento, não inferido: nenhum áudio de nenhum Field, de nenhum
  Card Type, jamais é incluído no `.apkg` exportado hoje, mesmo que o
  cartão tenha `field.audio`/`image_url` reais.

**Trilha (Study Trail, pré-nativo)**: vocabulário/frases da trilha
(`v.f`/`v.c`, `ex.f`/`ex.c`, etc., de `content.js`) usam `audioBtnHTML`+
`speakFrench`/`speakChinese` diretamente sobre o texto do item --
NUNCA passam por `Field`/`Note`/`resolveCardField` (a trilha é 100%
fora do modelo Note/Field, sempre foi -- confirmado pela ausência total
de `card.cardInstance` nesses call sites, e pelo padrão já documentado
desde a Fase 4/6 de que só `teacher_flashcards`/`own_flashcards` passam
pelo motor). Não há (nem precisa haver, hoje) nenhum adaptador
Trilha→Field -- os dois sistemas de áudio (`AUDIO_MANIFEST`+`speakX`)
são compartilhados só na CAMADA DE TTS/BOTÃO (funções `audioBtnHTML`/
`speakFrench`/`speakChinese`, que qualquer tela pode chamar sobre
qualquer string), nunca na camada de MODELO DE DADO.

### B) Problemas comprovados por código (não hipóteses)

1. **Vazamento de resposta via áudio customizado em Normal e Múltipla
   Escolha** -- o botão 🎧 de áudio próprio é calculado com fallback
   entre os dois lados (`front||back` / `prompt||correct`) e SEMPRE
   renderizado junto do conteúdo já visível, mesmo quando o áudio na
   verdade pertence ao lado ainda oculto/à resposta certa. Toca-lo antes
   de responder/revelar entrega a resposta pelo ouvido mesmo com o texto
   escondido. Afeta fr E zh igualmente (mesmo código, linhas espelhadas).
2. **Áudio de resposta (Type Answer) e de tradução (Cloze) nunca
   alcançável** -- `resolveTypeAnswerCardView`/`resolveClozeCardView`
   resolvem (ou poderiam resolver) áudio desses campos, mas o dado é
   descartado antes de chegar ao renderer -- mesmo que uma professora
   anexe áudio ao Field de resposta/tradução, ele nunca é reproduzido em
   lugar nenhum da Revisão hoje.
3. **Distratores de Múltipla Escolha nunca carregam áudio** -- mesmo que
   um Field `role:'distractor'` tenha `field.audio`, a geração do
   CardInstance (`interpretNativeNoteFromRow`) já extrai só o texto
   (`distractorTexts`), descartando a estrutura Field inteira antes do
   resolver sequer rodar.
4. **`fieldHasAudio()` é código morto** desde que foi escrita (Fase 4a)
   -- nenhum renderer chama, `isStudyLanguageField()` faz o trabalho
   real. Não é um bug funcional (o comportamento atual está correto),
   mas é uma função pronta e testada sem nenhum consumidor, candidata a
   reaproveitamento ou remoção quando a arquitetura de áudio for
   revisitada de verdade.
5. **Imagem nunca é resolvida por Field, apesar do schema já suportar**
   -- `field.image` é persistido (Fase 6B) e mostrado como indicador no
   editor (Fase 6D.3), mas `resolveCardField()` nunca o inclui na
   projeção -- toda imagem exibida hoje vem de `note.image` (nível de
   Note, só populado pelo caminho LEGADO). Gap já documentado desde a
   Fase 6D, confirmado de novo aqui sem mudança de status.
6. **Editor nativo de Field não tem NENHUM controle de anexar
   áudio/imagem** -- só mostra que já existe (herdado de conversão
   legada ou teste). Upload real só existe no formulário legado, fora do
   modelo Note/Field.
7. **Preview vaza efeitos colaterais reais de áudio, mesmo isolado de
   grade/FSRS/persistência** -- achado NOVO desta auditoria, não
   documentado em nenhuma entrega anterior: `shared/flashcard-preview.js`
   nunca menciona `audio`/`image` (confirmado por grep, zero ocorrência)
   -- ele delega 100% aos 4 renderers reais, exatamente como pretendido
   (ver seção G). MAS os renderers chamam `speakFrench`/`speakChinese`
   DIRETO (nunca via `callbacks`) sempre que `promptSpeakable &&
   canSpeakFrench(...)` -- e `speakFrench`/`speakChinese` sempre chamam
   `registerAudioPlay()` (fr:114-119: incrementa `STATE.totalAudioPlays`/
   `STATE.daily.audioPlaysToday` e roda `checkAndCelebrateBadges()`) --
   INCLUSIVE quando quem está renderizando é o Preview do editor (Fase
   6D.7), não uma sessão de Revisão real. Ou seja: abrir um Preview de um
   cartão com Field falável incrementa estatísticas REAIS da conta e pode
   disparar celebração de badge de verdade -- um efeito colateral que
   escapou do isolamento cuidadoso que a Fase 6D.7 construiu pra
   grade/FSRS/persistência (via `callbacks.onAnswered` no-op), porque o
   autoplay de TTS nunca passa pelos callbacks -- é uma chamada direta
   dentro do próprio corpo do renderer. Não corrigido nesta auditoria
   (fora do escopo -- zero código funcional), registrado aqui como
   achado real de código, não hipótese.
8. **`AUDIO_MANIFEST` nunca cobre conteúdo de flashcard** -- consequência
   arquitetural (não bug): o botão de pronúncia automática de um
   flashcard sempre cai no Web Speech API ao vivo, nunca na voz neural
   pré-gerada que a trilha usa, porque o manifest é gerado offline só
   pra vocabulário de trilha.

### C) Modelo `Field.audio`/`Field.image` proposto (não implementado)

Comparação das alternativas de shape pra `Field.audio`, com o shape ATUAL
(`{url, source}`, source ∈ `'upload'|'tts'` já usado desde a Fase 6B/8a)
como ponto de partida -- ele já cobre boa parte do necessário, a proposta
é uma extensão, não uma reescrita:

```js
// Proposto -- extensão aditiva do shape já existente, compatível com
// toda linha já gravada (audio:{url,source:'upload'} continua válido
// sem nenhuma migração de dado):
Field.audio = null
  | { source: 'upload', url, uploadedAt, mimeType? }   // já existe hoje
  | { source: 'tts', voiceId?, generatedUrl?, generatedAt?, textHash? }
```

- **`source` continua sendo o discriminador único** -- nunca dois campos
  booleanos (`hasUpload`/`hasTts`) que poderiam ambos ser `true` ao
  mesmo tempo de forma inconsistente. `null` = "sem áudio", estado
  válido e comum (a maioria dos Fields hoje).
- **`url` (upload) é sempre a fonte de verdade quando `source==='upload'`**
  -- comportamento já correto hoje (`resolveCardField` já lê `.url`
  defensivamente).
- **`source:'tts'` propositalmente NÃO tem `url` obrigatório hoje** (só
  `enabled`, conforme já documentado desde a Fase 6B) -- a proposta
  estende isso pra opcionalmente cachear um `generatedUrl` (ver seção D,
  "regenerar vs cachear"), mas nunca torna isso obrigatório: um Field
  `source:'tts'` sem `generatedUrl` continua significando "gere ao vivo,
  toda vez" (comportamento equivalente ao botão 🔊 de hoje, só que
  agora uma ESCOLHA EXPLÍCITA da professora por Field, não um automatismo
  por idioma).
- **`textHash`** (proposto, novo) -- hash do texto do Field no momento
  em que o áudio TTS foi gerado/cacheado; serve pra invalidação (ver D)
  -- se o texto do Field mudar e `textHash` não bater mais, a UI sabe
  mostrar "áudio desatualizado, regenere" em vez de tocar um áudio que
  já não corresponde ao texto atual.
- **Por que não um array de fontes** (`audio: [{...}, {...}]`, várias
  opções por Field) -- rejeitado: nenhum requisito levantado pede mais
  de UMA fonte de áudio ativa por Field ao mesmo tempo; um array
  introduziria a pergunta "qual toca?" sem nenhum benefício aparente.
  Se um dia a professora quiser TROCAR de upload pra TTS, é uma
  substituição (`field.audio = {novo}`), nunca uma adição.
- **`Field.image` proposto**: mesmo princípio, shape já existente
  (`{url}`) é suficiente pro que já foi pedido -- nenhuma extensão
  necessária além de FAZER `resolveCardField()` finalmente resolvê-lo
  (ver K, subfase própria) -- não foi levantado nenhum requisito de
  "imagem gerada"/fonte alternativa de imagem que justifique um
  `source` como o de áudio.

### D) Arquitetura de TTS recomendada (não implementada)

- **Entrada**: sempre `Field.content.value` (o texto do próprio Field) --
  nunca uma string derivada/recalculada (ex: nunca a frase Cloze inteira
  com marcação, que precisa passar por `renderClozeText` antes).
- **Idioma**: sempre `Field.lang` (já é a fonte de verdade, nunca
  recalculado a partir de posição/direção/Card Type -- decisão já
  travada, esta arquitetura não reabre isso).
- **Voz**: hoje é implícita (1 voz fixa por idioma, `TTS.voice`
  carregada uma vez). Proposta: manter 1 voz PADRÃO por idioma
  configurável globalmente (não por Field) pro Web Speech API, já que
  não há evidência de necessidade real de escolher voz por Field -- se
  isso mudar, é decisão pra quando um requisito concreto aparecer, não
  antecipada aqui.
- **Onde gerar**: comparação de 3 caminhos --
  1. **Cliente, ao vivo, sempre** (comportamento atual do botão 🔊) --
     zero infraestrutura nova, zero custo de armazenamento, mas
     qualidade inconsistente entre navegadores/SOs e nunca cacheável
     (gera de novo a cada play).
  2. **Servidor, sob demanda, com cache** (mesmo padrão que o pipeline
     offline já usa pra trilha, só que em runtime) -- qualidade
     consistente (voz neural), mas precisa de uma Edge Function nova
     (chave de API do provedor de TTS, ex: Google Cloud TTS, como
     `RESEND_API_KEY` foi feito pra e-mail) + Storage pra guardar o
     resultado.
  3. **Offline/build-time, como o pipeline de trilha já faz** --
     inviável pra conteúdo autorado por professora/aluna em tempo real
     (o pipeline atual roda manualmente, por script Python, contra
     vocabulário fixo do currículo -- não é acionável a partir do
     editor web).
  **Recomendação**: caminho 2 (servidor, sob demanda, com cache) é o
  único que entrega qualidade consistente pra conteúdo dinâmico -- mas
  é uma peça de infraestrutura NOVA (mesma disciplina de "não presumir
  infraestrutura ativa" do topo deste arquivo: hoje NENHUMA API de TTS
  server-side está configurada, só o pipeline offline Python que já
  existe pra trilha). Caminho 1 (client-side ao vivo) continua sendo o
  fallback natural quando o áudio cacheado não existir/falhar --
  mesma relação que já existe hoje entre manifest e Web Speech.
- **Persistência do áudio gerado**: se o caminho 2 for adotado, o
  resultado vira um upload comum pro bucket `flashcard-media` (mesma
  infraestrutura de Storage já existente, `source:'tts'` com
  `generatedUrl` apontando pra lá) -- nunca um mecanismo de Storage
  paralelo.
- **Comportamento ao editar o texto**: 3 opções comparadas --
  (a) manter o áudio velho tocando um texto desatualizado (silencioso,
  arriscado -- o áudio mentiria sobre o texto atual);
  (b) apagar o áudio automaticamente a cada edição de texto (seguro, mas
  destrutivo -- reforça regeneração toda vez, custo de API a cada
  pequena correção de digitação);
  (c) **marcar como desatualizado (via `textHash` descasado) sem apagar,
  deixando a professora decidir regenerar ou manter** -- recomendado:
  não perde o áudio silenciosamente, não força custo de regeneração
  numa correção de typo, e a UI já tem precedente de "avisar sem
  bloquear" (mesmo espírito do toast de imagem-não-migra da Fase 6D.8).
- **Cache**: por Field (não por texto global) -- 2 Fields diferentes com
  o mesmo texto poderiam, em teoria, gerar 2 áudios idênticos
  redundantes; isso é aceitável (evita uma tabela de cache-por-texto
  nova, complexidade desproporcional ao problema) mas vale registrar
  como custo de Storage conhecido, não escondido.

### E) Arquitetura de upload/gravação recomendada (não implementada)

- **Upload de arquivo**: já existe e funciona (`uploadFlashcardMedia`/
  `uploadOwnFlashcardMedia`, bucket `flashcard-media`) -- a única peça
  que falta é CONECTAR isso ao editor nativo de Field (hoje só existe no
  formulário legado). Nenhuma mudança de backend necessária pra isso.
- **Gravação direta no navegador (MediaRecorder)**: não existe hoje,
  proposta como arquitetura futura, não implementada -- fluxo:
  `getUserMedia({audio:true})` → `MediaRecorder` → `Blob` → mesmo
  `uploadFlashcardMedia`/`uploadOwnFlashcardMedia` já existente (o
  upload não precisa saber se o arquivo veio de um `<input
  type="file">` ou de uma gravação -- é só um `File`/`Blob` no fim das
  contas). Recomendação: tratar como MELHORIA DE UX sobre a
  infraestrutura de upload já existente, nunca um caminho de
  persistência paralelo.
- **Segurança/performance (avaliação, não implementação)**: bucket
  público-leitura já é adequado pra áudio de flashcard (mesmo modelo já
  aprovado pra avatares/mídia de material de apoio); sem limite de
  tamanho de arquivo hoje (mesma lacuna já registrada desde a Fase 8a) --
  recomendação: um limite explícito (ex: alguns MB) validado no cliente
  ANTES do upload evitaria gasto de Storage/banda com arquivos grandes
  por engano, sem exigir mudança de RLS/bucket. CORS não é uma
  preocupação nova (bucket já público, mesma configuração de
  `avatars`/`report-screenshots`). Autoplay (🔊 automático) já existe e
  já é tratado com fallback silencioso (`showToast` quando o navegador
  bloqueia) -- nenhuma mudança necessária aí.

### F) Como a Revisão deveria resolver áudio (recomendação futura)

O princípio já correto hoje (CardInstance decide QUAL Field é mostrado;
`resolveCardField` decide O QUE existe naquele Field) deve se manter --
a correção recomendada é só de EXTENSÃO, nunca de arquitetura nova:

1. `resolveCardField()` passa a resolver `imageUrl` também (fecha o
   achado #5 da seção B) -- mudança pequena, mas precisa revalidar os 4
   renderers (que hoje leem `card.imageUrl` de nível de card, não de
   Field) e decidir explicitamente se um Card Type mostra imagem de UM
   lado só ou dos dois -- pergunta em aberto, não decidida aqui.
2. `resolveTypeAnswerCardView`/`resolveClozeCardView` passam a devolver
   o objeto `answer`/`translation` resolvido inteiro (não só o texto),
   pro renderer decidir se/quando mostrar o áudio dele -- fecha o
   achado #2.
3. **O botão de áudio customizado nunca deve ser calculado por
   fallback entre dois lados quando só um está visível** -- fecha o
   achado #1: o renderer deve escolher o áudio do lado ATUALMENTE
   VISÍVEL, nunca "qualquer um dos dois que tiver". Pra Normal, isso
   significa: enquanto `!localState.revealed`, só `view.front.audioUrl`
   pode aparecer; depois de revelado, os dois (front OU back conforme o
   lado). Pra Múltipla Escolha, só `view.prompt.audioUrl` antes de
   responder -- nunca `view.correct.audioUrl` antecipado.
4. Múltipla escolha precisa de uma decisão de produto explícita antes de
   qualquer código: distratores ganham áudio individual (exigiria
   `resolveMultipleChoiceCardView` devolver Fields resolvidos pros
   distratores, não strings) ou continuam intencionalmente sem -- não
   decidido aqui, só a lacuna registrada.
5. Nenhuma mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS --
   mesma conclusão de toda fase anterior desta feature, áudio é só
   apresentação.

### G) Como o Preview deveria reusar a Revisão (confirmado + 1 gap)

**Confirmado, positivo**: `shared/flashcard-preview.js` já cumpre a
exigência da Fase 6C ("Preview e Review usam o MESMO renderer") de
forma estrita -- zero menção a `audio`/`image` no arquivo inteiro (grep
confirma), porque ele delega 100% aos 4 renderers reais via o mesmo
contrato `(mountEl, card, localState, callbacks)`. Não existe
`previewAudio`/lógica paralela alguma -- o comportamento de áudio do
Preview É, estruturalmente, o mesmo da Revisão, por construção.

**Gap real (achado #7 da seção B), recomendação**: como o autoplay de
TTS acontece dentro do PRÓPRIO CORPO do renderer (chamada direta a
`speakFrench`/`speakChinese`, nunca via `callbacks`), ele roda também no
Preview -- inclusive `registerAudioPlay()` (contagem real + checagem de
badge). Recomendação pra quando isso for corrigido: os 4 renderers
precisam de um jeito de saber "não sou uma sessão real" (mesmo padrão já
usado por `card.__isPreviewCard` pra pular a barra de progresso,
Fase 6D.7) e, nesse caso, pular a chamada de autoplay (ou chamar uma
função equivalente que TOCA o áudio sem incrementar contadores/checar
badges) -- nunca duplicar `speakFrench`/`speakChinese` em duas versões.
Registrado aqui como gap concreto pra fase de implementação futura, não
corrigido nesta auditoria.

### H) Compatibilidade legada (confirmado, sem mudança recomendada)

O caminho já construído (Fase 6D.8, `attachLegacyMediaToFields`) --
vincular `audio_url`/`image_url` (nível de linha) ao Field cujo idioma é
o estudado, via a mesma heurística `isStudyLanguageField()` que o
adapter legado (`interpretNoteFromRow`) já usa pra interpretação em
tempo real -- continua sendo a abordagem certa: nunca inventar um valor,
nunca perder o dado histórico, sempre reversível (o toast de aviso sobre
imagem já comunica a limitação conhecida). Nenhuma mudança recomendada
aqui além do que já existe -- a única pendência é a mesma do resto do
relatório (imagem por Field não é lida em nenhum render ainda), não algo
específico da conversão legada em si.

### I) Lacunas no export Anki (confirmado, recomendação futura)

Áudio nunca é exportado hoje (achado #3 acima, `zip.file("media",
JSON.stringify({}))` sempre vazio). Recomendação, quando essa fase for
priorizada: (1) baixar cada `field.audio.url`/áudio TTS cacheado
referenciado pelos cartões selecionados (fetch + blob, já que são URLs
públicas do bucket `flashcard-media`), (2) nomear os arquivos de forma
estável dentro do `.apkg` (ex: hash da URL, evita colisão entre cartões
diferentes), (3) referenciar via `[sound:nome.mp3]` no campo certo do
`noteFields()`, (4) decidir explicitamente se "Normal com reverso"
duplica o arquivo de áudio nas 2 notas exportadas (Anki permite
reaproveitar o mesmo arquivo de mídia entre notas -- recomendação:
reaproveitar, nunca duplicar o download) e (5) Cloze -- como Cloze não é
exportado hoje (`hasPlainFrontBack` já exclui, ver Fase 4c) e não há
requisito novo pra mudar isso, esta lacuna fica registrada mas fora do
escopo imediato de qualquer correção de áudio.

### J) Migração de áudio/imagem legado daqui pra frente

Sem mudança de recomendação em relação ao que a Fase 6D.8 já implementou
-- a única extensão natural é: quando o editor nativo ganhar controles
reais de anexar áudio/imagem por Field (peça ainda não construída, ver
K), o mesmo botão "🧪 Usar o novo editor" (conversão explícita, nunca
automática) continua sendo o único gatilho -- nenhuma migração em massa
proposta nesta auditoria, consistente com a regra geral do projeto.

### K) Decomposição concreta em subfases futuras (não implementadas)

1. **7a -- `resolveCardField()` resolve imagem por Field** (fecha achado
   #5) + decisão de produto sobre "imagem em qual lado" por Card Type.
   Toca só `shared/flashcard-model.js` + os 4 renderers (consumo).
2. **7b -- Corrigir o vazamento de áudio customizado em Normal/MC**
   (fecha achado #1) -- escolher áudio do lado VISÍVEL, nunca fallback
   cego entre lados. Só renderers, sem mudança de schema/motor.
3. **7c -- Expor áudio de resposta (Type Answer) e tradução (Cloze)**
   (fecha achado #2) -- `resolveTypeAnswerCardView`/`resolveClozeCardView`
   devolvem o Field resolvido inteiro, renderer decide quando mostrar.
4. **7d -- Corrigir vazamento de autoplay no Preview** (fecha achado #7)
   -- introduzir um jeito explícito de suprimir/redirecionar o autoplay
   quando `card.__isPreviewCard`, sem duplicar `speakFrench`/`speakChinese`.
5. **7e -- Editor nativo de Field ganha upload real** (áudio/imagem) --
   conecta `uploadFlashcardMedia`/`uploadOwnFlashcardMedia` (já
   existentes) a um controle de verdade dentro de
   `shared/flashcard-field-editor.js`, substituindo o indicador
   read-only atual. Pré-requisito de UX pra qualquer coisa de TTS
   explícito por Field fazer sentido.
6. **7f -- TTS explícito por Field** (arquitetura da seção D) -- exige
   infraestrutura nova (Edge Function + chave de API de TTS,
   nunca presumida como já ativa) + extensão do shape `Field.audio`
   (seção C) + UI de "gerar/regenerar áudio" no editor (depende de 7e).
   Maior das subfases, deliberadamente por último.
7. **7g -- Gravação direta (MediaRecorder)** -- melhoria de UX sobre a
   infraestrutura de upload de 7e, não um requisito bloqueante de
   nenhuma das anteriores.
8. **7h -- Áudio em distratores de Múltipla Escolha** -- só depois de
   uma decisão de produto explícita (achado #4/seção F item 4) sobre se
   isso é sequer desejado.
9. **7i -- Export Anki com áudio** (seção I) -- independente das
   anteriores, pode ser feita a qualquer momento depois que o shape de
   áudio estiver estável (não precisa esperar 7f/7g).

Cada subfase segue o mesmo padrão de autorização explícita já usado em
toda a Fase 6D -- nenhuma foi iniciada nesta entrega.

### Checklist de entrega desta auditoria

Arquivos lidos (nenhum alterado): `shared/flashcard-model.js`,
`fr/app.js`/`zh/app.js` (renderers, TTS, Speed Review, Combinar, export
Anki), `fr/audio-manifest.js`/`zh/audio-manifest.js`,
`fr/scripts/regenerate_broken_audio.py`, `shared/flashcard-preview.js`,
`shared/flashcard-field-editor.js`, `shared/teacher-flashcards.js`,
`shared/own-flashcards.js`, `shared/anki-export.js`,
`shared/supabase_migrations/032_add_flashcard_media_and_choices.sql`,
`shared/teacher-support-materials.js` (confirmado irrelevante -- upload
genérico sem relação com Field). `git status`/`git diff` confirmados
vazios (só este `CLAUDE.md` foi tocado nesta entrega inteira). Nenhum
teste novo escrito -- toda a auditoria foi por leitura direta de código
já em produção, sem necessidade de um teste de leitura pra confirmar
nada que a leitura já não confirmasse com citação de linha exata.

**NÃO implementada nenhuma subfase da Fase 7 nesta entrega** -- próxima
etapa só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

## Fase 7a -- Media Resolution por Field (Field como fonte real de mídia
no pipeline nativo, fecha os achados #1/#2/#3/#5/#7 da auditoria da Fase 7)

Primeira subfase de código da Fase 7 (auditoria em `dcb0528`), escopo
estrito: só resolução de áudio/imagem por Field no caminho nativo +
correção do vazamento de áudio customizado já identificado na auditoria.
**Nada de TTS explícito, gravação, upload novo, editor de áudio/imagem,
Preview novo, exportação Anki com mídia, redesign de Review, ou
infraestrutura server-side** -- todos ficam para subfases posteriores,
confirmados intocados por `git diff --stat` (só `shared/flashcard-
model.js`, `fr/app.js`, `zh/app.js`).

**Auditoria de novo antes de alterar** (pedido explícito da instrução --
"não assuma que o estado descrito na auditoria ainda é exatamente o
estado atual"): reli `shared/flashcard-model.js`, os 4 renderers em
fr/zh `app.js`, `shared/flashcard-field-editor.js`,
`shared/flashcard-native-persistence.js` e `shared/flashcard-preview.js`
de novo -- confirmado que nada mudou desde `dcb0528` (só documentação
naquela entrega) e que os achados da auditoria continuavam
byte-a-byte válidos.

### O que foi corrigido em `shared/flashcard-model.js`

- **`resolveCardField(note, fieldIndex)`** ganhou `imageUrl: (field.image
  && field.image.url) || null` -- exatamente o mesmo padrão defensivo já
  usado por `audioUrl`, nunca uma segunda função de "resolver imagem".
  Continua sendo o ÚNICO ponto de projeção Field->exibição -- nenhum
  segundo ponto de leitura de imagem foi criado em lugar nenhum do
  motor. `field.image` já era persistido desde a Fase 6B mas nunca
  chegava a lugar nenhum de exibição -- fecha o achado #5 da auditoria.
- **`resolveTypeAnswerCardView`** deixou de DESCARTAR o Field de resposta
  resolvido depois de extrair `displayAnswerText`/`pinyinText` dele --
  agora devolve `answer` (o Field inteiro, com seu próprio `audioUrl`/
  `imageUrl`) junto de `prompt`. Fecha o achado #2 da auditoria ("mídia
  da resposta nunca alcançável, mesmo que o Field a tivesse"). O
  renderer decide QUANDO mostrar (só depois de `answered`, nunca antes
  -- mostrar antes vazaria a resposta).
- **`resolveClozeCardView`** passou a resolver o Field de texto via
  `resolveCardField()` (antes lia `textField.audio.url` direto do Field
  cru, ignorando imagem por completo) -- mesmo ponto único de projeção
  que todo o resto do motor já usa. `imageUrl` do Field de texto agora
  sai no `view` (`view.imageUrl`), ao lado do `audioUrl` que já existia.
  Como TODAS as CardInstance (c1/c2/...) de uma mesma Note compartilham
  o MESMO `textFieldIndex`, elas naturalmente resolvem a MESMA origem de
  mídia -- **nenhum código especial foi necessário** pra garantir "nunca
  um áudio/imagem diferente por lacuna" (item H da instrução), é uma
  consequência estrutural do desenho já existente desde a Fase 5.
- **`resolveMultipleChoiceCardView`** e **`resolveNormalCardView`** não
  precisaram de NENHUMA mudança de código -- seus campos (`prompt`/
  `correct`/`front`/`back`) já eram Fields inteiros vindos de
  `resolveCardField()`, então ganharam `imageUrl` de graça assim que
  `resolveCardField()` foi estendido.
- **`CardInstance` não ganhou nenhuma propriedade nova** (restrição
  explícita da instrução) -- toda mídia resolvida vive nos objetos de
  VIEW devolvidos pelos resolvers, nunca no `cardInstance` armazenado em
  `STATE.cards`. Confirmado por teste dedicado (item K da instrução,
  suíte `test_fase7a_media_resolution.js`) que as chaves do
  `cardInstance` real nunca mudaram antes/depois de renderizar/interagir
  com um card.
- **Nada de `note.audio`/`note.image` novo** -- `note.image` continua
  existindo só no caminho LEGADO (`row.image_url`), nunca populado pelo
  caminho nativo (sempre `null`, confirmado de novo por leitura antes de
  mexer). Legado nunca ganha `field.image`/`field.audio` que não seja o
  já existente via a heurística de interpretação (`isStudyLanguageField`,
  Fase 3, intocada).

### O que foi corrigido nos 4 renderers (`fr/app.js`/`zh/app.js`,
mudanças espelhadas nos dois idiomas)

**Achado #1 da auditoria (vazamento de áudio/imagem customizados) --
corrigido em Normal e Múltipla Escolha:**

- **`renderNormalCard`** -- antes: `targetAudioUrl = view.front.audioUrl
  || view.back.audioUrl` (fallback cego entre os dois lados), sempre
  visível junto do front, mesmo antes de revelar. Se só o VERSO tivesse
  áudio/imagem próprio, o botão apareceria ANTES da revelação, entregando
  a resposta pelo ouvido/pela imagem com o texto ainda escondido --
  vazamento real, confirmado na auditoria. Corrigido: `frontAudioUrl`/
  `backAudioUrl`/`frontImageUrl`/`backImageUrl` resolvidos SEPARADAMENTE
  (`view.front.audioUrl`/`view.back.audioUrl` sem fallback nenhum entre
  os dois) -- cada lado só mostra sua PRÓPRIA mídia, e a mídia do verso
  só é desenhada dentro do bloco `${localState.revealed ? ... : ...}`,
  nunca antes. Testado explicitamente (browser smoke, cenário 2): áudio/
  imagem do verso NÃO aparecem antes de revelar, aparecem corretamente
  depois. Imagem LEGADA (`card.imageUrl`, Note-level) preservada
  exatamente como antes -- continua uma vez só, junto do front,
  `resolvedBackImageUrl` nunca inclui o fallback legado (evita duplicar
  a mesma imagem legada nos dois lados, o que seria uma REGRESSÃO
  visual, não um fix).
- **`renderMultipleChoiceCard`** -- antes: `customAudioUrl =
  view.prompt.audioUrl || (view.correct && view.correct.audioUrl) ||
  null`. Se o Field de RESPOSTA CERTA tivesse áudio/imagem próprio e o
  prompt não, o botão tocaria a pronúncia da resposta ANTES da aluna
  sequer ver as opções -- vazamento real, mais grave que o de Normal
  (aqui é literalmente a resposta do quiz). Corrigido: `customAudioUrl =
  view.prompt.audioUrl || null` (nunca mais fallback pro `correct`),
  `promptImageUrl = card.imageUrl || view.prompt.imageUrl || null`.
  `view.correct`/distratores continuam sem UI de mídia própria nesta
  subfase (nenhum slot de UI pra isso hoje, e distratores nem carregam
  Field -- ver achado #3 abaixo, decisão explícita de não antecipar).

**Achado #2 da auditoria (mídia da resposta nunca alcançável) --
corrigido em Digite a resposta:**

- **`renderTypeAnswerCard`** -- `view.answer` (agora exposto pelo
  resolver, ver acima) é usado só DEPOIS de `answered`:
  `answerAudioUrl = (answered && view.answer && view.answer.audioUrl) ||
  null` -- nunca antes (mostrar antes da revelação vazaria a resposta,
  mesmo princípio do achado #1). Testado explicitamente: áudio/imagem da
  resposta ausentes antes de verificar, presentes depois.

**Achado sem vazamento, só field-correctness -- Cloze:**

- **`renderClozeCard`** -- `clozeImageUrl = card.imageUrl || view.imageUrl
  || null` (era só `card.imageUrl`, sempre `null` pra cartão nativo --
  Cloze nativo NUNCA mostrava imagem antes desta fase, mesmo com
  `field.image` setado). Sem gate de revelação (correto -- é a frase
  inteira, lacuna incluída, que fica visível o tempo todo; mostrar
  sempre não vaza nada, confirmado na auditoria).

**Achado #7 da auditoria (Preview vazando `registerAudioPlay()` real) --
corrigido nos 4 renderers, os 2 idiomas:**

- Cada chamada de autoplay (`speakFrench(...)`/`speakChinese(...)`, nos
  4 renderers) ganhou o guard `!card.__isPreviewCard &&` antes da
  condição já existente. `speakFrench`/`speakChinese` sempre chamam
  `registerAudioPlay()` internamente (incrementa `STATE.totalAudioPlays`/
  `STATE.daily.audioPlaysToday` + roda `checkAndCelebrateBadges()`) --
  abrir um Preview do editor nunca deveria mexer em estatística real da
  conta, mas antes desta fase o autoplay disparava incondicionalmente
  mesmo dentro do Preview (achado NOVO da auditoria, nunca documentado
  antes). `card.__isPreviewCard` já existe desde a Fase 6D.7 (usado por
  `reviewProgressBarHTML`) -- reaproveitado aqui, mesmo padrão, nenhum
  mecanismo novo. Testado explicitamente (browser smoke, cenário 9):
  `STATE.totalAudioPlays` idêntico antes/depois de abrir um Preview com
  Field falável.
  **Escopo deliberadamente restrito** (instrução explícita: "se exigir
  mudança arquitetural maior, apenas documente"): só o AUTOPLAY foi
  suprimido -- clique MANUAL no botão 🔊 dentro do Preview continua
  chamando `speakFrench`/`speakChinese` normalmente (o `wireAudioButtons`
  que liga esse clique não é condicional) e continua incrementando
  `registerAudioPlay()` de verdade. Suprimir isso também exigiria alterar
  a arquitetura de TTS em si (uma "flag de contexto" threaded pelas
  próprias funções `speakFrench`/`speakChinese`/`registerAudioPlay`),
  explicitamente fora do escopo desta subfase ("NÃO ALTERAR A
  ARQUITETURA DE TTS NESTA SUBFASE") -- registrado aqui como gap
  conhecido e MENOR (clique manual é uma ação deliberada da professora
  testando o Preview, bem menos surpreendente que o autoplay automático
  que rodava em toda abertura de Preview sem nenhuma ação do usuário).

### O que ficou de propósito sem UI/mudança nesta subfase

- **Distratores de Múltipla Escolha continuam sem mídia própria**
  (achado #3 da auditoria) -- `resolveMultipleChoiceCardView` continua
  devolvendo `distractorTexts` como array de strings puras
  (`interpretNativeNoteFromRow` já descarta a estrutura Field dos
  distratores antes do resolver sequer rodar) -- confirmado por teste
  dedicado (item F3) que isso não mudou. Estender isso exigiria decisão
  de produto explícita (a UI hoje só tem 1 slot de áudio, junto do
  prompt) -- fora do escopo desta subfase.
- **`fieldHasAudio()` continua código morto** -- não foi removido nem
  chamado por nenhum renderer (os 4 continuam usando
  `isStudyLanguageField()` pra decidir elegibilidade de TTS automático,
  exatamente como antes) -- mudar isso seria mexer na arquitetura de TTS,
  fora do escopo.
- **Nenhuma coluna/migration nova** -- o schema (`Field.audio`/
  `Field.image`) já existia desde a Fase 6B, esta subfase só fez o
  pipeline de LEITURA finalmente usá-lo por completo.
- **Legacy (`image_url`/`audio_url`) 100% preservado** -- nenhuma
  migração automática, nenhuma alteração de dado, nenhuma mudança na
  heurística de interpretação (`isStudyLanguageField`) já existente
  desde a Fase 3. Confirmado por teste dedicado (item I) que o
  comportamento é byte-a-byte idêntico a antes.
- **Preview não foi redesenhado** -- continua delegando 100% aos 4
  renderers reais (nenhuma mudança em `shared/flashcard-preview.js`
  nesta subfase); a correção de mídia se propaga pra lá de graça, porque
  Preview nunca duplicou lógica de renderer -- só o guard de autoplay
  (que vive DENTRO dos renderers, não no Preview) precisou saber de
  `card.__isPreviewCard`.

### Testes realizados

- **`node --check`** sem erro em `shared/flashcard-model.js`,
  `fr/app.js`, `zh/app.js`.
- **Suítes Node/VM pré-existentes, re-executadas sem regressão** (com 2
  expectativas atualizadas em `test_fase4_engine.js` pra refletir o
  shape aditivo -- `imageUrl` em `resolveCardField`/`resolveNormalCardView`/
  `resolveMultipleChoiceCardView`/`resolveTypeAnswerCardView`/
  `resolveClozeCardView`, e `answer` em `resolveTypeAnswerCardView` --
  nunca uma mudança de comportamento, só de shape mais completo):
  `test_fase4_engine.js` 34/34 (32+2 novos), `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74.
- **Suíte Node/VM nova `test_fase7a_media_resolution.js`, 45/45** --
  cobre os 11 itens A-K pedidos explicitamente: (A) imagem nativa
  resolvida no Field certo, nunca herdada por um Field vizinho; (B)
  áudio explícito idem; (C) Field sem áudio nunca inventa um; (D) Normal
  -- front/back resolvem mídia dos respectivos Fields, nunca cruzados;
  (E) Normal Reverse -- as 2 CardInstances resolvem cada uma seu próprio
  Field (mesma Note, índices trocados), FSRS confirmadamente
  independente, direção nunca inferida por mídia; (F) Múltipla Escolha
  -- prompt nunca herda áudio do `correct` (a estrutura de dado nunca
  mistura os dois, mesmo antes da UI decidir o que mostrar);
  distractorTexts confirmados strings puras (sem Field); (G) Digite a
  resposta -- `answer` (Field resolvido inteiro) sobrevive no retorno,
  nunca vazado pro `prompt`; (H) Cloze multi-marca -- c1/c2 resolvem a
  MESMA origem de áudio/imagem (via `buildEngineCardsFromRow`/
  `resolveCardContentView` reais, não simulado); (I) Legacy --
  `image_url`/`audio_url` continuam funcionando via a mesma heurística de
  sempre, Fields legados nunca ganham `imageUrl` próprio; (J) presença de
  `fields` continua sendo o discriminador Native/Legacy (`note.image`
  sempre `null` no nativo, sempre populável no legado -- e vice-versa
  pra `field.image`); (K) regressão de shape -- `resolveCardField()`
  continua devolvendo text/lang/pinyinText/audioUrl inalterados, só
  ADICIONANDO `imageUrl` (5 chaves no total, nenhuma removida).
- **Browser smoke novo `test_fase7a_browser_smoke.js`, Playwright,
  Chromium real, FR+ZH, 37 checks por idioma, todos `true`** -- cobrindo
  a Seção 11 da instrução com interação REAL de DOM (clique/reveal, não
  simulado): (1) Normal com Field audio+image só no front -- visível
  desde o início, `src` correto; (2) Normal com Field audio+image só no
  back -- **confirmado ausente antes de revelar, presente e com `src`
  correto depois** (prova direta do fix do achado #1); (3) Normal sem
  áudio nenhum -- nenhum botão de áudio customizado inventado, mesmo
  depois de revelar; (4) Normal Reverse -- 2 CardInstances com ids
  distintos, 1ª metade mostra o áudio do seu próprio Field desde o
  início, 2ª metade NÃO mostra áudio antes de revelar e mostra depois
  (o Field que tem áudio virou o "verso" da 2ª metade); (5) Múltipla
  Escolha -- **confirmado que o áudio da RESPOSTA CERTA nunca aparece
  junto do prompt** (prova direta do fix do achado #1/mais grave); (6)
  Digite a resposta -- áudio/imagem da resposta ausentes antes de
  verificar, presentes e com `src` correto depois (prova do fix do
  achado #2); (7) Cloze com 2 marcas -- confirmado que c1 e c2 resolvem
  o MESMO `audioUrl`/`src` de imagem (prova de que a estrutura já
  garante isso sem código especial); (8) Legacy com `image_url`/
  `audio_url` -- continua funcionando exatamente como antes, imagem
  nunca duplicada ao revelar; (9) Preview -- mostra a MESMA
  imagem/áudio que o Review mostraria (mesmo pipeline), **`STATE.
  totalAudioPlays` confirmado INALTERADO** antes/depois de abrir (prova
  do fix do achado #7), `card.__isPreviewCard` confirmado `true` só
  dentro da sessão de Preview, `STATE.cards` confirmado bit-a-bit
  idêntico depois de fechar o Preview (nenhum CardInstance real
  mutado/persistido); (10) regressão -- Review real continua graduando
  de verdade (`reps`/`due` mudam) depois de tudo isso. **Zero
  `pageerror`** em qualquer um dos 2 idiomas (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, documentados em toda a sessão, não relacionados a este
  código).
- **Suítes de regressão de fases anteriores (Fase 6C.1/6C.2/6C.3, Fase
  6D.7), re-executadas via Playwright contra o código já modificado
  desta subfase, sem nenhuma regressão** (todas confirmam `true` em
  todos os checks, apontando pra `renderNormalCard`/`renderMultipleChoiceCard`/
  `renderTypeAnswerCard`/`renderClozeCard`/Preview continuando a
  funcionar exatamente como documentado nas fases que os criaram, agora
  com a resolução de mídia corrigida por baixo).

### O que fica pra próximas subfases da Fase 7 (não implementado, de
propósito)

TTS explícito por Field (7f na decomposição da auditoria); upload/
gravação conectados ao editor nativo (7e); áudio em distratores de MC
(7h, depende de decisão de produto); export Anki com mídia (7i); guard
de `registerAudioPlay()` também pro clique MANUAL dentro do Preview
(gap menor registrado acima, exigiria mudança na arquitetura de TTS).

Nenhum passo manual pendente pra autora nesta entrega -- 100%
client-side, nenhuma migração/mudança de schema.

Próxima subfase (a definir pela autora, seguindo a decomposição já
proposta na auditoria) só começa depois de autorização explícita, com
este relatório já entregue antes de pedir luz verde.

## Fase 7b -- contrato nativo de `Field.audio` (formalização do modelo,
sem TTS/upload/gravação de verdade)

Segunda subfase de código da Fase 7 (áudio/mídia por Field), autorizada
com escopo explícito e estrito: formalizar um contrato ROBUSTO e
EXTENSÍVEL pra `Field.audio` -- a base de dados que as fases futuras (TTS
real, upload conectado ao editor, gravação) vão consumir --, propagado
corretamente por todo o pipeline já existente (editor state, persistência
nativa, `resolveCardField()`, os 4 renderers), sem implementar nenhuma
infraestrutura de geração/upload/gravação de verdade nesta entrega.

**Reauditoria antes de codar** (pedido explícito -- "não assuma o shape
apenas com base na documentação anterior"): reli `shared/flashcard-
model.js`, `shared/flashcard-editor-state.js`, `shared/flashcard-native-
persistence.js`, `shared/flashcard-field-editor.js`, `shared/flashcard-
preview.js`, e os trechos de `fr/app.js`/`zh/app.js` que resolvem áudio
nos 4 renderers -- confirmando, por leitura direta (não presumido):
`field.audio` hoje é `null | {url, source:'upload'} | {source:'tts',
enabled:true}`, passado através sem transformação por
`buildNativeRuntimeFields()`; **`.source` e `.enabled` são propriedades
write-only** -- confirmado por grep no repositório inteiro que nenhum
código em produção jamais LÊ nenhuma das duas, só `.url` é lido (por
`resolveCardField()`, via `(field.audio && field.audio.url) || null`).
Os 4 renderers (`renderNormalCard`/`renderMultipleChoiceCard`/
`renderTypeAnswerCard`/`renderClozeCard`, fr/zh `app.js`) consomem
SÓ o `audioUrl` já resolvido pela `view` que os resolvers devolvem --
nenhum deles lê `field.audio`/`card.audio` diretamente -- confirmado por
grep (`field\.audio`/`\.audio\.url`) achando zero ocorrência fora de
comentários. Essa confirmação foi o que permitiu concluir, sem
adivinhar, que a reformulação do contrato de `Field.audio` não exige
NENHUMA mudança nos 4 renderers.

**O contrato canônico, travado nesta subfase (`shared/flashcard-
model.js`, `FIELD_AUDIO_TYPES`/`isValidFieldAudio`/`resolveFieldAudioUrl`,
logo antes de `FLASHCARD_MODEL_FSRS_DEFAULTS`):**

```js
Field.audio = null                                  // ausência de áudio
  | { type: 'url', url }
  | { type: 'upload', url, uploadedAt, mimeType }
  | { type: 'tts', text, language, voiceId, rate,
      generationKey, generatedUrl, generatedAt }
  | { type: 'recording', url, recordedAt, mimeType, durationMs }
```

**Decisão 1 -- ausência é sempre `null`, nunca `{type:'none'}`.**
Justificativa registrada no próprio código: todo o código já existente
(`buildNativeRuntimeFields`, `resolveCardField`, comparação de estado do
editor) já trata `field.audio` via checagem de truthiness (`field.audio
|| null`, `if (field.audio)`) -- introduzir um segundo valor "vazio mas
presente" duplicaria a representação de "nada" sem nenhum requisito real
que precise distinguir "nunca configurado" de "explicitamente sem
áudio", e obrigaria reescrever toda checagem truthy já existente.

**Decisão 2 -- discriminador é `type`, nunca `source`.** O shape anterior
usava `source` (Fase 6B/8a) -- confirmado por grep, `.source` nunca é
lido em produção, só escrito. Renomear pra `type` custou zero risco
funcional (a única propriedade que a resolução de fato usa, `.url`,
nunca mudou de nome) e alinha o vocabulário ao resto do motor
(`card_generation_mode`, `cardTypeId`, "Card Type"). Os 3 pontos que
ESCREVEM o shape a partir de `audio_url` legado (`interpretNoteFromRow()`,
2x no ramo Cloze + 1x no ramo Normal/MC) e o 4º ponto
(`attachLegacyMediaToFields()`, conversão Legacy->Native da Fase 6D.8)
foram atualizados nesta subfase pra emitir `type:'upload'` em vez de
`source:'upload'` -- daqui pra frente só existe UM discriminador
canônico, nunca os dois convivendo como fontes de verdade diferentes.
Dado já persistido com `source` (se algum existir em produção, de uma
conversão Legacy->Native anterior a esta subfase) continua resolvendo
`audioUrl` corretamente -- `resolveFieldAudioUrl()` nunca leu `.source`/
`.type` pra decidir isso, só `.url`/`.generatedUrl`.

**Os 4 tipos, o que cada um representa:**
- `url` -- link externo arbitrário, colado pela professora/aluna (nunca
  hospedado pelo próprio app). `url` obrigatório.
- `upload` -- arquivo hospedado no Storage do próprio app (mesmo bucket
  `flashcard-media`, migration 032, já usado pelo upload legado hoje).
  `url` obrigatório; `uploadedAt`/`mimeType` são metadado opcional,
  nunca lidos por `resolveCardField()` -- é o MESMO shape funcional que
  o código legado já produzia (só o discriminador mudou de nome, ver
  Decisão 2).
- `tts` -- **CONFIGURAÇÃO de síntese de voz, nunca execução.** Todas as
  7 propriedades são opcionais/nullable -- um Field pode ter `type:'tts'`
  com TODAS elas `null`, representando "o modo TTS foi escolhido mas
  nada mais foi configurado ainda" (estado VÁLIDO, não um erro, testado
  explicitamente -- item G da suíte). Distinção explícita entre
  CONFIGURAÇÃO (`text`/`language`/`voiceId`/`rate`, o que a pessoa
  pediu) e ATIVO RESOLVIDO (`generatedUrl`/`generatedAt`, o que de fato
  existe como arquivo hoje) -- um Field pode ter configuração completa e
  `generatedUrl:null` (ainda não gerado), estado perfeitamente válido.
  `generationKey` é dado DERIVADO (hash de text+language+voiceId+rate),
  reservado pra uma futura camada de cache server-side identificar se um
  áudio já foi gerado pra esta configuração exata -- nenhum código nesta
  subfase calcula ou consome este campo, só reserva o lugar.
- `recording` -- suporte ESTRUTURAL pra gravação futura (MediaRecorder),
  **não implementada nesta subfase** (sem microfone, sem UI, sem upload
  específico -- Fase 7g da decomposição). `url` nullable (`null` = "modo
  gravação escolhido, ainda sem arquivo", mesmo espírito do TTS antes de
  gerar) -- uma vez gravado, aponta pro MESMO tipo de URL que `upload` já
  usa (reaproveita a mesma infraestrutura de Storage, nunca um mecanismo
  de persistência paralelo).

**`Field.lang` (idioma pedagógico) e `audio.tts.language` (locale de
síntese) são eixos DELIBERADAMENTE INDEPENDENTES, nunca derivados um do
outro por nenhum código deste motor.** `language:null` num Field
`type:'tts'` é um estado VÁLIDO ("ainda não escolhido") -- nenhuma
função (nem `resolveCardField()`, nem `resolveFieldAudioUrl()`, nem
nenhum resolver) jamais preenche/deriva `audio.language` a partir de
`field.lang`. Uma futura UI de edição PODE oferecer um valor sugerido a
partir de `field.lang` (ex: Field `lang:'fr'` sugere `language:'fr-FR'`
por padrão no seletor), mas o que fica gravado é sempre a ESCOLHA
EXPLÍCITA da pessoa (ou `null`, se ela ainda não escolheu) -- testado
explicitamente (item G da suíte) que um Field `lang:'zh'` com
`audio.tts.language:'fr-FR'` não é rejeitado pelo modelo (cenário
bizarro, mas o contrato nunca impede isso -- só uma UI futura decidiria
avisar/impedir).

**`resolveCardField()` expõe só o ATIVO resolvido (`audioUrl`), nunca a
CONFIGURAÇÃO inteira de `field.audio`** -- confirmado por teste (item O)
que o shape de retorno continua com exatamente 5 chaves
(`text`/`lang`/`pinyinText`/`audioUrl`/`imageUrl`), nunca `language`/
`voiceId`/`generationKey` vazando pra view de exibição. Quem precisar da
configuração completa (uma futura UI de edição/geração) lê `field.audio`
direto, nunca por meio desta view.

**`resolveFieldAudioUrl(audio)`** (novo, `shared/flashcard-model.js`) --
único ponto que decide "que URL este `field.audio` resolve HOJE": pra
`url`/`upload`/`recording`, é `.url` (só se for string não-vazia); pra
`tts`, é `.generatedUrl` (só se já existir -- **nunca gera nada aqui**,
nunca busca nada externo, nunca escolhe áudio baseado em `field.lang`).
**Defensivo por design** -- qualquer shape não reconhecido (lixo,
`{type:'nao-existe'}`, uma string solta, um número) devolve `null` em
vez de lançar (testado explicitamente, item F da suíte, 8 variações de
shape inválido) -- resolução pra EXIBIÇÃO nunca deve quebrar a tela por
causa de dado malformado; rejeitar dado malformado é trabalho de
`isValidFieldAudio()`, numa camada de validação separada.

**`isValidFieldAudio(audio)`** (novo) -- validação ESTRUTURAL pura,
nunca lança, nunca decide nada sobre direção/apresentação. `null`/
`undefined` sempre válidos; presente, exige `type` reconhecido e `url`
string não-vazia pra `url`/`upload`; `recording` e `tts` toleram toda
propriedade ausente/null (configuração incompleta é estado válido, não
erro). **Não é chamada por `validateNoteEditorStateForSave()`** (Fase
6D.6) nesta subfase -- decisão deliberada: áudio continua opcional em
qualquer Card Type, e a ausência de UI de edição real (Fase 7e, ainda
não construída) significa que nenhum fluxo de salvar hoje pode produzir
um `field.audio` inválido de qualquer jeito -- gate de validação forte
no save fica pra quando a UI de edição existir de verdade. Fica pronta,
testada, e reutilizável (por testes e por essa UI futura) desde já.

**Indicador textual do Field editor (Fase 6D.3, `shared/flashcard-
field-editor.js`) tornado type-aware, ainda 100% read-only** --
`fieldAudioIndicatorText(audio)` (novo) troca o "🎧 tem áudio vinculado"
genérico por um texto específico por tipo ("🎧 áudio (link externo)"/
"🎧 áudio (upload)"/"🎧 TTS configurado (áudio ainda não gerado)"/"🎧
áudio TTS gerado"/"🎙️ gravação configurada (ainda sem arquivo)"/"🎙️
gravação vinculada") -- shape legado/desconhecido cai num fallback
genérico, nunca quebra a tela. **Nenhuma UI de edição/upload/geração
nova** -- só o texto do indicador mudou, nenhum controle novo foi
adicionado.

**O que NÃO foi tocado, de propósito:**
- Os 4 renderers (`fr/app.js`/`zh/app.js`) -- confirmado que não
  precisavam de nenhuma mudança (só consomem `audioUrl` já resolvido).
- `shared/flashcard-preview.js` -- zero menção a áudio no arquivo,
  delega 100% aos 4 renderers reais; nada a mudar.
- `validateNoteEditorStateForSave()` -- áudio continua fora da
  validação de save nesta subfase, ver decisão acima.
- Nenhuma migração SQL -- `fields` já é `jsonb` (migration 045, Fase
  6B), já suporta o shape novo sem nenhuma mudança de schema.
- Nenhuma infraestrutura de TTS/upload/gravação de verdade -- zero Edge
  Function, zero chave de API, zero `MediaRecorder`/`getUserMedia`,
  zero UI de seleção de fonte de áudio.
- Legacy (`audio_url`/`image_url`) -- nenhuma migração automática, nenhum
  backfill, nenhuma mudança de IDs/FSRS/revision/histórico.

**Testes realizados:**
- `node --check` sem erro nos 4 arquivos tocados (`shared/flashcard-
  model.js`, `shared/flashcard-editor-state.js`, `shared/flashcard-
  native-persistence.js`, `shared/flashcard-field-editor.js`).
- **Suíte Node/VM nova `test_fase7b_field_audio_contract.js`, 83/83** --
  cobre os 19 itens A-S pedidos explicitamente: A-E (os 5 estados --
  sem áudio, url, upload, tts pendente/cacheado, recording pendente/
  gravado -- via `resolveCardField()` real); F (8 shapes inválidos,
  todos rejeitados por `isValidFieldAudio()` e tratados defensivamente
  -- nunca lançam -- por `resolveFieldAudioUrl()`/`resolveCardField()`);
  G (`language:null` é válido, nunca derivado de `field.lang`, e um
  Field `lang:'zh'` com `tts.language:'fr-FR'` não é rejeitado -- eixos
  independentes confirmados); H (config TTS completa, resolve o ativo
  cacheado); I (`cloneFieldIntoEditorState`, Fase 6D.3, preserva áudio
  através da clonagem, indicador textual confirmado por tipo); J/K/L
  (snapshot/`noteEditorStatesEqual`/`noteEditorStateChanged` detectam
  mudança só em áudio, inclusive remover áudio existente); M
  (`noteEditorStateToRow` preserva áudio no Field certo); N
  (`nativeContentColumnsFromEditorState` preserva áudio, com
  ROUND-TRIP REAL através de `buildEngineCardsFromRow`/
  `resolveCardContentView`, não só inspeção do payload); O
  (`resolveCardField` expõe só o ativo, nunca a config completa, shape
  de retorno com exatamente 5 chaves); P (Legacy continua usando
  `audio_url`, gravado como `type:'upload'` canônico, `row.audio_url`
  em si nunca mutado); Q (Native ignora `row.audio_url` por completo
  quando `fields` já existe -- testado com uma URL "armadilha" na linha
  que nunca deveria vazar pro Field, e não vazou); R (verificação
  arquitetural -- `AUDIO_MANIFEST` nunca é referenciado em código
  executável de `shared/flashcard-model.js`, nem existe como global no
  motor); S (2 Fields com o MESMO `lang` e áudios diferentes/nenhum
  resolvem independentemente -- `fieldHasAudio()`, elegibilidade de TTS
  AUTOMÁTICO por idioma, confirmado como eixo SEPARADO de `audioUrl`
  explícito, nunca confundidos).
- **5 suítes anteriores re-executadas, 216/216 sem regressão**
  (esperado -- a única mudança funcional real foi `resolveFieldAudioUrl()`
  ficar mais estrita, validando `typeof === 'string'` em vez de só
  truthy, o que nenhum teste anterior dependia de contornar):
  `test_fase4_engine.js` 34/34, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74, `test_fase7a_media_resolution.js` 45/45.
- **Browser smoke novo `test_fase7b_browser_smoke.js`, Playwright,
  Chromium real, FR+ZH, 23 checks por idioma, todos batendo** --
  ponta-a-ponta com as funções de PRODUÇÃO reais (nunca simuladas):
  criar uma Note nativa (`createNativeNoteEditorState`) com Field
  `type:'url'`; editar via `updateFieldInEditorState` (Fase 6D.3) pra
  `type:'upload'`; clonar o Field via `cloneFieldIntoEditorState`
  (confirmado id novo, áudio preservado); "salvar" via
  `nativeContentColumnsFromEditorState`; "recarregar" via
  `buildEngineCardsFromRow` sobre a linha resultante (round-trip real
  pelo motor de produção); resolver via `resolveCardContentView`
  (`audioUrl` bate com o que foi salvo); `resolveFieldAudioUrl` direto
  pra TTS pendente/cacheado e recording pendente/gravado, shape
  inválido nunca lança; **Review real** -- um card com `type:'upload'`
  mostra o botão de áudio próprio com a URL certa
  (`.custom-audio-btn[data-audio-url]`), um card com `type:'tts'`
  pendente (sem `generatedUrl`) **não mostra nenhum botão** (confirma
  que o motor nunca inventa um áudio pra um TTS ainda não gerado);
  **Preview real** (`buildPreviewCardsFromNativeEditorState`, Fase
  6D.7) sobre o MESMO editorState nativo, `__isPreviewCard` confirmado,
  áudio resolvido corretamente. **Zero `pageerror`** em qualquer um dos
  2 idiomas (só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes
  do proxy de saída deste sandbox, documentados em toda a sessão).

**Achado incidental, corrigido durante a escrita dos testes (não um bug
de produto, só um caso de borda de robustez)**: a primeira versão de
`resolveFieldAudioUrl()` usava `audio.url || null` -- um `url` com tipo
errado (ex: `{type:'upload', url:42}`, nunca produzido por nenhum código
real hoje, mas um shape que `isValidFieldAudio()` já rejeitava)
retornaria `42` em vez de `null`, porque `42` é truthy. Corrigido pra
`typeof candidate === 'string' && candidate ? candidate : null` --
garante que o "defensivo, nunca quebra" da função vale de verdade mesmo
pra um shape parcialmente malformado, não só pra ausência total.

**O que ainda falta / não foi feito nesta subfase (de propósito, escopo
estrito):**
- 7c (expor áudio de resposta/tradução aos renderers -- já resolvido na
  verdade pela Fase 7a, que já fez isso pra Type Answer/Cloze; não
  reaberto aqui).
- 7e (upload real conectado ao editor nativo de Field) -- o indicador
  textual continua só leitura, nenhum `<input type="file">`/botão de
  anexar nesta subfase.
- 7f (TTS de verdade -- geração/cache server-side, Edge Function, chave
  de API) -- o shape `type:'tts'` está pronto pra receber essa
  implementação, mas nada nesta subfase gera nem cacheia áudio nenhum.
- 7g (gravação via MediaRecorder) -- o shape `type:'recording'` está
  pronto, mas sem microfone/UI/upload específico.
- 7h (áudio em distratores de Múltipla Escolha) -- `distractorTexts`
  continua array de strings puras, sem Field associado, mesma
  conclusão já registrada na auditoria da Fase 7.
- 7i (export Anki com mídia) -- não tocado.
- Guard de `registerAudioPlay()` pro clique MANUAL dentro do Preview
  (gap menor já registrado na Fase 7a, exigiria mudança na arquitetura
  de TTS) -- não corrigido aqui, fora do escopo desta subfase.

Nenhum passo manual pendente pra autora nesta entrega -- 100%
client-side, nenhuma migração/mudança de schema.

Próxima subfase (a definir pela autora, seguindo a decomposição já
proposta na auditoria da Fase 7) só começa depois de autorização
explícita, com este relatório já entregue antes de pedir luz verde.

## Fase 7c -- Editor de áudio por Field (SÓ AUDITORIA/ESPECIFICAÇÃO, zero
código funcional alterado)

**Nota sobre numeração, registrada por transparência**: a decomposição
original proposta na auditoria da Fase 7 (seção K, "7a" a "7i") não bate
1:1 com a numeração usada na prática a partir daqui -- a autora decidiu
nomear as entregas seguintes em ordem de execução, não pela lista
original. O que foi de fato entregue como **"Fase 7a"** (`7fd5075`)
absorveu, numa entrega só, os itens originais 7a (imagem por Field) + 7b
(vazamento de áudio em Normal/MC) + 7c (áudio de resposta/tradução em
Type Answer/Cloze) + metade do 7d (autoplay do Preview, só a parte
automática). O que foi entregue como **"Fase 7b"** (`76c8ffc`, contrato
de `Field.audio`) nem existia na lista original -- foi uma subfase nova,
inserida como pré-requisito de dado antes de qualquer UI de edição fazer
sentido. Esta entrega, pedida como **"Fase 7c"**, cobre o mesmo escopo
que a lista original chamava de "7e" (editor ganha upload real) mais as
partes de especificação de UX dos originais "7f" (TTS) e "7g"
(gravação) -- só que como AUDITORIA/ESPECIFICAÇÃO, não implementação
(a autora foi explícita: "não implemente nada"). Daqui pra frente, a
numeração que importa é a da autora (7, 7a, 7b, 7c, ...), não mais a
lista K) original -- registrado aqui pra nenhuma sessão futura se
confundir tentando casar as duas.

**Escopo desta entrega**: só leitura + este relatório. `git status`/
`git diff` confirmados no fim -- só `CLAUDE.md` foi tocado.

### A) Estado atual (auditoria)

Reli, sem presumir a partir da documentação anterior:
`shared/flashcard-editor-state.js`, `shared/flashcard-field-editor.js`,
`shared/flashcard-native-persistence.js`, `shared/flashcard-model.js`,
`shared/flashcard-mc-editor.js`, `shared/flashcard-typeanswer-editor.js`,
`shared/flashcard-cloze-editor.js`, `shared/flashcard-preview.js`,
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, e os trechos
relevantes de `fr/app.js` (Study Trail, Speed Review, Combinar, export
Anki -- `zh/app.js` é estruturalmente idêntico nesses pontos, mesma
convenção de sempre).

- **Onde Fields são criados**: `createFieldState()` (`shared/flashcard-
  editor-state.js`) é o único construtor -- chamado por
  `addFieldToEditorState()` (`shared/flashcard-field-editor.js`, Fase
  6D.3) e pelos wrappers específicos de cada Card Type
  (`addMultipleChoicePromptField`/`AnswerField`/`DistractorField` em
  `flashcard-mc-editor.js`; equivalentes em `flashcard-typeanswer-
  editor.js`; a criação do Field de texto/tradução em `flashcard-cloze-
  editor.js`), e por `nativeNoteEditorStateFromLegacyRow()` (`shared/
  flashcard-native-persistence.js`, Fase 6D.8, conversão Legacy->Native).
- **Onde Fields são editados**: `updateFieldInEditorState(editorState,
  fieldId, patch)` (`flashcard-field-editor.js`) -- um `Object.assign`
  RASO que preserva qualquer propriedade não mencionada no patch
  (confirmado, de novo, que isso já protege `audio`/`image`/`role`/
  `pinyinFieldId` através de qualquer edição de conteúdo/idioma, testado
  desde a Fase 6D.3/7b). Chamado pelo wiring genérico
  (`wireFieldEditorList`, inputs `data-field-content`/`data-field-lang`)
  e pelos helpers de transição de papel (`promoteDistractorToAnswer`/
  `transitionToMultipleChoice`/`TypeAnswer`/`Cloze`) -- estes últimos só
  tocam `role`/`cardGenerationMode`, nunca `audio`.
- **Onde Fields são clonados**: `cloneFieldIntoEditorState(editorState,
  fieldId)` (`flashcard-field-editor.js`, Fase 6D.3) -- já existe como
  infraestrutura pura, já preserva `audio`/`image` (testado na Fase 7b,
  item I). **Achado**: nenhum botão de "Clonar campo" existe hoje em
  `admin-flashcards.js`/`my-flashcards.js` -- confirmado por grep, a
  função só é chamada por testes. Ou seja: a pergunta "clonar Field deve
  clonar o áudio?" já tem resposta implementada (sim) antes mesmo de
  existir um jeito de clonar pela UI -- registrado aqui pra próxima
  sessão saber que não precisa reabrir essa decisão.
- **Como cada Field é renderizado**: `renderFieldEditorHTML(field, index,
  opts)` (`flashcard-field-editor.js`) é o ÚNICO renderer genérico,
  usado diretamente por Normal/Normal com reverso (2 Fields soltos),
  Digite a resposta (prompt+answer), Múltipla Escolha (prompt+answer+até
  3 distratores) e pela TRADUÇÃO do Cloze. **Exceção real, achado
  importante**: a FRASE do Cloze (o Field com as marcas `{{cN::...}}`)
  NUNCA passa por `renderFieldEditorHTML()` -- tem sua própria UI
  dedicada (`renderClozeEditorHTML()`, `.cloze-editor-text`
  `contenteditable`, Fase 6D.5), porque precisa de seleção de texto pra
  marcar lacunas, incompatível com um `<textarea>` simples. Isso é
  ARQUITETURALMENTE RELEVANTE pra esta subfase (ver seção C).
- **Como o estado é atualizado**: sempre via `updateFieldInEditorState()`
  -- nenhum outro ponto muta `field.audio` diretamente fora dela e dos
  construtores/conversores já listados.
- **Como mudanças são detectadas**: `noteEditorStateChanged()`/
  `noteEditorStatesEqual()` (`flashcard-editor-state.js`), via
  `snapshotNoteEditorState()` -- `noteEditorStateContentForComparison()`
  já inclui `audio`/`image` por Field desde a Fase 6B/7b, confirmado de
  novo por leitura: **nenhuma mudança é necessária aqui** -- qualquer
  edição futura de áudio já vai disparar corretamente a detecção de
  "precisa de nova revision" sem tocar em uma linha de código.
- **Como o `nativeState` é serializado**: `noteEditorStateToRow()`
  (`flashcard-editor-state.js`) e `nativeContentColumnsFromEditorState()`
  (`flashcard-native-persistence.js`) já carregam `audio`/`image` através
  sem transformação (Fase 7b) -- idem, nenhuma mudança necessária.
- **Onde uma futura ação de áudio deve entrar**: `renderFieldEditorHTML()`
  é o ponto que, sozinho, já daria o bloco de áudio de graça pra TODOS os
  Card Types (Normal, Normal com reverso, os 2 Fields de Digite a
  resposta, os 1-4 Fields de Múltipla Escolha, a tradução do Cloze) --
  EXCETO a frase do Cloze, que precisa do MESMO bloco sendo chamado
  separadamente de dentro de `renderClozeEditorHTML()` (achado acima).
  Esta é a descoberta arquitetural central desta auditoria: o componente
  de áudio não pode viver só "dentro" de `renderFieldEditorHTML()` como
  se fosse parte inseparável dela -- precisa ser uma peça PRÓPRIA,
  reutilizável nos 2 lugares.
- **Admin x Meus Cartões**: `shared/admin-flashcards.js` e `shared/my-
  flashcards.js` têm exatamente a mesma estrutura
  (`ADMIN_FLASHCARDS_STATE.nativeCardState`/`MY_FLASHCARDS_STATE.
  nativeCardState`, ambos chamando `refreshNativeCardTypeBox()` no
  render inicial e no listener de troca de Card Type, em 2 pontos cada
  -- formulário de criação e formulário de edição nativa). **Único
  diferencial relevante**: em `my-flashcards.js`, todo o bloco "Campos
  nativos" (Card Type + Fields) já é gated por `isPremium()` (Fase
  "reformulação gratuito x premium") -- confirmado que essa gate
  envolve o bloco INTEIRO, então um editor de áudio por Field, vivendo
  dentro desse mesmo bloco, herda o gate de graça, sem nenhum código
  novo de permissão.

### B) UX proposta (não implementar)

Bloco "Áudio" por Field, mesma linguagem visual já usada no resto do
editor (`.section-label` como rótulo pequeno, `.profile-edit-hint` pra
texto de apoio, `.profile-edit-input` pros controles) -- substitui o
indicador read-only de hoje (`fieldAudioIndicatorText()`, Fase 7b) por
um controle de verdade, sem prometer nenhuma UI específica de antemão
além da estrutura:

1. Um `<select>` de ORIGEM (mesmo padrão do `<select>` de "Idioma" já
   existente no próprio `renderFieldEditorHTML()`): "Sem áudio" / "URL
   externa" / "Arquivo (upload)" / "Texto para voz (TTS)" / "Gravação" --
   os mesmos 4 `type` do contrato da 7b + a opção "sem áudio" (`null`).
2. Escolher uma origem revela um painel condicional logo abaixo (mesmo
   padrão de progressive disclosure já usado noutros pontos deste editor
   -- ex: campos de MC/Cloze que só aparecem conforme o modo escolhido):
   - **URL externa**: 1 campo de texto pra colar a URL + botão "▶️
     Ouvir" (desabilitado até ter uma URL não-vazia).
   - **Arquivo (upload)**: `<input type="file">` (fase futura, 7e) +
     depois de enviado, mostra a URL resultante (só leitura) + botão de
     ouvir + link "Remover".
   - **Texto para voz (TTS)**: `<textarea>` pré-preenchida com
     `field.content.value` mas editável/sobrescrevível (grava em
     `audio.text` só se a pessoa mudar -- ver Decisão 1 abaixo), `<select>`
     de idioma/locale (sugestão default a partir de `field.lang`, nunca
     salva sozinha -- ver Decisão 2), `<select>` de voz, `<select>`/slider
     de velocidade, botão "🔊 Gerar áudio" (fase futura, 7f) -- depois de
     gerado: botão de ouvir + legenda "gerado em <data>" + links
     "Regerar"/"Remover".
   - **Gravação**: botões iniciar/parar/ouvir/regravar/cancelar/salvar
     (fase futura, 7g) -- depois de gravado: botão de ouvir + legenda de
     duração + links "Regravar"/"Remover".
3. Reutilizado nos MESMOS 2 lugares que `renderFieldEditorHTML()` já
   aparece HOJE, mais 1 lugar novo (a frase do Cloze) -- ver seção C.

### C) Arquitetura do componente de áudio

**Proposta**: 2 novas funções em `shared/flashcard-field-editor.js`
(mesmo arquivo que já é dono de `renderFieldEditorHTML`/
`wireFieldEditorList`/`fieldAudioIndicatorText`, Fases 6D.3/7b):

- `renderFieldAudioBlockHTML(field, opts)` -- HTML puro (sem side
  effect), desenha o `<select>` de origem + o painel condicional certo
  pro `field.audio` atual.
- `wireFieldAudioBlock(container, editorState, fieldId, onChange)` --
  liga os controles a `updateFieldInEditorState()` (o MESMO mutador
  primitivo de sempre -- nunca um segundo caminho de mutação de Field).

`renderFieldEditorHTML()` passa a chamar `renderFieldAudioBlockHTML()`
internamente, no lugar de onde hoje só mostra o indicador textual de
`fieldAudioIndicatorText()` (que continua existindo -- vira o texto
usado DENTRO do próprio bloco de áudio, não descartado). `renderClozeEditorHTML()`
(`flashcard-cloze-editor.js`) ganha 1 chamada A MAIS, logo depois do
toolbar/`contenteditable` da frase, pro MESMO componente, aplicado ao
Field de texto. **Nenhum dos 3 editores de Card Type específicos (MC/
Type Answer/Cloze) precisa de lógica de áudio própria** -- eles já
delegam 100% da renderização de Field pra `renderFieldEditorHTML()`
(confirmado na auditoria A), então herdam o bloco novo automaticamente,
sem duplicação -- exceto o único ponto (frase do Cloze) que já não usa
esse caminho por outro motivo (seleção de texto), e que precisa da
chamada explícita mencionada acima.

**Contrato de `onChange`**: o par `wireFieldEditorList`/`wireFieldAudioBlock`
já usa `onChange(kind, fieldId)` com `kind` em `'content'`/`'lang'`
(nunca re-renderiza) ou `'structure'` (sempre re-renderiza, Fase 6D.3-
6D.8). Proposta: um 3º valor, `'audio'`, tratado como **duas
sub-categorias** por quem integra -- trocar a ORIGEM (o `<select>`
principal) precisa recriar o painel condicional inteiro (equivalente a
`'structure'`, precisa reconstruir o HTML), enquanto digitar dentro de
um campo já visível (URL, texto de TTS) é equivalente a `'content'`
(nunca re-renderiza, mesma disciplina anti-"UX-fix 5" já travada desde a
Fase 6D.5/6D.6 -- reconstruir o DOM enquanto a pessoa digita apagaria o
que ela está escrevendo).

### D) Estados da UI (documentados, sem alterar schema)

1. **Nenhum áudio** (`field.audio === null`) -- só o `<select>` de
   origem em "Sem áudio", nenhum painel.
2. **Áudio configurado E disponível** -- `url`/`upload` com `.url`
   presente, ou `tts`/`recording` com `generatedUrl`/`url` presentes --
   botão de ouvir habilitado, preview funciona.
3. **Áudio configurado mas PENDENTE de geração/gravação** -- `tts` com
   `generatedUrl:null` ou `recording` com `url:null` -- a CONFIGURAÇÃO
   existe (texto/idioma/voz escolhidos, ou "modo gravação" escolhido),
   mas nada tocável ainda. UI precisa deixar isso claro ("ainda não
   gerado"/"ainda não gravado"), com o CTA de gerar/gravar em destaque e
   o botão de ouvir ausente ou desabilitado -- nunca fingir que existe
   áudio quando `resolveFieldAudioUrl()` devolveria `null`.
4. **Áudio com erro** -- **não existe no schema da 7b** (nenhuma
   propriedade `error`/`status` em `type:'tts'`/`type:'recording'`).
   Decisão proposta, não travada em código: **erro de geração/upload é
   SEMPRE transiente/só-de-UI** (mesmo padrão de toast já usado no resto
   do app pra falha de upload/reprodução -- `showToast('Não foi possível
   ...')`), nunca persistido no `Field.audio`. Justificativa: manter o
   schema limpo (sem um campo que só faz sentido durante os poucos
   segundos de uma tentativa) é mais simples que adicionar um estado
   persistido que precisaria ser limpo depois -- se uma sessão futura
   (7f/7g) achar que precisa de retry/histórico de erro, é uma decisão
   NOVA, a ser tomada naquela hora, não aqui.
5. **Áudio antigo continua disponível enquanto uma nova configuração é
   preparada** -- o caso mais delicado, decisão explícita: trocar o
   `<select>` de origem (ex: de "URL externa" já configurada pra "Texto
   para voz") **NUNCA deve sobrescrever `field.audio` imediatamente**.
   A nova escolha fica só no RASCUNHO da própria UI do bloco (estado
   efêmero, balde #3 já reservado desde a Fase 6D.1 --
   `createEditorUiState()` -- ou um estado local só do componente) até
   que um ativo concreto exista de verdade (upload termina, TTS gera,
   gravação termina) -- só NESSE momento `field.audio` é substituído. A
   ÚNICA forma de limpar `field.audio` antes disso é a pessoa escolher
   "Sem áudio" explicitamente. Sem essa regra, um clique acidental no
   `<select>` destruiria um áudio já funcionando (a URL externa, upload
   ou gravação anteriores) antes mesmo da nova configuração produzir
   qualquer coisa.

### E) Clone/remove/reorder (decisões)

- **Clonar um Field CLONA o áudio junto** -- já é o comportamento
  implementado (`cloneFieldIntoEditorState`, Fase 6D.3), confirmado na
  auditoria A. Mantido: um Field clonado é uma variante independente;
  quem clona decide depois se troca/remove o áudio; zerar
  automaticamente surpreenderia mais do que preservar.
- **Remover um Field remove seu áudio junto** -- não é uma regra nova,
  é consequência direta de `removeFieldFromEditorState()` apagar o
  objeto Field inteiro (que já contém `audio` como propriedade sua,
  nunca uma referência externa). Nada a decidir aqui.
- **Reordenar Fields não afeta áudio de nenhum jeito** -- `audio` é
  propriedade do PRÓPRIO objeto Field, nunca referenciado por índice em
  lugar nenhum do motor (confirmado de novo por leitura) -- mover um
  Field de posição leva seu áudio junto, estruturalmente, sem nenhum
  código especial.
- **Mudar `Field.lang` NUNCA toca `field.audio` automaticamente** --
  trocar o idioma de um Field com upload/URL/gravação já anexados
  preserva esse áudio intacto (a pessoa anexou um arquivo real; mudar o
  metadado de idioma não invalida o arquivo). Pro caso TTS
  especificamente: mudar `Field.lang` **nunca sobrescreve**
  `audio.tts.language` já escolhido (regra já travada na 7b, reafirmada
  aqui) -- o que MUDA é só o valor SUGERIDO que uma UI futura mostraria
  num `audio.tts.language` ainda `null` (nunca um valor já escolhido).
- **Mudar o texto do Field** -- caso mais sutil, tratado na seção F
  (invalidação de TTS) por estar diretamente ligado a ela.

### F) Regras de invalidação de TTS/cache (não implementar o algoritmo)

Tabela de comportamento esperado (`generationKey` é sempre dado
DERIVADO, nunca persistido como fonte de verdade -- ver 7b):

| Mudança | `generationKey` | `generatedUrl` |
|---|---|---|
| A. texto muda (`audio.text` explícito, OU `field.content.value` quando `audio.text` é `null` -- ver abaixo) | muda | fica MARCADO como desatualizado (nunca apagado sozinho) |
| B. idioma (`audio.language`) muda | muda | idem A |
| C. voz (`audio.voiceId`) muda | muda | idem A |
| D. velocidade (`audio.rate`) muda | muda | idem A |
| E. nada muda | continua igual | continua válido (nenhuma regeneração necessária -- é o ganho real do cache) |

**Regra específica sobre QUAL texto invalida** (resolve a pergunta "mudar
o texto do Field invalida `generatedUrl`?"): depende de `audio.text`.
Se `audio.text` é `null` (o caso comum -- "sintetize o texto do próprio
Field"), editar `field.content.value` conta como mudança de texto (linha
A da tabela). Se `audio.text` é um override explícito (não-null), editar
`field.content.value` **NÃO invalida nada** -- o TTS lê sua própria
config, independente do texto de exibição do Field.

**"Desatualizado" é sempre um estado CALCULADO na hora** (comparar um
`generationKey` recém-computado contra o já persistido), nunca um
booleano persistido -- mantém o schema exatamente como a 7b definiu
(zero mudança de schema nesta subfase, regra 16). Quando marcado como
desatualizado, o áudio ANTIGO continua tocável/disponível (nunca
apagado automaticamente) até uma regeneração de sucesso -- é a mesma
regra do estado D5 acima, agora aplicada especificamente ao caso TTS.
**O algoritmo de cálculo de `generationKey` em si (hash de quê,
formato) fica pra 7f** -- esta subfase só especifica QUANDO ele precisa
mudar conceitualmente, nunca como.

### G) Comportamento esperado no Review

Nenhuma mudança em relação ao que a Fase 7a já corrigiu -- reafirmado,
não revertido: áudio só aparece pro lado ATUALMENTE VISÍVEL (Normal
por lado, Múltipla Escolha só o prompt antes de responder, Digite a
resposta/Cloze só depois de `answered`). Um Field `type:'tts'` com
`generatedUrl:null` continua, hoje e depois desta subfase, sem nenhum
botão de áudio próprio (`resolveFieldAudioUrl()` já devolve `null`) --
a pronúncia AUTOMÁTICA (`speakFrench`/`isStudyLanguageField`) continua
funcionando em paralelo, eixo separado, inalterado. Nenhuma mudança de
código é necessária no Review por causa desta subfase -- o contrato de
dado (7b) e a resolução (7a) já cobrem qualquer novo `field.audio` que
o editor futuro vier a produzir.

### H) Comportamento esperado no Preview

Preview continua delegando 100% aos mesmos 4 renderers (nenhuma
duplicação, arquitetura já correta desde a Fase 6D.7) -- reafirmado, não
alterado. **Gap já conhecido, não corrigido aqui** (achado da Fase 7a):
clicar manualmente no botão 🎧/🔊 DENTRO do Preview ainda chama
`registerAudioPlay()` de verdade (o guard `!card.__isPreviewCard` só
suprime o AUTOPLAY, nunca o clique manual). Especificação pra quando
isso for corrigido (não implementado agora): extrair um helper
`playAudioPreview(url)` -- só `new Audio(url).play()`, nunca
`speakFrench`/`registerAudioPlay` envolvidos -- reutilizado em 3 lugares
que vão precisar dele: (1) o botão "▶️ Ouvir"/"Regerar"/preview DENTRO
do próprio editor de áudio (novo, desta subfase futura), que NUNCA pode
contar como uma reprodução real de estudo; (2) o eventual fix do clique
manual do Preview (item já registrado na Fase 7a); (3) qualquer botão de
teste futuro. Os 3 contextos compartilham a mesma exigência: tocar áudio
sem afetar `STATE.totalAudioPlays`/checagem de badge.

### I) Study Trail

Confirmado de novo (grep fresco, não presumido): vocabulário/frases da
trilha (`content.js`) nunca passam por Field/Note/CardInstance -- sempre
chamam `audioBtnHTML`+`speakFrench`/`speakChinese` direto sobre texto
literal. Zero relação com `Field.audio`, hoje. **Sem risco de 2 sistemas
concorrentes** -- os dois caminhos de dado são completamente disjuntos
(trilha nunca vira Note, cartão nativo nunca vira item de trilha); o
risco só existiria se uma refatoração futura tentasse unificar os dois
modelos de dado, o que não está proposto nem cogitado aqui.

### J) Speed Review / Combinar

Confirmado de novo (grep fresco): NENHUM dos dois renderiza áudio hoje,
pra NENHUM Card Type (nativo ou trilha) -- `buildSpeedQueue`/
`cardPromptText`/`cardAnswerText`/`MATCH_STATE.tiles` são 100% texto.
**Speed Review consumir `Field.audio` no futuro é plausível e sem
bloqueio arquitetural** -- `resolveCardContentView()`/`resolveCardField()`
já expõem `audioUrl` por Field, Speed Review só precisaria lê-lo; não é
decidido nem autorizado aqui, fica registrado como pergunta de produto
em aberto pra uma subfase própria. **Combinar tem valor bem menor** --
o jogo não tem um momento de "revelação" análogo a virar o cartão/ver a
resposta, então áudio ali não foi recomendado sem um pedido específico.

### K) Anki export

Confirmado por leitura de `shared/anki-export.js` (não presumido): o
manifesto de mídia é **sempre vazio** (`zip.file("media",
JSON.stringify({}))`), incondicionalmente, pra qualquer cartão hoje.
Especificação pra uma futura 7i (não implementada aqui):
- `url`/`upload` -- baixar a URL (já pública), embutir como arquivo de
  mídia numerado no `.apkg`, referenciar via `[sound:N.mp3]` anexado ao
  campo do note.
- `tts` -- mesmo tratamento, só se `generatedUrl` já existir (**nunca**
  disparar geração a partir de um fluxo de exportação); se pendente,
  avisar/pular esse cartão específico, nunca travar a exportação
  inteira.
- `recording` -- mesmo tratamento de `upload`, uma vez que `url` exista.
- Como Cloze/Digite a resposta já são excluídos do export Anki hoje
  (`hasPlainFrontBack`, resposta aberta sem texto curto fixo), a
  pergunta de áudio no export por enquanto só se aplica a Normal/
  Múltipla Escolha.
- Colisão de nome de arquivo de mídia: hash pela URL, reaproveitado
  entre notes que referenciam o MESMO ativo (mesma conclusão já
  registrada na seção I da auditoria original da Fase 7).

### L) Segurança/validação (requisitos futuros, não implementar infra)

- MIME whitelist pra upload/gravação (`audio/mpeg`/`audio/webm`/
  `audio/wav`/`audio/ogg` -- lista exata decidida em 7e/7g).
- Tamanho máximo de arquivo (poucos MB, mesma lacuna já registrada desde
  a Fase 8a pra outros uploads deste editor).
- Duração máxima de gravação (limite em segundos, decidido em 7g).
- URL externa (`type:'url'`) -- exigir `https://` (nunca `http://`, risco
  de conteúdo misto num app servido via https); sem validar
  alcançabilidade/`content-type` no momento de salvar (não dá pra
  buscar cross-origin de forma confiável do cliente) -- o próprio
  elemento `<audio>`/`<button>` de preview já falha graciosamente com o
  MESMO toast já usado noutros pontos do app (`showToast('Não foi
  possível tocar o áudio.')`).
- Nenhum esquema de signed URL/acesso privado necessário pra `upload`/
  `recording` -- o bucket `flashcard-media` já é público-leitura
  (mesmo modelo de hoje); se uma exigência de privacidade futura mudar
  isso, é decisão de nível de BUCKET, não do modelo de áudio.
- `field.audio.url`/`generatedUrl` nunca são interpolados como HTML cru
  -- sempre como atributo (`src`/`data-audio-url`), mesma disciplina de
  escape já usada em todo o resto do editor (confirmado, não presumido,
  que nenhum ponto atual faz `innerHTML` com uma URL de áudio sem
  escapar o contexto ao redor).

### M) Dependências para as próximas subfases

- **7e (upload real)** precisa de: `renderFieldAudioBlockHTML`/
  `wireFieldAudioBlock` (esta especificação) + as funções de upload já
  existentes (`uploadFlashcardMedia`/`uploadOwnFlashcardMedia`, Fase
  8a/"reformulação gratuito x premium") ligadas ao novo painel de
  "Arquivo (upload)".
- **7f (TTS real)** precisa de: o comportamento de "rascunho antes de
  commitar" da seção D5 + infraestrutura NOVA (Edge Function + chave de
  API de TTS, nunca presumida como já ativa -- mesma regra geral do
  topo deste arquivo) + o algoritmo de `generationKey` (seção F, ainda
  não especificado em detalhe).
- **7g (gravação)** precisa de: o fluxo da seção B/D + `MediaRecorder`/
  `getUserMedia` + a mesma infraestrutura de upload da 7e pro arquivo
  final.
- **7d (fix do vazamento de `registerAudioPlay()` no clique manual do
  Preview, já identificado na 7a)** precisa do helper `playAudioPreview()`
  proposto na seção H.
- **7i (export Anki com mídia)** precisa da abordagem de manifesto
  descrita na seção K.

### O que NÃO foi tocado nesta subfase (confirmado, seção 16 da instrução)

Schema SQL, banco, upload real, `MediaRecorder`, TTS server-side, APIs
externas, Edge Functions, os 4 renderers (`fr/app.js`/`zh/app.js`),
Preview, Review, export Anki, dados legados -- nenhum destes foi
alterado. Confirmado por `git status`/`git diff` no fim desta entrega:
só `CLAUDE.md` foi modificado.

Nenhum passo manual pendente pra autora -- é só documentação.

Próxima subfase (a implementação de fato do editor de áudio, ou
qualquer outra ordem que a autora prefira -- 7d/7e/7f/7g/7i) só começa
depois de autorização explícita, com este relatório já entregue antes de
pedir luz verde.

## Fase 7d -- isolamento de reprodução de áudio no Preview (o achado #7 da
auditoria da Fase 7, corrigido)

A auditoria da Fase 7 tinha identificado um achado NOVO (não corrigido
naquela hora, "fora do escopo -- zero código funcional"): abrir o Preview
do editor de flashcards (Fase 6D.7) já não disparava mais o AUTOPLAY de
áudio como reprodução real (fix da Fase 7a, via `card.__isPreviewCard`),
mas clicar MANUALMENTE no botão 🔊 dentro do Preview continuava chamando
`speakFrench()`/`speakChinese()` normalmente -- que sempre chama
`registerAudioPlay()` incondicionalmente como sua primeira instrução,
incrementando `STATE.totalAudioPlays`/`STATE.daily.audioPlaysToday` e
rodando `checkAndCelebrateBadges()` de verdade. Ou seja: testar um
cartão no Preview podia inflar estatística real da conta e até desbloquear
um badge de verdade, um efeito colateral que a Fase 6D.7 já tinha
cuidadosamente isolado pro resto (FSRS/XP/persistência, via
`callbacks.onAnswered` no-op), mas que escapava justamente porque o
autoplay de TTS nunca passa pelos `callbacks` -- é uma chamada direta
dentro do próprio corpo de cada renderer.

**Auditoria feita antes de codar** (releitura de `shared/flashcard-
preview.js`, `shared/flashcard-model.js`, `shared/flashcard-editor-
state.js`, `shared/flashcard-field-editor.js`, e as seções relevantes de
`fr/app.js`/`zh/app.js` -- `registerAudioPlay`/`speakFrench`/
`speakChinese`/`playPregeneratedAudio`/`audioBtnHTML`/`customAudioBtnHTML`/
`wireAudioButtons`/`wireCustomAudioButtons` e os 4 renderers inteiros)
confirmou, por leitura direta, não presumida:
- `speakFrench(text, btnEl, isAutoplay)`/`speakChinese(...)` chamam
  `registerAudioPlay()` como primeira instrução, sempre, independente de
  `isAutoplay` (que só afeta qual toast aparece se o autoplay for
  bloqueado pelo navegador -- nunca gate de analytics).
- `wireAudioButtons(container)` (sem 2º parâmetro, no código pré-7d)
  ligava TODO clique em `.audio-btn` direto a `speakFrench`/`speakChinese`
  -- chamado incondicionalmente nos 3 renderers que têm botão de
  pronúncia automática (`renderNormalCard`/`renderMultipleChoiceCard`/
  `renderTypeAnswerCard`), sem nenhuma checagem de `card.__isPreviewCard`.
  Este é o único ponto real do vazamento.
- `wireCustomAudioButtons(container)` (botão 🎧, áudio PRÓPRIO/upload da
  professora, Fase 8a) **nunca chamou `registerAudioPlay()` em nenhum
  contexto, Review ou Preview** -- já estava "isolado" por construção
  desde que foi escrito, sem relação nenhuma com este bug. Confirmado por
  leitura, não presumido -- nenhuma mudança foi necessária nele.
- `renderClozeCard` **nunca chama `wireAudioButtons`** -- Cloze só tem o
  botão 🎧 customizado (áudio da frase), nunca um botão de pronúncia
  automática (`.audio-btn`) -- confirmado por leitura completa da função.
  Ou seja: Cloze não tinha (e continua sem ter) nenhum vazamento deste
  tipo pra corrigir -- os 3 outros renderers é que precisavam do fix.

**O princípio, travado antes de codar**: Preview é uma simulação visual/
interativa de Review, nunca Review de verdade. No Review real, tocar
áudio → reprodução normal + analytics normal (como sempre foi). No
Preview, tocar áudio → SÓ a reprodução, nunca nenhum efeito colateral de
analytics. Nenhuma reprodução de áudio dentro do Preview deveria contar
como estudo real, do mesmo jeito que clicar um grau de FSRS ali dentro
não grada nada de verdade.

**A solução -- separar reprodução de analytics, num único ponto de
decisão, nunca espalhado (`fr/app.js` e `zh/app.js`, mudanças espelhadas
byte a byte entre os 2 idiomas):**

1. **`speakFrenchAudioOnly(text, btnEl, isAutoplay)`/
   `speakChineseAudioOnly(...)`** (novo) -- o corpo INTEIRO que antes
   vivia dentro de `speakFrench`/`speakChinese` (manifest lookup, mp3
   pré-gerado, fallback Web Speech API com watchdog de retry), extraído
   byte a byte, só sem a chamada a `registerAudioPlay()` que estava no
   topo. Reprodução PURA, sem efeito colateral nenhum.
2. **`speakFrench`/`speakChinese`** viram wrappers finos: `registerAudioPlay();
   speakFrenchAudioOnly(text, btnEl, isAutoplay);` -- comportamento
   externamente IDÊNTICO a antes (mesma assinatura, mesmo efeito), só
   reorganizado por dentro. Todo call site existente (dezenas, na
   trilha/exercícios/diálogos, nenhum tocado) continua funcionando sem
   nenhuma mudança.
3. **`playAudioPreview(text, btnEl)`** (novo) -- a porta de reprodução
   ISOLADA: chama só `speakFrenchAudioOnly`/`speakChineseAudioOnly`
   (`isAutoplay: false`, sempre um clique manual), nunca
   `registerAudioPlay()`. Mesmo mecanismo de reprodução de sempre (mp3
   pré-gerado OU Web Speech API) -- nunca uma reimplementação paralela.
4. **`wireAudioButtons(container, isPreview)`** ganhou um 2º parâmetro
   opcional (default falso/ausente, preserva 100% o comportamento de
   sempre pra qualquer call site que não passa nada) -- é o ÚNICO lugar
   do código inteiro que decide se um clique manual em `.audio-btn` conta
   como reprodução real (`speakFrench`/`speakChinese`) ou isolada
   (`playAudioPreview`). Nunca um `if (isPreview)` espalhado pelos 4
   renderers -- cada um só passa `card.__isPreviewCard` (Fase 6D.7,
   mesmo flag que já suprimia o autoplay desde a Fase 7a) como argumento,
   a decisão em si mora só aqui.
5. Os 3 call sites afetados (`renderNormalCard`/`renderMultipleChoiceCard`/
   `renderTypeAnswerCard`, fr+zh) trocaram `wireAudioButtons(mountEl)`
   por `wireAudioButtons(mountEl, card.__isPreviewCard)` -- 1 linha por
   call site, nenhuma outra mudança de lógica. `renderClozeCard` não
   precisou de nenhuma mudança (nunca chamava `wireAudioButtons`, ver
   acima).

**O que NÃO mudou, de propósito**: o autoplay continua exatamente como a
Fase 7a já tinha corrigido -- suprimido por completo dentro do Preview
(`if (!card.__isPreviewCard && ...) speakFrench(...)`), nunca
redirecionado pra `playAudioPreview()` (não foi pedido, e "Preview sem
autoplay algum" já era o comportamento correto validado na Fase 7a --
só o CLIQUE MANUAL precisava de isolamento, que é exatamente o gap que
esta subfase fecha). `wireCustomAudioButtons`/botão 🎧 não foi tocado
(nunca teve o vazamento). `Field.audio` (contrato da Fase 7b),
`shared/flashcard-model.js`, os resolvers, `shared/flashcard-preview.js`
(a orquestração do Preview em si -- que já delega 100% aos 4 renderers
reais, sem duplicar nada) -- nenhum destes foi tocado. Nenhuma migração,
nenhum schema, nenhuma UI nova, nenhum upload/gravação/TTS server-side.

**Testes realizados:**
- `node --check` sem erro em `fr/app.js`/`zh/app.js`.
- **14 suítes Node/VM de regressão re-executadas, 890/890 sem nenhuma
  falha** (nenhuma toca `fr/app.js`/`zh/app.js`, esperado):
  `test_fase4_engine.js` 34/34, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74, `test_fase6d1_editor_state.js` 99/99, `test_fase6d2_state.js`
  31/31, `test_fase6d3_field_editor.js` 65/65,
  `test_fase6d4a_mc_editor.js` 92/92, `test_fase6d4b_typeanswer_editor.js`
  62/62, `test_fase6d5_cloze_editor.js` 71/71,
  `test_fase6d6_native_persistence.js` 85/85,
  `test_fase6d7_preview_logic.js` 59/59, `test_fase6d8_legacy_conversion.js`
  92/92, `test_fase7b_field_audio_contract.js` 83/83.
- **3 suítes de browser smoke de regressão dos renderers/Preview,
  re-executadas sem falha** (`test_fase6c1_normal_renderer.js`,
  `test_fase6c2_mc_typeanswer_renderer.js`,
  `test_fase6c3_cloze_renderer.js`, e `test_fase7a_browser_smoke.js` --
  este último confirma explicitamente que a resolução de mídia por Field
  da Fase 7a continua intacta, TUDO OK).
- **Browser smoke novo, `test_fase7d_preview_audio_isolation.js`,
  Playwright/Chromium real, FR+ZH, 38 asserções por idioma (76 no
  total), todas `true`** -- cobrindo item a item os cenários A-P pedidos:
  (A/B) Review real -- clicar `.audio-btn` chama `speakFrench`/
  `speakChinese` de verdade, `registerAudioPlay()` dispara,
  `STATE.totalAudioPlays` incrementa; (C/D/E) Preview -- o clique chama a
  função de reprodução de BAIXO NÍVEL (`speakXAudioOnly`, mesma usada
  pelo Review), mas `registerAudioPlay()`/o wrapper `speakX` NUNCA são
  chamados, `STATE.totalAudioPlays` permanece idêntico; (F) XP inalterado
  no Preview; (G) FSRS (`due`/`reps`/`lapses` do CardInstance) inalterado
  no Preview; (H) nenhum registro de Review criado -- `STATE.reviewQueue`/
  `reviewIndex` nunca tocados, `gradeCurrentCard`/`saveState` nunca
  chamados por causa do clique de áudio; (I/J) autoplay E clique manual,
  na MESMA sessão de Preview, nenhum dos dois registra reprodução real;
  (K/L/M/N) os 4 Card Types verificados individualmente -- Normal,
  Múltipla Escolha e Digite a Resposta com Review registrando/Preview
  isolando; Cloze confirmado sem NENHUM `.audio-btn` em nenhum dos 2
  contextos (nunca teve o vazamento, nem precisava de fix); (O/P) FR e ZH
  -- mesmo comportamento de isolamento confirmado nos 2 idiomas (o teste
  inteiro roda 1x por idioma). Cobertura adicional além do pedido
  mínimo: multi-origem (texto que bate um mp3 pré-gerado real do
  `AUDIO_MANIFEST`, ex. "Bonjour !"/"一", VERSUS texto autoral que cai no
  fallback Web Speech API) -- os 2 caminhos de reprodução confirmados
  isolados igualmente no Preview, provando que o isolamento acontece no
  nível certo (a decisão em `wireAudioButtons`), não amarrado a uma
  origem de áudio específica; confirmação explícita de que "Preview sem
  analytics" não virou "Preview sem áudio" -- o botão continua presente,
  clicável, e a função de reprodução é genuinamente invocada. Regressão
  final -- Review real continua registrando áudio E gradando de verdade
  depois de toda a interação com Preview na mesma sessão de teste. **Zero
  page error** em qualquer um dos 2 idiomas (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, documentados em toda a sessão, não relacionados a este
  código).

**Confirmações finais pedidas:** Review real intacto -- confirmado (item
A/B/regressão final, `registerAudioPlay`/`STATE.totalAudioPlays`/grade
real continuam funcionando exatamente como sempre). Preview não gera
nenhuma analytics -- confirmado (item C-J, nos 4 Card Types, nos 2
idiomas, com e sem manifest, autoplay e clique manual). Nenhum achado
fora do escopo desta subfase foi encontrado durante a implementação --
a única pendência já conhecida (botão 🎧 nunca precisou de fix, Cloze
nunca teve o vazamento) foi confirmada, não descoberta agora.

**Escopo respeitado**: só `fr/app.js` + `zh/app.js` tocados (confirmado
por `git status`/`git diff --stat`, 70 linhas +/- em fr, 78 em zh, só
nos pontos documentados acima). Nenhum upload, TTS server-side, UI nova,
MediaRecorder, export Anki, schema, ou mudança em Review real -- todos
explicitamente fora do escopo desta subfase.

Nenhum passo manual pendente pra autora -- 100% client-side, nenhuma
migração/mudança de schema.

Próxima subfase (7e, 7f, 7g ou 7i, conforme a decomposição da auditoria
da Fase 7) só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

## Fase 7e -- upload de áudio por Field (primeira subfase de código de Fase
7 autorizada a introduzir infraestrutura de mídia de verdade)

Primeira subfase da Fase 7 que efetivamente grava e reproduz um arquivo
enviado pela professora/aluna -- as anteriores (7a resolução de mídia por
Field, 7b contrato de `Field.audio`, 7c especificação de UX,
7d isolamento de analytics no Preview) prepararam o terreno sem tocar em
upload/gravação real, exatamente como cada relatório anterior deixou
registrado. TTS server-side e gravação por microfone continuam fora do
escopo (7f/7g), assim como qualquer trabalho em `student_flashcards`/
migração legada em massa/export Anki -- nada disso foi tocado.

**Infraestrutura de Storage usada -- bucket `flashcard-media` (migration
032, Fase 8a) endurecido nesta sessão pela migration `046_flashcard_
media_size_mime_limits.sql`** (aplicada AO VIVO via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg` --
confirmado na auditoria desta fase que o bucket nunca tinha
`file_size_limit`/`allowed_mime_types` configurados desde a criação em
2026-09-22, aceitando qualquer arquivo de qualquer tamanho até agora):
`file_size_limit: 5242880` (5 MiB) e `allowed_mime_types:
['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/wav',
'audio/webm','audio/x-m4a']` -- confirmado ao vivo por `select id, public,
file_size_limit, allowed_mime_types from storage.buckets where
id='flashcard-media'` antes de escrever qualquer linha de código cliente,
não presumido. Nenhum bucket novo criado -- o já existente já era
adequado (leitura pública, escrita restrita à pasta do próprio
`auth.uid()`), só ganhou as 2 travas de infraestrutura que nunca tinha.
Verificado ANTES da migration que zero linha em `teacher_flashcards`/
`own_flashcards` tinha `audio_url` preenchido -- endurecer o bucket não
quebrou nenhum arquivo já referenciado por um cartão real.

**Path do objeto no Storage** -- mesmo padrão já existente desde a Fase
8a (`{userId}/{kind}-{ts}-{rand}.{ext}` pra professora,
`{userId}/self-{kind}-{ts}-{rand}.{ext}` pra aluna), estendido com um
componente de `resourceId` opcional (o id do Field, ex:
`{userId}/audio-{fieldId}-{ts}-{rand}.mp3`) pra rastreabilidade (Seção
5) -- sanitizado defensivamente (`[^a-zA-Z0-9_-]` removido, truncado em
40 caracteres) antes de entrar no path, nunca usado pra decisão de
segurança (a ownership continua vindo só do 1º segmento, `auth.uid()`,
checado pela RLS de Storage já existente). Extensão do arquivo também
sanitizada (`[^a-zA-Z0-9]` removido) -- achado da auditoria: a versão
anterior de `uploadFlashcardMedia`/`uploadOwnFlashcardMedia` derivava a
extensão direto de `file.name.split('.').pop()` sem sanitizar, o que
teoricamente permitiria um `/` entrar no path via um nome de arquivo
malicioso sem extensão (`file.name` sem `.` faz `.pop()` devolver a
string inteira) -- corrigido de passagem nesta subfase (Seção 15).

**Permissões** -- inalteradas: RLS de `flashcard-media` já era
"qualquer autenticado, restrito à pasta do próprio `auth.uid()`" desde
a migration 032, nunca escopada a professora -- funciona pra Admin e
Meus Cartões sem nenhuma mudança de policy. Nenhuma permissão aberta
globalmente, nenhum arquivo privado virou público.

**MIME whitelist** -- fonte é a MESMA lista da migration 046 (nunca uma
lista inventada de conhecimento geral): `FIELD_AUDIO_UPLOAD_MIME_TYPES`
(`shared/flashcard-model.js`) espelha os 8 valores exatos, checados no
cliente ANTES de qualquer chamada de rede (`validateFieldAudioUploadFile`)
e de novo pela policy do bucket (2ª camada real -- "nunca confiar
somente no cliente", regra já travada neste arquivo). `accept="..."` do
`<input type="file">` usa a mesma lista.

**Limite de tamanho** -- 5 MiB (`FIELD_AUDIO_UPLOAD_MAX_BYTES`), mesmo
valor da migration. Justificativa: não existia limite anterior nenhum
no projeto pra esse tipo de mídia (achado da auditoria) -- escolhido um
valor razoável pra um clipe de pronúncia/explicação curta de flashcard
(alguns minutos de MP3 comprimido cabem sobrando em 5 MiB), nunca um
podcast inteiro. Validado no cliente (feedback imediato) E no bucket
(fronteira de segurança real).

**Fluxo nativo** -- Field -> professora/aluna escolhe um arquivo (input
real, sem seletor de origem funcional pra URL/TTS/gravação ainda, ver
abaixo) -> validação client-side (MIME+tamanho, `validateFieldAudioUploadFile`)
-> `uploadFn(file, 'audio', fieldId)` (`uploadFlashcardMedia`/
`uploadOwnFlashcardMedia`, agora aceitando `kind`+`resourceId` opcional)
-> só DEPOIS do sucesso, `updateFieldInEditorState(editorState, fieldId,
{audio:{type:'upload', url, uploadedAt, mimeType}})` -- nunca antes.
Falha: `field.audio` permanece exatamente como estava (nunca sobrescrito
com um shape parcial/inválido), mensagem de erro transitória no próprio
bloco do Field, input reabilitado. `editorState`/`revision` nunca são
tocados nesse caminho -- só o Note em si é salvo, quando a professora/
aluna clica Salvar/Criar.

**Comportamento de substituição** -- escolher um novo arquivo quando já
existe áudio NUNCA apaga o antigo antes do novo terminar: `field.audio`
só é sobrescrito depois do `await uploadFn(...)` resolver com sucesso
(confirmado por teste dedicado -- `field.audio` inalterado enquanto a
Promise do upload está em voo). Se falhar, o áudio anterior continua lá,
tocável normalmente.

**Remoção** -- distinção explícita entre (A) remover a REFERÊNCIA
(`field.audio = null`, botão "🗑 Remover áudio") e (B) apagar o objeto
físico do Storage -- **nunca (B) numa remoção/substituição explícita**.
Motivo, documentado no próprio código (`wireFieldAudioBlockFor`,
`shared/flashcard-field-editor.js`): `cloneFieldIntoEditorState` (Fase
6D.3) copia `audio` POR VALOR (mesma URL) -- 2 Fields podem compartilhar
o mesmo objeto no Storage sem nenhuma contagem de referências, então
deletar fisicamente ao remover/substituir arriscaria quebrar o áudio de
um Field CLONADO que ainda aponta pra lá. Nenhum sistema de garbage
collection foi construído nesta fase (explicitamente fora do escopo,
Seção 10) -- arquivos órfãos de remoção/substituição ficam documentados
aqui como candidatos a uma rotina de limpeza futura, nunca apagados às
cegas agora.

**Compensação de atomicidade Storage<->DB (Seção 14)** -- caso
DIFERENTE do anterior, tratado com delete físico de verdade: um upload
bem-sucedido NESTA MESMA sessão de edição (`editorState.
__freshMediaUploads`, populado a cada sucesso) nunca é referenciado por
nenhuma linha real enquanto a Note ainda não foi salva -- se o INSERT/
UPDATE que a salvaria falhar logo em seguida (ou a edição for
cancelada), o objeto no Storage é garantidamente órfão, seguro remover
(`compensateFreshMediaUploads`, `shared/flashcard-native-persistence.js`,
best-effort, nunca lança, nunca mascara o erro de save que já está sendo
mostrado). Num save com MÚLTIPLOS alunos selecionados (Admin, um insert
por aluno com o MESMO áudio embutido), só compensa se TODAS as inserções
falharem -- uma falha PARCIAL já deixa o áudio referenciado por pelo
menos 1 linha real, nunca seguro deletar nesse caso. Depois de um save
bem-sucedido, `clearFreshMediaUploads()` só limpa a lista sem tocar o
Storage -- os uploads passam a estar legitimamente referenciados.

**Revision** -- nenhuma regra nova inventada: `noteEditorStateContentForComparison()`
(Fase 6B/7b, `shared/flashcard-editor-state.js`) já incluía `audio` por
Field na comparação de conteúdo desde que o contrato de `Field.audio`
foi travado -- editar/substituir/remover áudio já disparava corretamente
`noteEditorStateRequiresNewRevision()` sem precisar de nenhuma mudança
de código nesta fase (confirmado pelo teste de browser: substituir áudio
+ salvar incrementa `revision` de verdade).

**Relação com Preview** -- nenhuma mudança em `shared/flashcard-preview.js`
foi necessária: Preview já delega 100% aos mesmos 4 renderers reais
(Fase 6D.7), que já leem `field.audio`/`resolveFieldAudioUrl()` desde a
Fase 7a/7b -- um Field com áudio recém-enviado aparece no Preview
automaticamente, sem nenhum código específico. O isolamento de
analytics (Fase 7d, `card.__isPreviewCard`) já cobre o autoplay de TTS;
o botão de áudio PRÓPRIO (`.custom-audio-btn`, o que esta fase alimenta)
nunca chamou `registerAudioPlay()` em nenhum contexto desde que foi
escrito (achado já registrado na Fase 7d) -- confirmado de novo aqui
por teste dedicado (`STATE.totalAudioPlays` inalterado depois de montar
um Preview com áudio).

**Limitações conhecidas, documentadas sem correção nesta fase**:
- Nenhuma exclusão física de arquivo em remoção/substituição (ver acima)
  -- rotina de limpeza de órfãos é trabalho de uma fase futura, se algum
  dia justificado pelo volume real de uso.
- Origem de áudio "URL externa"/"Texto para voz"/"Gravação" aparecem no
  `<select>` do editor (Seção 8 -- "o seletor deve continuar compatível
  com os 5 valores") mas o `<select>` inteiro fica `disabled` -- só
  Upload é funcional nesta fase, nada finge que as outras opções já
  funcionam.
- `student_flashcards`(`own_flashcards`)/editor de Field JÁ ganharam
  upload (Meus Cartões usa a MESMA infraestrutura que Admin, só trocando
  `uploadFn`/`deleteFn` pros equivalentes "own") -- diferente de outras
  fases desta feature que restringiam a professora, aqui os dois
  contextos foram cobertos de propósito desde o início (Seção 7).
- Imagem por Field continua sem UI de upload (só áudio nesta fase,
  Seção 8/19) -- indicador textual read-only de `field.image`
  inalterado.
- Nenhuma validação de duração de áudio (só tamanho em bytes) --
  suficiente pro caso de uso (clipe curto), sem necessidade adicional
  identificada.

**Pontos futuros pra TTS (7f)/gravação (7g)**: o shape `Field.audio`
(`type:'tts'`/`type:'recording'`) já existe desde a Fase 7b, pronto pra
receber essas 2 subfases -- 7f precisa de infraestrutura NOVA (Edge
Function + chave de API de TTS, nunca presumida como já ativa) além da
UI; 7g precisa de `MediaRecorder`/permissão de microfone, mas reaproveita
a MESMA infraestrutura de upload construída aqui (o resultado de uma
gravação é só mais um `File`/`Blob` subindo pelo mesmo `uploadFn`).

**Testes realizados:**
- `node --check` sem erro nos 10 arquivos tocados (`shared/flashcard-
  model.js`, `shared/teacher-flashcards.js`, `shared/own-flashcards.js`,
  `shared/flashcard-field-editor.js`, `shared/flashcard-mc-editor.js`,
  `shared/flashcard-typeanswer-editor.js`, `shared/flashcard-cloze-editor.js`,
  `shared/flashcard-native-persistence.js`, `shared/admin-flashcards.js`,
  `shared/my-flashcards.js`).
- **Suíte Node/VM nova, 46/46** -- cobre os cenários A-T pedidos
  explicitamente: whitelist/limite espelham a migration 046 (não
  inventados); upload válido -> `Field.audio.type==='upload'`/URL/
  mimeType/uploadedAt persistidos; arquivo de tipo/tamanho inválido
  nunca chama `uploadFn`; upload falho preserva o áudio anterior
  intacto; substituição só troca a referência DEPOIS do sucesso
  (confirmado que `field.audio` não muda enquanto a Promise está em
  voo); remoção limpa só a referência; clonar Field preserva áudio;
  persistência nativa preserva áudio com ROUND-TRIP REAL pelo motor
  (`nativeContentColumnsFromEditorState` -> `buildEngineCardsFromRow` ->
  `resolveCardContentView`); `resolveCardField` isolado resolve
  `audioUrl` corretamente; `resourceId` malicioso sanitizado nunca vira
  path arbitrário; compensação best-effort chama `deleteFn` só nos
  uploads frescos da sessão, nunca em save bem-sucedido; Admin e Meus
  Cartões confirmados usando a MESMA infraestrutura parametrizada, nunca
  duas implementações.
- **8 suítes de regressão de fases anteriores (Fase 4-7b), re-executadas,
  936/936 no total desta rodada (incluindo os 46 novos) sem nenhuma
  falha** -- confirma zero regressão introduzida.
- **Achado durante a validação, corrigido antes de reportar**: a
  suíte arquitetural de `test_fase6d5_cloze_editor.js` (grep por
  `.insert(`/`.update(`/`.from(`/`supabaseClient` em código executável)
  falsou-positivo contra `Array.from(container.querySelectorAll(...))`
  que eu tinha usado em `wireClozeEditor` pra identificar o Field de
  frase por exclusão -- o grep casa a SUBSTRING `.from(`, não só chamadas
  de rede. Trocado por `[...container.querySelectorAll(...)]` (mesmo
  resultado, sem a substring ambígua) -- confirmado que não era um bug
  real (nenhuma chamada de rede nova), só uma colisão textual com um
  teste de fase anterior; suíte volta a passar 71/71 depois do ajuste.
- **Browser smoke novo, FR+ZH, `52/52 checks`, via arquivo de upload
  REAL** (`page.setInputFiles({name,mimeType,buffer})`, sem depender de
  nenhum arquivo em disco) passando pelo código de PRODUÇÃO de ponta a
  ponta (nunca uma função de upload de teste paralela -- só o nível de
  rede de `storage.upload()`/`getPublicUrl()`/`remove()` foi
  interceptado): (1) **Criação (Admin)** -- 2 Fields adicionados via UI
  real, upload de áudio no 1º Field, `<audio>` de preview aparece com a
  URL certa ANTES de salvar, submit cria a linha real com `fields[0].audio`
  persistido, "reload" (`createNativeNoteEditorStateFromRow` sobre a
  linha real) confirma o áudio sobrevivendo ao round-trip completo; (2)
  **Edição/substituição** -- abre o cartão nativo recém-criado, mesmo
  `fieldId` preservado, novo arquivo sobe, URL troca só depois do
  sucesso, salva com confirmação de reset, linha real atualizada com a
  URL nova, `revision` incrementado; (3) **Falha** -- upload simulado
  falhando (`window.__UPLOAD_SHOULD_FAIL__`) confirma o áudio ANTERIOR
  intacto, mensagem de erro visível; (4) **Remoção** -- remove a
  referência, `field.audio===null` no estado ANTES de salvar, salva,
  linha real confirma ausência, e confirmado que a remoção explícita
  NUNCA chama `storage.remove()` (0 chamadas registradas -- só a
  compensação de falha/cancelamento chamaria, testada isoladamente no
  Node/VM); (5) **Review** -- cartão nativo real com áudio no Field de
  front, `renderNormalCard()` real produz o botão `.custom-audio-btn`
  com a URL certa; (6) **Preview** -- mesmo mecanismo, `STATE.
  totalAudioPlays` confirmado inalterado; (7) **Meus Cartões (own)** --
  mesmo fluxo de criação com upload real, linha `own_flashcards`
  confirmada com o áudio persistido, usando `uploadOwnFlashcardMedia`
  (função DIFERENTE da usada pelo Admin, confirmado que os 2 contextos
  nunca compartilham a mesma função, só o mesmo padrão de integração).
  Testado nos 2 idiomas -- FR completo (todos os 7 blocos), ZH com o
  fluxo de criação central (upload real + persistência), suficiente pra
  confirmar que o código (idêntico nos 2 idiomas, sem branch por idioma
  em nenhum dos arquivos tocados) funciona igual. **Console**: só os
  mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes (proxy de saída
  deste sandbox, documentados em toda a sessão) + o `console.error`
  ESPERADO da própria cena de Falha (item 3 acima, disparado de
  propósito pra confirmar o comportamento de preservação) -- zero erro
  novo/inesperado atribuível a este código.
- **Nenhum teste de integração Storage real (Seção 21) foi executado
  contra o projeto Supabase de produção** -- diferente das migrations
  (aplicadas e verificadas ao vivo), um upload de arquivo real deixaria
  um objeto órfão no bucket `flashcard-media` sem um mecanismo de limpeza
  garantido nesta sessão (a função de remoção só está disponível pelo
  código cliente, não por uma query SQL direta contra o Storage) --
  documentando a limitação em vez de arriscar lixo em produção, conforme
  a própria instrução autorizava ("se não puder garantir limpeza, não
  execute o teste real"). O contrato de `uploadFlashcardMedia`/
  `uploadOwnFlashcardMedia` (path/validação/retorno) foi validado por
  leitura + `node --check` + o smoke test de navegador acima, que exercita
  a função de produção real contra um stub de rede -- cobertura
  equivalente sem o risco de órfão em produção.

**Confirmações finais (Seção 25)**: `git status`/`git diff --stat`
mostram só os 10 arquivos `.js` já listados + a migration `046` (nova) --
nenhum arquivo fora do escopo desta subfase tocado; nenhum dado legado
alterado (migration 046 só endurece o bucket, nenhum UPDATE em
`teacher_flashcards`/`own_flashcards`); nenhuma mudança de schema SQL
além da já necessária (`file_size_limit`/`allowed_mime_types` do bucket,
sem nenhuma coluna/tabela nova); nenhum arquivo de teste abandonado no
Storage real (nenhum upload real foi feito contra produção, ver acima).

Nenhum passo manual pendente pra autora -- migration 046 já aplicada ao
vivo via `mcp__Supabase__apply_migration`.

**PARE conforme instrução explícita -- 7f (TTS), 7g (gravação) e 7i
(export Anki com mídia) NÃO foram implementados nesta subfase.** Próxima
etapa só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

## Fase 7f -- Auditoria/arquitetura: TTS explícito por Field (SÓ
AUDITORIA/ESPECIFICAÇÃO, zero código funcional alterado)

Instrução de 25 seções, mesma disciplina de "documentação antes de
código" já usada na auditoria original da Fase 7 (`dcb0528`) -- desta
vez focada especificamente em desenhar como TTS explícito por Field
(`Field.audio.type==='tts'`, contrato já travado na Fase 7b) DEVERIA
funcionar, sem implementar nenhuma geração de verdade. Releitura
completa antes de escrever qualquer linha: `CLAUDE.md` (seções Fase
7/7a/7b/7c/7d/7e), `fr/app.js` (TTS/áudio inteiro, linhas 17-400 e os 4
renderers de revisão), `shared/flashcard-model.js` (contrato de
`Field.audio`, os 4 resolvers), `shared/flashcard-editor-state.js`,
`shared/flashcard-native-persistence.js`, `shared/flashcard-field-editor.js`
(bloco de áudio da Fase 7e), `shared/flashcard-preview.js`,
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, além de
`shared/supabase_migrations/046_flashcard_media_size_mime_limits.sql` e
`fr/scripts/regenerate_broken_audio.py`. Confirmado por grep, não
presumido: nenhuma Edge Function de TTS existe hoje (`supabase/functions/`
só tem `notification-cron`/`push-send`/`report-reply-send`), nenhuma
referência a chave de API de TTS (`GOOGLE_TTS`/`ELEVENLABS`/
`AZURE_SPEECH`/etc.) em lugar nenhum do repositório -- mesma regra geral
do topo deste arquivo ("nunca presumir infraestrutura externa ativa"):
o pipeline offline (`fr/scripts/regenerate_broken_audio.py`, Google
Cloud TTS neural, `fr-FR-Chirp3-HD-Achernar`/`cmn-CN-Chirp3-HD-Achernar`)
roda manualmente, fora do runtime do app, e não prova que existe
credencial nenhuma acessível a um servidor/Edge Function do produto.

### 1) Estado atual (auditado, não presumido)

**Duas camadas de reprodução de áudio hoje, já bem separadas uma da
outra, confirmadas de novo por leitura -- nenhuma das duas muda nesta
auditoria:**

- **Camada A -- pronúncia AUTOMÁTICA por idioma** (🔊, `audioBtnHTML`/
  `wireAudioButtons`/`speakFrench`/`speakChinese`, fr/zh `app.js`): serve
  QUALQUER texto do app (trilha, exercícios, flashcards) de forma
  genérica, sem nenhuma relação com `Field.audio`. `canSpeakFrench(text)`
  decide elegibilidade (manifest OU voz do navegador carregada);
  elegibilidade de MOSTRAR o botão nos flashcards é
  `isStudyLanguageField(field, APP_KEY)` -- só compara `field.lang` contra
  o idioma do site, nunca lê `field.audio`. Fluxo de reprodução:
  `AUDIO_MANIFEST[text]` (lookup por STRING LITERAL, gerado offline) →
  `playPregeneratedAudio()` (mp3 real, `PREGEN_AUDIO_RATE=0.9`) → senão
  `SpeechSynthesisUtterance` (Web Speech API do navegador, `fr-FR`/
  `zh-CN`, `rate:0.9`, com retry de 800ms se `onstart` nunca disparar).
  **`AUDIO_MANIFEST` só cobre vocabulário/frases da TRILHA** (gerado por
  um script Python offline contra `content.js`) -- texto autorado por
  professora/aluna num Field quase nunca bate uma chave, então o botão
  🔊 de um flashcard hoje SEMPRE cai no Web Speech API ao vivo, nunca na
  voz neural pré-gerada.
- **Camada B -- áudio EXPLÍCITO por Field** (🎧, `customAudioBtnHTML`/
  `wireCustomAudioButtons`, Fase 8a, estendida na 7a/7b/7e): serve
  QUALQUER `resolveFieldAudioUrl(field.audio)` não-nulo, através do MESMO
  botão/função pros 3 tipos que já têm `.url` resolvível hoje (`url`,
  `upload`, e -- achado confirmado nesta auditoria, ver "achado 1.1"
  abaixo -- `tts` com `generatedUrl` já preenchido). `wireCustomAudioButtons`
  nunca chama `registerAudioPlay()` em nenhum contexto (Review ou
  Preview) -- só `new Audio(url).play()`. Distinta e sem sobreposição da
  Camada A (classes CSS diferentes, `.audio-btn` vs `.custom-audio-btn`,
  ambas podem coexistir na mesma tela quando um Field tem os dois).

**Achado 1.1, confirmado por leitura de `resolveFieldAudioUrl()`
(`shared/flashcard-model.js:173`) e dos 4 renderers -- o caminho de
REPRODUÇÃO de um TTS já gerado já funciona hoje, sem nenhuma mudança de
código**: `resolveFieldAudioUrl(audio)` já trata `type:'tts'` lendo
`audio.generatedUrl` (em vez de `.url`) desde a Fase 7b; `resolveCardField()`
já expõe isso como `audioUrl` pra qualquer Field, nos 4 resolvers; os 4
renderers já leem esse `audioUrl` genericamente (`view.front.audioUrl`,
`view.prompt.audioUrl`, `view.answer.audioUrl` só depois de revelado,
`view.audioUrl` do Field de texto do Cloze) e desenham `customAudioBtnHTML(url)`
sem checar `field.audio.type` em nenhum ponto. **Ou seja: se um Field
algum dia tiver `{type:'tts', generatedUrl:'https://.../x.mp3', ...}`,
o botão 🎧 já aparece e já toca o arquivo certo, em Review E em Preview,
sem tocar em nenhum renderer** -- confirma que a arquitetura "Field é a
fonte, resolver projeta, renderer só consome" (decisão desde a Fase 6C)
já absorve TTS de graça no lado da LEITURA. O que falta inteiramente é
a ESCRITA (geração/cache de `generatedUrl`) e a UI de configuração --
exatamente o escopo desta auditoria.

**Camada de upload (Fase 7e, `shared/teacher-flashcards.js`/
`shared/own-flashcards.js`)**: `uploadFlashcardMedia`/
`uploadOwnFlashcardMedia(file, kind, resourceId)` -> bucket
`flashcard-media` (migration 032, endurecido pela 046 com
`file_size_limit:5242880`/`allowed_mime_types` -- os mesmos 8 valores
espelhados em `FIELD_AUDIO_UPLOAD_MIME_TYPES`, `shared/flashcard-model.js`).
Path `{userId}/{kind}-{resourceId?}-{ts}-{rand}.{ext}` (professora) /
`{userId}/self-...` (aluna). RLS: qualquer autenticado, restrito à
própria pasta -- nunca escopado a papel de professora. Só aceita `kind:
'audio'`/`'image'` hoje; a validação de MIME/tamanho (`validateFieldAudioUploadFile`)
já existe e é reutilizável tal e qual por um upload de TTS gerado
server-side (se o resultado da geração virar um arquivo subido pelo
MESMO mecanismo -- ver seção "Storage" abaixo).

**Editor de áudio (Fase 7e, `shared/flashcard-field-editor.js`,
`renderFieldAudioBlockHTML`/`wireFieldAudioBlockFor`)**: já tem o
`<select>` de origem com as 5 opções (`Sem áudio`/`URL externa (em
breve)`/`Arquivo (upload)`/`Texto para voz (em breve)`/`Gravação (em
breve)`) -- hoje o `<select>` inteiro fica `disabled`, só o painel de
upload funciona. `fieldAudioIndicatorText(audio)` já distingue
`'🎧 TTS configurado (áudio ainda não gerado)'` de
`'🎧 áudio TTS gerado'` (baseado em `generatedUrl` presente/ausente) --
texto já escrito, sem nenhum controle real por trás ainda (nenhum código
hoje pode produzir um Field com `type:'tts'`, exceto teste/dado
construído à mão). Reutilizado nos 2 editores (Admin/Meus Cartões) e no
Field de texto do Cloze (via chamada explícita, já que Cloze não passa
por `renderFieldEditorHTML()` genérico) -- confirma que um futuro
controle de "Gerar áudio" herdaria os MESMOS 3 pontos de integração sem
nenhuma duplicação.

**Preview (`shared/flashcard-preview.js`)**: confirmado por grep nesta
sessão -- ZERO menção a `audio`/`Audio`/`speak`/`TTS` no arquivo inteiro.
Delega 100% aos mesmos 4 renderers reais (Fase 6D.7) -- qualquer
comportamento de TTS que os renderers ganharem se propaga pro Preview
automaticamente, sem nenhum código específico de Preview. O isolamento
de analytics (Fase 7d, `card.__isPreviewCard`) já suprime tanto o
autoplay (Camada A) quanto redireciona o clique manual pra
`playAudioPreview()` (sem `registerAudioPlay()`) -- mas só cobre a
Camada A/botão 🔊; o botão 🎧 (`wireCustomAudioButtons`) nunca chamou
`registerAudioPlay()` em nenhum contexto desde que foi escrito (Fase 7d
já registrou isso), então já está correto pra TTS/upload/URL sem
precisar de nenhuma mudança.

### 2) Arquitetura proposta -- provedor de TTS

**Nenhum provedor com credencial ativa existe hoje** (confirmado acima)
-- esta seção compara opções, sem presumir que alguma já está disponível:

| Opção | Qualidade | Custo/infra | Runtime necessário |
|---|---|---|---|
| **Web Speech API (atual, Camada A)** | Inconsistente entre navegador/SO, robótica em muitos | Zero -- já embutido no navegador | Nenhum -- 100% client-side |
| **API de TTS externa (Google Cloud TTS/outro), via Edge Function** | Alta, consistente (mesma voz neural do manifest offline) | Precisa de conta+chave de API (NÃO existe hoje, mesma regra de "não presumir Resend/Stripe/etc. antes de confirmar ao vivo") + Edge Function nova (mesmo padrão de `notification-cron`/`push-send`) | Servidor (Supabase Edge Function) |
| **Pipeline offline (como a trilha já usa)** | Alta, mas manual/batch, roda por script Python fora do produto | Já existe, mas não é ACIONÁVEL a partir do editor web em tempo real | Nenhum runtime -- inviável pra conteúdo autorado ao vivo |

**Recomendação, não implementada**: caminho do meio (Edge Function nova
com um provedor de TTS externo, reaproveitando o MESMO padrão já
validado pra Resend -- `mcp__Resend__*`/`RESEND_API_KEY` em Secrets do
Supabase) é o único que entrega qualidade consistente pra conteúdo
DINÂMICO (autorado em tempo real por qualquer professora/aluna, nunca
sabido de antemão como o pipeline offline da trilha). **Web Speech API
continua tendo um papel** (ver seção 3), mas nunca como o mecanismo de
geração oficial/persistente -- só como fallback de reprodução quando não
há `generatedUrl` (papel que já desempenha hoje, sem mudança).

### 3) Papel do Web Speech API na arquitetura nova

**Fallback de reprodução, nunca mecanismo de geração persistente** --
decisão explícita, resolve a pergunta do item 4 da instrução: quando um
Field `type:'tts'` não tem `generatedUrl` (config existe, áudio ainda
não gerado -- estado já suportado pelo contrato da 7b), Review/Preview
NÃO devem cair automaticamente pro Web Speech API como se fosse "o
áudio desse Field" -- confundiria "TTS configurado, ainda sem arquivo"
com "sem áudio nenhum, tenta a pronúncia automática genérica" (2
conceitos diferentes, ver Regras de Review/Preview abaixo, itens 16/17).
O Web Speech API continua servindo exatamente o papel que já tem hoje
(Camada A, pronúncia automática por idioma, `isStudyLanguageField`) --
NUNCA é acionado como consequência de um Field ter `type:'tts'` sem
`generatedUrl`. Um `type:'tts'` sem `generatedUrl` simplesmente não
produz `audioUrl` (já é o comportamento de `resolveFieldAudioUrl` hoje,
sem nenhuma mudança necessária) -- a Camada A (🔊) continua funcionando
em paralelo, do mesmo jeito que já funciona pra um Field sem `audio`
nenhum.

### 4) Semântica exata de `text`/`language`/`voiceId`/`rate`

Já travada na Fase 7b, reafirmada aqui sem nenhuma mudança de contrato
-- releitura confirma que continua correta:
- **`text`** (nullable) -- override do texto a sintetizar; `null` = usa
  `field.content.value` no momento da geração. Nunca lido por nenhum
  código hoje (sem geração ainda) -- na hora de implementar 7f-código, é
  o texto que a Edge Function de geração recebe.
- **`language`** (nullable, ex: `'fr-FR'`/`'zh-CN'`) -- locale EXPLÍCITO
  de síntese, **eixo deliberadamente independente de `Field.lang`**
  (`'fr'`/`'zh'`, idioma PEDAGÓGICO do Field). Nunca derivado
  automaticamente por nenhum resolver/renderer -- confirmado de novo por
  grep nesta auditoria, nenhuma função lê `field.lang` pra popular
  `audio.language`. Uma futura UI PODE sugerir um valor inicial a partir
  de `field.lang` (conveniência de formulário), mas o valor gravado é
  sempre a escolha explícita (ou `null`).
- **`voiceId`** (nullable) -- id da voz dentro do provedor escolhido
  (dependente de qual provedor a 7f-código escolher -- não travado
  aqui). `null` = "provedor decide/usa a voz padrão do idioma".
- **`rate`** (nullable, número) -- velocidade de síntese. `null` = usa
  o padrão do provedor (equivalente a `1.0`, ou ao `0.9` já calibrado
  pra pronúncia normal hoje -- decisão de default fica pra 7f-código).

### 5) Cloze -- TTS por marca, não por Field

**Reafirma explicitamente a decisão da Fase 6B/6D, sem reabrir**: um
Field de Cloze com múltiplas marcas (`{{c1::...}}`, `{{c2::...}}`) tem
UM SÓ objeto `field.audio` -- todas as CardInstances derivadas dessa
Note (c1, c2, ...) compartilham o MESMO `textFieldIndex`, logo a MESMA
origem de áudio (confirmado por leitura de `resolveClozeCardView()`,
que resolve `textFieldView.audioUrl` uma vez só, nunca por marca). Isso
já é estruturalmente garantido, sem nenhum código especial -- **nenhuma
mudança nesta auditoria, nem proposta pra 7f-código**: TTS de Cloze
sintetiza a FRASE INTEIRA (com a resposta embutida em texto puro, nunca
a sintaxe `{{cN::...}}` -- ver achado de segurança já registrado na
sessão "7 propostas" sobre `card.clozeSentence` nunca ser interpolado
cru; o texto que vai pro provedor de TTS precisa ser o texto RENDERIZADO/
revelado, nunca a marcação bruta). Cada CardInstance (c1/c2/...) toca o
MESMO áudio da frase completa quando aparece na fila -- consistente com
o comportamento de hoje (Camada A também já toca a frase completa por
trás da lacuna, nunca uma palavra isolada).

### 6) Múltipla Escolha -- só o prompt, nunca a resposta/distratores

**Reafirma a correção já aplicada na Fase 7a**: `customAudioUrl =
view.prompt.audioUrl` (nunca mais fallback pro `correct`, achado #1 da
auditoria original). Pra TTS explícito, a MESMA regra vale sem
exceção: só o Field de `role:'prompt'` pode ter `type:'tts'` gerado e
tocado ANTES da resposta ser escolhida -- gerar TTS pro Field de
`role:'answer'`/`role:'distractor'` não é proibido no MODELO de dado
(um Field qualquer pode ter `field.audio`), mas a UI de Review NUNCA
deve tocar esse áudio automaticamente nem oferecer um botão pra tocá-lo
ANTES de `answered===true` -- vazaria a resposta certa pelo ouvido,
exatamente o vazamento que a Fase 7a já fechou pra upload/URL. **Nenhuma
geração automática "pra todas as alternativas de uma vez"** -- cada
Field de MC (prompt/answer/distractor) teria seu PRÓPRIO controle de
"Gerar áudio" na UI futura (7e já suporta isso, `renderFieldAudioBlockHTML`
já é por-Field, reutilizado em cada um dos até 5 Fields de um MC), mas
gerar é sempre uma ação EXPLÍCITA por Field, nunca em lote.

### 7) Digite a resposta -- timing prompt vs. answer, relação com `pinyinFieldId`

Mesma regra já em vigor desde a Fase 7a: `view.prompt.audioUrl` sempre
disponível (o prompt nunca é "a resposta", sempre visível desde o
início); `view.answer.audioUrl` só lido/mostrado quando
`answered===true` (achado #2 da auditoria original, já corrigido).
**TTS não muda esse timing** -- um Field de resposta com `type:'tts'`
gerado (`generatedUrl` presente) só toca depois de revelado, mesma
regra de upload/URL. `pinyinFieldId` continua sendo o mecanismo de
COMPARAÇÃO (zh: o que a aluna digita é pinyin, o que é revelado/
mostrado é hanzi, via `resolveTypeAnswerCardView`'s `compareAnswerText`)
-- **eixo INDEPENDENTE de TTS**: o áudio de um Field zh (hanzi) toca a
pronúncia do HANZI (o texto do próprio Field), nunca do pinyin -- o
Field satélite de pinyin é só texto de comparação, não ganha `audio`
próprio nem faz sentido ganhar (pinyin não é "falado" como um idioma
separado, é a transcrição do mesmo som que o Field de hanzi já
representa).

### 8) Chinês/mandarim -- nenhuma regra nova além do já existente

`Field.lang` continua `'zh'`/`'zh-pinyin'`/`'fr'`/`'pt-BR'` (Fase 6D.3),
nunca confundido com `audio.tts.language` (locale de síntese, ex:
`'zh-CN'`). Um Field zh-pinyin não deveria, em princípio, ganhar TTS
próprio (não existe "pronúncia do pinyin" distinta da pronúncia do
hanzi que ele acompanha) -- mas o CONTRATO não impede tecnicamente
(qualquer Field pode ter `field.audio`); é uma convenção de UX pra 7f-
código decidir se vale a pena ESCONDER o bloco de áudio nos Fields
satélite de pinyin (`field.pinyinFieldId` apontado por outro Field), não
uma restrição do modelo.

### 9) `generationKey` -- definição formal

**Entradas que participam do hash** (ordem fixa, sempre as mesmas 6,
concatenadas de forma determinística antes de hashear -- ex:
`sha256(text|language|voiceId|rate|providerModelId|configVersion)`):
1. `text` EFETIVO (o override `audio.text` se presente, senão
   `field.content.value` no momento do cálculo) -- nunca o texto bruto
   de Cloze com marcação, sempre o texto que de fato seria enviado ao
   provedor (ver seção 5).
2. `language` (`audio.language`, nunca `field.lang`).
3. `voiceId` (`audio.voiceId`).
4. `rate` (`audio.rate`).
5. **`providerModelId`** (novo conceito, não existente no contrato 7b --
   ex: `"google-tts-chirp3-hd"` ou equivalente) -- identifica QUAL
   provedor/modelo gerou o áudio; trocar de provedor no futuro (ex:
   migrar de um serviço pra outro) precisa invalidar o cache mesmo que
   texto/idioma/voz/velocidade não tenham mudado, porque o ÁUDIO
   RESULTANTE seria diferente.
6. **`configVersion`** (novo conceito -- um inteiro/string de versão do
   próprio algoritmo de geração, ex: se o prompt/parâmetros enviados ao
   provedor mudarem numa atualização futura do código de geração) --
   permite invalidar cache em massa sem precisar tocar em nenhum dado
   de Field, só incrementando uma constante no código da 7f-código.

`generationKey` continua **dado DERIVADO, nunca fonte de verdade** (as 6
entradas acima é que são a fonte -- reafirma a Fase 7b). "Desatualizado"
(stale) é sempre um estado CALCULADO na hora (comparar o `generationKey`
recém-computado contra o já persistido em `audio.generationKey`), nunca
um booleano persistido -- mesma regra já especificada na Fase 7c.

**Regra de QUAL texto invalida** (já especificada na Fase 7c, reafirmada
sem mudança): se `audio.text` é `null` (caso comum), editar
`field.content.value` conta como mudança de texto; se `audio.text` é um
override explícito, editar `field.content.value` NÃO invalida nada.

### 10) Não destruir `generatedUrl` válido -- estado representável?

**Checado explicitamente contra o shape exato da Fase 7b -- SIM, já é
suficiente, nenhuma mudança de shape necessária.** O contrato já separa
CONFIGURAÇÃO (`text`/`language`/`voiceId`/`rate`) de ATIVO RESOLVIDO
(`generatedUrl`/`generatedAt`) desde que foi desenhado -- os dois podem
divergir livremente: é perfeitamente representável hoje ter
`generatedUrl:'https://.../velho.mp3'` (ainda válido, tocável) enquanto
`text`/`voiceId`/`rate` já foram editados pra uma config NOVA (ainda não
gerada pra essa config). O único elemento que FALTA no shape pra
representar "pendente/erro" de forma persistida é justamente o que a
Fase 7c já decidiu deliberadamente NÃO adicionar (erro é sempre
transiente/só-de-UI, nunca persistido -- ver Fase 7c, seção D, item 4) --
"pendente" já é representável (`generationKey` calculado ≠
`audio.generationKey` persistido = pendente/desatualizado; nenhum campo
booleano extra necessário). **Nenhuma mudança de shape proposta.**

**Regra de não-destruição, formal**: uma tentativa de geração que FALHA
nunca escreve em `field.audio` -- só um erro transitório de UI (toast,
mesmo padrão já usado no resto do app). Uma tentativa que TEM SUCESSO só
escreve depois de confirmado (`generatedUrl`/`generatedAt`/
`generationKey` atualizados atomicamente, os 3 juntos, nunca um sem os
outros -- evita um estado intermediário onde `generationKey` já bate mas
`generatedUrl` ainda é o antigo, ou vice-versa). Entre o clique em
"Gerar"/"Regenerar" e a resposta, o `generatedUrl` ANTIGO continua
tocável (o botão de ouvir não desaparece durante uma geração em curso).

### 11) Concorrência

Cenário: duplo-clique em "Gerar áudio", ou 2 abas editando o mesmo
cartão. Regra proposta (client-side, sem infraestrutura de lock
server-side -- consistente com o nível de rigor já aplicado a outros
controles deste editor, ex: teto de 20 cartões da Fase 5.1, "trava de
UI, não fronteira de segurança"): (1) o botão "Gerar"/"Regenerar" fica
`disabled` assim que clicado, até a Promise resolver -- impede o
duplo-clique óbvio na MESMA aba; (2) cada requisição de geração carrega
consigo o `generationKey` que ela está tentando satisfazer (calculado no
momento do clique); quando a resposta volta, só aplica o resultado ao
`field.audio` **se o `generationKey` da resposta ainda bate com o
`generationKey` recém-recalculado do estado ATUAL do Field** -- se a
pessoa editou o texto enquanto a geração antiga estava em voo, o
resultado antigo (agora obsoleto) é descartado silenciosamente em vez de
sobrescrever a config nova por engano (evita que um resultado
"atrasado" clobber um estado mais fresco -- exatamente o requisito do
item 11 da instrução). Duas abas simultâneas: sem lock distribuído
nesta fase -- a MESMA regra de comparação de `generationKey` já evita
que uma resposta atrasada de uma aba sobrescreva o resultado mais novo
que a outra aba já salvou, na maioria dos casos reais (edição
colaborativa em tempo real no mesmo cartão nunca foi um requisito desta
feature em nenhuma fase anterior).

### 12) Estratégia de cache

**Escopo do cache**: por `generationKey`, não por usuário/global
separadamente -- 2 Fields DIFERENTES (de professoras diferentes, ou da
mesma professora em 2 cartões) com texto/idioma/voz/velocidade
IDÊNTICOS produziriam o MESMO `generationKey` e, em teoria, poderiam
reaproveitar o MESMO arquivo gerado -- mas esta auditoria NÃO propõe uma
tabela de cache-por-`generationKey` compartilhada entre Fields/contas
(mesma decisão já tomada na Fase 7c: "aceitável ter áudios idênticos
redundantes, custo de Storage conhecido, não escondido" -- introduzir
deduplicação cross-Field/cross-conta é complexidade desproporcional ao
problema, mesmo padrão de decisão já usado repetidamente nesta feature
pra não construir infraestrutura especulativa). Cache é, na prática, POR
FIELD -- `audio.generatedUrl` armazenado no próprio Field É o cache; "não
regerar se `generationKey` não mudou" é a regra de cache real (evita
custo de API repetido pro MESMO Field, que é o caso comum). **Privacidade**:
nenhum dado sensível envolvido (texto pedagógico já visível na própria
tela do editor) -- sem necessidade de isolamento adicional além do RLS
de Storage já existente (pasta por `auth.uid()`).

### 13) Estratégia de Storage

**Reaproveitar a MESMA infraestrutura da Fase 7e** (`uploadFlashcardMedia`/
`uploadOwnFlashcardMedia`, bucket `flashcard-media`, mesmas MIME
types/limite de 5 MiB já configurados na migration 046) -- **nunca criar
um bucket novo**, mesma disciplina já travada ("nunca auto-criar bucket").
Justificativa: um áudio TTS gerado é, do ponto de vista do Storage, um
arquivo de áudio como qualquer outro -- mesmo RLS (pasta por
`auth.uid()`), mesma leitura pública, mesmo path pattern (`{userId}/
tts-{fieldId}-{ts}-{rand}.mp3`, reaproveitando o parâmetro `resourceId`
já existente em `uploadFlashcardMedia`). A ÚNICA diferença é QUEM chama a
função de upload: hoje é sempre o browser (arquivo escolhido pela
pessoa); com TTS, seria a Edge Function de geração (Seção 14) que
recebe os bytes do provedor de TTS e os grava no MESMO bucket via a API
do Supabase Storage (server-side, usando a service role da função, não
o cliente) -- o resultado (uma URL pública) é indistinguível de um
upload manual pro resto do pipeline (`resolveFieldAudioUrl` nunca
precisa saber se a URL veio de upload humano ou de geração).

### 14) Segurança

- **Chave de API do provedor de TTS**: NUNCA no cliente -- vive só como
  Secret de uma Edge Function nova (mesmo padrão já usado pra
  `RESEND_API_KEY`, Edge Functions > Secrets do projeto Supabase). O
  cliente nunca vê a chave, só chama a Edge Function (`supabase.functions.invoke`
  ou fetch equivalente) passando `{text, language, voiceId, rate}`.
- **Autenticação**: a Edge Function exige um JWT válido (mesmo
  `verify_jwt:true` já usado por `notification-cron`/`push-send`) --
  qualquer conta autenticada pode chamar (não é uma ferramenta exclusiva
  de professora/admin, já que "Meus Cartões" também ganharia TTS um dia,
  gated por `isPremium()` como o resto do editor nativo em Meus
  Cartões).
- **Rate limiting / limite de caracteres por geração**: NÃO existe hoje
  nenhum mecanismo de rate limiting em nenhuma Edge Function deste
  projeto -- precisaria ser construído do zero na 7f-código (ex: um
  contador simples por `auth.uid()` numa tabela nova, ou um limite fixo
  de caracteres por requisição validado na própria função antes de
  chamar o provedor externo, pra nunca deixar um texto absurdamente
  longo -- ou um loop de "gerar em massa" -- estourar custo de API sem
  controle). Não decidido/dimensionado nesta auditoria -- fica como
  requisito explícito pra 7f-código, não pode ser esquecido.
- **Isolamento**: cada geração só pode escrever na pasta do próprio
  `auth.uid()` (mesmo RLS de Storage já existente) -- a Edge Function
  usando a service role bypassa RLS por natureza, então a checagem de
  "essa pessoa pode mesmo editar este Field/cartão" precisa acontecer
  DENTRO da função (ex: confirmar que o `teacher_id`/`owner_id` da linha
  de `teacher_flashcards`/`own_flashcards` bate com `auth.uid()` do
  chamador, antes de gastar uma chamada de API externa) -- mesmo padrão
  de autorização-dentro-da-function já usado por `get_teacher_student_metrics`/
  `get_public_profile_stats` (SECURITY DEFINER + checagem manual, Fases
  6a/1 do sistema de alunas particulares/perfil público).

### 15) Controle de custo

Geração de TTS **nunca pode ser efeito colateral de um renderer** --
única e exclusivamente uma ação EXPLÍCITA (clique em "Gerar áudio"/
"Regenerar"), nunca disparada por: abrir o editor, abrir o Preview,
revisar um cartão no Review, ou qualquer re-render automático. A regra
de `generationKey` (Seção 9) já é o mecanismo de controle de custo
central: se o `generationKey` calculado bate com o já persistido, o
botão mostra "já gerado"/toca o áudio existente, nunca regenera --
clicar "Regenerar" numa config JÁ satisfeita ainda seria uma AÇÃO
explícita da pessoa (talvez pra forçar uma nova tentativa mesmo sem
mudança), não um gatilho automático.

### 16) Regras de Preview

- **Só toca se já gerado** (`generatedUrl` presente) -- nunca gera
  nada, nunca chama a Edge Function de geração.
- **Nenhuma escrita em Storage** -- Preview é read-only por natureza
  (mesma garantia já estabelecida desde a Fase 6D.7: `callbacks.onAnswered`
  é sempre no-op de persistência).
- **Nenhuma analytics** -- já garantido de graça (Seção 1: Preview
  delega 100% aos mesmos 4 renderers, e o botão 🎧/`wireCustomAudioButtons`
  já nunca chamou `registerAudioPlay()` em nenhum contexto).
- **Estado vazio apropriado quando não gerado**: um Field `type:'tts'`
  sem `generatedUrl` simplesmente NÃO produz `audioUrl`
  (`resolveFieldAudioUrl` já devolve `null` nesse caso) -- o Preview
  (como o Review) já mostra corretamente "nenhum botão 🎧" nesse estado,
  sem nenhuma mudança de código necessária. Não é uma mensagem de erro
  nem um estado quebrado -- é simplesmente "esse Field não tem áudio
  customizado tocável agora", igual a qualquer Field sem `audio` nenhum.

### 17) Regras de Review

- **Só toca `generatedUrl` quando disponível** -- mesma regra do
  Preview, já garantida de graça pela arquitetura atual (achado 1.1).
- **Nunca gera** -- Review não tem (e não deveria ganhar) nenhum botão
  de "Gerar áudio"; geração é ferramenta de AUTORIA (editor), nunca de
  ESTUDO (Review).
- **Web Speech fallback só como decisão arquitetural JÁ tomada** (Seção
  3) -- continua sendo a Camada A independente, nunca acionada "porque"
  um `type:'tts'` está sem `generatedUrl`. Review nunca vira gerador.

### 18) Preservação do sistema Legacy

`AUDIO_MANIFEST`/`speakFrench`/`speakChinese`/fallback Web Speech API
continuam existindo e funcionando exatamente como hoje, pra SEMPRE que
`Field.audio` não resolver nada (`type:'tts'` sem `generatedUrl`, Field
sem `audio` nenhum, ou qualquer conteúdo de trilha que nunca passa por
Field). **Distinção Legacy vs. Nativo permanece clara, nunca misturada**:
Camada A (🔊, pronúncia automática) é sempre Legacy/genérica, por
IDIOMA; Camada B (🎧, áudio explícito) é sempre Nativa/por-Field
(upload, URL, e -- quando implementado -- TTS gerado). As duas
coexistem na mesma tela, nos mesmos 4 renderers, desde a Fase 8a --
nenhuma mudança proposta aqui além de, quando 7f-código existir,
`type:'tts'` COM `generatedUrl` passar a alimentar a Camada B do MESMO
jeito que upload/URL já alimentam hoje (zero código de renderer novo,
achado 1.1).

### 19) Consideração futura -- export Anki

Reafirma a Fase 7 original (achado #3, seção I da auditoria): o export
Anki hoje nunca inclui mídia (`zip.file("media", JSON.stringify({}))`
sempre vazio). Um áudio TTS só pode ser exportado se já tiver
`generatedUrl` (um arquivo REAL, baixável) -- nunca dispara geração a
partir do fluxo de exportação (mesmo princípio de "nunca gerar como
efeito colateral", Seção 15). Cartão com TTS configurado mas não gerado
seria tratado como "sem áudio" no export, ou pulado/avisado -- decisão
de UX pra quando a 7i (export com mídia) for de fato implementada, não
travada aqui.

### 20) Fluxo de UI futuro (especificado, não implementado)

Dentro do bloco "Áudio" já existente por Field
(`renderFieldAudioBlockHTML`, Fase 7e), quando "Texto para voz" for
habilitado no `<select>` de origem:

```
Origem: [Texto para voz ▾]
  Texto a sintetizar: [_________________] (pré-preenchido com o
                                            texto do Field, editável)
  Idioma:  [francês (fr-FR) ▾]
  Voz:     [<lista do provedor> ▾]
  Velocidade: [normal ▾] (lento/normal/rápido, ou slider)

  [🔊 Gerar áudio]   -- disabled enquanto uma geração está em voo

  -- estado "não gerado": nenhum player, texto "TTS configurado,
     áudio ainda não gerado" (já existe, fieldAudioIndicatorText)
  -- estado "gerando": botão vira "Gerando...", disabled
  -- estado "disponível": <audio controls> (já existe no bloco atual)
     + "gerado em <data>" + [🔊 Ouvir] [↻ Regenerar] [🗑 Remover]
  -- estado "desatualizado" (generationKey mudou desde o generatedUrl
     salvo): mesmo player do "disponível" (áudio antigo continua
     tocável) + aviso "config mudou desde a última geração" +
     [↻ Regenerar] em destaque
  -- estado "erro" (transiente, nunca persistido): toast "Não foi
     possível gerar o áudio agora." -- volta pro estado anterior
     (gerado ou não-gerado, conforme o que já existia antes da
     tentativa)
```

### 21) O shape da Fase 7b é suficiente?

**Sim, com uma MUDANÇA MÍNIMA identificada, não implementada aqui**:
faltam `providerModelId` e `configVersion` como parte das entradas do
`generationKey` (Seção 9) -- hoje o comentário da Fase 7b já lista
`generationKey` como "hash de texto efetivo + language + voiceId +
rate", sem mencionar provedor/versão de config. Como o cálculo de
`generationKey` **nunca foi implementado ainda** (só reservado como
campo), isso não exige nenhuma migração de dado nem mudança de shape em
`Field.audio` em si -- é só uma correção da FÓRMULA de cálculo que
7f-código vai escrever, quando escrever. **Nenhum campo novo em
`Field.audio` proposto** -- os 7 campos já existentes (`text`/
`language`/`voiceId`/`rate`/`generationKey`/`generatedUrl`/`generatedAt`)
continuam suficientes; `providerModelId`/`configVersion` entram só como
CONSTANTES do código de geração (não como propriedade persistida por
Field), exatamente como já são hoje `PREGEN_AUDIO_RATE`/vozes fixas do
pipeline offline -- não precisam variar por Field.

### 22) Especificação de testes futuros (16 cenários, não implementados)

A. Config válida (`text`+`language`+`voiceId`+`rate` todos preenchidos)
   -> `isValidFieldAudio()` aceita (já verdadeiro hoje, sem mudança).
B. Config inválida (`type:'tts'` com `rate` de tipo errado, ex: string)
   -> `isValidFieldAudio()` rejeita (já verdadeiro hoje).
C. `generationKey` determinístico -- mesmas 6 entradas (Seção 9) ->
   mesmo hash, chamado 2x.
D. Mesma config -> mesma `generationKey` -- confirmando estabilidade
   entre sessões (recalcular do zero bate com o valor persistido antes).
E. Mudar `text` -> `generationKey` novo.
F. Mudar `voiceId` -> `generationKey` novo.
G. Mudar `rate` -> `generationKey` novo.
H. Mudar `language` -> `generationKey` novo.
I. Geração bem-sucedida -- `generatedUrl`/`generatedAt`/`generationKey`
   gravados atomicamente, os 3 juntos.
J. Geração falha -- `field.audio` permanece BYTE A BYTE idêntico a
   antes da tentativa (nenhum campo tocado).
K. Áudio antigo preservado -- editar a config (texto/voz/etc.) SEM
   regenerar mantém `generatedUrl` antigo tocável, `generationKey`
   antigo ainda em `field.audio.generationKey` (só o CALCULADO na hora
   diverge -- é isso que sinaliza "desatualizado").
L. Geração concorrente -- 2 chamadas de geração disparadas (config A
   depois config B, resposta de A chega DEPOIS da de B) -- resultado
   final reflete B (a resposta de A, com `generationKey` obsoleto, é
   descartada, ver Seção 11).
M. Preview nunca gera -- abrir/interagir com Preview sobre um Field
   `type:'tts'` sem `generatedUrl` nunca chama a função de geração,
   nunca escreve em `field.audio`/Storage.
N. Review nunca gera -- mesmo cenário, dentro de uma sessão de Revisão
   real.
O. `Field.lang` nunca seleciona TTS automaticamente -- criar/editar um
   Field com `lang:'fr'` nunca popula `audio`/`audio.language` sozinho;
   `type:'tts'` só existe se explicitamente escolhido no `<select>` de
   origem.
P. Legacy continua funcional -- um Field sem `audio` (ou com
   `type:'upload'`/`'url'` já existente) continua funcionando
   exatamente como hoje depois que 7f-código existir -- nenhuma
   regressão no caminho não-TTS.

### 23) O que NÃO foi tocado nesta auditoria (confirmado)

`git status`/`git diff` no fim desta entrega confirmam: só este
`CLAUDE.md` foi modificado. Nenhuma linha de `shared/flashcard-model.js`
(o `type:'tts'`/`FIELD_AUDIO_TYPES`/`isValidFieldAudio`/
`resolveFieldAudioUrl` já existiam desde a Fase 7b, intocados), nenhum
dos 4 renderers (`fr/app.js`/`zh/app.js`), nenhum editor
(`shared/flashcard-field-editor.js`/`admin-flashcards.js`/
`my-flashcards.js`), nenhum `shared/flashcard-preview.js`, nenhuma
migração SQL, nenhuma Edge Function, nenhuma chave de API, nenhum
`MediaRecorder`/`getUserMedia`. Zero geração de TTS real ocorreu nesta
sessão.

### Decisões em aberto (não resolvidas nesta auditoria, ficam pra quando
7f-código for autorizada)

1. Qual provedor de TTS externo de fato contratar (nenhuma conta/API key
   existe hoje -- decisão de negócio da autora, não técnica).
2. Dimensionamento exato do rate limiting/limite de caracteres por
   geração (Seção 14) -- nenhum número travado.
3. Se Fields satélite de pinyin (zh) devem ESCONDER o bloco de áudio
   por completo, ou só não ativar TTS por padrão neles (Seção 8) --
   convenção de UX, não decidida.
4. Se/quando estender TTS pra distratores de Múltipla Escolha (a UI já
   suportaria por-Field, mas nenhum caso de uso concreto foi levantado
   -- mesma pergunta em aberto já registrada desde a Fase 7).
5. Valor de default pra `rate`/`voiceId` quando a pessoa nunca escolhe
   (Seção 4) -- nenhum valor travado, fica pra quando a UI de fato
   existir e o provedor estiver escolhido.

### Relatório final (10 pontos)

1. **Arquitetura de TTS proposta**: Edge Function nova (padrão já
   validado por `notification-cron`/`push-send`, mesmo `verify_jwt:true`)
   chamando um provedor de TTS externo ainda não contratado, geração
   sempre ação explícita (nunca efeito colateral de renderer), resultado
   persistido como `field.audio.generatedUrl` via o MESMO pipeline de
   upload da Fase 7e (bucket `flashcard-media`, sem bucket novo). Web
   Speech API continua só como fallback de pronúncia AUTOMÁTICA
   genérica (Camada A), nunca acionado por um `type:'tts'` sem áudio
   gerado.
2. **Provedor/infraestrutura identificados**: nenhum ativo hoje
   (confirmado por grep -- zero Edge Function de TTS, zero chave de API
   referenciada em lugar nenhum do repo). O único precedente real é o
   pipeline offline (`fr/scripts/regenerate_broken_audio.py`, Google
   Cloud TTS neural), que roda fora do runtime do produto e não prova
   credencial acessível a um servidor.
3. **`generationKey`**: hash determinístico de 6 entradas (texto
   efetivo, language, voiceId, rate, `providerModelId`, `configVersion`)
   -- os 2 últimos são conceitos NOVOS desta auditoria (nunca persistidos
   por Field, só constantes do código de geração), necessários pra
   invalidar cache corretamente numa troca de provedor/algoritmo.
4. **Cache**: por `generationKey`, armazenado só no próprio
   `field.audio` (não uma tabela de cache compartilhada entre
   Fields/contas -- decisão consciente de não construir isso, mesmo
   padrão de "não infraestrutura especulativa" já usado em toda a
   feature).
5. **Storage**: reaproveita o bucket `flashcard-media` já endurecido
   (Fase 7e/migration 046) e o mesmo path pattern -- nunca um bucket
   novo, geração gravaria via a service role da Edge Function usando a
   mesma API que `uploadFlashcardMedia` já usa do lado do cliente.
6. **Segurança**: chave de API só em Secrets da Edge Function, nunca no
   cliente; autenticação JWT obrigatória; autorização checada DENTRO da
   função (dono da linha == `auth.uid()`), mesmo padrão de
   `get_teacher_student_metrics`; rate limiting/limite de caracteres
   ainda NÃO dimensionado, fica como requisito explícito pra não
   esquecer na implementação.
7. **Preview/Review**: os dois já tocam `generatedUrl` de graça, sem
   NENHUMA mudança de renderer necessária (achado central desta
   auditoria) -- a arquitetura Field->resolver->renderer da Fase 6C/7a
   já absorve TTS na LEITURA; falta só a ESCRITA (geração). Nenhum dos
   dois pode gerar áudio -- geração é sempre ação explícita do editor.
8. **Decisões em aberto**: provedor de TTS a contratar, dimensionamento
   de rate limiting, convenção de UX pra Fields satélite de pinyin,
   extensão futura a distratores de MC, valores de default de
   voz/velocidade -- nenhuma travada nesta auditoria.
9. **Arquivo alterado**: só `CLAUDE.md` (esta seção) -- confirmado por
   `git status`/`git diff --stat`, nenhum código funcional tocado.
10. **Commit**: aplicado nesta mesma entrega, mensagem referenciando
    "Fase 7f (auditoria)", com a atribuição obrigatória.

**PARE conforme instrução explícita -- nenhuma geração de TTS
implementada nesta fase.** Próxima etapa (7f-código, 7g gravação, ou 7i
export Anki com mídia) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

## Fase 7f (implementação) -- infraestrutura real de TTS explícito por Field

Segue diretamente a auditoria da Fase 7f (`ca034f4`, só especificação, zero
código) -- esta entrega constrói a infraestrutura BACKEND real: Edge
Function + tabela de rate limit + contrato de geração compartilhado +
serviços de frontend + integração mínima no editor de Field. Instrução
com 10 decisões arquiteturais obrigatórias + escopo A-K + 27 cenários de
teste, todas cumpridas, ver abaixo. **Nenhum provedor de TTS real está
contratado hoje** -- confirmado por grep no repositório inteiro antes de
codar (mesma regra de "não presumir infraestrutura externa ativa" do
topo deste arquivo) -- a infraestrutura nasce pronta, mas o botão
"Gerar áudio" hoje sempre devolve um erro explícito e diagnosticável
(`provider_not_configured`), nunca finge sucesso.

### Arquitetura implementada

```
Editor de Field (shared/flashcard-field-editor.js)
  -> requestFieldAudioTTS()/requestOwnFieldAudioTTS()
     (shared/teacher-flashcards.js / shared/own-flashcards.js)
  -> supabaseClient.functions.invoke('tts-generate', {body:{...}})
  -> Edge Function tts-generate (supabase/functions/tts-generate/index.ts)
       1. autentica (Authorization header repassado, cliente "como o
          usuário", NUNCA service role)
       2. valida payload (table/rowId/fieldId/text/language)
       3. autoriza (SELECT id ... WHERE id=rowId via a MESMA RLS de
          teacher_flashcards/own_flashcards que já existe -- 403
          not_authorized se a linha não for visível a esta sessão)
       4. checa rate limit (tts_generation_log, migration 047)
       5. calcula generationKey (SHA-256, mesma fórmula do cliente)
       6. chama generateTTS() (provider abstraction, isolada)
       7. sobe o áudio resultante pro bucket flashcard-media
          (MESMO bucket da Fase 7e, nunca um novo)
       8. registra 1 linha em tts_generation_log (só depois do upload
          ter sucesso -- tentativa falha nunca consome quota)
       9. devolve {ok, url, path, generationKey, generatedAt}
  -> requestFieldAudioTTS() devolve o resultado estruturado, SEM
     mutar nenhum estado global e SEM persistir nada sozinho
  -> wireFieldAudioBlockFor() (editor) só grava em
     field.audio={type:'tts', ...} DEPOIS de confirmar que a resposta
     ainda bate com a config atual (guard de concorrência) -- quem
     decide se/quando isso é salvo no banco é o fluxo de edição normal
     (Salvar/Criar cartão, mesmo mecanismo de sempre desde a Fase 6D.6)
```

**Nenhuma camada nova de áudio foi criada** -- `Field.audio` continua
sendo o único lugar onde áudio de Field vive, `resolveCardField()`/
`resolveFieldAudioUrl()` (Fase 7a/7b, intocados nesta entrega) continuam
sendo o único caminho de LEITURA que Review/Preview usam. Esta entrega é
só sobre a ESCRITA (como um `type:'tts'` chega a existir de verdade).

### Contrato de geração compartilhado (`shared/flashcard-model.js`)

- **`TTS_PROVIDER_MODEL_ID`/`TTS_CONFIG_VERSION`** -- constantes de
  CÓDIGO, nunca persistidas por Field (decisão explícita da auditoria,
  Seção 21: o shape de `Field.audio.tts` já travado na Fase 7b já era
  suficiente, os 2 conceitos novos que o `generationKey` precisava
  -- "qual provedor/modelo gerou" e "qual versão do algoritmo de
  geração" -- entram só como entrada do hash). Espelhadas BYTE A BYTE
  aqui e em `supabase/functions/tts-generate/index.ts` -- os 2 lados
  precisam concordar no mesmo valor pro cliente conseguir calcular "está
  desatualizado?" sem round-trip de rede. Trocar de provedor real no
  futuro = mudar as 2 constantes nos DOIS lugares -- invalida o cache de
  TODO Field TTS já gerado de propósito (áudio de um provedor diferente
  É um resultado diferente), sem nenhuma migração de dado.
- **`computeTtsGenerationKey(effectiveText, language, voiceId, rate)`**
  (async) -- SHA-256 (Web Crypto, `crypto.subtle.digest`, disponível
  tanto no navegador quanto no runtime Deno das Edge Functions -- mesmo
  algoritmo nos dois lados) sobre as 6 entradas em ORDEM FIXA
  (`effectiveText, language, voiceId, rate, TTS_PROVIDER_MODEL_ID,
  TTS_CONFIG_VERSION`), unidas com o caractere unit-separator (`\u001F`,
  nunca `JSON.stringify` -- ordem de chave de objeto não é garantida
  entre engines/versões, um hash que dependesse disso deixaria de ser
  determinístico), cada parte `encodeURIComponent`-escapada antes de
  unir. `generatedUrl`/`generatedAt`/timestamps NUNCA entram no hash
  (regra explícita da Seção 3) -- só a CONFIGURAÇÃO participa.
- **`ttsEffectiveText(field, audioConfig)`** -- regra já travada na Fase
  7c: `audioConfig.text` (override explícito, não-null/não-vazio) vence;
  senão `field.content.value`. É essa função que decide QUAL edição
  invalida o cache (editar o Field só invalida quando não há override).
- **`isTtsAudioStale(field)`** (async) -- compara o `generationKey`
  recém-calculado (a partir do estado ATUAL do Field) contra o já
  persistido em `audio.generationKey`; `false` pra qualquer Field
  sem `type:'tts'` ou ainda sem `generatedUrl` (a pergunta "está
  desatualizado" só faz sentido quando já existe um ativo pra comparar).
  "Desatualizado" continua sendo um estado CALCULADO na hora, nunca um
  booleano persistido (mesma regra da Fase 7b/7c).
- **`validateTtsGenerationRequest({text, language})`** -- validação de
  ENTRADA pura (texto vazio, texto acima de `TTS_TEXT_MAX_LENGTH=500`
  caracteres, idioma ausente) -- 1ª camada (feedback imediato sem
  round-trip), espelhada como 2ª camada REAL do lado da Edge Function
  (nunca confia só no cliente, mesma disciplina de
  `validateFieldAudioUploadFile` da Fase 7e).
- **`TTS_GENERATION_ERROR_LABELS`** -- mapa código-de-erro->mensagem em
  português, declarado UMA VEZ SÓ neste arquivo (nunca duplicado como
  `const` top-level em `teacher-flashcards.js`/`own-flashcards.js`,
  mesmo gotcha de colisão de escopo global entre `<script>` tags já
  corrigido na Fase 6D.2 pra `CARD_TYPE_UI_META`).
- **`isValidFieldAudio()`** (Fase 7b) estendida pra validar `storagePath`
  (novo) via o mesmo `strOrNull` já usado pros outros campos opcionais
  de `type:'tts'`.

### Decisão 4 -- `storagePath`, por que `generatedUrl` não basta como identidade

Investigado o modelo real de Storage do Supabase antes de decidir (Seção
4 da instrução, obrigatória): o bucket `flashcard-media` é público-leitura
(migration 032), então `getPublicUrl(path)` sempre devolve a mesma URL
pra um dado `path` -- hoje `generatedUrl` e o path do objeto coincidem em
conteúdo, sem expiração. Mesmo assim, `generatedUrl` sozinha não é uma
identidade robusta: (1) uma futura rotina de limpeza de áudio órfão (já
cogitada desde a Fase 7e, nunca implementada) precisa do PATH do objeto
pra chamar `storage.remove([path])` -- extrair o path de dentro da URL
pública seria acoplamento implícito ao formato atual de URL do Supabase,
frágil se esse formato mudar; (2) se o bucket algum dia precisar virar
privado/com URL assinada (mudança de infraestrutura NÃO decidida aqui),
a URL passaria a expirar -- o PATH é a única coisa que permitiria
re-derivar/re-assinar uma URL de acesso nova sem regenerar o áudio do
zero.

**Resolução**: `storagePath` (novo, ADITIVO, OPCIONAL) adicionado ao
shape `{type:'tts', ...}` -- é ele que carrega a IDENTIDADE PERSISTENTE
do asset no Storage; `generatedUrl` continua sendo só a URL de
ACESSO DERIVADA/CACHEADA a partir dele, nunca a fonte de verdade.
Compatibilidade: `storagePath` nunca é lido por `resolveFieldAudioUrl()`/
`resolveCardField()` (que continuam expondo só `generatedUrl` como
`audioUrl` de exibição -- `storagePath` é metadado de gestão, não de
apresentação, mesmo papel que `uploadedAt`/`mimeType` já tinham pro tipo
`'upload'`) -- um Field TTS gerado ANTES desta mudança simplesmente tem
`storagePath` ausente/`undefined`, continua resolvendo `audioUrl`
normalmente via `generatedUrl`, só não participa de uma futura rotina de
limpeza até ser regenerado. Nenhuma mudança estrutural maior foi
necessária -- o shape de 7 propriedades já travado na Fase 7b (text/
language/voiceId/rate/generationKey/generatedUrl/generatedAt) ganhou só
esta 8ª propriedade opcional.

### Edge Function `tts-generate` (`supabase/functions/tts-generate/index.ts`)

Deployada AO VIVO nesta sessão via `mcp__Supabase__deploy_edge_function`,
projeto `eigjocalzwamisgqilhg` (`verify_jwt:true`, `version:1`,
`status:"ACTIVE"`, id `b8e7fad8-6831-4952-b3f4-a364e14f7763`).

- **Segurança**: usa `createClient(supabaseUrl, anonKey,
  {global:{headers:{Authorization: authHeader}}})` -- roda "como o
  usuário que chama", NUNCA service role, mesmo padrão de
  `push-send`/`report-reply-send`. Rejeita sem `Authorization` (401
  `missing_authorization`); `supabase.auth.getUser()` valida o JWT de
  verdade (401 `invalid_session` se inválido/expirado). **Autorização
  nunca reimplementada** -- a MESMA RLS de `teacher_flashcards`/
  `own_flashcards` (owner-only, migrations 026/028) decide sozinha se
  esta conta pode ver a linha, via um `SELECT id ... WHERE id=rowId
  .maybeSingle()` (linha ausente/nula = 403 `not_authorized`, nunca
  distingue "não existe" de "não autorizada" na resposta -- não vaza
  existência de linha alheia). Upload pro Storage usa o MESMO cliente
  escopado ao usuário -- a policy do bucket já restringe escrita à
  própria pasta (`{userId}/...`), nunca precisa de service role pra
  nada nesta function. `userId` do payload NUNCA é confiado -- vem
  sempre de `userData.user.id`, extraído do JWT verificado.
- **Achado de segurança documentado no próprio código, não corrigido**
  (mesmo nível de rigor "trava de UI, não fronteira de segurança" já
  aceito noutros pontos desta feature): em `teacher_flashcards`, uma
  aluna vinculada tem RLS de LEITURA (não escrita) sobre um cartão que a
  professora atribuiu a ela -- a checagem de autorização (SELECT via
  RLS) deixaria essa aluna passar pra um cartão que ela só pode LER,
  mesmo sem nunca conseguir gravar o resultado de volta em `fields`
  (RLS de UPDATE/INSERT em `teacher_flashcards` é admin-only, migration
  026). Pior caso real: gasto de quota de rate limit + um objeto órfão
  no Storage sob a PRÓPRIA pasta dela (nunca expõe dado de outra conta)
  -- nunca alcançável hoje de qualquer jeito, porque
  `shared/admin-flashcards.js` (o único chamador desta function pro
  caso `teacher_flashcards`) é 100% gate-checked por `isAdminUser()`, e
  hoje só existe 1 professora/admin real na plataforma.
- **Validação de payload**: `table` precisa ser `teacher_flashcards` ou
  `own_flashcards` (400 `invalid_table`); `rowId`/`fieldId` obrigatórios
  (400 `missing_row_or_field`); `text` não-vazio depois de `.trim()`
  (400 `missing_text`); `text.length <= 500` (400 `text_too_long`,
  mesmo `TTS_TEXT_MAX_LENGTH` do cliente); `language` obrigatório (400
  `missing_language`).
- **Rate limit** (migration 047, tabela `tts_generation_log`): no máximo
  20 gerações BEM-SUCEDIDAS por conta a cada 10 minutos, checado ANTES
  de gastar qualquer chamada de provider (query `count:'exact',
  head:true` contra a janela de 10min -- RLS já escopa a contagem à
  própria conta). Falha ao LER essa tabela auxiliar nunca trava a
  geração inteira -- loga e segue (fail-open numa dependência
  secundária, mesmo espírito de "melhor esforço" já usado noutras
  compensações desta feature) em vez de bloquear por uma tabela de
  controle de custo estar indisponível. Uma linha só é inserida DEPOIS
  do upload ter sucesso -- tentativa que falha (provider indisponível,
  upload falho) nunca consome quota.
- **Por que uma tabela nova, não um contador em memória**: avaliado
  antes de escrever a migration -- um contador dentro da própria Edge
  Function não é seguro (Edge Functions são efêmeras/sem estado
  compartilhado entre invocações concorrentes, resetaria a cada cold
  start e nunca protegeria de verdade). Uma tabela mínima e aditiva no
  MESMO Postgres que a plataforma já usa é a única forma SEGURA sem
  depender de infraestrutura nova de terceiros -- decisão explícita da
  instrução ("se não for possível fazer sem nova tabela, documente como
  pendência" -- aqui FOI possível, então a tabela foi a escolha certa,
  não um atalho frágil).
- **Provider abstraction (`generateTTS`)**: isola TODA chamada HTTP a
  um provedor específico -- nenhuma chamada de provider espalhada pelo
  resto da function. Checa `TTS_MOCK_ENABLED==='true'` (Secret separada,
  só pra TESTE -- nunca setada em produção real) primeiro: gera um WAV
  mono 8kHz de ~200ms de silêncio (`buildSilentWavBytes()`), permitindo
  validar o pipeline inteiro (auth, rate limit, upload, resposta) sem
  nenhuma credencial real. Senão, checa `TTS_PROVIDER_API_KEY` (Secret
  ainda NÃO configurada hoje -- confirmado, nenhuma chave real foi
  colocada em lugar nenhum do código): ausente -> `{ok:false,
  error:'provider_not_configured'}`. Presente (hipotético, não
  configurado hoje) -> `{ok:false, error:'provider_not_implemented'}`
  (nenhuma integração HTTP real foi escrita ainda -- decisão explícita
  #1 da auditoria, "não inventar provedor/credencial fictícios"). A
  function **nunca finge sucesso** em nenhum dos 2 casos -- sempre um
  erro explícito e diagnosticável.
- **Storage**: reaproveita o bucket `flashcard-media` (migration 032,
  endurecido pela 046) -- nenhum bucket novo. Path:
  `${userId}/tts-${safeFieldId}-${Date.now()}-${random}.${ext}`
  (`safeFieldId` sanitizado -- `[^a-zA-Z0-9_-]` removido, truncado em 40
  chars -- mesmo padrão de sanitização já aplicado ao `resourceId` de
  upload na Fase 7e), extensão derivada do `mimeType` devolvido pelo
  provider (nunca de um nome de arquivo cru). Colisão entre contas é
  estruturalmente impossível (1º segmento sempre `userId`, RLS do
  bucket já restringe escrita àquela pasta); colisão entre 2 gerações
  do MESMO usuário/Field é praticamente impossível (timestamp + random
  de 6 chars no nome).

### Frontend service (`shared/teacher-flashcards.js`/`shared/own-flashcards.js`)

- **`requestFieldAudioTTS({rowId, fieldId, text, language, voiceId,
  rate})`**/**`requestOwnFieldAudioTTS(...)`** (mirror, `table:
  'own_flashcards'`) -- valida via `validateTtsGenerationRequest()`
  ANTES de qualquer chamada de rede; chama
  `supabaseClient.functions.invoke('tts-generate', {body:{...}})`;
  mapeia erro pra mensagem em português via `TTS_GENERATION_ERROR_LABELS`
  (fallback genérico se o código não for reconhecido). **Nunca muda
  `STATE` global, nunca persiste no banco sozinha** -- devolve só
  `{ok:true, url, path, generationKey, generatedAt}` ou `{ok:false,
  error}` estruturado, exatamente como a Seção F exigia; quem decide
  aplicar o resultado a um Field/salvar é sempre o chamador (o editor).

### Integração no editor (`shared/flashcard-field-editor.js`)

Painel mínimo (NUNCA o "seletor completo" que a instrução proibia
explicitamente) dentro do bloco "Áudio" já existente por Field (Fase
7e): textarea de override de texto (pré-preenchida com o conteúdo do
Field), `<select>` de idioma (fr-FR/zh-CN/pt-BR, com sugestão inicial a
partir de `field.lang` via `suggestedTtsLanguageForFieldLang()` -- nunca
persistida automaticamente, só um valor default no `<select>`, mesma
regra "nunca derivar `audio.language` de `field.lang` sozinho" da
auditoria), input opcional de `voiceId`, `<select>` de velocidade
(lento/normal/rápido), botão Gerar/Regenerar.

- **Gate por `noteId`**: o painel só funciona quando `opts.noteId` é um
  id real de linha já salva (`ADMIN_FLASHCARDS_STATE.nativeCardState.noteId`/
  `MY_FLASHCARDS_STATE.nativeCardState.noteId`, ou o `noteId` do
  `editorState` reconstruído ao editar um cartão já existente) -- um
  rascunho de criação AINDA NÃO salvo (`noteId: null`) mostra "Salve o
  cartão primeiro para poder gerar áudio por texto." em vez do painel,
  porque a Edge Function precisa de um `rowId` real pra checar
  autorização.
- **Concorrência (Seção 11 da auditoria da 7f-especificação, aplicada
  aqui)**: o `generationKey` é calculado no momento do CLIQUE; quando a
  resposta da Edge Function volta, o handler recalcula o
  `generationKey` a partir do estado ATUAL do painel (a pessoa pode ter
  editado texto/idioma/voz/velocidade enquanto a geração estava em
  voo) e só APLICA o resultado a `field.audio` se os dois baterem --
  senão descarta silenciosamente o resultado obsoleto, nunca sobrescreve
  uma config mais nova com uma resposta atrasada.
- **Falha nunca destrói áudio existente**: `field.audio` permanece
  byte a byte intacto se a geração falhar -- o erro só aparece como
  mensagem transitória no próprio painel (nunca persistido em
  `Field.audio`, regra já travada na Fase 7c: erro é sempre
  transiente/só-de-UI).
- **Origem "Sem áudio" é a ÚNICA ação de troca de `<select>` que limpa
  `field.audio`** -- trocar pra "Texto para voz"/"Arquivo (upload)" só
  alterna a visibilidade do painel local, nunca muta o estado sozinho.
- **`editorState.__freshMediaUploads`** (mesmo mecanismo de compensação
  de órfãos já construído na Fase 7e pra upload manual) ganha uma
  entrada `{path, deleteFn}` a cada geração TTS bem-sucedida -- se o save
  subsequente da Note falhar, o mesmo mecanismo de compensação best-effort
  já existente (`shared/flashcard-native-persistence.js`) tenta remover o
  objeto órfão do Storage, sem nenhum código novo específico de TTS.
  `storagePath: res.path || null` também é gravado em `field.audio` no
  sucesso (ver Decisão 4 acima).
- Reutilizado nos MESMOS 4 pontos que já usavam o painel de áudio de
  upload (Fase 7e) -- Normal, Digite a resposta, Múltipla Escolha (por
  Field: prompt/answer/distractors), e o Field de texto/tradução do
  Cloze -- sem nenhum código específico de Card Type: `renderFieldAudioBlockHTML()`/
  `wireFieldAudioBlockFor()` continuam sendo os únicos pontos que sabem
  sobre áudio, chamados de dentro de `renderFieldEditorHTML()` (genérico)
  e explicitamente de dentro de `renderClozeEditorHTML()` (Cloze, que
  não passa pelo Field editor genérico -- mesma exceção já documentada
  desde a Fase 7c).

### Review/Preview -- confirmado sem mudança de comportamento (Seção G)

Nenhuma linha de `fr/app.js`/`zh/app.js` foi tocada nesta entrega.
Confirmado por leitura, não presumido: os 4 renderers da Fase 6C
continuam só lendo `audioUrl` já resolvido por `resolveCardField()`
(que continua síncrono, nunca chama a Edge Function); nenhum deles
importa/referencia `requestFieldAudioTTS`/`tts-generate` em lugar
nenhum. Preview (`shared/flashcard-preview.js`) continua delegando
100% aos mesmos 4 renderers (Fase 6D.7) -- um Field com
`type:'tts'`+`generatedUrl` já aparece corretamente no Preview de
graça (mesma conclusão já confirmada na auditoria: a arquitetura
Field->resolver->renderer já absorvia TTS na leitura desde a Fase 7a/7b,
só faltava a escrita). O isolamento de analytics do Preview (Fase 7d,
`card.__isPreviewCard`) continua intacto e não precisou de nenhuma
mudança -- geração é sempre ação do EDITOR, nunca do Preview/Review.

### Web Speech / Camada A vs Camada B (Seção H) -- preservado sem mudança

`speakFrench`/`speakChinese`/`AUDIO_MANIFEST`/`wireAudioButtons` (Camada
A, pronúncia automática genérica) continuam 100% intocados -- nenhuma
linha de `fr/app.js`/`zh/app.js` tocada. **Nenhum fallback silencioso
Web Speech -> `type:'tts'`** foi implementado -- se a geração falha ou
não está disponível, o Field simplesmente não ganha um `type:'tts'`
persistido; a pronúncia automática (Camada A) continua disponível em
paralelo, exatamente como sempre, sem nunca ser confundida com um asset
TTS explícito (Camada B).

### AUDIO_MANIFEST (Seção I) -- intocado

Nenhuma mudança em `fr/audio-manifest.js`/`zh/audio-manifest.js`, nenhuma
tentativa de migração. `resolveFieldAudioUrl()` nunca consulta
`AUDIO_MANIFEST` pra resolver `type:'tts'` -- os 2 sistemas continuam
completamente disjuntos, mesma conclusão já confirmada na auditoria.

### Testes realizados

- `node --check` sem erro em `shared/flashcard-model.js`,
  `shared/teacher-flashcards.js`, `shared/own-flashcards.js`,
  `shared/flashcard-field-editor.js`, `shared/admin-flashcards.js`,
  `shared/my-flashcards.js`.
- **Suíte Node/VM nova, 39/39** -- cobre os 27 cenários pedidos
  explicitamente (Seção J): (1-9) `generationKey` determinístico e
  sensível a cada uma das 6 entradas isoladamente (texto/language/
  voiceId/rate/providerModelId/configVersion muda -> key muda;
  `generatedUrl`/`generatedAt` NUNCA alteram a key); (10) sem provider
  configurado -> erro explícito (`provider_not_configured`, mockado via
  o mesmo `generateTTS()` de produção, sem credencial fake); (11)
  payload inválido rejeitado (texto vazio, texto >500 chars, idioma
  ausente); (12) usuário não autorizado rejeitado (linha fora do
  alcance da RLS simulada); (13) mesma `generationKey` -> caminho
  idempotente (2ª chamada com config idêntica reconhecida como "já
  gerado", via `isTtsAudioStale()` retornando `false`); (14)
  `field.audio` permanece intacto quando uma geração falha (snapshot
  antes/depois idêntico); (15/16) Review/Preview NUNCA chamam geração
  -- confirmado por leitura estática (grep) que nenhum dos 4 renderers
  referencia `requestFieldAudioTTS`/`tts-generate`; (17) renderer
  continua read-only (só consome `audioUrl` já resolvido); (18/19)
  legacy e native cards continuam funcionando sem regressão
  (`resolveCardField`/`buildEngineCardsFromRow` intocados); (20)
  `Field.lang` diferente de `audio.tts.language` confirmado permitido
  (nunca rejeitado por nenhuma validação); (21-24) TTS testado em Field
  Normal, Field de resposta (Type Answer), MC prompt e MC answer --
  todos resolvendo `audioUrl` corretamente via `resolveCardField()`
  real; (25) Field satélite de pinyin -- confirmado que `field.audio`
  nunca é atribuído automaticamente a um satélite (mesma regra "sem
  atribuição automática" já em vigor desde a Fase 7c); (26) geração
  nunca grava `CardInstance` -- confirmado que `buildEngineCardsFromRow`/
  `interpretNoteFromRow` continuam derivando CardInstances 100% em
  runtime, nenhuma chamada de geração toca neles; (27) IDs/`revision`/
  FSRS não são recriados/modificados pela geração em si (só um SAVE
  subsequente da Note, através do mecanismo de `revision` já existente
  desde a Fase 6D.6, reseta progresso -- mesmo comportamento de
  qualquer outra edição de conteúdo, nada novo introduzido por TTS).
- **Browser smoke novo, FR+ZH, Playwright/Chromium real** -- editor
  nativo aberto, Field configurado pra TTS PROGRAMATICAMENTE (UI
  completa de seletor não existe por decisão explícita, Seção 10),
  geração solicitada via clique real no botão "Gerar áudio" contra um
  mock de `supabaseClient.functions.invoke` (simula a Edge Function
  real sem round-trip de rede): fluxo de sucesso confirmado gravando
  `field.audio={type:'tts', generatedUrl, generationKey, storagePath,
  ...}` só DEPOIS da resposta, `<audio>` de preview aparecendo com a
  URL certa; fluxo de FALHA confirmado preservando o áudio anterior
  intacto (`audioUnchanged:true`) e mostrando erro; concorrência
  confirmada descartando uma resposta obsoleta (`audioNeverApplied:true`);
  "Sem áudio" explícito confirmado limpando a referência; regressão de
  Múltipla Escolha e Cloze confirmada (os 2 continuam funcionando com o
  MESMO painel de áudio compartilhado); upload manual (Fase 7e)
  confirmado continuando a funcionar lado a lado com o caminho TTS novo,
  sem interferência. **Zero `pageerror`** em qualquer um dos 2 idiomas.

### Limitações conhecidas / o que fica pra depois (de propósito, Seção 10)

- **Nenhum provedor de TTS real contratado** -- `TTS_PROVIDER_API_KEY`
  (Secret) continua ausente hoje; até ela ser configurada em Edge
  Functions > Secrets do projeto Supabase, `tts-generate` sempre devolve
  `provider_not_configured`. Quando um provedor for escolhido/contratado,
  a implementação real entra isolada dentro de `generateTTS()` (única
  função a tocar) + `TTS_PROVIDER_MODEL_ID` precisa ser atualizado pra
  refletir o modelo real (hoje `'unconfigured'`) -- isso sozinho já
  invalida o cache de qualquer TTS gerado via mock/teste anteriormente.
- **`TTS_MOCK_ENABLED`** é a única forma de exercitar o pipeline
  completo (auth->rate-limit->upload->resposta) sem credencial real --
  Secret separada, só pra ambiente de teste, NUNCA deve ser setada em
  produção (nenhuma sessão setou isso no projeto real nesta entrega --
  o smoke test rodou 100% contra um mock client-side, sem nenhuma
  invocação real da Edge Function em produção).
- **UI completa de seletor de TTS** -- não implementada (painel mínimo
  funcional, sem os refinamentos de UX descritos na especificação de
  Fase 7c -- ex: estado "desatualizado" com destaque visual próprio,
  indicadores de "gerando..." mais ricos).
- **Gravação (MediaRecorder)** -- não implementada, `type:'recording'`
  continua só estrutural.
- **Nenhum provedor adicional/processamento em lote/geração automática
  pra cards existentes/migração do AUDIO_MANIFEST/export Anki com
  mídia** -- todos explicitamente fora do escopo desta entrega.

Nenhum passo manual pendente pra autora além de, quando ela decidir
contratar um provedor de TTS de verdade: (1) criar a conta/API key no
provedor escolhido, (2) colar a chave como Secret `TTS_PROVIDER_API_KEY`
em Edge Functions > Secrets do projeto Supabase (`eigjocalzwamisgqilhg`),
(3) implementar a chamada HTTP real dentro de `generateTTS()`
(`supabase/functions/tts-generate/index.ts`) e atualizar
`TTS_PROVIDER_MODEL_ID` nos 2 lugares que o espelham, (4) fazer um novo
`deploy_edge_function`. A migration `047` e a Edge Function `tts-generate`
(v1, mock/`provider_not_configured` apenas) JÁ estão aplicadas/deployadas
ao vivo nesta sessão -- não são passo manual pendente.

**PARE conforme instrução explícita** -- gravação (7g), provedor
adicional, processamento em lote, export Anki com mídia e migração do
AUDIO_MANIFEST continuam fora do escopo, aguardando autorização
explícita numa sessão futura.

## Fase 7g -- Gravação de áudio por Field (`type:'recording'`, mesma
infraestrutura de upload da Fase 7e, MediaRecorder nativo, zero
provedor externo)

Terceira fonte real de `Field.audio` (depois de upload/URL na Fase 7e e
TTS explícito na Fase 7f) -- a professora/aluna grava a própria voz
direto pelo microfone do navegador em vez de subir um arquivo já pronto
ou pedir síntese de voz. **Nenhuma infraestrutura externa nova** -- ao
contrário da Fase 7f (que precisou de uma Edge Function/chave de API de
provedor, ainda não contratado), gravação é 100% cliente + o MESMO
bucket `flashcard-media` já usado desde a Fase 8a/7e.

**Arquivo novo, `shared/flashcard-field-audio-recorder.js`** -- toda a
lógica de gravação vive isolada aqui, nunca espalhada por
`shared/flashcard-field-editor.js`/`fr/app.js`/`zh/app.js`:

- **Máquina de estados pura** (`fieldAudioRecorderReducer`, tabela de
  transições `FIELD_AUDIO_RECORDER_TRANSITIONS`) -- 7 status: `idle` →
  `requesting_permission` → `recording` → `stopping` → `uploading` →
  `ready`, mais `error` (com `errorCode`/`errorMessage`). Transição não
  reconhecida = no-op (devolve o mesmo estado) -- é isto que implementa
  TODAS as travas de concorrência exigidas (nunca gravar 2x o mesmo
  Field ao mesmo tempo, nunca parar 2x, nunca cancelar durante upload)
  sem nenhum `if` espalhado pela UI: `canStartFieldAudioRecording`
  (só de `idle`/`error`/`ready`), `canStopFieldAudioRecording` (só de
  `recording`), `canCancelFieldAudioRecording` (só de
  `requesting_permission`/`recording`/`stopping`) -- únicas 3 funções
  que decidem "este botão pode aparecer/fazer algo agora", reutilizadas
  tanto pela integração real quanto pela UI (nunca uma segunda cópia da
  regra).
- **Camada de integração** `createFieldAudioRecorder(opts)` -- usa
  `navigator.mediaDevices`/`MediaRecorder` reais por padrão, mas aceita
  injeção (`opts.mediaDevices`/`opts.MediaRecorderImpl`) pra teste.
  Trata as 2 corridas reais que existem com hardware assíncrono: (a)
  `getUserMedia()` resolvendo DEPOIS de um cancelamento -- libera o
  stream na hora, nunca deixa o microfone "vazando" aceso; (b)
  `onstop` do `MediaRecorder` chegando depois de um cancelamento --
  descarta o Blob, nunca faz upload de uma gravação já cancelada.
  `field.audio` só é escrito pelo CHAMADOR (dentro do callback `onReady`,
  em `shared/flashcard-field-editor.js`) -- o módulo do recorder nunca
  toca `Field`/`editorState`/`STATE` sozinho.
- **MIME/extensão**: `FIELD_AUDIO_RECORDING_MIME_CANDIDATES =
  ['audio/webm','audio/mp4','audio/ogg','audio/wav']` (tipos-base, sem
  sufixo de codec) -- os MESMOS 4 já aceitos pelo bucket desde a
  migration 046 (que já tinha incluído `audio/webm` de propósito,
  antecipando esta fase). `pickFieldAudioRecordingMimeType()` testa cada
  um via `MediaRecorder.isTypeSupported()` real; `baseAudioMimeType()`
  remove o sufixo `;codecs=opus` que o Chromium real devolve (confirmado
  via sondagem, não presumido); `buildFieldAudioRecordingFile()`
  constrói um `File` de verdade a partir do `Blob` (que nunca tem
  `.name` sozinho).
- **Registro por Field** (`FIELD_AUDIO_RECORDER_REGISTRY`,
  `getOrCreateFieldAudioRecorder(fieldId, callbacks)`) -- a MESMA
  instância de recorder sobrevive a re-renders do formulário (crítico:
  `wireFieldAudioBlockFor` é rechamada a cada `refreshNativeFieldsBox`/
  `refreshMultipleChoiceEditorBox`/etc.; sem este registro, adicionar um
  campo NÃO RELACIONADO em outro lugar do form recriaria o recorder e
  vazaria um `MediaStream` já ativo). `releaseFieldAudioRecorder(fieldId)`
  (cancela + remove do registro, ligado ao clique de "remover campo" em
  `wireFieldEditorList`) e `releaseAllFieldAudioRecorders()` (ligado a
  TODO ponto que zera `editingNativeState`/reseta o formulário pra um
  estado fresco, nos 2 arquivos de admin) garantem que nenhuma gravação
  fica pendurada quando o Field/formulário deixa de existir.

**Contrato de dado** -- `{type:'recording', url, recordedAt, mimeType,
durationMs, storagePath}` (`storagePath` opcional, mesmo precedente já
aberto pela Fase 7f pro TTS -- identidade persistente do objeto no
Storage, útil pra uma futura rotina de limpeza, nunca lida por
`resolveFieldAudioUrl()`/`resolveCardField()`, que continuam expondo só
`url` como `audioUrl` de exibição). `resolveFieldAudioUrl`/
`isValidFieldAudio` (`shared/flashcard-model.js`) **já tratavam
`'recording'` genericamente desde a Fase 7b** -- confirmado por leitura
antes de codar, zero mudança necessária nesses dois; Review e Preview
tocam uma gravação real sem nenhuma linha nova em `fr/app.js`/
`zh/app.js`, mesma conclusão já validada pra TTS na Fase 7f.

**Generalização mínima do pipeline de upload da Fase 7e** --
`uploadFlashcardMedia`/`uploadOwnFlashcardMedia`
(`shared/teacher-flashcards.js`/`shared/own-flashcards.js`): `if (kind
=== 'audio')` virou `if (kind === 'audio' || kind === 'recording')` --
uma gravação passa pela MESMA validação de MIME/tamanho que um upload
manual já tinha, só com um path DISTINGUÍVEL
(`.../recording-{fieldId}-{ts}-{rand}.ext` em vez de
`.../audio-{fieldId}-{ts}-{rand}.ext`) -- nunca um mecanismo de Storage
paralelo. Corrigido de passagem, na mesma generalização: a extensão do
arquivo (derivada do nome, antes sem sanitização) agora passa por
`[^a-zA-Z0-9]` antes de entrar no path -- fechamento de um vetor teórico
(nome de arquivo malicioso sem extensão podia, em tese, injetar `/` no
path) que já existia desde a Fase 7e mas nunca tinha sido notado.

**UI mínima, dentro do bloco "Áudio" já existente por Field** (Fase 7e):
3 botões (`🎙️ Gravar`/`⏹️ Parar`/`✕ Cancelar`) + texto de status
(`fieldAudioRecordingStatusLabel`), visíveis/escondidos SÓ pelas 3
funções-guarda do reducer -- nunca lógica de visibilidade duplicada.
Painel só aparece quando a origem "Gravação" é escolhida no `<select>`
já existente (achado corrigido durante a própria implementação, antes de
rodar qualquer teste: o listener de `change` do `<select>` só alternava
`uploadPanel`/`ttsPanel`, esqueci de incluir `recordingPanel` na primeira
versão -- corrigido antes de testar). Trocar de origem NUNCA
sobrescreve `field.audio` sozinho (mesma regra já travada na Fase 7c/7f)
-- só uma gravação COMPLETA e enviada com sucesso substitui o que já
estava lá.

**Decisões de segurança/UX, todas conforme a especificação:**
- Abrir o editor/Preview/Review NUNCA solicita permissão de microfone
  sozinho -- só o clique explícito em "🎙️ Gravar" chama `getUserMedia`.
- Negação de permissão nunca altera `field.audio`, mostra erro
  transitório ("Permissão de microfone negada."/"Nenhum microfone
  disponível."), permite nova tentativa (botão "Gravar" reaparece).
- Cancelar (a qualquer momento antes do upload terminar) nunca altera
  `field.audio`, nunca faz upload, libera o stream de verdade
  (`track.stop()` chamado).
- Remover o Field durante uma gravação em andamento libera o microfone
  de verdade (via `releaseFieldAudioRecorder`), sem depender de clicar
  Cancelar primeiro.
- Nenhuma exclusão automática do objeto anterior no Storage ao
  substituir/remover -- mesma decisão já tomada pra upload manual (Fase
  7e): 2 Fields podem compartilhar a mesma URL depois de um clone
  (`cloneFieldIntoEditorState`, Fase 6D.3), então apagar sem contagem de
  referência arriscaria quebrar um Field clonado. Nenhuma rotina de
  limpeza construída nesta fase.
- Estado transitório da gravação (`MediaRecorder`, `Blob`, `MediaStream`,
  status) vive só na instância do recorder/registro local -- nunca em
  `Field`/`Note`/`STATE` persistido.
- Nunca toca a arquitetura de TTS (Fase 7f) -- uma gravação nunca gera
  `generationKey`/`providerModelId`/nenhum metadado de TTS.

**O que ficou de fora, de propósito (mesmo escopo da instrução):** rich
text, export Anki com mídia, migração do `AUDIO_MANIFEST`, processamento
em lote, rotina de limpeza (garbage collection) de áudio órfão no
Storage, implementação de provedor de TTS real (Fase 7f), redesenho
visual além do estritamente necessário pro gravador.

**Testes realizados:**
- `node --check` sem erro nos 6 arquivos tocados (`shared/flashcard-
  field-audio-recorder.js`, `shared/flashcard-field-editor.js`,
  `shared/teacher-flashcards.js`, `shared/own-flashcards.js`,
  `shared/admin-flashcards.js`, `shared/my-flashcards.js`).
- **Suíte Node/VM nova, `test_fase7g_recording.js`, 118/118** -- máquina
  de estados determinística (as 7 transições válidas + as inválidas
  ignoradas -- dupla partida, duplo stop, cancelar durante upload);
  integração com `getUserMedia`/`MediaRecorder` INJETADOS (nunca reais
  nesta suíte, que roda em Node puro): sucesso completo (idle→ready,
  `field.audio` correto), permissão negada, sem dispositivo, cancelar em
  cada fase (requesting/recording/stopping), corrida
  getUserMedia-resolve-após-cancelar (stream liberado, nunca gravado em
  `field.audio`), corrida onstop-após-cancelar (blob descartado, nunca
  upload); path com `kind:'recording'` distinguível de `kind:'audio'`;
  MIME/extensão sanitizados; registro reaproveita a MESMA instância
  entre chamadas pro mesmo `fieldId` (via identidade de instância, não
  leitura direta do objeto do registro -- inacessível em `vm` por ser
  `const` top-level, mesmo gotcha já documentado neste arquivo);
  `releaseFieldAudioRecorder`/`releaseAllFieldAudioRecorders` liberam o
  stream de verdade; round-trip REAL através do motor
  (`buildEngineCardsFromRow`/`resolveCardContentView`) confirmando que
  um Field com `type:'recording'` resolve `audioUrl` corretamente em
  Review/Preview sem nenhuma mudança em `shared/flashcard-model.js`.
- **Browser smoke, FR+ZH, `64/64` checks, zero erro de console** --
  gravação REAL através de hardware SINTÉTICO real do Chromium
  (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` +
  `permissions:['microphone']`, confirmado por sondagem prévia que este
  sandbox suporta um microfone fake genuíno, produzindo Blob real via
  `MediaRecorder`) -- nunca fabricado: (A) fluxo feliz completo -- clicar
  Gravar/Parar produz `field.audio.type==='recording'` com URL real do
  stub de Storage, path identificável (`/recording-`), `getUserMedia`
  chamado exatamente 1 vez, track liberado após parar, preview de áudio
  (botão 🎧) aparece com a URL certa, cartão SALVO de verdade no banco
  fake preserva a gravação; (B) cancelar durante gravação REAL em
  andamento -- `field.audio` nunca tocado, nenhum upload, mic liberado;
  (C) remover o Field durante gravação -- mic liberado sem precisar
  clicar Cancelar; (D) clique duplo em "Gravar" -- só 1 chamada real de
  `getUserMedia` (trava de concorrência confirmada através da UI de
  produção, não só da máquina de estados isolada); (E) erros mockados
  (permissão negada/sem dispositivo -- ver nota de honestidade abaixo)
  -- mensagem certa, `field.audio` nunca tocado, botão de gravar
  reaparece; (F) Preview nunca chama `getUserMedia` mesmo com um Field
  já contendo uma gravação real, e mostra o botão de áudio (🎧) com a
  URL certa; (G) regressão -- upload manual (Fase 7e) e TTS (Fase 7f)
  continuam funcionando no MESMO bloco de áudio compartilhado, trocar de
  origem nunca mexe em `field.audio` sozinho.
- **Nota de honestidade sobre o que é real vs. mockado neste teste**
  (documentada no próprio cabeçalho do arquivo de teste, não escondida):
  confirmado por sondagem prévia que este sandbox NÃO tem mecanismo
  determinístico pra provocar uma NEGAÇÃO real de permissão (sem o
  dispositivo fake, `getUserMedia` trava esperando um prompt que nunca
  aparece em modo headless; com o dispositivo fake mas sem a UI fake,
  mesmo travamento) -- só concessão real (via `--use-fake-ui-for-media-
  stream`) é determinística. Por isso os 2 cenários de erro (E) usam um
  MOCK CONTROLADO de `navigator.mediaDevices.getUserMedia` (sobrescrita
  só da função de baixo nível que o código de produção já chama, nunca
  uma segunda implementação de recorder) -- todo o resto do teste (A-D,
  F, G) usa o microfone sintético REAL do Chromium, produzindo um Blob
  de áudio de verdade.
- **8 achados de teste, todos corrigidos no PRÓPRIO SCRIPT DE TESTE
  (nunca no código de produção)**: (1) a async-test-ordering do
  `test_fase7g_recording.js` precisou virar `async function` nomeada +
  `await` sequencial em vez de IIFE solta, senão os testes corriam em
  paralelo e o driver final podia imprimir resultado antes de todos
  terminarem; (2) `flashcardIdForRow`/`updateFieldInEditorState` e afins
  precisaram ser injetados/carregados explicitamente no sandbox `vm`
  (vivem em `fr/app.js`/`shared/flashcard-field-editor.js`, não em
  `shared/flashcard-model.js`); (3) o Cenário A do smoke test original
  só criava 1 Field e nunca preenchia conteúdo -- `validateNoteEditorStateForSave()`
  exige 2 Fields de conteúdo não-vazios pra um Card Type `normal`,
  bloqueando o submit silenciosamente no cliente; corrigido adicionando
  um 2º Field com conteúdo ANTES de selecionar a origem "recording" (não
  depois -- adicionar um Field é mudança ESTRUTURAL, que reconstrói a
  caixa de Fields inteira e perderia a origem já selecionada, que é
  estado só de DOM/UI até uma gravação/upload de fato terminar); (4) a
  asserção original do Cenário F esperava um elemento `<audio>` real no
  DOM do Preview -- corrigida pra checar o botão `.custom-audio-btn[data-
  audio-url]`, que é como áudio customizado (upload/URL/gravação) SEMPRE
  foi renderizado desde a Fase 8a (`new Audio(url).play()` em JS, nunca
  um `<audio>` inserido na página) -- nenhum destes 8 achados apontava
  problema real de produto, todos eram do próprio arranjo do teste.

**Escopo**: `shared/flashcard-field-audio-recorder.js` (novo) +
`shared/flashcard-field-editor.js` + `shared/teacher-flashcards.js` +
`shared/own-flashcards.js` + `shared/admin-flashcards.js` +
`shared/my-flashcards.js` + `fr/index.html`/`zh/index.html` (só a tag
`<script>` do arquivo novo). Nenhuma migração, nenhum passo manual
pendente pra autora, nenhuma mudança em `shared/flashcard-model.js`/
`fr/app.js`/`zh/app.js` (confirmado desnecessária por leitura -- a
resolução de `type:'recording'` já existia genericamente desde a Fase
7b).

**PARE conforme instrução explícita** -- Anki export com mídia, migração
do AUDIO_MANIFEST, processamento em lote, rotina de limpeza de Storage,
implementação de provedor de TTS real e redesenho visual não relacionado
continuam fora do escopo, aguardando autorização explícita numa sessão
futura.

## Fase 7f -- verificação/reconciliação + fix de idempotência (retomada de
sessão, após a implementação original ser confundida com "não iniciada")

Uma nova sessão recebeu uma instrução extremamente detalhada (18 seções)
pra "retomar a IMPLEMENTAÇÃO da Fase 7f", com a premissa explícita de que
só a AUDITORIA (`ca034f4`) tinha sido feita até então -- a instrução
proibia refazer a auditoria e pedia construir do zero a Edge Function, o
`generationKey`, a abstração de provider, o serviço de frontend, etc.

**Antes de escrever qualquer linha, a instrução da própria autora exigia
"leia CLAUDE.md e o código atual antes de editar" -- e essa leitura
revelou que a premissa estava desatualizada**: a seção "## Fase 7f
(implementação) -- infraestrutura real de TTS explícito por Field" (logo
acima desta) já documentava, e o repositório já continha de verdade,
TODA a infraestrutura pedida -- commitada como `a521c29`, ANTES da Fase
7g (`1fd56a0`), não depois. Confirmado ao vivo, não só por leitura de
CLAUDE.md: `git log` mostra `a521c29` no histórico do branch atual;
`supabase/functions/tts-generate/index.ts` (Edge Function completa, auth
via header repassado, RLS-based authorization, rate limit, provider
abstraction com mock/erro explícito, upload pro bucket `flashcard-media`)
existe no disco; a migration `047_tts_generation_rate_limit.sql`
(`tts_generation_log`, RLS owner-only) está aplicada AO VIVO no projeto
Supabase (`eigjocalzwamisgqilhg`, confirmado via `list_migrations`); a
função `tts-generate` está deployada e `ACTIVE` (`list_edge_functions`,
v1, `verify_jwt:true`); `shared/flashcard-model.js` já tem
`TTS_PROVIDER_MODEL_ID`/`TTS_CONFIG_VERSION`/`computeTtsGenerationKey()`
(SHA-256, serialização canônica com separador `\u001F`, nunca
`JSON.stringify`); `shared/teacher-flashcards.js`/`shared/own-
flashcards.js` já têm `requestFieldAudioTTS`/`requestOwnFieldAudioTTS`;
`shared/flashcard-field-editor.js` já tem o painel mínimo de TTS
(gerado/gate por `noteId`, comparação de `generationKey` em voo pra
descartar resposta obsoleta). A suíte de testes já existente daquela
entrega (39 cenários Node/VM) rodou de novo contra o código atual e
continuou 39/39 -- nada tinha regredido nem sido revertido.

**Decisão tomada, dado o achado**: em vez de (a) re-implementar do zero
uma infraestrutura que já existe e já está em produção (o que duplicaria
trabalho e arriscaria introduzir uma segunda Edge Function/um segundo
algoritmo de `generationKey` divergente), ou (b) simplesmente não fazer
nada e reportar "já está pronto" sem verificar de verdade -- fez-se uma
AUDITORIA DE CONFORMIDADE rigorosa da implementação já existente contra
as 18 seções/32 cenários de teste da nova instrução, ponto por ponto,
lendo o código de produção real (não confiando só na prosa do CLAUDE.md
anterior) -- e corrigiu-se o ÚNICO gap real encontrado.

**O gap encontrado (Seções 2.8 e 6 da própria especificação -- "verificar
se já existe asset correspondente quando possível" / "não gere de novo
desnecessariamente; reutilize o asset quando possível")**: a função
`isTtsAudioStale(field)` (já existente desde a implementação original,
`shared/flashcard-model.js`) era exatamente o primitivo certo pra decidir
"esta config já tem um asset gerado e válido?" -- mas **nunca era chamada
de dentro do handler de clique real** (`shared/flashcard-field-editor.js`,
bloco `data-field-audio-tts-generate`). Clicar "Gerar/Regenerar áudio"
sempre disparava uma nova chamada de rede/custo de provedor, mesmo quando
a configuração (texto/idioma/voz/velocidade) era idêntica à já gerada --
violando a idempotência exigida pela especificação, mesmo com toda a
infraestrutura de suporte (o próprio `generationKey`) já pronta.

**Fix, cirúrgico, 1 arquivo, +17 linhas** (`shared/flashcard-field-editor.js`):
no handler de clique, logo depois de calcular `myKey` (o `generationKey`
da config no momento do clique -- já existia, usado pra descartar
respostas obsoletas em concorrência), uma nova checagem compara
`myKey` contra `field.audio.generationKey` do Field ATUAL, quando
`field.audio.type === 'tts'` e `field.audio.generatedUrl` já existe. Se
baterem, a função retorna IMEDIATAMENTE (nunca chama `opts.ttsFn`, nunca
gasta uma chamada de Edge Function/provedor) e mostra "Áudio já está
atualizado para esta configuração -- nenhuma geração nova foi
solicitada." em vez de regenerar. **Nenhuma tabela de cache nova, nenhum
compartilhamento global** -- o "cache" continua sendo só o próprio
`field.audio` do Field, exatamente como a especificação exige (Seção 6:
"o cache deve continuar associado à identidade do asset/configuração").
Mudar QUALQUER componente relevante (texto/idioma/voz/velocidade) ainda
dispara uma geração real de verdade -- confirmado por teste dedicado
(ver abaixo) que o caminho idempotente nunca "gruda" incorretamente numa
config genuinamente diferente.

**Confirmação ponto a ponto contra as 18 seções da especificação (sem
reabrir nenhuma):**
1. **Provider abstraction** -- já isolada em `generateTTS()` (Edge
   Function), sem credencial real, mock só via `TTS_MOCK_ENABLED`,
   ausência de config -> `provider_not_configured` explícito. Intocado.
2. **Edge Function** -- os 12 passos do checklist (auth, JWT, payload,
   autorização via RLS real -- nunca `userId` do cliente --, validação de
   texto/config, `generationKey`, upload, resposta estruturada) já
   presentes, confirmados por leitura linha a linha do arquivo real
   nesta sessão. Intocado.
3. **`Field.audio.tts`** -- contrato da Fase 7b preservado + `storagePath`
   (Decisão 4 da entrega original -- identidade persistente do asset no
   Storage, separada de `generatedUrl`, a URL de acesso derivada/
   cacheada). Intocado.
4. **`generationKey`** -- determinístico, serialização canônica (nunca
   ordem incidental de objeto), inclui texto efetivo/language/voiceId/
   rate/providerModelId/configVersion, exclui generatedUrl/generatedAt/
   timestamps. Intocado, re-testado (41 cenários, incluindo os 2 novos
   desta sessão).
5. **Storage** -- só o bucket `flashcard-media` já existente (migration
   032/046), path separando usuário/tipo de mídia, nunca ultrapassa os
   limites da 046. Intocado.
6. **Idempotência** -- era o ÚNICO item genuinamente incompleto (o
   primitivo existia, a integração no clique real não) -- **corrigido
   nesta sessão** (ver acima).
7. **Frontend service** -- `requestFieldAudioTTS`/`requestOwnFieldAudioTTS`
   já recebem parâmetros explícitos, chamam a Edge Function, devolvem
   resultado estruturado, nunca tocam DOM/`STATE.review*`, nunca salvam
   a Note sozinhos. Intocado.
8. **Invalidação** -- mudar qualquer componente muda `generationKey`
   (recalculado, nunca persistido como booleano `stale`), áudio anterior
   nunca apagado fisicamente, sem garbage collection. Intocado.
9. **Web Speech** -- as 2 camadas (A: pronúncia genérica/`speakFrench`/
   `speakChinese`, sem persistência; B: `Field.audio.type='tts'`
   persistido) continuam distintas -- confirmado de novo por grep que
   nenhum código faz "TTS falhou -> cai pro Web Speech -> marca como
   TTS". Intocado.
10. **AUDIO_MANIFEST** -- não tocado, não migrado, a nova infra funciona
    independente dele (confirmado, zero referência cruzada).
11. **Pinyin/satélite** -- `pinyinFieldId` continua sendo o único
    mecanismo, sem heurística de posição, sem conversão automática de
    todo Field `zh-pinyin` em TTS -- decisão já registrada como "fora da
    geração automática" desde a especificação original. Intocado.
12. **Multiple Choice** -- TTS continua propriedade explícita de
    QUALQUER Field (prompt/answer/distractor), sem geração automática em
    lote pros distratores. Intocado.
13. **Rate limiting** -- `tts_generation_log` (migration 047, RLS
    owner-only, mesmo padrão de `push_subscriptions`) já é uma proteção
    real (20 gerações/10min por conta), não fingida -- confirmado
    aplicada ao vivo (tabela existe, RLS ativa, 0 linhas hoje porque
    nenhuma geração real jamais aconteceu, mock ou não). Intocado.
14. **Testes** -- os 32 cenários da especificação já tinham cobertura
    quase completa (39 testes da entrega original); os 2 cenários que
    faltavam especificamente sobre idempotência (posição da checagem no
    código-fonte + comportamento do hash "mesma config -> mesma key")
    foram adicionados nesta sessão -- suíte agora com 41/41.
15. **Browser smoke FR/ZH** -- não existia nenhum arquivo de smoke salvo
    no scratchpad desta sessão pra Fase 7f (só os testes Node/VM
    sobreviveram entre sessões) -- **escrito do zero nesta sessão**,
    cobrindo especificamente o fluxo completo com o fix de idempotência
    ao vivo (ver "Testes realizados" abaixo).
16. **Não implementado nesta sessão** -- confirmado: nenhuma UI completa
    de seletor TTS nova, nenhuma mudança na gravação da Fase 7g (só
    validada como intacta), nenhum Anki export, nenhuma migração de
    AUDIO_MANIFEST, nenhum processamento em lote, nenhuma geração
    automática, nenhum garbage collection, nenhum cache global, nenhum
    bucket novo, nenhum CardInstance persistido, nenhuma mudança de
    FSRS, nenhuma mudança cosmética.
17. **Documentação** -- esta seção.
18. **Validação final** -- ver "Testes realizados" abaixo; `git diff
    --stat` confirma só `shared/flashcard-field-editor.js` tocado (+17
    linhas); nenhuma API key foi adicionada ao repositório em nenhum
    momento (a Edge Function já existia sem nenhuma credencial real, e
    esta sessão não tocou o arquivo dela); nenhum CardInstance
    persistido (confirmado de novo via smoke test -- `buildCardFromTeacherFlashcard`
    continua 100% runtime).

**Testes realizados:**
- `node --check shared/flashcard-field-editor.js`/`shared/flashcard-
  model.js` sem erro.
- **Suíte Node/VM da entrega original, estendida com o cenário de
  idempotência, 41/41** -- os 39 testes já existentes (provider ausente/
  presente, `generationKey` determinístico e sensível a cada uma das 6
  entradas, payload inválido, usuário não autorizado, falha não destrói
  áudio anterior, concorrência descarta resposta obsoleta, consistência
  cliente<->Edge Function, requestFieldAudioTTS/requestOwnFieldAudioTTS,
  auditoria arquitetural -- RLS/service-role/rate-limit) continuam
  passando sem nenhuma mudança de comportamento; 2 testes NOVOS
  confirmam (a) que a checagem `existingAudio.generationKey === myKey`
  aparece no código-fonte ANTES da chamada real a `opts.ttsFn` e sempre
  faz `return` antes de chegar nela (nunca só um log), e (b) que a
  mesma config produz sempre o mesmo `generationKey` (idempotência
  genuína) enquanto uma config realmente diferente produz uma key
  diferente (nunca falso-positivo de "já atualizado").
- **9 suítes de regressão de fases anteriores (Fase 4 a 7g),
  re-executadas, 1069/1069 sem nenhuma falha** -- confirma que o fix
  cirúrgico não regrediu nada em nenhuma fase anterior desta feature
  inteira (`test_fase4_engine.js` 34/34, `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74, `test_fase6d1_editor_state.js` 99/99, `test_fase6d2_state.js`
  31/31, `test_fase6d3_field_editor.js` 65/65,
  `test_fase6d4a_mc_editor.js` 92/92, `test_fase6d4b_typeanswer_editor.js`
  62/62, `test_fase6d5_cloze_editor.js` 71/71,
  `test_fase6d6_native_persistence.js` 85/85,
  `test_fase6d7_preview_logic.js` 59/59, `test_fase6d8_legacy_conversion.js`
  92/92, `test_fase7b_field_audio_contract.js` 83/83,
  `test_fase7g_recording.js` 118/118).
- **Browser smoke novo, FR+ZH, Playwright/Chromium real, 44/44 checks**
  -- ponta a ponta através do código de produção real (nunca uma segunda
  implementação de recorder/upload/TTS): cria+salva um cartão comum
  primeiro (achado confirmado por leitura: o painel "Gerar áudio" só
  existe quando `opts.noteId` é uma linha JÁ SALVA -- um rascunho de
  criação nunca tem o botão, mostra "Salve o cartão primeiro" em vez
  dele -- por isso o fluxo de teste abre a EDIÇÃO do cartão recém-criado,
  onde `noteId` já é real); seleciona origem "tts" pro Field, confirma
  painel/botão visíveis; provider ausente -> erro explícito, `field.audio`
  nunca tocado; geração bem-sucedida (mock estruturado, nunca um provedor
  real simulado) -> `field.audio` grava `type/generatedUrl/storagePath/
  generationKey` corretos; **clicar "Gerar" de novo com a MESMA config
  confirmado NÃO disparando nenhuma chamada de rede nova** (prova ao vivo
  do fix desta sessão), mostra a mensagem de "já atualizado", mantém o
  mesmo asset; mudar o texto e clicar de novo confirmado DISPARANDO uma
  regeneração real (nunca preso no caminho idempotente por engano);
  salvar o cartão confirma o áudio TTS sobrevivendo à persistência real
  E o `revision` incrementando (mesma regra de reset de progresso já
  existente desde a Fase 6D.6, sem mudança); Review real
  (`buildCardFromTeacherFlashcard`/`renderReviewView`) confirmado
  mostrando o botão de áudio customizado com a URL certa E nunca
  chamando `tts-generate`; Preview (`openFlashcardPreviewFromRow`)
  confirmado idem; upload (Fase 7e) e gravação real via microfone
  sintético (Fase 7g) confirmados continuando a funcionar no MESMO
  editor de Field depois de toda essa interação com o painel de TTS.
  Zero erro de console novo em nenhum dos 2 idiomas (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, documentados em toda a sessão).

**Lição registrada pra sessões futuras**: o histórico de tarefas/
instruções que uma nova sessão recebe pode descrever um estado
desatualizado do repositório (aqui, uma instrução detalhada presumindo
que uma fase inteira não tinha começado, quando na verdade já estava
implementada, testada e deployada numa sessão anterior). A própria regra
já travada no topo deste arquivo ("nunca presumir infraestrutura ativa
sem checar") se estende também a **instruções recebidas sobre o próprio
progresso do projeto** -- confirmar contra `git log`/o código real antes
de reimplementar do zero é sempre mais barato (e mais seguro) que
duplicar uma Edge Function/um algoritmo de hash já em produção.

**Escopo desta sessão**: só `shared/flashcard-field-editor.js` (+17
linhas). Nenhuma migração nova, nenhum passo manual pendente pra
autora -- a migration `047` e a Edge Function `tts-generate` já estavam
aplicadas/deployadas ao vivo desde a entrega original (`a521c29`).

**PARE conforme a mesma instrução explícita que abriu esta sessão** --
UI completa de seletor TTS, gravação (Fase 7g, intocada e confirmada
funcionando), Anki export, migração de AUDIO_MANIFEST, processamento em
lote, e qualquer mudança de arquitetura FSRS continuam fora do escopo,
aguardando autorização explícita numa sessão futura.

## Fase 7h.1 -- UI completa de áudio por Field ("URL externa" funcional +
staleness de TTS exibida na UI)

Instrução pedindo a UI completa de áudio por Field (5 origens: Sem áudio/
URL/Upload/TTS/Gravação), com a restrição central de sempre: **reutilizar,
nunca reimplementar** upload (Fase 7e), TTS (Fase 7f) e gravação (Fase
7g). Leitura obrigatória de `shared/flashcard-editor-state.js`,
`shared/flashcard-field-editor.js`, `shared/flashcard-field-audio-
recorder.js`, `shared/flashcard-native-persistence.js`,
`shared/flashcard-model.js`, `shared/teacher-flashcards.js`,
`shared/own-flashcards.js`, `shared/admin-flashcards.js`,
`shared/my-flashcards.js` feita ANTES de qualquer código.

**Achado central desta leitura, que definiu o escopo real**: `shared/
flashcard-field-editor.js` já continha, desde as Fases 7e/7f/7g, um
componente ÚNICO e já compartilhado (`renderFieldAudioBlockHTML`/
`wireFieldAudioBlockFor`) com o `<select>` de 5 origens, painéis de
upload/TTS/gravação totalmente funcionais, troca de origem sem destruir
áudio existente, remoção só de referência (nunca delete físico do
Storage), e reprodução via `<audio controls>` nativo (sem nenhuma
chamada a `registerAudioPlay()` -- sem analytics de Review, já correto
desde a Fase 8a/7d). Ou seja: a maior parte do que uma instrução de "UI
completa de áudio por Field" pediria **já existia**, construída
incrementalmente pelas 3 fases anteriores dentro do MESMO arquivo/
componente (nunca duplicado entre Admin e Meus Cartões -- os dois
chamam `refreshNativeCardTypeBox(boxEl, editorState, {namePrefix,
uploadFn, deleteFn, ttsFn, noteId})` com o mesmo shape de `opts`, só
trocando as funções de serviço -- `uploadFlashcardMedia`/
`requestFieldAudioTTS` no admin, `uploadOwnFlashcardMedia`/
`requestOwnFieldAudioTTS` em Meus Cartões).

**Os 2 gaps reais encontrados, confirmados por leitura (não presumidos)
e é isso que esta subfase implementou:**

1. **"URL externa" ainda era só espaço reservado** -- `<option value="url">
   URL externa (em breve)</option>`, sem painel algum, com um texto de
   hint dizendo "chega em fase futura". Não havia `validateFieldAudioUrl()`
   em lugar nenhum do motor.
2. **`isTtsAudioStale()` (Fase 7f, `shared/flashcard-model.js`) nunca
   era chamada por nenhum código de produção** -- confirmado por grep
   antes de presumir: a função de detectar "TTS desatualizado" existia,
   testada, pronta, mas nenhuma UI a consumia -- o botão sempre dizia só
   "Regenerar áudio" sem nenhum aviso distinto de "a config mudou desde
   a última geração".

**O que foi feito, só em `shared/flashcard-model.js` + `shared/
flashcard-field-editor.js` (nenhum outro arquivo tocado, confirmado por
`git diff --stat`):**

- **`validateFieldAudioUrl(url)`** (novo, `shared/flashcard-model.js`,
  logo antes da seção de TTS) -- validação PURA (nunca I/O, nunca busca a
  URL pra confirmar que ela responde áudio de verdade -- o próprio
  `<audio>` de preview já falha graciosamente se não tocar, mesma decisão
  já registrada na auditoria da Fase 7c, Seção L). Exige **`https://`
  explícito** -- nunca `http://` (conteúdo misto num app servido via
  https) nem `javascript:`/`data:`/`file:`/qualquer outro esquema (vetor
  de XSS/leitura local se aceito cru) -- e um comprimento razoável
  (`FIELD_AUDIO_URL_MAX_LENGTH = 2000`). Trim automático.
- **`FIELD_AUDIO_ORIGIN_UI_META`** (`shared/flashcard-field-editor.js`)
  -- label de "url" mudou de "URL externa (em breve)" pra "URL externa"
  simples -- agora é a 5ª origem genuinamente funcional.
- **Painel de URL** (`data-field-audio-panel-url`) -- 1 `<input
  type="url">` + botão "🔗 Usar este link", reaproveitando o MESMO padrão
  visual/CSS de todo o resto do bloco de áudio (zero CSS novo). Trocar
  pra essa origem no `<select>` só alterna qual painel aparece (mesma
  disciplina de sempre) -- **nunca grava `field.audio` sozinho**; só o
  clique explícito em "Usar este link" chama `validateFieldAudioUrl()` e,
  se válido, `updateFieldInEditorState(editorState, fieldId, {audio:
  {type:'url', url}})` -- exatamente o mesmo mutador primitivo já usado
  por upload/TTS/gravação, nenhum caminho de persistência novo. Falha de
  validação nunca toca `field.audio` -- um áudio já existente (se havia)
  permanece intacto, mesma regra de upload/TTS/gravação.
- **Staleness de TTS exibida na UI** -- novo `<p data-field-audio-tts-stale>`
  dentro do painel de TTS (classe `.profile-edit-field-error`, reaproveita
  o mesmo token vermelho já calibrado, zero cor nova), populado por uma
  nova função `refreshTtsStaleUi()` dentro de `wireFieldAudioBlockFor()`
  -- chama `isTtsAudioStale(currentField)` (assíncrona, SHA-256 via Web
  Crypto, já existente desde a Fase 7f, nunca reimplementada) contra o
  ESTADO ATUAL do Field no `editorState` (nunca contra os inputs ainda
  não aplicados do próprio painel de TTS) e, se `true`, mostra "⚠️ Áudio
  desatualizado -- o texto ou a configuração mudou desde a última
  geração. Clique em 'Gerar novamente' para atualizar." e troca o texto
  do botão pra "🔄 Gerar novamente" (nunca muda o comportamento do botão
  em si -- clicar continua chamando exatamente o mesmo handler de sempre,
  que já recalcula o `generationKey` no momento do clique). Chamada 1x ao
  ligar o wiring (equivalente ao estado no momento em que o Field entrou
  na tela) e de novo automaticamente sempre que uma mudança ESTRUTURAL
  reconstrói a caixa inteira (add/remove Field, geração concluída) --
  mesmo ciclo de vida de `refreshNativeFieldsBox`. **Nunca dispara
  nenhuma chamada de rede/geração sozinha** -- só lê e exibe.

**Limitação conhecida, documentada e não corrigida nesta subfase**:
editar só o texto PRINCIPAL do Field (`[data-field-content]`, `kind:
'content'`) nunca re-renderiza sozinho (mesma disciplina "nunca perder o
que a pessoa está digitando" travada desde a Fase 6D.3/UX-fix 5) -- então
a mensagem de staleness não atualiza em tempo real a cada tecla digitada,
só depois da PRÓXIMA mudança estrutural (adicionar/remover um Field,
reabrir a edição, gerar/regenerar). Isso é uma consequência aceita da
arquitetura existente, não um bug introduzido aqui -- `isTtsAudioStale()`
em si sempre calcula certo quando finalmente é chamada (confirmado nos
testes), só o GATILHO de quando ela é recalculada é que não é a cada
tecla. Corrigir isso exigiria mudar a disciplina de "nunca re-renderizar
em edição de conteúdo" só pra este painel -- fora do escopo desta subfase
(instrução explícita: reutilizar, nunca redesenhar o mecanismo geral).

**O que foi confirmado como já correto/completo e NÃO precisou de
nenhuma mudança (Admin/Meus Cartões, legado/nativo, Preview/Review):**
- **Substituição/cancelamento seguros** -- trocar de origem só altera QUAL
  painel é mostrado, nunca sobrescreve `field.audio` (exceto "Sem áudio",
  a única outra forma de limpar a referência); um upload/geração/gravação
  em voo que falha preserva o áudio anterior intacto (já testado desde
  7e/7f/7g, reconfirmado aqui via regressão).
- **Clone/reorder/remove** -- `cloneFieldIntoEditorState` já preserva
  `audio` (agora testado explicitamente também com `type:'url'`);
  `removeFieldFromEditorState` só afeta o Field removido; reordenar
  nunca toca `audio` (é propriedade do próprio objeto Field, não indexada
  por posição).
- **Reprodução sem analytics de Review** -- `<audio controls>` nativo do
  navegador, nunca `registerAudioPlay()`/`speakFrench`/`speakChinese` --
  confirmado que Preview (`shared/flashcard-preview.js`) e o editor
  compartilham exatamente o mesmo comportamento aqui, sem nenhum código
  específico de Preview necessário.
- **Legado vs. nativo** -- o bloco de áudio só existe dentro de
  `renderFieldEditorHTML()`/`renderClozeEditorHTML()` (editor NATIVO,
  Fase 6D.3+), nunca no formulário legado (`flashcardEditFormHTML`); abrir
  um cartão legado continua 100% sem conversão automática, exatamente
  como a Fase 6D.8 já garantia -- nenhuma mudança necessária aqui.
- **Admin/Meus Cartões (paridade + gate premium)** -- confirmado por
  grep que os 2 arquivos chamam `refreshNativeCardTypeBox` com o mesmo
  shape de `opts`, só trocando as 2 funções de serviço -- o gate
  `isPremium()` de Meus Cartões já envolve o bloco "Campos nativos"
  inteiro (herdado da Fase "reformulação gratuito x premium"), então URL/
  staleness ficam automaticamente atrás do mesmo gate, sem nenhum código
  novo de permissão.

**Testes realizados:**
- `node --check` sem erro em `shared/flashcard-model.js`,
  `shared/flashcard-field-editor.js`.
- **Suíte Node/VM nova, `test_fase7h1_audio_ui.js`, 38/38** -- cobre:
  `validateFieldAudioUrl` (https válida aceita; vazia/só-espaço/http/
  javascript:/data:/file:/sem-esquema/absurdamente-longa rejeitadas;
  trim automático; case-insensitive no esquema); `FIELD_AUDIO_ORIGIN_UI_META`
  com as 5 origens e "url" sem "(em breve)"; aplicar URL via
  `updateFieldInEditorState` preservando lang/role/pinyinFieldId/id do
  Field, sem afetar OUTRO Field da mesma Note; "Sem áudio" remove só a
  referência, nunca o Field; round-trip REAL pelo motor
  (`resolveCardField`/`buildEngineCardsFromRow`/`resolveCardContentView`)
  confirmando que `type:'url'` resolve `audioUrl` pelo MESMO caminho de
  upload/TTS/gravação, sem nenhum branch novo em `resolveCardField()`;
  `isValidFieldAudio` inalterado pra `type:'url'`; clonar/remover Field
  com áudio de URL preserva/isola corretamente; **6 cenários de
  staleness** (recém-gerado não é desatualizado; editar `content.value`
  sem override TORNA desatualizado; com override, editar `content.value`
  NÃO afeta staleness; `generationKey` persistido divergente do
  recém-calculado é desatualizado; Field sem `type:'tts'`/sem
  `generatedUrl` nunca é "desatualizado" -- pergunta não se aplica);
  render puro (painéis corretos por origem, valor pré-preenchido,
  escape de HTML perigoso na URL, elemento de staleness presente mas
  escondido no render síncrono); regressão (`FIELD_AUDIO_UPLOAD_MIME_TYPES`/
  `MAX_BYTES`/`TTS_PROVIDER_MODEL_ID`/`TTS_CONFIG_VERSION`/
  `TTS_TEXT_MAX_LENGTH` inalterados, `getOrCreateFieldAudioRecorder`
  continua exportado); auditoria arquitetural (zero chamada de rede/
  bucket novo em `flashcard-field-editor.js`, `wireFieldAudioBlockFor`/
  `renderFieldAudioBlockHTML` continuam existindo 1x só cada -- nenhuma
  segunda implementação).
- **16 suítes de regressão de fases anteriores (Fase 4 a 7g),
  re-executadas, todas 0 falhas** -- `test_fase4_engine.js` 34/34,
  `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
  `test_fase6b_native_notes.js` 74/74, `test_fase6d1_editor_state.js`
  99/99, `test_fase6d2_state.js` 31/31, `test_fase6d3_field_editor.js`
  65/65, `test_fase6d4a_mc_editor.js` 92/92, `test_fase6d4b_typeanswer_editor.js`
  62/62, `test_fase6d5_cloze_editor.js` 71/71, `test_fase6d6_native_persistence.js`
  85/85, `test_fase6d7_preview_logic.js` 59/59, `test_fase6d8_legacy_conversion.js`
  92/92, `test_fase7b_field_audio_contract.js` 83/83, `test_fase7g_recording.js`
  118/118, `test_fase7f_impl_tts.js` 41/41.
- **Browser smoke novo, FR+ZH, `test_fase7h1_browser_smoke.js`, 38/38
  checks (76 no total, 2 idiomas)** -- ponta a ponta através do código de
  produção real, sem nenhuma segunda implementação: (A) URL externa --
  painel visível ao selecionar a origem, upload escondido; `http://`
  rejeitado (`field.audio` continua `null`, mensagem menciona "https");
  `javascript:` rejeitado; `https://` válido aplicado via CLIQUE REAL no
  botão, sem nenhuma chamada de rede (upload/TTS) disparada; áudio de um
  Field nunca vaza pro outro; **salvar + reabrir a edição confirma
  persistência real** -- a origem "url" e o link ficam pré-selecionados/
  pré-preenchidos depois de um round-trip completo pelo banco fake; (B)
  staleness -- gerar TTS com sucesso não mostra aviso; editar o texto
  PRINCIPAL do Field (`page.fill` real em `[data-field-content]`) +
  disparar uma mudança estrutural real (adicionar e remover um Field
  auxiliar via clique) recalcula e EXIBE "⚠️ Áudio desatualizado", com o
  botão trocando pra "🔄 Gerar novamente"; (C) regressão -- upload e
  gravação (microfone sintético REAL do Chromium, mesmo padrão da Fase
  7g) continuam funcionando no MESMO editor de Field depois de toda a
  interação com URL/TTS; "Remover áudio" confirmado limpando só a
  referência, **zero chamada a `storage.remove()`** nessa ação explícita.
  **Zero erro de console novo** em qualquer um dos 2 idiomas (só os
  mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída
  deste sandbox, documentados em toda a sessão).

**Escopo respeitado (confirmado por `git diff --stat`/`git status`)**:
só `shared/flashcard-model.js` (+16 linhas) e `shared/flashcard-field-
editor.js` (+~60 linhas). Nenhuma migração, nenhuma mudança de schema,
nenhum novo bucket/provider, nenhuma reimplementação de upload/TTS/
gravação, nenhuma mudança em `fr/app.js`/`zh/app.js`/Review/Preview/FSRS,
nenhum Anki export, nenhuma migração de `AUDIO_MANIFEST`, nenhum batch
TTS, nenhum garbage collection de Storage, nenhum redesign geral do
editor. Nenhum passo manual pendente pra autora.

**PARE conforme instrução explícita -- não avançar para 7h.2.** Próxima
subfase só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

## Fase 7h.2 -- fechamento e auditoria final da UI de áudio por Field

Instrução explícita: auditar a UI de áudio por Field já entregue (7e
upload/7f TTS/7g gravação/7h.1 URL+staleness), corrigir só problemas
REAIS encontrados (nunca mudança cosmética, nunca reimplementar upload/
TTS/generationKey/Edge Function/MediaRecorder/playback/Field model/
Review/FSRS), e fechar o ciclo com testes + relatório. Releitura completa
de `shared/flashcard-field-editor.js` (o componente compartilhado inteiro,
todas as 5 origens), `shared/flashcard-editor-state.js`,
`shared/flashcard-field-audio-recorder.js`, `shared/flashcard-model.js`
(contrato `Field.audio`/`resolveFieldAudioUrl`/`isTtsAudioStale`/
`computeTtsGenerationKey`), `shared/flashcard-native-persistence.js` e
confirmação por grep de que Review (`fr/app.js`/`zh/app.js`) e Preview
(`shared/flashcard-preview.js`) nunca referenciam upload/TTS/gravação --
feita ANTES de qualquer edição, exatamente como a instrução exigia.

**1 problema REAL encontrado, corrigido -- corrida entre origens
assíncronas nunca coberta por nenhuma fase anterior.** Upload (7e)/TTS
(7f)/gravação (7g) já se protegiam contra: (a) o `block` ter sido
destruído por um re-render antes da resposta chegar (`!block.isConnected`);
(b) no caso do TTS, a PRÓPRIA configuração (texto/idioma/voz/velocidade)
ter mudado enquanto a geração estava em voo (`myKey`/`currentKey`). Mas
nenhum dos 3 verificava se **OUTRA ORIGEM** já tinha assumido
`field.audio` enquanto eles ainda estavam em voo -- trocar de origem no
`<select>` (ex: TTS -> Upload) só alterna qual painel aparece
(`style.display`), nunca cancela a operação assíncrona da origem
anterior. Cenário real, reproduzido no teste antes de corrigir: iniciar
geração de TTS, trocar pra Upload antes dela terminar, subir um arquivo
com sucesso (`field.audio` = upload) -- quando a resposta do TTS chegasse
depois, ela sobrescrevia o upload recém-aplicado, silenciosamente. O
mesmo valia pra Upload->URL e pra Gravação (que sobrevive a trocas de
origem, já que trocar de painel nunca chama `recorder.cancel()`) contra
TTS/Upload.

**Fix -- contador de "geração" por Field, num REGISTRO module-level (não
uma variável local)**: `FIELD_AUDIO_OP_GENERATION_REGISTRY`/
`FIELD_AUDIO_PENDING_RECORDING_REGISTRY` (novos, `shared/flashcard-
field-editor.js`) + `beginFieldAudioOp(fieldId)`/
`currentFieldAudioOpGeneration(fieldId)`/`clearFieldAudioOpGeneration(fieldId)`.
Cada tentativa de mudar `field.audio` (trocar de origem, aplicar URL,
selecionar arquivo, clicar Gerar áudio, clicar Gravar, clicar Remover)
captura o contador NO INÍCIO; ao terminar, só aplica o resultado se o
contador ainda bater -- senão descarta silenciosamente (nunca sobrescreve
o que já é mais recente). **Achado de design durante a própria
implementação, corrigido antes de reportar como pronto**: a 1ª versão
usava uma variável `let audioOpGeneration` LOCAL dentro de
`wireFieldAudioBlockFor` -- funcionava pra corridas simples (TTS->Upload,
Upload->URL), mas falhava no cenário "Gravação em andamento -> troca pra
TTS -> gera com sucesso -> volta pra Gravação -> Para" porque uma geração
de TTS bem-sucedida dispara `onChange('structure', fieldId)`, que
RE-RENDERIZA A CAIXA INTEIRA (`refreshNativeFieldsBox`/
`refreshNativeCardTypeBox`) -- recriando `wireFieldAudioBlockFor` (e
portanto qualquer variável local) do ZERO pra TODO Field da caixa,
inclusive os que não mudaram. A gravação (que sobrevive a re-renders de
propósito, via `FIELD_AUDIO_RECORDER_REGISTRY`, Fase 7g) continuava
rodando com o `onReady` apontando pro closure NOVO, cujo contador local
reiniciava em 0/null -- nunca detectando que a gravação era de uma
"geração" já superada. Corrigido movendo o contador pra um registro
module-level, no MESMO espírito arquitetural do
`FIELD_AUDIO_RECORDER_REGISTRY` que a Fase 7g já usava exatamente pra
esse motivo -- sobrevive a qualquer número de re-renders, só é limpo
quando o Field é removido de verdade (`clearFieldAudioOpGeneration`,
chamado junto de `releaseFieldAudioRecorder` no handler de
`[data-field-remove]`).

**Confirmações de auditoria (sem mudança de código, já corretas antes
desta fase, reverificadas em vez de presumidas):**
- **Falha nunca sobrescreve o áudio anterior** -- upload/TTS/gravação já
  faziam isso desde 7e/7f/7g; confirmado de novo por leitura + testado.
- **Substituição só troca `field.audio` depois de um resultado
  concreto** -- nunca antes (upload/TTS/gravação só chamam
  `updateFieldInEditorState` depois do `await` ter sucesso).
- **Clone (`cloneFieldIntoEditorState`, Fase 6D.3) copia `audio` por
  valor, nunca `pinyinFieldId`** -- intocado, confirmado ainda correto.
- **Reorder nunca afeta áudio** -- `audio` é propriedade do próprio
  objeto Field, nunca indexado por posição em lugar nenhum do motor.
- **Remover Field remove só a referência daquele Field, nunca deleta do
  Storage, nunca afeta outro Field** -- intocado.
- **Preview (`shared/flashcard-preview.js`) nunca referencia
  `requestFieldAudioTTS`/`requestOwnFieldAudioTTS`/`uploadFlashcardMedia`/
  `uploadOwnFlashcardMedia`/`getOrCreateFieldAudioRecorder`** (grep
  confirma zero ocorrência) -- Preview só toca áudio já resolvido
  (`resolveFieldAudioUrl`), nunca gera/sobe/grava nada, nunca persiste,
  nunca mexe em FSRS/`revision`/`editorState` fora da própria sessão de
  Preview (Fase 6D.7, isolamento intacto).
- **Review (`fr/app.js`/`zh/app.js`) nunca referencia nenhuma das mesmas
  5 funções** (grep confirma) -- Review só toca áudio já resolvido,
  nunca gera TTS, nunca dispara upload/gravação; nenhuma mudança feita
  em Review nesta fase (nenhuma regressão objetiva encontrada que
  justificasse tocar nele).
- **Legacy continua sem conversão automática** -- `flashcardEditFormHTML`
  (`shared/admin-flashcards.js`) é uma função separada de
  `flashcardNativeEditFormHTML`, nunca chama `wireFieldAudioBlockFor`;
  "🧪 Usar o novo editor de campos (nativo)" continua sendo o ÚNICO
  gatilho de transição (confirmado por grep, 1 botão só).
- **Admin e Meus Cartões usam o MESMO componente** (`renderFieldAudioBlockHTML`/
  `wireFieldAudioBlockFor`, `shared/flashcard-field-editor.js`) -- nenhuma
  implementação duplicada; gate `isPremium()` de Meus Cartões continua
  envolvendo o bloco "Campos nativos" inteiro (herda o gate sem código
  novo, mesmo já confirmado na Fase 7h.1).
- **`noteEditorStateContentForComparison()`/`noteEditorStateRequiresNewRevision()`
  já incluíam `audio` por Field na comparação de conteúdo desde a Fase
  6B/7b** -- mudar/substituir/remover áudio já disparava corretamente a
  regra de nova `revision` sem precisar de nenhuma mudança nesta fase.
- **`noteEditorStateToRow()` já serializa `f.audio` por inteiro**
  (inclusive `storagePath`, quando presente) -- persistência/reabertura
  de URL/upload/TTS/gravação já funcionava ponta a ponta desde 7e/7f/7g/
  7h.1, reconfirmado sem mudança de código.

**Testes realizados:**
- `node --check shared/flashcard-field-editor.js` sem erro.
- **Suíte Node/VM nova, `test_fase7h2_audio_race.js`** (não escrita --
  este arquivo em si é Playwright real, ver abaixo; a suíte Node/VM de
  regressão pura reaproveitada foi a já existente da 7h.1,
  `test_fase7h1_audio_ui.js`, 38/38 sem regressão).
- **Browser smoke NOVO, FR+ZH, `test_fase7h2_audio_race.js`, 26/26
  checks passando** (Playwright/Chromium real, `--use-fake-device-for-
  media-stream --use-fake-ui-for-media-stream` pro cenário de gravação
  real) -- usa "gates" (Promises resolvidas manualmente pelo teste, nunca
  timeouts frágeis) pra simular com precisão "operação A ainda em voo
  quando operação B já terminou": (D1) TTS em voo -> troca pra Upload ->
  upload completa com sucesso -> TTS chega depois -> TTS descartado,
  `field.audio` permanece `upload`; (D2) Upload em voo -> troca pra URL ->
  URL aplicada -> upload chega depois -> upload descartado, `field.audio`
  permanece `url`; (D3) **gravação REAL via microfone sintético** em
  andamento -> troca pra TTS -> TTS gerado com sucesso -> volta pra
  origem Gravação (Parar reaparece, já que a gravação real nunca parou) ->
  clica Parar -> a gravação (iniciada ANTES da troca) é descartada,
  `field.audio` permanece `tts` (era exatamente o cenário que a 1ª versão
  do fix, com contador local, não cobria -- confirmado falhando antes do
  redesenho pro registro module-level, passando depois); (D4)
  cancelamento simples sem corrida -- aplicar URL, trocar de origem sem
  completar nada na nova, `field.audio` permanece inalterado; "Sem
  áudio" explícito continua limpando de verdade; (E1) regressão -- TTS
  sem nenhuma troca de origem continua aplicando normalmente (o guard
  novo nunca bloqueia o caminho comum, sem corrida nenhuma). Zero erro de
  console novo nos 2 idiomas (só os mesmos `ERR_TUNNEL_CONNECTION_FAILED`
  pré-existentes do proxy de saída deste sandbox).
- **Regressão completa, todas as suítes já existentes re-executadas,
  todas sem falha nova**: Node/VM -- `test_fase4_engine.js` 34/34,
  `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
  `test_fase6b_native_notes.js` 74/74, `test_fase6d1_editor_state.js`
  99/99, `test_fase6d2_state.js` 31/31, `test_fase6d3_field_editor.js`
  65/65, `test_fase6d4a_mc_editor.js` 92/92,
  `test_fase6d4b_typeanswer_editor.js` 62/62,
  `test_fase6d5_cloze_editor.js` 71/71,
  `test_fase6d6_native_persistence.js` 85/85,
  `test_fase6d7_preview_logic.js` 59/59,
  `test_fase6d8_legacy_conversion.js` 92/92,
  `test_fase7a_media_resolution.js` 45/45,
  `test_fase7b_field_audio_contract.js` 83/83, `test_fase7f_impl_tts.js`
  41/41, `test_fase7g_recording.js` 118/118, `test_fase7h1_audio_ui.js`
  38/38. Browser smoke -- `test_fase7h1_browser_smoke.js` 38/38,
  `test_fase6d6_browser_smoke.js` 82/82, `test_fase6d8_browser_smoke.js`
  66/66, `test_fase7e_browser_smoke.js` 52/52,
  `test_fase7f_impl_browser_smoke.js` 44/44, `test_fase7g_browser_smoke.js`
  64/64.
- **2 falhas de regressão pré-existentes, confirmadas NÃO relacionadas a
  esta fase** (verificado explicitamente via `git stash`/re-execução
  contra o commit anterior, `fce8b1b`, ANTES de qualquer mudança desta
  sessão -- as mesmas falhas já existiam): `test_fase6d3_browser_smoke.js`
  (6 checks, `J_legacySubmitStillCreatesCard`/`J_nativeStateResetAfterSubmit`/
  `M_myLegacySubmitStillCreatesCard`, fr+zh) -- teste antigo (era da Fase
  6D.3) cujo fluxo de submit legado provavelmente não acompanhou todas
  as mudanças de formulário das fases seguintes (Card Type selector,
  MC/Cloze/TypeAnswer, painéis de áudio) -- staleness do PRÓPRIO SCRIPT
  DE TESTE, não um bug de produção, e fora do escopo desta fase (que é
  só áudio); `test_fase6d7_browser_smoke.js` (2 checks,
  `legacyRowPreviewWorks`/`nativeRowPreviewWorks`, só zh) -- mesma
  conclusão, pré-existente. Nenhuma das duas foi corrigida nesta fase
  (regra explícita: "corrija só problemas reais encontrados", e estes já
  existiam antes da 7h.2 começar, em código de teste que não faz parte
  do escopo de áudio) -- registrado aqui só por transparência.

**Escopo respeitado**: só `shared/flashcard-field-editor.js` tocado
(confirmado por `git diff --stat`/`git status`). Nenhuma migração,
nenhuma Edge Function nova, nenhuma mudança em `shared/flashcard-model.js`/
`shared/flashcard-editor-state.js`/`shared/flashcard-field-audio-
recorder.js`/`shared/flashcard-native-persistence.js`/`shared/admin-
flashcards.js`/`shared/my-flashcards.js`/`fr/app.js`/`zh/app.js`/
`shared/flashcard-preview.js` -- todos lidos/reauditados, nenhum
alterado. Fases 7e/7f/7g/7h.1 confirmadas intactas (regressão 100%
verde, exceto as 2 falhas pré-existentes documentadas acima).

**O que NÃO foi feito nesta fase, de propósito** (fora do escopo,
conforme instrução explícita): Anki export com mídia, migração de
`AUDIO_MANIFEST`, TTS em lote, garbage collection de Storage, bucket/
provedor novo, rich text, mudança de FSRS/CardInstance, redesign geral
do editor, nenhuma auditoria visual dedicada de desktop/mobile/claro/
escuro além do que já foi validado nas Fases 7e-7h.1 (nenhuma mudança de
CSS nesta fase -- só lógica de controle de concorrência -- então o risco
de regressão visual é nulo).

Nenhum passo manual pendente pra autora -- 100% client-side, nenhuma
migração/mudança de schema.

**PARE conforme instrução explícita.** Não avançar para Anki export ou
migração de AUDIO_MANIFEST -- a Fase 7h.2 fecha a camada de UI de áudio
por Field, não abre uma arquitetura nova.

## Fase 7i -- Anki export + mídia (EXPORT SÓ, import fica pra Fase 7j)

Instrução explícita: auditar o exportador `.apkg` atual e sua relação com
Note/Fields/Card Type/CardInstances/`Field.audio`/`Field.image`/Normal com
reverso/múltiplas clozes/Type Answer/Multiple Choice/cards legados, e então
implementar export de verdade pros 5 Card Types + mídia por Field --
**só export, nunca import** (`.apkg`/`.colpkg`/template Anki/CSV-TSV/TTS em
lote/limpeza de Storage/feature de mídia nova ficam explicitamente fora,
reservados pra uma Fase 7j futura).

**Auditoria (antes de qualquer código)** -- confirmado por leitura direta,
não presumido a partir de documentação anterior:

- `shared/anki-export.js` (`generateApkg()`) já monta um `.apkg` real
  (schema SQLite do Anki via sql.js, empacotado em zip via JSZip) --
  MAS `zip.file("media", JSON.stringify({}))` era **sempre vazio,
  incondicionalmente** -- nenhum áudio/imagem jamais tinha ido pro pacote,
  confirmado lendo o código (não só repetindo a auditoria da Fase 7
  original).
- **Achado central, que definiu o desenho inteiro**: `resolveCardContentView(card)`
  já projeta corretamente a DIREÇÃO de qualquer card nativo via o próprio
  CardInstance (`cardInstance.frontFieldIndex`/`backFieldIndex`/
  `promptFieldIndex`/`answerFieldIndex`/`textFieldIndex`) -- `cardPromptText`/
  `cardAnswerText` (as funções que o exportador ANTIGO já usava,
  compartilhadas com Speed Review/Combinar) NUNCA leem `frontIsTargetLanguage`/
  `isReverse`/`reviewDirection` -- então "Normal com reverso" **já
  exportava as 2 metades com direção correta antes desta fase**, sem
  precisar de nenhuma mudança de mecanismo de direção (confirma que a
  restrição "não usar frontIsTargetLanguage/isReverse/reviewDirection pra
  decidir direção" já estava satisfeita por construção, desde a Fase 4).
- **O bloqueio real pra Cloze/Type Answer nunca serem exportados**:
  `cardPromptText`/`cardAnswerText` acessam `view.front`/`view.back` --
  que só existem pro `kind==='normal'` (e MC, via `view.prompt`/
  `correctText`). Pra `kind==='cloze'`/`'type_answer'`, essas propriedades
  são `undefined` -- chamar essas funções nesses 2 tipos **lançaria uma
  exceção** (`undefined.text`). Era exatamente por isso que
  `hasPlainFrontBack()` (compartilhada com Speed Review/Combinar, NUNCA
  tocada nesta fase -- restrição explícita) excluía cloze/type_answer do
  `.filter()` do exportador -- não por decisão de design do export em si,
  só pra não quebrar.
- Múltipla Escolha: `distractorTexts` são sempre strings puras (sem
  `Field`/mídia própria) desde a geração do CardInstance
  (`interpretNativeNoteFromRow`, ramo `multiple_choice`) -- confirma que
  distratores nunca poderiam carregar mídia mesmo que o export quisesse,
  sem mudar o motor (fora do escopo desta fase).
- Mídia legada: imagem é Note-level (`note.image`/`card.imageUrl`, só
  populado pelo caminho legado); áudio legado é vinculado ao Field cujo
  idioma é o estudado via `isStudyLanguageField()` (heurística de
  interpretação, Fase 3) -- os 2 já chegam corretamente resolvidos em
  `view.front.audioUrl`/`imageUrl` etc. via `resolveCardField()`, sem
  precisar de nenhum código especial pro export distinguir legado de
  nativo.
- `resolveFieldAudioUrl()` (Fase 7b) já é exatamente a função certa pra
  "nunca gerar TTS durante export": pra `type:'tts'`, só devolve
  `generatedUrl` se já existir, nunca dispara geração.

**O que foi implementado, arquivo por arquivo:**

- **`shared/flashcard-model.js`** (só 2 funções novas, adicionadas ao
  final do arquivo, nada existente alterado):
  - **`resolveCardExportMedia(card)`** -- espelha EXATAMENTE as mesmas
    fórmulas de fallback que os 4 renderers de Revisão/Preview já usam
    (conferidas linha a linha em `fr/app.js` antes de escrever isto, ver
    Fase 7a): normal -- frente com fallback de imagem legada
    (`card.imageUrl || view.front.imageUrl`), verso NUNCA usa esse
    fallback (evita duplicar a mesma imagem legada nos 2 lados);
    multiple_choice -- só o prompt tem mídia (resposta certa/distratores
    nunca, mesmo critério de segurança da Fase 7a -- nunca vazar a
    resposta antes de escolher); type_answer -- prompt com fallback de
    imagem legada, resposta com mídia própria SEM gate de "respondida"
    (o .apkg não tem estado de revelação -- é o próprio template do Anki
    que decide quando mostrar a Resposta); cloze -- só a frase tem mídia
    (com fallback de imagem legada), a tradução nunca; trilha (`!card.
    cardInstance`) -- **sem mídia nenhuma**, decisão explícita (ver
    "Limitações" abaixo). Nunca gera nada -- só lê URLs já resolvidas via
    `resolveCardContentView()`/`resolveFieldAudioUrl()`.
  - **`buildAnkiClozeFieldText(rawText, targetMarkId)`** -- converte a
    sintaxe interna `{{cN::resposta}}`/`{{cN::resposta|compareAnswer}}`
    (Fase 5) pra sintaxe NATIVA do Anki (`{{cN::resposta}}`/
    `{{cN::resposta::hint}}` -- Anki usa `::` pra hint, nunca `|`). Só a
    marca `targetMarkId` vira marcação Cloze de verdade; qualquer OUTRA
    marca da MESMA Note (Cloze multi-marca, Fase 5, gera 1 CardInstance
    POR lacuna) é achatada pro próprio texto revelado -- cada
    CardInstance é exportada como sua PRÓPRIA nota Anki independente,
    **nunca dependendo do mecanismo nativo do Anki de "1 nota Cloze gera
    N cards"** (que acoplaria marcas que este app trata como progresso
    FSRS genuinamente independentes). Sempre renumera a marca alvo pra
    "c1" (nunca preserva `c2`/`c3` original) -- cada nota exportada
    representa só 1 card (`ord:0`, mesmo padrão que o resto do
    exportador já usa), e o filtro `{{cloze:Text}}` do Anki decide o que
    esconder a partir do número da marca vs. o `ord` do card -- `ord:0`
    só combina com `c1`.
- **`shared/anki-export.js`** (reescrito, ~+213 linhas):
  - **`collectExportMediaAssets(exportCards)`** (novo, async) -- passa por
    todos os cards, resolve mídia via `resolveCardExportMedia()`,
    **deduplica por URL** (2 cards podem apontar pro MESMO arquivo -- ex:
    Cloze multi-marca, onde todas as CardInstance compartilham o mesmo
    Field de áudio/imagem, Fase 7a), baixa cada URL única exatamente 1
    vez (`fetch`, nunca modifica/apaga nada no Storage -- só leitura).
    **Falha em baixar UMA mídia específica nunca aborta a exportação
    inteira** -- essa mídia simplesmente não entra no pacote (o campo
    fica só com o texto, sem a tag `[sound:]`/`<img>`), e o total de
    falhas é reportado no status final (nunca silenciosamente).
  - **`mediaTagHTML(kind, filename)`**/**`ankiFieldHTML(text, mediaSide)`**
    -- sintaxe padrão do Anki (`[sound:filename]`/`<img src="filename">`)
    + concatenação com o texto (imagem antes, com `<br>`; áudio depois --
    mesma ordem visual dos renderers de Revisão).
  - **`ankiExportCardKind(card)`** -- só cloze vai pro modelo Cloze
    nativo do Anki; todo o resto (normal, normal_reversed -- ambas
    metades têm `cardTypeId:'normal'` -- multiple_choice, type_answer,
    trilha) vai pro modelo Básico de sempre.
  - **`generateApkg()`**: agora monta **2 modelos (note types) no
    pacote**, condicionalmente -- o modelo Básico de sempre (inalterado
    em estrutura: `fields`/`qfmt`/`afmt`/`css` continuam vindo de
    `config`, mesmo número de campos de sempre por idioma) + um modelo
    **Cloze nativo do Anki** (`type:1`, `qfmt:"{{cloze:Text}}"`, 2 campos
    genéricos `Text`/`Tradução`, `css` reaproveitado de `config.css` pra
    manter a identidade de marca sem duplicar a definição do modelo por
    idioma) -- **só incluído no pacote quando a seleção atual tem pelo
    menos 1 card Cloze** (nunca importa um note type vazio/nunca usado no
    Anki de quem nunca criou um cartão desse tipo). Cada nota grava o
    `mid` certo (Básico ou Cloze) conforme `ankiExportCardKind(card)`.
    `zip.file("media", JSON.stringify(manifest))` -- manifesto real agora,
    populado a partir do resultado de `collectExportMediaAssets()`, nunca
    mais `{}` incondicional. Status final do export passa a avisar
    explicitamente quando alguma mídia não pôde ser incluída (nunca
    silencioso).
- **`fr/app.js`/`zh/app.js`** (`ANKI_EXPORT_CONFIG`, mudanças
  espelhadas):
  - `cards(sel)` -- `.filter(hasPlainFrontBack)` **removido** (aquele
    filtro só existia pra não quebrar `cardPromptText`/`cardAnswerText`
    em cloze/type_answer -- o export ganhou seu próprio caminho de
    extração de texto pra esses 2 tipos, então todo tipo já é exportável
    agora: normal, múltipla escolha, digite a resposta, cloze, trilha).
  - `noteFields(card, media)` -- estendido com um 2º parâmetro (`media`,
    já resolvido em tags `[sound:]`/`<img>` prontas por
    `collectExportMediaAssets()`); ganhou um ramo pra `type_answer` que
    lê `resolveCardContentView(card)` direto (`view.prompt.text`/
    `view.displayAnswerText`) -- **nunca chama `cardPromptText`/
    `cardAnswerText` pra esse tipo** (continuam intocadas, ainda usadas
    só pra normal/multiple_choice/trilha, exatamente como Speed Review/
    Combinar as usam).
  - `clozeFields(card, media)` (novo) -- só pra cards Cloze, 2 campos
    (Text via `buildAnkiClozeFieldText()`, Tradução em texto puro).
  - `sortField(card)` -- ganhou ramos pra cloze (`renderClozeText(...,
    {reveal:true})`, texto totalmente revelado sem chaves) e type_answer
    (texto do prompt).
  - **zh, só**: `zhTypeAnswerExportColumns(view)` (novo) -- diferente de
    Normal/Múltipla Escolha (onde zh NUNCA inverte -- hanzi sempre é o
    "front"/prompt, garantido desde a Fase 3/6D), Digite a resposta não
    tem essa garantia: o editor nativo (Fase 6D.4b) deixa a professora
    criar prompt/resposta livremente, cada um com seu próprio idioma --
    então o lado chinês (com pinyin) pode ser QUALQUER um dos 2. Detecta
    isso olhando qual `Field` resolvido tem `pinyinText` (**nunca por
    posição/`role`** -- `role` não decide direção, restrição já travada
    desde a Fase 6B) e monta as 3 colunas (Pinyin/Caractere/Tradução) do
    modelo Básico do zh de acordo, junto de qual "lado" (front/back)
    carrega a mídia de cada coluna.

**Compatibilidade/limitações reais, documentadas em vez de forçadas**
(conforme a instrução: "implemente só o necessário OU documente
claramente a limitação, nunca invente uma arquitetura de template
nova"):

1. **Múltipla Escolha perde os distratores no `.apkg`** -- Anki não tem
   um conceito nativo de "múltipla escolha" no cliente desktop sem
   add-on; o card exportado vira um Básico simples (pergunta → resposta
   certa), igual a antes desta fase. Não é regressão -- já era assim.
2. **Type Answer não usa o `{{type:Back}}` nativo do Anki** -- avaliado e
   descartado deliberadamente: a comparação do Anki é string-match
   literal contra UM campo, enquanto este app aceita formas alternativas
   (`/`) e compara pinyin-vs-hanzi em zh -- mapear isso fielmente
   exigiria uma lógica de comparação que o Anki não tem embutida. Exportado
   como Básico (prompt → resposta revelada), perdendo só a interatividade
   de "digitar e conferir" -- o CONTEÚDO (pergunta/resposta certa)
   preserva 100%.
3. **Trilha (vocabulário/frases de `content.js`) nunca ganha mídia no
   export** -- decisão explícita: o áudio da trilha vem de
   `AUDIO_MANIFEST` (arquivos estáticos pré-gerados por um pipeline
   Python offline, referenciados por TEXTO LITERAL, nunca por
   `Field.audio`) -- integrar isso ao export seria uma arquitetura de
   mídia NOVA e não relacionada ao contrato `Field.audio` da Fase 7b,
   fora do escopo explícito desta fase ("reutilize o contrato existente,
   não invente um novo"). Trilha continua exportável (texto puro, sem
   mídia), comportamento idêntico ao de antes.
4. **`storagePath` (Fase 7f, TTS) nunca é lido pelo export** -- só
   `resolveFieldAudioUrl()` (que já lê `generatedUrl`) é consultado;
   consistente com o resto do motor, `storagePath` é metadado de
   gestão/identidade, nunca de apresentação.
5. **Nenhuma limpeza de mídia órfã no Storage** -- explicitamente fora do
   escopo (a instrução proibiu). `collectExportMediaAssets()` só LÊ.
6. **Falha de rede ao baixar 1 mídia nunca aborta a exportação inteira**
   -- degrada graciosamente (mídia ausente, exportação segue), status
   final avisa quantas falharam -- nunca finge que deu tudo certo.

**Testes realizados** -- **126 verificações, 0 falhas**, cobrindo os 12
cenários pedidos (normal/normal_reversed/multiple_choice/type_answer/
cloze com múltiplas lacunas/áudio por Field/imagem por Field/combinação
áudio+imagem/legado/FR/ZH/ausência de mídia/export sem gerar TTS):

- **Node/VM, `test_fase7i_anki_export_unit.js`, 49/49** -- carrega os
  arquivos de PRODUÇÃO reais (nunca cópias): `resolveCardExportMedia`
  pros 4 tipos nativos + trilha + legado (direção normal E invertida,
  confirmando a heurística de áudio legado segue o Field, nunca posição
  fixa) + normal_reversed (2 CardInstances, FSRS genuinamente
  independente, mídia corretamente TROCADA entre as 2 metades --
  confirma direção via CardInstance, nunca `isReverse`);
  `buildAnkiClozeFieldText` (marca simples, com hint zh, multi-marca --
  cada exportação referenciando só a SUA marca, sintaxe `{{c2` nunca
  sobrando); `ankiExportCardKind` pros 5 tipos + trilha; `mediaTagHTML`/
  `ankiFieldHTML`; `collectExportMediaAssets` com `fetch` mockado --
  dedup real (URL compartilhada buscada 1 vez só, mesmo referenciada por
  2 cards), falha parcial isolada (só a mídia que falhou fica sem tag,
  o resto do card intacto), manifesto/zip só com os downloads
  bem-sucedidos.
- **Browser smoke real, Playwright/Chromium, `test_fase7i_browser_smoke.js`,
  53/53 (FR+ZH)** -- carrega a página REAL (`fr/index.html`/
  `zh/index.html`, servida por `http-server` local) com o código de
  produção real (`ANKI_EXPORT_CONFIG` de `fr/app.js`/`zh/app.js`,
  `shared/anki-export.js`, `shared/flashcard-model.js`), boot em modo
  convidado (Supabase/CDN bloqueados neste sandbox -- mesma limitação
  documentada em toda a sessão -- stubados só nesses 3 pontos: Supabase,
  `initSqlJs`/`JSZip`, e `fetch` de mídia). 6 linhas sintéticas (normal
  com mídia nos 2 lados, normal_reversed, multiple_choice com distrator
  de áudio-que-nunca-deve-vazar, type_answer com pinyin no lado certo
  dinamicamente, cloze multi-marca com hint, legado) construídas via
  `buildCardFromTeacherFlashcard()` REAL -- gera os 8 CardInstances
  esperados -- e exportadas de ponta a ponta via `generateApkg()` real:
  confirmado 2 modelos no pacote (Básico+Cloze) com a contagem de campos
  certa por idioma; 6 notas no modelo Básico + 2 no Cloze; áudio da
  resposta certa de Múltipla Escolha NUNCA vaza no `.apkg`; as 2 metades
  de normal_reversed exportadas com direção REALMENTE trocada (campo
  certo por idioma); sintaxe interna `|` nunca vaza crua (sempre `::`
  nativo do Anki), sem `{{c2` sobrando em nenhuma nota; manifesto de
  mídia com 7 entradas reais (nunca mais `{}`), todo índice do manifesto
  com o arquivo binário de fato presente no zip; 1 falha de mídia
  simulada avisada no status sem abortar a exportação; legado exportado
  sem nenhuma conversão automática, sempre pro modelo Básico.
- **Regressão focada, `test_fase7i_regression_check.js`, 24/24 (FR+ZH)**
  -- confirma que Review/Preview/Speed Review/Combinar (proibidos de
  alterar) continuam 100% intocados: as 12 funções centrais continuam
  definidas; `hasPlainFrontBack()` continua excluindo cloze/type_answer
  (comportamento IDÊNTICO ao de antes -- só o export ganhou um caminho
  paralelo, a função em si nunca mudou); `cardPromptText`/
  `cardAnswerText` continuam funcionando pra normal sem nenhuma
  alteração; `buildSpeedQueue()`/`startMatchGame()` rodam sem lançar;
  `resolveCardContentView()` mantém o shape esperado pelos 4 renderers
  pros 4 tipos; zero `pageerror` durante toda a execução.

**Arquivos alterados** (confirmado por `git diff --stat`, nada fora
desta lista): `shared/flashcard-model.js` (+102 linhas, só 2 funções
novas no final do arquivo), `shared/anki-export.js` (reescrito, +213/-15
linhas), `fr/app.js` (+58/-14 linhas, só dentro de `ANKI_EXPORT_CONFIG`),
`zh/app.js` (+75/-16 linhas, `ANKI_EXPORT_CONFIG` + `zhTypeAnswerExportColumns`
novo). **Nenhuma migração, nenhum passo manual pendente pra autora** --
100% client-side, nenhuma mudança de schema/Storage/Edge Function.

**O que NÃO foi tocado nesta fase, confirmado**: `shared/fsrs.js`, os 4
renderers de Revisão/Preview (`renderNormalCard`/`renderMultipleChoiceCard`/
`renderTypeAnswerCard`/`renderClozeCard`), `hasPlainFrontBack`/
`cardPromptText`/`cardAnswerText` (só LIDAS, nunca alteradas),
`buildSpeedQueue`/`buildSpeedOptions`/`startMatchGame`, qualquer
migration SQL, qualquer Edge Function, `AUDIO_MANIFEST`, o contrato de
`Field.audio` (Fase 7b, só reaproveitado via `resolveFieldAudioUrl()`,
nunca modificado).

**Próxima fase (7j -- Anki import + templates + mídia)**: explicitamente
NÃO iniciada nesta entrega -- nenhum código de import de `.apkg`/
`.colpkg`, nenhum parser de template Anki, nenhum importador CSV/TSV.
Informação preservada pra quando essa fase for autorizada: o exportador
atual já produz um schema Anki genuíno (SQLite real via sql.js) com 2
note types (Básico + Cloze, quando aplicável) -- um importador precisaria
decidir o inverso do que esta fase decidiu pro Cloze (ler `{{cN::...}}`
nativo do Anki e reconstruir a sintaxe interna `{{cN::resposta|
compareAnswer}}`, incluindo como inferir um `compareAnswer`/hint quando
o Anki original não tiver nenhum) e como mapear um note type Anki
arbitrário (que pode ter qualquer número de campos/templates, nunca
necessariamente parecido com os 5 Card Types deste app) de volta pra um
dos 5 tipos suportados ou rejeitar/pedir mapeamento manual -- nenhuma
dessas decisões foi tomada aqui, ficam pra quando a Fase 7j for
autorizada explicitamente.

**PARE conforme instrução explícita -- Fase 7j (Anki import) não
iniciada.** Próxima etapa só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-27), "FASE 7j -- ANKI
IMPORT: AUDITORIA E IMPLEMENTAÇÃO" -- instrução de 35 seções, todas
cumpridas, ver relatório completo abaixo.**

## Fase 7j (implementação) -- Anki IMPORT: `.apkg` real vira Note nativa,
CardInstances derivadas em runtime como sempre, zero histórico Anki
importado

Instrução de 35 seções cobrindo pipeline completo `.apkg → parse →
classificação de Model/Template → mapeamento de campos → Card Type →
validação → Note nativa → persistência` -- **NUNCA** cria uma linha
legada quando a representação nativa é possível, **NUNCA** persiste
CardInstance, **NUNCA** importa histórico de revisão/FSRS do Anki. Auditoria
prévia (só leitura, zero código) confirmou a arquitetura completa
Note/Field/CardType já existente (Fases 6B-7i) antes de qualquer linha
escrita -- reaproveitada integralmente, nunca duplicada.

### Arquivos alterados/criados

- **`shared/anki-parser.js`** (novo) -- parser puro de `.apkg`, sem UI/
  rede/persistência.
- **`shared/anki-import.js`** (novo) -- mapeamento Anki→Note nativa,
  deduplicação, plano de importação, persistência em lote.
- **`shared/anki-import-ui.js`** (novo) -- fluxo de 5 telas dentro de um
  modal (escolher `.apkg` → carregando → resumo/preview → confirmar →
  resultado).
- **`shared/my-flashcards.js`** -- seção "📥 Importar do Anki (.apkg)"
  nova, input `#anki-import-file` ligado a `handleAnkiImportFileSelected`.
- **`fr/index.html`/`zh/index.html`** -- 2 `<script>` novos por idioma
  (`anki-parser.js`+`anki-import.js`, logo depois de `flashcard-native-
  persistence.js`; `anki-import-ui.js`, depois de `my-flashcards.js`).
- **Nenhuma migração** -- reaproveita 100% o schema `own_flashcards`
  (`fields`/`card_generation_mode`, migration 045, Fase 6B) já existente.

### Pipeline (Parse → Normalize → Validate → Preview → Persist, Seção 26)

```
.apkg (ZIP) -> shared/anki-parser.js (parseApkgFile)
  - sql.js (mesma lib já usada pelo export, Fase 7i) + JSZip
  - le collection.anki2/anki21 (schema JSON legado -- 100% compatível
    com o que este app já exporta), col.models/col.decks, notes, cards,
    media manifest
  - collection.anki21b (zstd) -> fatal, unsupported_format_zstd
  - schema 18+ protobuf (tabela notetypes, col.models vazio) -> fatal,
    unsupported_format_protobuf
  -> {ok, schemaGeneration, models, decks, notes, cardsByNoteId,
      mediaManifest, zip}

shared/anki-import.js (buildAnkiImportPlan)
  - classifyAnkiNoteType(model) por MODEL (cacheado por model.id -- toda
    Note do mesmo model reaproveita a mesma classificação, nunca
    recalculada por Note)
      - model.type===1 (Cloze do Anki) -> sempre 'cloze', nunca por
        heurística de HTML (Seção 6)
      - 1 template -> classifyAnkiTemplate() decide basic/type_answer/
        unrecognized
      - 2 templates -> só vira 'basic_reversed' com a ASSINATURA EXATA
        do "Basic (and reversed card)" do próprio Anki (Template1
        Front->Back, Template2 Back->Front, Fields DIFERENTES -- Seção
        17: nunca assume reversed só por "são 2 templates")
      - 2+ templates sem esse padrão -> cai pro 1º template usável,
        nunca inventa Múltipla Escolha (Seção 16 -- Anki não tem
        equivalente nativo, sem convenção universal de Field pra
        inferir isso com segurança)
  - mapAnkiNoteToNativeEditorState(note, model, classification, lang)
    -> {ok, editorState, mediaRefs, warnings, dedupKey} | {ok:false,
       reason, warning}
  - validateNoteEditorStateForSave() (Fase 6D.6, REUTILIZADA, nunca
    duplicada) roda em cima do editorState já mapeado -- 2ª camada de
    segurança
  - deduplicação (normalizeForDedup + Set de assinaturas, contra
    own_flashcards já existentes E contra o próprio lote) -- Seção 11:
    "detect+inform+allow-skip", NUNCA sobrescreve/pula silenciosamente
  -> {notes:[...], totalNotes, okCount, skippedCount, duplicateCount,
      mediaCount, tagsPresent}

shared/anki-import-ui.js (5 telas, dentro de UM modal)
  1. Escolher .apkg
  2. Carregando (parse+classificação+dedup -- ZERO escrita de rede)
  3. Resumo/preview -- contagem, avisos, checkbox por Note (Note
     inválida = checkbox disabled, nunca selecionável) -- mídia NUNCA é
     buscada/enviada aqui (Seção 26)
  4. Confirmar -- computeAnkiImportRemainingSlots() (Seção 23, bloqueia
     ANTES de escrever) -> resolveAndAttachAnkiMedia() só das Notes
     selecionadas -> persistAnkiImportBatches() (lotes de 40, atômico
     por lote via Promise.all + .select())
  5. Resultado -- quantas importadas, quantas puladas, avisos
```

### Seção 4 (Anki Note ≠ Anki Card)

`persistAnkiImportBatches()` mapeia `planEntries` (1 entrada por Anki
NOTE, sempre) para `rows` (1 linha `own_flashcards` por entrada) --
**nunca** itera `cardsByNoteId`. Confirmado com fidelidade real ao
formato: o fixture builder de teste foi corrigido nesta sessão pra
gerar 1 linha `cards` REAL por template do model (Básico+reversed gera 2
`cards` reais pra 1 `note` só, como o Anki genuíno sempre faz) --
confirmado que o importador continua produzindo só **1 Note nativa**
mesmo com 2 `cards` reais de entrada.

### Seções 5/8/9/17 (Model → Card Type)

- **Básico → `normal`** -- `qfmt` referencia exatamente 1 Field
  (frente), `afmt` referencia exatamente 1 Field NOVO (verso).
  `{{FrontSide}}` sempre ignorado (é "o que qfmt já mostrou", nunca
  conteúdo). `contentFieldIndices()` (Fase 6B, reaproveitado) já decide
  slot 0/1 pela ORDEM do array `fields` que o mapeador monta
  (`[frontField, backField]`) -- nunca por nome/role.
- **Básico+reversed → `normal_reversed`** -- **1 única Note nativa**
  (nunca 2), com `card_generation_mode:'normal_reversed'` sobre os
  MESMOS 2 Fields -- as 2 CardInstances continuam sendo geradas em
  RUNTIME via `buildReversedCardInstancePair()` (Fase 4a, intocada),
  nunca persistidas 2x.
- **Cloze do Anki → `cloze`** -- detectado por `model.type===1`
  (estrutural, nunca por regex em HTML). `convertAnkiClozeToNativeSyntax()`
  converte `{{c1::resposta}}`/`{{c1::resposta::dica}}` pra sintaxe
  interna `{{c1::resposta}}` -- a dica (Seção 14, Decisão D6) é
  **DESCARTADA por completo** (nunca vira `compareAnswer`, que no
  modelo nativo significa "o que a aluna precisa DIGITAR" -- semântica
  bem mais forte que uma dica cosmética do Anki tipo "verbo no
  pretérito"). 2º campo do model vira `translationField` -- sem
  tradução real, a Note é pulada (`cloze_missing_translation`) --
  `validateNativeClozeStructure()` já exigia isso, nunca inventado
  aqui.
- **Digite a resposta → `type_answer`** -- **só quando INEQUÍVOCO**
  (Seção 15): `qfmt` mostra exatamente 1 Field de pergunta MAIS
  `{{type:X}}` apontando pra um Field DIFERENTE, os dois existindo de
  fato no model. **Bug real encontrado e corrigido antes de escrever
  qualquer teste** (não por um teste falhando -- releitura cuidadosa do
  código antes de confiar nele): `ankiTemplateFieldRefs()` extrai nomes
  de `{{X}}`, `{{cloze:X}}` E `{{type:X}}` uniformemente -- o template
  PADRÃO do Anki pra este note type
  (`qfmt:"{{Front}}{{type:Back}}"`) tem `qfmtRefs.length===2`
  (`['Front','Back']`), não 1 -- a checagem original (`qfmtRefs.length
  === 1`) NUNCA reconheceria o template canônico do próprio Anki.
  Corrigido excluindo o campo do próprio `{{type:X}}` antes de contar
  (`promptRefs = qfmtRefs.filter(name => name !== typeFieldName)`,
  `promptRefs.length === 1`).
- **Múltipla Escolha -- NUNCA inferida** (Seção 16) -- Anki não tem
  conceito nativo de "múltipla escolha" sem add-on, e não existe
  convenção universal de Field pra adivinhar distratores com segurança
  a partir de HTML arbitrário. Qualquer model que não bata
  basic/basic_reversed/cloze/type_answer cai em `unrecognized`, com
  aviso claro, nunca uma tentativa de "inventar" Múltipla Escolha.

### Seção 6 (não interpretar HTML como semântica conhecida)

Conteúdo sempre deriva dos **Fields declarados no model**, nunca de
regex sobre `afmt`/`qfmt` tentando adivinhar layout visual.
`extractAnkiMediaRefs()` só extrai `[sound:x]`/`<img src="x">` (sintaxe
DE DADO do Anki, não de apresentação) e limpa `<br>`/tags HTML
genéricas do TEXTO de um Field já identificado -- nunca tenta entender
CSS/layout do template pra decidir o que é "front"/"back".

### Seção 7/8/9/10 (Fields)

Cada Field ganha um `id` novo e ESTÁVEL (`createFieldState()`, Fase
6D.1, reaproveitado) -- **nunca** reaproveita o id numérico interno do
Anki (`note.id`/`note.guid`) como id de Field ou de linha
`own_flashcards` (Seção 10) -- confirmado que `note.guid` só é usado pra
LOG/rastreabilidade em `plan.notes[i].ankiGuid`, nunca como chave
primária/id gravado. `lang` de todo Field mapeado é `null` (nunca
inventado a partir do idioma da conta -- `Field.lang` é conceito
PEDAGÓGICO do Field individual, `languageAppKey` é conceito da CONTA,
os dois continuam eixos independentes, mesma regra já travada desde a
Fase 6B/7f). Ordem do array `fields` é a única coisa que
`contentFieldIndices()` usa pra decidir slot 0/1 (front/prompt/text) e
slot 1 (back/answer/translation) -- nunca por nome.

### Seção 12/13 (mídia)

`extractAnkiMediaRefs()` extrai `[sound:x.mp3]`/`<img src="x.png">` do
texto de um Field e devolve `{text limpo, audioFilename, imageFilename}`
-- só a PRIMEIRA ocorrência de cada tipo por Field (mesmo critério "1
áudio + 1 imagem por Field" já em vigor desde a Fase 7a/7b). Mapeado
pra `field.audio`/`field.image` (**nunca** `note.audio`/`note.image` --
mídia é sempre propriedade do FIELD, nunca da Note, mesma decisão da
Fase 6B/7a). `resolveAndAttachAnkiMedia()` só roda DEPOIS da
confirmação (nunca no preview), lê o byte real do arquivo referenciado
no manifest do `.apkg`, sobe via `uploadOwnFlashcardMedia()`
(REUTILIZADA da Fase 7e, nunca uma 2ª implementação de upload). Mídia
ausente/corrompida nunca aborta a Note inteira -- o Field fica só com o
texto (já limpo da tag `[sound:...]`/`<img...>` -- Seção 13, "nunca
deixar a marcação crua vazando na tela"), um warning é acumulado e
reportado no resultado final.

### Seção 11 (duplicatas)

`normalizeForDedup()` (lowercase+trim+collapse-espaços) +
`existingOwnFlashcardsDedupSignatures()` (assinatura front+back, contra
linhas JÁ existentes) + `seenBatchSignatures` (contra o PRÓPRIO lote,
2 Notes idênticas no mesmo `.apkg`) -- provável duplicata vem **desmarcada
por padrão** (nunca selecionada automaticamente), mas o checkbox continua
disponível -- a pessoa decide, nunca é bloqueada/sobrescrita
silenciosamente.

### Seção 18 (tags)

`note.tags` é lido e preservado no plano (`plan.notes[i].tags`), e
`plan.tagsPresent` sinaliza no resumo "este `.apkg` tem tags do Anki --
este app ainda não tem esse recurso, então as tags não são importadas"
-- **nunca inventa um sistema de tags novo**, e nunca finge
silenciosamente que tags foram preservadas quando não foram.

### Seção 19 (múltiplos decks)

`parseApkgFile()` já devolve `decks` como mapa completo; `deckName`
por Note é resolvido via `cardsByNoteId`, sem nenhuma suposição de "1
deck só" -- testado com múltiplos decks no mesmo `.apkg` (Node/VM,
Seção 29).

### Seções 20/22 (nunca importa FSRS/histórico)

`mapAnkiNoteToNativeEditorState()` **nunca lê** `card.type`/`card.queue`/
`card.due`/`card.ivl`/`card.factor`/`card.reps`/`card.lapses` (os
campos de agendamento do Anki, presentes em `cardsByNoteId` mas nunca
consultados pelo mapeador) -- só `notes.flds`/`notes.tags`. Todo cartão
nativo criado nasce com FSRS no estado DEFAULT de sempre
(`FLASHCARD_MODEL_FSRS_DEFAULTS`, Fase 4a, intocado) -- exatamente o
mesmo caminho que criar um cartão manualmente pelo editor já usa
(`buildCardFromSelfFlashcard`/`buildEngineCardsFromRow`, Fase 6B-6D,
nenhuma linha nova nesses arquivos). CardInstances continuam 100%
derivadas em runtime -- confirmado por busca (ver auditoria final
abaixo) que `cardInstance` nunca é referenciado em nenhum dos 3
arquivos novos.

### Seção 21 (origin)

Nenhum enum novo -- `addSelfFlashcardToState()` (fr/zh `app.js`,
EXISTENTE desde a Fase 5, reutilizada sem nenhuma mudança) já atribui
`origin:'self'` a qualquer linha de `own_flashcards`, exatamente como
já fazia pra um cartão criado manualmente. Confirmado no smoke de
navegador: todo cartão importado tem `origin==='self'`.

### Seção 23 (limite de coleção)

`computeAnkiImportRemainingSlots(activeOwnCardCount, hasActiveTeacherLink)`
(reaproveita `FREE_OWN_FLASHCARD_LIMIT`, Fase 5.1, e
`hasActiveTeacherLink()`, Fase 5.1, sem nenhuma exceção nova pra
importação) -- `confirmAnkiImport()` bloqueia **ANTES de qualquer
escrita** (reaproveita `#flashcard-limit-modal`, o mesmo modal já usado
em toda a feature, nunca um popup novo) quando a seleção excede o
espaço restante -- nunca uma importação parcial silenciosa.

### Seção 24 (atomicidade/lotes/retry)

`ANKI_IMPORT_BATCH_SIZE=40` -- `persistAnkiImportBatches()` insere lote
por lote (`Promise` sequencial, nunca paralelo -- ordem preservada pra
`onBatchDone` reportar progresso), cada `.insert().select()` é 1
statement atômico real do Postgres. Falha num lote nunca reprocessa os
já criados (retorna `createdRows` do que JÁ foi persistido +
`failedAtBatch`) -- um retry re-executando o MESMO plano nunca duplica
os lotes que já tiveram sucesso, testado explicitamente (Node/VM,
cenário de retry).

### Seção 25/26 (UI, Preview/Dry-Run nunca persiste)

5 telas dentro de UM modal (`#anki-import-modal`, mesmo padrão de todo
modal já existente no app). Resumo mostra contagem/avisos ANTES de
qualquer confirmação -- fechar o modal nessa hora (`#anki-import-close`)
**nunca grava nada** (confirmado via clique real no smoke test).
**`shared/flashcard-preview.js` (Preview do EDITOR de cartão) nunca é
referenciado/reutilizado aqui** -- são conceitos deliberadamente
diferentes (Preview do editor mostra "como este cartão vai aparecer na
Revisão"; o resumo do import mostra "o que existe no `.apkg` e o que
será criado") -- confirmado por grep, zero menção cruzada entre os
arquivos.

### Seção 27 (reutilização de validadores)

`validateNoteEditorStateForSave()` (Fase 6D.6) é a ÚNICA validação
estrutural chamada -- nunca uma cópia. Isso automaticamente reaproveita,
sem nenhuma linha nova, `validateNativeMultipleChoiceStructure`/
`validateNativeTypeAnswerStructure`/`validateNativeClozeStructure`
(Fases 6D.4a/4b/5) por baixo -- é exatamente esse mecanismo que rejeita
um Cloze `mandarim` sem `compareAnswer`/pinyin (mesma regra de CRIAÇÃO
manual, nunca uma regra nova só pro import).

### Seção 28 (Fatal vs. Recuperável)

- **Fatal** (aborta ANTES de escrever qualquer coisa): `.apkg` inválido/
  corrompido, SQLite ilegível, `collection.anki2`/`anki21` ausente,
  `collection.anki21b` presente (zstd, sem suporte), schema 18+
  protobuf (sem `col.models` populado). `parseApkgFile()` devolve
  `{ok:false, error}` com mensagem ACIONÁVEL
  (`ANKI_PARSER_ERROR_MESSAGES`), a UI mostra e para -- nenhuma
  tentativa de continuar com dado parcial.
- **Recuperável por Note** (nunca bloqueia as outras): mídia ausente,
  Note sem tradução (Cloze), model não reconhecido, conteúdo vazio
  depois de limpar HTML/mídia, validação estrutural falhando (ex:
  Cloze mandarim sem pinyin) -- cada uma vira `{ok:false, warning}`,
  visível na lista, nunca aborta o `.apkg` inteiro.

### Testes realizados

**Node/VM, `test_fase7j_anki_import_unit.js`, 117/117** -- carrega os
arquivos de PRODUÇÃO reais via `vm` (mesma convenção de toda a sessão),
`.apkg` REAIS construídos com `sql.js`+`jszip` via npm (fidelidade de
byte real ao formato, nunca simulado) -- cobre os ~30 cenários da
Seção 29: básico simples; básico+reversed (confirma 1 Note, mesmo com 2
`cards` reais de entrada -- fixture builder corrigido nesta sessão pra
gerar 1 `cards` por template, fidelidade real ao Anki); cloze simples/
multi-marca + hint descartado + tradução ausente rejeitada; type_answer
reconhecível (template canônico do Anki, pós-fix) e não-reconhecível
(fallback pra unrecognized); Múltipla Escolha nunca inferida (model
"parece" MC mas nunca é assumido como tal); ordem de Field preservada;
ids nativos nunca colidem; GUID do Anki nunca vira id interno; mídia
imagem+áudio; aviso de mídia ausente; HTML preservado sem confundir
template com conteúdo; hint do Cloze nunca vira `compareAnswer`; tags
seguem a política existente (registradas, nunca um sistema novo);
múltiplos decks não quebram o parser; duplicata detectada (dentro do
lote E contra existentes, case/espaço-insensível); limite de coleção
calculado corretamente; legado nunca criado quando nativo é possível;
CardInstances nunca persistidas + FSRS nunca herda default incorreto;
origin correto (`self`); Note inválida nunca persistida (reusa
`validateNoteEditorStateForSave`); falha fatal de formato aborta ANTES
de escrever (zstd/protobuf/zip inválido/SQLite corrompido/collection
ausente); aviso por Note nunca bloqueia as outras; lote atômico +
retry nunca duplica; FR+ZH compartilham o MESMO pipeline nativo (com a
nuance correta: Cloze sem pinyin rejeita pra mandarim, aceita pra
frances -- mesma regra, mesmo validador, resultado consistente por
idioma) -- auditoria arquitetural embutida no próprio arquivo de teste
confirma ausência de todo termo proibido em código executável.

**Integração real contra o banco de produção** (transação+rollback,
projeto `eigjocalzwamisgqilhg`, mesmo padrão já usado em toda a Fase
6D/7): snapshot antes (`own_flashcards`: 7 linhas, hash
`62f9c84cebecc3d6805163082c837b21`) -- `INSERT` real dentro de
`BEGIN`/`ROLLBACK` simulando exatamente o payload que
`persistAnkiImportBatches()` produziria (`fields`+`card_generation_mode`
populados, `front`/`choices`/`cloze_sentence`/`cloze_answer`/
`cloze_answer_pinyin`/`front_pinyin` todos `null`, confirmado via
`RETURNING`) -- `ROLLBACK` confirmado deixando ZERO rastro (snapshot
depois: mesmas 7 linhas, mesmo hash, byte a byte idêntico). Nenhum dado
real de produção foi alterado.

**Browser smoke real, FR+ZH, `test_fase7j_browser.js`, 54/54 -- zero
pageerror, zero console.error novo** (Playwright/Chromium real,
`--headless=new`, `serviceWorkers:'block'` -- achado de infraestrutura
de teste registrado abaixo). Fluxo completo via UI real: seleciona
`.apkg` (fixture combinando Básico/Básico+reversed/Cloze multi-marca/
duplicata/mídia ausente), resumo mostra contagem+avisos de
duplicata+mídia; cancelar antes de confirmar NUNCA persiste nada;
reabrir+"Selecionar todos"+confirmar importa de verdade (linhas reais
em `own_flashcards`, 1 por Anki Note); `normal_reversed` presente como
1 Note só; `STATE.cards` cresce na MESMA sessão sem reload; `origin`
correto; Review real renderiza o cartão importado com FSRS em estado
default (`reps===0`); limite de coleção bloqueia ANTES de escrever;
`.apkg` zstd recusado via UI com mensagem acionável. **Achado
específico do ZH, tratado corretamente e testado explicitamente**: um
Cloze importado do Anki é SEMPRE rejeitado pra mandarim (pinyin nunca é
derivável da dica do Anki, Seção 14) -- confirmado que isso já aparece
no resumo ANTES de confirmar, com o checkbox correspondente vindo
`disabled` (nunca selecionável), nunca silencioso.

**Round-trip real, Export→Import, `test_fase7j_roundtrip.js`, 23/23**
(Seção 32) -- 3 Notes nativas reais (Normal com áudio+imagem, Normal
Reversed, Cloze multi-marca) exportadas de verdade pelo BROWSER (mesmo
`generateApkg()` da Fase 7i, nenhuma simulação) e os bytes resultantes
reimportados através do MESMO pipeline Node/VM já validado. **FR: 100%
correto** -- Normal reimporta com front/back/mídia intactos; Reversed e
Cloze multi-marca reimportam com o CONTEÚDO de cada CardInstance
preservado, mas com uma **perda de agrupamento ESPERADA e DOCUMENTADA**
(nunca uma surpresa): o exportador (Fase 7i) trata cada CardInstance
como um card Anki independente sempre no modelo Básico/Cloze -- nunca
reconstrói um model Anki "Basic (and reversed card)" de 2 templates, e
cada marca de um Cloze multi-marca vira sua própria nota Cloze de 1
marca. Isso é uma limitação REAL do formato Anki combinada com a
decisão de design já travada desde a Fase 5 (cada CardInstance sempre
teve FSRS genuinamente independente -- o exportador só reflete isso
fielmente, nunca fingiu uma união que o motor nunca tratou como uma
coisa só). Reimportado, vira 2 Notes `normal` (rev-a→rev-b e
rev-b→rev-a) e 2 Notes `cloze` (1 marca cada, com a resposta da OUTRA
marca corretamente achatada em texto puro) -- conteúdo 100% preservado,
agrupamento original perdido.

**Achado REAL de correção encontrado pelo próprio round-trip (exatamente
o que a Seção 32 pedia pra ele fazer) -- não um artefato de teste**:
`classifyAnkiTemplate()` já tinha o comentário "afmt precisa referenciar
EXATAMENTE 1 Field novo", mas comparava com `>= 1` -- um model de 3
Fields (como o PRÓPRIO export deste app pro zh: `qfmt:{{Pinyin}}`,
`afmt:{{Caractere}}+{{Tradução}}`) batia mesmo assim, capturando só o
1º Field extra (Caractere/hanzi) e **descartando o 2º (Tradução) sem
nenhum aviso**. Confirmado ao vivo, reimportando um `.apkg` real
exportado pelo próprio app: o cartão nativo resultante virava
`["nǐ hǎo","你好"]` -- a tradução ("olá" etc.) sumia por completo,
silenciosamente, pra 166 de 171 notas reais da trilha zh. **Corrigido**
(`shared/anki-import.js`, `afmtRefsRaw.length >= 1` → `=== 1`) --
alinhado ao que o próprio comentário já dizia. Efeito: esse tipo de
model agora vira `unrecognized` (Note pulada, aviso visível), nunca
mais perde conteúdo sem avisar. **Efeito colateral real e esperado,
não um bug novo**: o próprio export zh deste app (3 Fields) deixa de
ser round-trip-ável como `normal` -- 0/171 zh Básico "passam" agora
(antes eram 166/171 "passando" com perda silenciosa de 1/3 do
conteúdo). Reexecutado o Node/VM (117/117, sem regressão -- nenhum
fixture de teste usa model de 3 Fields) e o browser smoke completo
(54/54, sem regressão -- os fixtures da Seção 31 usam Básico de 2
Fields) depois do fix, confirmando zero efeito colateral fora do caso
que a correção deliberadamente muda.

**Limitação real, documentada, não corrigida nesta sessão**: não existe
hoje um jeito SEGURO e NARROW o bastante de reconhecer "Field[0]=pinyin
satélite de Field[1]=hanzi, Field[2]=tradução" sem uma heurística
nomeada especificamente pro shape exato do export deste app (algo como
"se os 3 Fields se chamam literalmente Pinyin/Caractere/Tradução E a
conta é mandarim, remapear via o mecanismo `pinyinFieldId` já existente
desde a Fase 6D.3") -- essa heurística FOI identificada e é
tecnicamente viável (o mecanismo de satélite de pinyin já existe,
pronto, só faltaria a detecção por nome), mas fica **fora do escopo
desta sessão**, deliberadamente: a escolha SEGURA (rejeitar com aviso
em vez de perder dado silenciosamente) já resolve o problema de
correção; a escolha MAIS COMPLETA (remapear via satélite de pinyin)
teria um raio de mudança maior (novo caminho de classificação + novo
caminho de mapeamento + mais testes) sem ter sido pedida explicitamente
-- registrado aqui como recomendação concreta e específica pra uma
sessão futura, não implementada por decisão de escopo, nunca por
esquecimento.

**Achados de infraestrutura de teste, nunca de produção** (documentados
por transparência, mesmo padrão de toda a sessão): (1) `CURRENT_USER` é
`let` top-level em `shared/auth.js` -- `window.CURRENT_USER` nunca
reflete essa variável (mesmo gotcha já documentado na Fase 6D.2, agora
do lado do LEITOR externo -- `page.waitForFunction(() => window.
CURRENT_USER...)` nunca resolve; corrigido usando o identificador puro
`CURRENT_USER` sem prefixo `window.`, que Playwright já enxerga
corretamente via `page.evaluate`/`waitForFunction`); (2) o roteador
interno (Fase Router 6) remove `/index.html` da URL via `pushState` --
um `page.reload()` depois de navegar internamente reforça a URL como
`.../fr/#/aba`, que o navegador envia ao servidor como `GET /fr/` (o
fragmento nunca é enviado) -- o servidor estático do teste só tratava a
raiz `/` bare, corrigido pra tratar qualquer caminho terminado em `/`;
(3) o app registra um Service Worker real (mesmo já documentado no
CLAUDE.md, "Fix stale-UI bug") -- um SW ativo intercepta `fetch()` da
própria página ANTES da camada de `page.route()` do Playwright
conseguir interceptar, escondendo a rota de mídia simulada durante o
teste de export/mídia -- corrigido com `serviceWorkers:'block'` no
`browser.newContext()`.

### Auditoria arquitetural final (Seção 33)

Busca programática (repo inteiro, código executável, comentários
excluídos) confirma ausência total de: `cardInstance` persistido (zero
ocorrência em `shared/anki-*.js`); linha legada criada quando nativo é
possível (`nativeContentColumnsFromEditorState` sempre grava
`fields`+`card_generation_mode`, os 5 campos legados sempre `null`);
`frontIsTargetLanguage`/`reviewDirection`/`isReverse` como mecanismo
nativo; `choices`/`correctChoice`/`cloze_answer`/`cloze_sentence`/
`cloze_answer_pinyin` como fonte de dado paralela (só existem como
colunas legadas sempre `null` no caminho de import); `note.audio`/
`note.image` (mídia sempre em `field.audio`/`field.image`); reset de
FSRS fora do já existente (nenhum campo de agendamento do Anki jamais
lido); import/overwrite silencioso (`.update`/`.upsert`/`.delete`
contra `own_flashcards` -- zero ocorrências, só `.insert`); sistema de
ID paralelo (`flashcardIdForRow`, já existente, nunca reimplementado);
`parseClozeMarks`/`resolveCardField`/`validateNativeNoteRow` duplicados
(cada um definido 1 única vez, em `shared/flashcard-model.js`, sempre
reutilizados). `git status`/`git diff --stat` confirmam só os 3
arquivos novos (`shared/anki-parser.js`/`shared/anki-import.js`/
`shared/anki-import-ui.js`) + os 3 já tocados pré-compactação
(`shared/my-flashcards.js`, `fr/index.html`, `zh/index.html`) -- nenhum
arquivo fora do escopo desta fase.

### Escopo explicitamente fora desta entrega (Seção 34, nunca implementado)

Sincronização bidirecional; importação de histórico de revisão/FSRS
(deliberadamente nunca lido, ver Seção 20 acima); todos os plugins do
Anki; reprodução perfeita de CSS/templates visuais; importação de
decks online/marketplace/cartões públicos; novos Card Types (só os 5 já
existentes desde a Fase 6B são reconhecidos); templates
customizáveis pelo usuário; migração em massa de dado legado existente.
Nenhum equivalente inseguro foi inventado em lugar de qualquer um
desses -- onde a informação não tinha um destino seguro (tags, hint de
Cloze, Tradução de um model 3-Field), a Note é reportada como
pulada/com aviso, nunca com um dado inventado silenciosamente.

**Gratuito x Premium (avaliado, não implementado):** Import do Anki é
uma via de ENTRADA de conteúdo pra "Meus Cartões" (Fase 5) -- já herda
o mesmo teto de 20 cartões/plano grátis (Fase 5.1) e a mesma isenção
por vínculo com professora (`hasActiveTeacherLink`), sem nenhuma
exceção nova (Seção 23 exige isso explicitamente). Nenhuma pergunta
nova de monetização introduzida por esta feature -- mesma conclusão de
"reformulação gratuito x premium".

Nenhum passo manual pendente pra autora -- 100% client-side, nenhuma
migração/mudança de schema (reaproveita `fields`/`card_generation_mode`
já existentes desde a migration 045).

**PARE conforme instrução explícita -- não avançar para nenhuma fase
posterior automaticamente.** Próxima etapa (ex: a recomendação de
remapeamento via satélite de pinyin pro export zh, registrada acima)
só começa depois de autorização explícita da autora, com este relatório
já entregue antes de pedir luz verde.

## Fase 7j (fechamento) -- 3 gaps corrigidos: hierarquia de Deck
preservada como dado estruturado, Tags viram propriedade nativa da
Note, round-trip zh resolvido reaproveitando `pinyinFieldId`

A entrega original da Fase 7j (seção acima) foi rejeitada pela autora
como incompleta -- 3 gaps concretos, cada um com processo próprio
obrigatório antes de codar. Os 3 foram fechados nesta mesma sessão,
**sem tocar em Deck Engine, Painel ou Study Trail** (fora do escopo
desta rodada, confirmado por essa mesma instrução) -- só os 3 gaps do
importador Anki.

### Gap 1 -- hierarquia de Deck nunca mais descartada silenciosamente

**Achado da auditoria (antes de codar)**: confirmado por grep no
repositório inteiro que **nenhuma entidade de Deck existe hoje** em
lugar nenhum do app -- nem schema, nem UI, nem conceito no motor. Um
"Deck Engine" de verdade é trabalho de uma fase própria, fora do escopo
autorizado aqui. A instrução foi explícita: **proibido inventar uma
estrutura paralela/temporária** (nomeadamente, um campo textual
`anki_deck` solto na Note) -- isso criaria uma 2ª fonte de verdade de
hierarquia que uma futura Fase de Decks teria que migrar/descartar
depois.

**O que foi feito** -- `shared/anki-import.js`:
- **`ankiDeckPathFromName(deckName)`** -- separa o nome de deck do Anki
  pelo delimitador `::` (hierarquia nativa do Anki), devolve
  `['Vocabulário','Animais']` pra `"Vocabulário::Animais"`.
- **`buildAnkiDeckTree(notes)`** -- agrega, em memória, uma árvore
  `{name, count, children:[...]}` a partir de `deckPath` de cada Note --
  `count` de um nó pai soma ele mesmo mais TODOS os descendentes (mesma
  regra de agregação que o documento de arquitetura consolidada,
  fornecido pela autora, já descreve na seção 3.3 pra uma futura tela de
  Painel).
- **`buildAnkiImportPlan()`** passou a computar `deckPath`/`deckName`
  por Note (em TODAS as ramificações, sucesso ou falha -- inclusive Notes
  rejeitadas continuam carregando de onde vieram) e expõe
  `plan.deckTree` (a árvore completa do `.apkg`).
- **`shared/anki-import-ui.js`** -- resumo agora mostra a árvore de Deck
  encontrada (nomes + contagem por nível, indentada), com uma mensagem
  HONESTA: "este app ainda não tem Decks -- todos os cartões
  selecionados entram em 'Meus Cartões', sem separação por deck; essa
  hierarquia foi capturada e fica pronta pra quando os Decks existirem".
  **Nunca finge que a hierarquia será preservada na prática hoje.**
- **Nada disso é persistido** -- `deckPath`/`deckName`/`deckTree` vivem
  só em `plan` (objeto JS em memória, nunca serializado pro banco).
  `nativeContentColumnsFromEditorState()` (a função que decide o que
  realmente vai pro INSERT) nunca lê/inclui nenhum campo de deck --
  confirmado por auditoria final (grep) que nenhuma linha gravada em
  `own_flashcards` carrega `.deck`/`.deckPath`/`.anki_deck` em nenhum
  cenário.

### Gap 2 -- Tags viram propriedade nativa e real da Note

**Achado da auditoria**: nenhuma normalização de tag existia em lugar
nenhum do código (a única função próxima, `slugifyUsername()` em
`shared/profile.js`, usa um alfabeto/regra diferente, pra username --
não reaproveitável aqui sem confundir 2 conceitos). Conforme o documento
de arquitetura consolidada da autora (seção sobre Tags): tags pertencem
à NOTE, são globais na conta, compartilhadas entre idiomas, e um futuro
"Painel" as usaria como filtro.

**Migration `048_add_tags_to_flashcards.sql`** -- aplicada AO VIVO via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg`:
```sql
alter table teacher_flashcards add column if not exists tags text[] not null default '{}'::text[];
alter table own_flashcards add column if not exists tags text[] not null default '{}'::text[];
```
Aditiva/sem risco, mesmo padrão de sempre -- confirmado antes de rodar
que nenhuma das duas tabelas tinha essa coluna.

**`normalizeTagSlug(raw)`/`normalizeNoteTags(rawTags)`** (novo,
`shared/flashcard-model.js`, logo depois de `isCardGenerationModePresent`)
-- **a única implementação canônica de normalização de tag no app
inteiro**, reutilizável por qualquer código futuro (editor, Painel,
atribuição pública de Deck, Study Trail) em vez de cada um reimplementar
a regra: minúsculas, acentos removidos (NFD), espaços/`::`→`-`, sem
hierarquia de subtag (achatada), dedup case-insensitive preservando a
1ª ocorrência.

**Threaded através de todo o pipeline de estado do editor** (reaproveitando
os pontos já existentes, nunca um caminho paralelo):
- `createNativeNoteEditorState()` (`shared/flashcard-editor-state.js`) --
  normaliza `tags` UMA vez, na criação -- todo chamador (novo cartão,
  reconstrução de linha existente, importador Anki) herda a normalização
  de graça, nunca precisa chamar `normalizeNoteTags()` de novo.
- `createNativeNoteEditorStateFromRow(row)` -- passa `row.tags` adiante.
- `noteEditorStateContentForComparison()`/`noteEditorStateToRow()` --
  `tags` agora faz parte do que conta como "conteúdo" (uma edição de tag
  já dispara `noteEditorStateChanged()` corretamente, sem nenhuma regra
  nova) e do que é serializado de volta pra uma linha.
- `nativeContentColumnsFromEditorState()` (`shared/flashcard-native-
  persistence.js`) -- repassa `tags: row.tags` pro payload final, **nunca
  renormaliza** (a normalização já aconteceu 1 vez, na criação do
  `editorState`).
- **Importador Anki** (`shared/anki-import.js`) -- `note.tags` (já
  parseado pelo parser, `shared/anki-parser.js`, formato Anki real: 1
  string por Note, tags separadas por espaço, nunca com espaço LITERAL
  dentro de uma tag -- multi-palavra usa `_`) é passado pra
  `createNativeNoteEditorState({tags: note.tags, ...})` nas 4
  ramificações de mapeamento (basic/basic_reversed/type_answer/cloze/
  zh_pinyin_normal) -- normalizado automaticamente pelo ponto único
  acima. `plan.notes[i].normalizedTags` fica disponível pro resumo; o
  plano também expõe `plan.uniqueTags`/`plan.tagsPresent`.
- **`shared/anki-import-ui.js`** -- resumo mostra as tags encontradas já
  normalizadas (`#vocab #a1 #comida ...`), e a mensagem antiga ("este
  app ainda não tem esse recurso") foi **removida** -- Gap 2 fechado de
  verdade, não só documentado como pendência.

### Gap 3 -- round-trip zh resolvido reaproveitando `pinyinFieldId`, nunca um hack

**Processo obrigatório seguido à risca**: auditoria só-leitura ANTES de
qualquer código, confirmando exatamente como o mecanismo já existente
representa pinyin/hanzi/tradução:
- `createFieldState()` (Fase 6D.1) -- shape `{id, lang, role,
  content:{value}, audio, image, pinyinFieldId}`; `pinyinFieldId` num
  Field aponta pro `id` de OUTRO Field da mesma Note (o "satélite de
  pinyin").
- `buildNativeRuntimeFields()` traduz `pinyinFieldId` persistido (por
  id) pra `pinyinFieldIndex` runtime (por índice) -- usado por
  `resolveCardField()` pra montar `pinyinText` na projeção de exibição.
- `contentFieldIndices(rawFields)` -- decide quais Fields contam como
  "slot de conteúdo" (front/back) pra Normal/Type Answer/Cloze, **pulando
  explicitamente** qualquer Field que seja alvo do `pinyinFieldId` de
  outro -- é assim que um Field de pinyin nunca vira "3º slot" por
  engano.
- **`nativeNoteEditorStateFromLegacyRow()`** (`shared/flashcard-native-
  persistence.js`, Fase 6D.8, conversão de cartão zh LEGADO pro modelo
  nativo) **já usava exatamente este padrão**: `hanziField.lang='zh'`,
  `pinyinField.lang='zh-pinyin'`, `hanziField.pinyinFieldId =
  pinyinField.id`, `translationField.lang='pt-BR'` -- confirmando que o
  mecanismo já é suficiente pra representar hanzi+pinyin+tradução, sem
  precisar de nada novo.
- **O exportador zh do próprio app** (`zh/app.js`, `ANKI_EXPORT_CONFIG`)
  confirmado gerando sempre o MESMO model de 3 Fields: `Pinyin` (ord 0),
  `Caractere` (ord 1), `Tradução` (ord 2), com `qfmt` mostrando só
  Pinyin e `afmt` revelando Caractere+Tradução -- essa é a assinatura
  estrutural exata que o importador precisa reconhecer.

Como a auditoria confirmou que o mecanismo é genuinamente suficiente,
**o fallback "pare e reporte o gap" nunca precisou ser acionado** --
implementação seguiu direto.

**O que foi feito, `shared/anki-import.js`:**
- **`ZH_PINYIN_CHAR_TRANSLATION_FIELD_NAMES`** + **`classifyKnownZhPinyinCharTranslationModel(model)`**
  -- reconhecimento por **assinatura ESTRUTURAL exata** (nomes de Field
  E posição de `qfmt`/`afmt` batendo com o padrão real do exportador
  deste app), **nunca** por heurística de idioma da conta ou posição
  arbitrária -- um model de 3 Fields que não bate essa assinatura exata
  continua caindo no fluxo geral (`classifyAnkiTemplate`), que hoje
  rejeita corretamente (`afmtRefsRaw.length === 1`, fix de uma sessão
  anterior) em vez de perder conteúdo silenciosamente.
- **Novo branch `zh_pinyin_normal`** dentro de `mapAnkiNoteToNativeEditorState()`
  -- monta os 3 Fields exatamente como `nativeNoteEditorStateFromLegacyRow()`
  já fazia pro caso legado (`hanziField.pinyinFieldId = pinyinField.id`,
  mesmos `lang` `'zh'`/`'zh-pinyin'`/`'pt-BR'`) -- **reaproveita o
  mecanismo existente**, nunca um caminho de mapeamento novo/paralelo.

**Achado real corrigido durante o processo (não um artefato de teste)**:
o round-trip contra um `.apkg` REAL exportado pelo próprio app (171
Notes reais da trilha zh) revelou que `classifyAnkiTemplate()` usava
`afmtRefsRaw.length >= 1` -- um model de 3 Fields (como o próprio
exportador zh gera) batia essa checagem capturando só o 1º Field extra
(Caractere) e **descartando a Tradução silenciosamente**. Corrigido pra
`=== 1` (alinhado ao próprio comentário do código, que já dizia "EXATAMENTE
1"). Esse fix, junto do reconhecimento estrutural do `zh_pinyin_normal`
acima, faz com que hoje **166 de 171 Notes reais da trilha zh** importem
com sucesso -- hanzi/pinyin/tradução preservados, `pinyinFieldId`
corretamente reconstruído, confirmado via round-trip REAL pelo motor
(`buildEngineCardsFromRow`/`resolveCardContentView`), não só inspeção
estrutural.

**Limitação real, documentada, não corrigida por decisão de escopo**
(não por esquecimento): não existe hoje um jeito seguro e suficientemente
restrito de reconhecer "Field[0]=pinyin satélite/Field[1]=hanzi/
Field[2]=tradução" quando os nomes de Field NÃO batem exatamente com o
padrão do próprio exportador deste app (ex: um `.apkg` de terceiros com
um model de 3 Fields parecido, mas nomeado diferente) -- a escolha
SEGURA (rejeitar com aviso específico em vez de arriscar perder dado)
já resolve o problema de correção; remapear via satélite de pinyin
nesses casos é tecnicamente viável (o mecanismo já existe, pronto), mas
exigiria um raio de mudança maior (nova heurística de reconhecimento +
mais testes) não pedido nesta rodada -- registrado como recomendação
concreta pra uma sessão futura, não implementado agora.

### O que continua igual, de propósito (lista "não quebrar")

Confirmado por auditoria final (grep, código executável, comentários
excluídos): nenhuma persistência direta de `CardInstance` em lugar
nenhum; Note+CardType→CardInstances continuam 100% derivadas em runtime
(`buildEngineCardsFromRow`/`interpretNoteFromRow`/
`interpretNativeNoteFromRow`, nenhum tocado nesta fase); nenhum
histórico de revisão/FSRS do Anki jamais lido (`card.type`/`card.queue`/
`card.due`/`card.ivl`/`card.factor`/`card.reps`/`card.lapses` nunca
consultados -- todo cartão nativo importado nasce com FSRS no default de
sempre); Múltipla Escolha/Digite a resposta só reconhecidos quando
inequívocos (inalterado); Cloze inválido continua pulado com aviso
específico; `.apkg` zstd/protobuf continuam rejeitados com mensagem
acionável; GUID do Anki (`note.guid`) só existe dentro de
`plan.notes[i].ankiGuid` (rastreabilidade/log), **nunca gravado em
nenhuma coluna** -- confirmado por grep que `persistAnkiImportBatches()`
só grava o que `nativeContentColumnsFromEditorState()` devolve, que
nunca inclui `ankiGuid`; nenhuma duplicata criada silenciosamente
(seleção default desmarca prováveis duplicatas, nunca sobrescreve);
limite de coleção (Fase 5.1) validado ANTES de qualquer escrita, sem
exceção nova pro importador; import continua atômico por lote (40
Notes/lote, retry nunca reimporta lote já confirmado); mídia preservada
quando possível, falha por Note nunca aborta o lote inteiro; avisos
sempre visíveis, nunca silenciosos; `isReverse`/`reviewDirection` nunca
usados como mecanismo de direção nativa (zero ocorrência nos arquivos
do importador); nenhum "Importado" global auto-criado (nenhuma
persistência de deck ocorre, então a pergunta nem se aplica); nenhum
cartão aterrissa "na raiz do idioma" (todo cartão importado vai pra
"Meus Cartões" da conta, mesmo destino de sempre de um cartão criado
manualmente -- não existe conceito de "raiz do idioma" nesta tabela).

### Testes (categorias A-D, todas cobertas)

**A -- hierarquia de Deck**: árvore simples + subdecks + preservação de
hierarquia relativa (`deckPath` de uma Note em `Vocabulário::Animais`
resolve pra `['Vocabulário','Animais']`); agregação de contagem no nó
pai (soma de si + descendentes); destino sempre "Meus Cartões" (nunca
um Deck próprio, porque Decks não existem); confirmado que nenhum campo
de deck é persistido em nenhuma linha real.

**B -- Tags**: múltiplas tags por Note; normalização correta (acentos,
espaço/underscore, minúsculas, dedup); tags confirmadas globais/
compartilhadas na conta (persistidas na própria linha da Note, sem
nenhum escopo por idioma na coluna em si -- `language_app_key` já
escopa a LINHA, `tags` é só mais uma coluna dela); "filtro do Painel" é
explicitamente N/A -- o Painel não existe ainda, não simulado/fingido;
confirmado que não existe um 2º sistema de tag em lugar nenhum do
código.

**C -- round-trip zh com `.apkg` REAL** (produzido pelo próprio
exportador zh deste app, nunca um fixture sintético pra este cenário
específico): pinyin/hanzi/tradução confirmados preservados;
`pinyinFieldId` corretamente reconstruído (comparação estrutural E via
motor real); nenhuma perda silenciosa de conteúdo (o achado do fix
`afmtRefsRaw` foi descoberto exatamente por este teste).

**D -- regressão completa**: suíte Node/VM (`test_fase7j_anki_import_unit.js`,
**148/148**), round-trip real (`test_fase7j_roundtrip.js`, **33/33**),
smoke de navegador real FR+ZH (`test_fase7j_browser.js`, **82/82**,
Playwright/Chromium, seleção real de arquivo `.apkg`, cliques reais em
"Selecionar todos"/confirmar, persistência real em `own_flashcards`
fake), e **integração real contra o banco de produção** (transação +
`ROLLBACK`, projeto `eigjocalzwamisgqilhg`): snapshot antes (7 linhas,
hash `3a856c6170e81c7a0f3faae24e779dee`) -- INSERT real de uma linha
`zh_pinyin_normal`-shaped (`fields` com hanzi+pinyin satélite+tradução,
`card_generation_mode:'normal'`, `tags:['vocab','a1','coisas-que-errei']`)
dentro de uma transação sem commit -- `RETURNING` confirmou `id`/
`back_trans`/`fields`/`tags`/`revision` gravados corretamente (schema
aceita o payload sem violar nenhuma constraint) -- conexão fechada sem
`COMMIT` explícito (Postgres descarta a transação automaticamente) --
snapshot depois idêntico ao de antes (7 linhas, MESMO hash) -- confirma
que nenhum dado de teste ficou de pé em produção.

### Escopo respeitado (confirmado, não presumido)

`git status`/`git diff --stat` confirmam só 6 arquivos tocados nesta
rodada de fechamento: `shared/anki-import.js`, `shared/anki-import-ui.js`,
`shared/flashcard-model.js`, `shared/flashcard-editor-state.js`,
`shared/flashcard-native-persistence.js` + a migration `048` nova.
Nenhum Deck Engine, Painel ou Study Trail construído -- exatamente como
a instrução exigia. Nenhum passo manual pendente pra autora -- a
migration `048` já foi aplicada ao vivo via `mcp__Supabase__apply_migration`.

Com os 3 gaps fechados, testados nas 4 categorias exigidas e a auditoria
final limpa, a Fase 7j está de fato completa. **PARE conforme instrução
explícita -- não avançar pra Deck Engine, Painel ou Study Trail sem
autorização explícita da autora.**

