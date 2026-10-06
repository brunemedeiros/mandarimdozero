// ---------- Fase 7j (ver CLAUDE.md) -- Anki IMPORT: mapper Note/Model/
// Template -> Note/Field/CardType nativo + validação + dedup + persistência
// em lote ----------
//
// Depende de (mesma posição de shared/anki-parser.js -- antes de
// shared/admin-flashcards.js/shared/my-flashcards.js, depois de
// shared/flashcard-model.js/shared/flashcard-editor-state.js/
// shared/flashcard-native-persistence.js/shared/flashcard-mc-editor.js/
// shared/flashcard-typeanswer-editor.js/shared/flashcard-cloze-editor.js/
// shared/own-flashcards.js/shared/roles.js):
//   - shared/anki-parser.js        (parseApkgFile -- dados crus do .apkg)
//   - shared/flashcard-model.js    (CARD_GENERATION_MODES, parseClozeMarks,
//                                    contentFieldIndices, validateNativeNoteRow)
//   - shared/flashcard-editor-state.js (createNativeNoteEditorState,
//                                    createFieldState, noteEditorStateToRow)
//   - shared/flashcard-native-persistence.js (validateNoteEditorStateForSave,
//                                    nativeContentColumnsFromEditorState)
//   - shared/own-flashcards.js     (uploadOwnFlashcardMedia)
//   - shared/roles.js              (hasActiveTeacherLink)
//   - shared/my-flashcards.js      (FREE_OWN_FLASHCARD_LIMIT)
//   - shared/deck-engine.js        (preflightOwnCardInstanceCreation, Fase F)
//   - shared/supabase-client.js    (supabaseClient -- só pro INSERT em lote)
//   - shared/auth.js               (CURRENT_USER)
//
// Princípio central (ver CLAUDE.md, "Anki Note != Anki Card"): 1 Anki Note
// vira 1 Note nativa. CardInstances NUNCA são persistidas -- são sempre
// derivadas em runtime pelo motor já existente (buildEngineCardsFromRow,
// via interpretNoteFromRow/interpretNativeNoteFromRow), exatamente como
// todo o resto desta feature já funciona desde a Fase 6B. Este arquivo
// nunca grava uma linha por Anki Card -- só por Anki Note.

// ============================================================
// Classificação de Model/Template -> Card Type native
// ============================================================

// Palavras-chave especiais do Anki que NUNCA são nome de Field -- filtradas
// ao extrair referências de campo de um template (Section 6: "distinguir
// conteúdo do Field de instruções do Template").
const ANKI_TEMPLATE_SPECIAL_KEYWORDS = new Set([
  'FrontSide', 'Tags', 'Type', 'Deck', 'Subdeck', 'Card', 'CardFlag', 'Flag', 'CSS',
]);

// Remove wrappers condicionais {{#Field}}...{{/Field}} e {{^Field}}...{{/Field}}
// (mantém o conteúdo interno -- o wrapper só controla VISIBILIDADE, não é
// conteúdo em si) antes de extrair referências de campo -- sem isso, um
// template como "{{#Extra}}{{Extra}}{{/Extra}}" contaria "Extra" como
// referenciado mesmo quando o campo está vazio/condicional, o que é
// correto, mas os PRÓPRIOS marcadores {{#...}}/{{/...}} não devem ser
// confundidos com uma referência de campo de conteúdo.
function stripAnkiTemplateConditionalMarkers(text){
  return (text || '').replace(/\{\{[#^\/][^{}]*\}\}/g, '');
}

// Extrai os nomes de Field DISTINTOS referenciados por um template (depois
// de remover os marcadores condicionais) -- inclui referências simples
// ({{Front}}), cloze ({{cloze:Text}}) e type-in-answer ({{type:Back}}),
// mas nunca palavras-chave especiais do Anki (FrontSide/Tags/Deck/...).
function ankiTemplateFieldRefs(text){
  const stripped = stripAnkiTemplateConditionalMarkers(text);
  const refs = [];
  const re = /\{\{(?:cloze:|type:)?([^{}#^\/]+?)\}\}/g;
  let m;
  while ((m = re.exec(stripped))){
    const name = m[1].trim();
    if (name && !ANKI_TEMPLATE_SPECIAL_KEYWORDS.has(name) && !refs.includes(name)) refs.push(name);
  }
  return refs;
}

function ankiTemplateHasClozeRef(text, fieldName){
  const stripped = stripAnkiTemplateConditionalMarkers(text);
  const re = new RegExp(`\\{\\{cloze:${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`);
  return re.test(stripped);
}

function ankiTemplateTypeField(text){
  const stripped = stripAnkiTemplateConditionalMarkers(text);
  const m = /\{\{type:([^{}]+?)\}\}/.exec(stripped);
  return m ? m[1].trim() : null;
}

// Classifica UM template (par qfmt/afmt) -- nunca decide o Card Type do
// Note inteiro sozinho (isso é classifyAnkiNoteType, que combina os
// templates de um model). Devolve sempre um shape reconhecível, nunca
// lança -- template mal-formado só vira `{kind:'unrecognized'}`.
function classifyAnkiTemplate(model, tmpl){
  const fieldNames = (model.flds || []).map(f => f.name);

  // Cloze -- detectado pelo PRÓPRIO model.type (Anki marca isso de forma
  // confiável e estrutural, nunca por heurística de HTML), nunca por
  // adivinhação de conteúdo (Section 6: "não interpretar HTML arbitrariamente
  // como se fosse semântica conhecida").
  if (model.type === 1){
    const clozeFieldName = fieldNames.find(name => ankiTemplateHasClozeRef(tmpl.qfmt, name));
    if (clozeFieldName) return { kind: 'cloze', textFieldName: clozeFieldName };
    return { kind: 'unrecognized', reason: 'cloze_field_not_found' };
  }

  const qfmtRefs = ankiTemplateFieldRefs(tmpl.qfmt);
  const typeFieldName = ankiTemplateTypeField(tmpl.qfmt);

  // Type Answer -- só quando INEQUÍVOCO (Section 15): exatamente 1 campo de
  // pergunta em qfmt, mais um {{type:X}} apontando pra um campo DIFERENTE
  // do de pergunta, e os dois existem de fato no model. `ankiTemplateFieldRefs`
  // já inclui o próprio nome referenciado por `{{type:X}}` na lista de refs
  // (ela não distingue "{{X}}" de "{{type:X}}" ao extrair nomes) -- o
  // template PADRÃO do Anki pra este note type é
  // `qfmt: "{{Front}}{{type:Back}}"` (Front mostrado, Back é o que a
  // aluna digita), então `qfmtRefs` sozinho conta OS DOIS (['Front','Back']),
  // nunca só 1. A pergunta de verdade é "além do campo que {{type:}}
  // pede pra digitar, sobra exatamente 1 outro campo mostrado antes de
  // responder?" -- por isso o campo do próprio {{type:X}} é excluído antes
  // de contar.
  const promptRefs = qfmtRefs.filter(name => name !== typeFieldName);
  if (typeFieldName && promptRefs.length === 1
      && fieldNames.includes(promptRefs[0]) && fieldNames.includes(typeFieldName)){
    return { kind: 'type_answer', promptFieldName: promptRefs[0], answerFieldName: typeFieldName };
  }

  // Básico -- qfmt referencia exatamente 1 Field (a "frente"); afmt precisa
  // referenciar exatamente 1 Field NOVO além dele (o "verso") -- {{FrontSide}}
  // é ignorado (é "o que qfmt já mostrou", nunca um Field de conteúdo).
  // Achado real da Fase 7j (round-trip -- Section 32): esta checagem já
  // dizia "exatamente 1" no comentário, mas comparava com `>= 1` -- um
  // model de 3+ Fields cujo afmt mostra 2 Fields novos além da frente
  // (ex: o próprio export deste app pro zh, Pinyin/Caractere/Tradução --
  // qfmt só {{Pinyin}}, afmt {{Caractere}}+{{Tradução}}) batia nesta
  // branch e ficava com `backFieldName` = só o PRIMEIRO ('Caractere'),
  // descartando o segundo ('Tradução') SEM nenhum aviso -- confirmado ao
  // vivo reimportando um .apkg real exportado por este mesmo app: o
  // cartão nativo resultante virava só `[pinyin, hanzi]`, a tradução
  // sumia de vez, silenciosamente. Corrigido pra `=== 1` (bate o
  // comentário) -- um model assim vira `unrecognized` (aviso visível,
  // Note pulada, nunca perde conteúdo sem avisar) em vez de mapear
  // parcialmente com perda de dado silenciosa -- mesmo princípio já
  // seguido em todo o resto do arquivo (Seção 13/28: erro recuperável e
  // VISÍVEL é sempre preferível a sucesso parcial silencioso).
  if (qfmtRefs.length === 1 && fieldNames.includes(qfmtRefs[0])){
    const frontFieldName = qfmtRefs[0];
    const afmtRefsRaw = ankiTemplateFieldRefs(tmpl.afmt).filter(name => name !== frontFieldName);
    if (afmtRefsRaw.length === 1 && fieldNames.includes(afmtRefsRaw[0])){
      return { kind: 'basic', frontFieldName, backFieldName: afmtRefsRaw[0] };
    }
  }

  return { kind: 'unrecognized', reason: 'ambiguous_template' };
}

// ============================================================
// Reconhecimento do model Básico específico que o PRÓPRIO exportador zh
// deste app produz (Fase 7j, fechamento do gap 3 -- ver CLAUDE.md, Gap 3
// "ZH round-trip via pinyinFieldId").
//
// Auditoria feita ANTES de escrever isto (obrigatória, ver relatório):
// createFieldState()/pinyinFieldId (shared/flashcard-editor-state.js) já
// representam "um Field de conteúdo com um Field satélite de pinyin
// anexado" -- contentFieldIndices() (shared/flashcard-model.js) já pula
// o satélite ao contar slots de conteúdo posicionais, e
// nativeNoteEditorStateFromLegacyRow() (shared/flashcard-native-
// persistence.js) já usa EXATAMENTE este mecanismo pra converter um
// cartão zh LEGADO (front/front_pinyin/back_trans) -- confirmado por
// leitura do código real, nunca presumido. O mecanismo é suficiente;
// faltava só o IMPORTADOR reconhecer quando um model Anki representa
// essa mesma relação.
//
// zh/app.js (ANKI_EXPORT_CONFIG) SEMPRE exporta com o MESMO model --
// Normal e Digite a resposta zh caem no MESMO shape de 3 campos (só o
// CONTEÚDO de cada campo muda, nunca a estrutura do model/template) --
// confirmado lendo `fields`/`qfmt`/`afmt` reais em zh/app.js antes de
// escrever este reconhecimento, nunca adivinhado:
//   fields: [{name:"Pinyin"}, {name:"Caractere"}, {name:"Tradução"}]
//   qfmt:   "...{{Pinyin}}..."
//   afmt:   "{{FrontSide}}...{{Caractere}}...{{Tradução}}..."
//
// Reconhecido por ASSINATURA ESTRUTURAL EXATA -- 3 Fields com estes
// NOMES LITERAIS, nesta ORDEM, 1 template só, cujo qfmt referencia só
// "Pinyin" e cujo afmt referencia "Caractere"+"Tradução" (nada mais) --
// NUNCA "se idioma===zh" nem heurística posicional genérica sobre um
// model de 3 campos arbitrário (isso reabriria exatamente o risco que o
// bugfix de classifyAnkiTemplate() fechou -- adivinhar qual dos 2 campos
// "novos" é conteúdo vs. satélite de pinyin, pra um deck de terceiros
// desconhecido). Um model de 3rd-party que por acaso usa estes 3 nomes
// literais (auto-descritivos: "Pinyin"/"Caractere"/"Tradução") é tratado
// do mesmo jeito, de propósito -- os NOMES já dizem o que cada campo é,
// não é uma adivinhação, é reconhecimento por rótulo explícito.
const ZH_PINYIN_CHAR_TRANSLATION_FIELD_NAMES = ['Pinyin', 'Caractere', 'Tradução'];

function classifyKnownZhPinyinCharTranslationModel(model){
  if (model.type === 1) return null; // nunca compete com a detecção de Cloze (model.type===1)
  const flds = (model.flds || []).slice().sort((a, b) => a.ord - b.ord);
  const fieldNames = flds.map(f => f.name);
  if (fieldNames.length !== 3) return null;
  if (fieldNames[0] !== ZH_PINYIN_CHAR_TRANSLATION_FIELD_NAMES[0]
      || fieldNames[1] !== ZH_PINYIN_CHAR_TRANSLATION_FIELD_NAMES[1]
      || fieldNames[2] !== ZH_PINYIN_CHAR_TRANSLATION_FIELD_NAMES[2]) return null;
  const tmpls = model.tmpls || [];
  if (tmpls.length !== 1) return null;
  const tmpl = tmpls[0];
  const qfmtRefs = ankiTemplateFieldRefs(tmpl.qfmt);
  if (qfmtRefs.length !== 1 || qfmtRefs[0] !== 'Pinyin') return null;
  const afmtRefs = ankiTemplateFieldRefs(tmpl.afmt).filter(name => name !== 'Pinyin');
  if (afmtRefs.length !== 2 || !afmtRefs.includes('Caractere') || !afmtRefs.includes('Tradução')) return null;
  return { kind: 'zh_pinyin_normal', pinyinFieldName: 'Pinyin', hanziFieldName: 'Caractere', translationFieldName: 'Tradução' };
}

// Classifica um MODEL inteiro (todos os templates juntos) -- combina os
// resultados de classifyAnkiTemplate() dos seus tmpls (ordenados por `ord`,
// a mesma ordem que o Anki usa pra gerar Card 1/Card 2/...) numa decisão
// única de Card Type native, seguindo a Seção 17 ("não simplesmente assumir
// que 'dois templates' significa reversed -- analisar as referências aos
// Fields"). Resultado cacheável por model.id (mesmo model = mesma
// classificação pra toda Note que o usa) -- quem chama decide o cache.
function classifyAnkiNoteType(model){
  // Gap 3 (ver comentário acima) -- checagem estrutural mais específica
  // primeiro, sempre barata (compara nomes de campo antes de qualquer
  // outra coisa) e mutuamente exclusiva com todo o resto desta função
  // (só retorna não-null pra essa assinatura exata de 3 campos/1
  // template/refs exatas) -- nunca intercepta nenhum outro model.
  const knownZh = classifyKnownZhPinyinCharTranslationModel(model);
  if (knownZh) return knownZh;

  const tmpls = (model.tmpls || []).slice().sort((a, b) => a.ord - b.ord);
  if (!tmpls.length) return { kind: 'unrecognized', reason: 'no_templates' };

  const perTmpl = tmpls.map(t => classifyAnkiTemplate(model, t));

  // Cloze -- basta 1 template reconhecido como cloze (é o caso normal --
  // modelos Cloze do Anki quase sempre têm 1 template só).
  const clozeTmpl = perTmpl.find(c => c.kind === 'cloze');
  if (model.type === 1 && clozeTmpl){
    const fieldNames = (model.flds || []).map(f => f.name);
    const textIdx = fieldNames.indexOf(clozeTmpl.textFieldName);
    // Campo de tradução -- Decisão D4 (ver relatório da Fase 7j): o modelo
    // native EXIGE um 2º campo não-vazio (validateNativeClozeStructure já
    // bloqueia tradução vazia) -- muitos decks Cloze do Anki só têm 1 campo
    // ("Text"), sem par de tradução. Aqui só REGISTRAMOS qual seria o
    // candidato (o outro campo do model, se existir) -- a decisão de pular
    // a Note por falta de tradução de verdade acontece no MAPEAMENTO
    // (mapAnkiNoteToNativeEditorState), nunca aqui (classificação de MODEL
    // não olha conteúdo de Note nenhuma).
    const translationIdx = fieldNames.findIndex((_, i) => i !== textIdx);
    return { kind: 'cloze', textFieldIdx: textIdx, translationFieldIdx: translationIdx };
  }

  if (tmpls.length === 1){
    const c = perTmpl[0];
    if (c.kind === 'basic' || c.kind === 'type_answer') return c;
    return { kind: 'unrecognized', reason: c.reason || 'unrecognized_single_template' };
  }

  // 2 templates: candidato a "normal com reverso" (Section 17) -- só quando
  // os 2 são "basic" E as frentes de cada um são Fields DIFERENTES (a
  // assinatura exata de "Basic (and reversed card)"/"Basic (optional
  // reversed card)" do próprio Anki: Template 1 = FieldA->FieldB, Template
  // 2 = FieldB->FieldA).
  if (tmpls.length === 2 && perTmpl[0].kind === 'basic' && perTmpl[1].kind === 'basic'
      && perTmpl[0].frontFieldName === perTmpl[1].backFieldName
      && perTmpl[0].backFieldName === perTmpl[1].frontFieldName
      && perTmpl[0].frontFieldName !== perTmpl[0].backFieldName){
    return { kind: 'basic_reversed', frontFieldName: perTmpl[0].frontFieldName, backFieldName: perTmpl[0].backFieldName };
  }

  // 2+ templates sem o padrão reversed inequívoco -- Section 17: nunca
  // assume reversed só por "são 2 templates". Cai pro 1º template
  // reconhecido (perde os templates extras -- warning reportado por quem
  // chama), nunca inventa Multiple Choice (Section 16 -- Anki não tem
  // equivalente native, e não existe convenção universal de campos pra
  // inferir isso com segurança de HTML/Field arbitrário).
  const firstUsable = perTmpl.find(c => c.kind === 'basic' || c.kind === 'type_answer');
  if (firstUsable) return Object.assign({}, firstUsable, { extraTemplatesDropped: tmpls.length - 1 });

  return { kind: 'unrecognized', reason: 'multi_template_ambiguous' };
}

// ============================================================
// Conversão de sintaxe Cloze Anki -> sintaxe nativa interna
// ============================================================

// Anki: {{c1::resposta}} (idêntico à nossa sintaxe) ou
// {{c1::resposta::dica}} (hint -- SEM equivalente seguro no modelo native,
// Section 14: "não transformar hint em resposta esperada sem justificativa").
// Decisão D6 (ver relatório): a dica é DESCARTADA (nunca vira compareAnswer,
// que no nosso modelo significa "o que o aluno precisa DIGITAR pra acertar"
// -- semântica bem mais forte que uma dica cosmética do Anki, ex. "verbo no
// pretérito"), a RESPOSTA em si é sempre preservada integralmente. Devolve
// {text, hintsDropped} -- warning só informativo, nunca bloqueia a Note.
function convertAnkiClozeToNativeSyntax(ankiText){
  let hintsDropped = 0;
  const converted = (ankiText || '').replace(/\{\{(c\d+)::((?:(?!\}\}).)*)\}\}/g, (_, markId, body) => {
    const sepIdx = body.indexOf('::');
    if (sepIdx === -1) return `{{${markId}::${body}}}`;
    hintsDropped += 1;
    return `{{${markId}::${body.slice(0, sepIdx)}}}`;
  });
  return { text: converted, hintsDropped };
}

// ============================================================
// Mídia -- [sound:arquivo]/<img src="arquivo"> -> field.audio/field.image
// ============================================================

const ANKI_SOUND_TAG_RE = /\[sound:([^\]]+)\]/g;
const ANKI_IMG_TAG_RE = /<img[^>]*\bsrc=["']([^"'>]+)["'][^>]*>/g;

// Extrai as referências de mídia de um texto de Field (podem existir 0, 1,
// ou várias de cada tipo -- só a PRIMEIRA de cada tipo é usada como
// audio/image do Field, mesmo critério "1 áudio + 1 imagem por Field" que
// o resto do app já segue desde a Fase 7a/7b) e devolve o texto SEM as
// tags de mídia embutidas (Section 12: "não deixar apenas o texto
// [sound:x.mp3] se for possível importar a mídia real" -- e mesmo quando
// não for possível, Section 13 exige nunca deixar a marcação crua vazando
// na tela; o texto visível nunca mostra `[sound:...]`/`<img ...>`).
function extractAnkiMediaRefs(fieldText){
  const raw = fieldText || '';
  const audioFilenames = [];
  const imageFilenames = [];
  let m;
  ANKI_SOUND_TAG_RE.lastIndex = 0;
  while ((m = ANKI_SOUND_TAG_RE.exec(raw))) audioFilenames.push(m[1]);
  ANKI_IMG_TAG_RE.lastIndex = 0;
  while ((m = ANKI_IMG_TAG_RE.exec(raw))) imageFilenames.push(m[1]);
  const cleanText = raw.replace(ANKI_SOUND_TAG_RE, '').replace(ANKI_IMG_TAG_RE, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  return {
    text: cleanText,
    audioFilename: audioFilenames[0] || null,
    imageFilename: imageFilenames[0] || null,
  };
}

// ============================================================
// Mapeamento: Anki Note + classificação de Model -> Note editor state nativo
// ============================================================

// Constrói o editor state nativo (SEM mídia ainda -- mídia é resolvida à
// parte, só na hora de persistir de verdade, nunca durante o preview, ver
// resolveAndAttachAnkiMedia abaixo) pra uma Anki Note, dada a classificação
// já computada do seu model. Devolve sempre {ok, ...} -- nunca lança;
// falha de mapeamento é sempre um "erro recuperável por Note" (Section 28),
// nunca aborta a importação inteira.
function mapAnkiNoteToNativeEditorState(note, model, classification, languageAppKey){
  const fieldNames = (model.flds || []).map(f => f.name);
  const rawFieldByName = (name) => {
    const idx = fieldNames.indexOf(name);
    return idx >= 0 ? (note.flds[idx] || '') : '';
  };

  if (classification.kind === 'basic' || classification.kind === 'basic_reversed'){
    const frontRaw = extractAnkiMediaRefs(rawFieldByName(classification.frontFieldName));
    const backRaw = extractAnkiMediaRefs(rawFieldByName(classification.backFieldName));
    if (!frontRaw.text || !backRaw.text){
      return { ok: false, reason: 'empty_content', warning: 'Frente ou verso ficou vazio depois de limpar HTML/mídia -- Note pulada.' };
    }
    const frontField = createFieldState({ lang: null, content: { value: frontRaw.text } });
    const backField = createFieldState({ lang: null, content: { value: backRaw.text } });
    return {
      ok: true,
      warnings: [],
      mediaRefs: [{ field: frontField, audioFilename: frontRaw.audioFilename, imageFilename: frontRaw.imageFilename },
                  { field: backField, audioFilename: backRaw.audioFilename, imageFilename: backRaw.imageFilename }],
      editorState: createNativeNoteEditorState({
        languageAppKey,
        cardGenerationMode: classification.kind === 'basic_reversed' ? 'normal_reversed' : 'normal',
        fields: [frontField, backField],
        tags: note.tags,
      }),
      dedupKey: `${frontRaw.text}\u0001${backRaw.text}`.toLowerCase().trim(),
    };
  }

  if (classification.kind === 'zh_pinyin_normal'){
    // Gap 3 (ver comentário na classificação acima) -- reaproveita, sem
    // nenhuma mudança, o MESMO mecanismo pinyinFieldId que
    // nativeNoteEditorStateFromLegacyRow() (shared/flashcard-native-
    // persistence.js) já usa pra um cartão zh legado: hanziField carrega
    // pinyinFieldId apontando pro Field satélite de pinyin, nunca um
    // Field solto extra -- contentFieldIndices() (shared/flashcard-
    // model.js) já sabe pular esse satélite ao contar os 2 slots de
    // conteúdo (front=hanzi, back=tradução), sem nenhum código especial
    // aqui além de montar os 3 Fields na relação certa.
    const pinyinRaw = extractAnkiMediaRefs(rawFieldByName(classification.pinyinFieldName));
    const hanziRaw = extractAnkiMediaRefs(rawFieldByName(classification.hanziFieldName));
    const translationRaw = extractAnkiMediaRefs(rawFieldByName(classification.translationFieldName));
    if (!pinyinRaw.text || !hanziRaw.text || !translationRaw.text){
      return { ok: false, reason: 'empty_content', warning: 'Pinyin, caractere ou tradução ficou vazio depois de limpar HTML/mídia -- Note pulada.' };
    }
    const hanziField = createFieldState({ lang: 'zh', content: { value: hanziRaw.text } });
    const pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: pinyinRaw.text } });
    const translationField = createFieldState({ lang: 'pt-BR', content: { value: translationRaw.text } });
    hanziField.pinyinFieldId = pinyinField.id;
    return {
      ok: true,
      warnings: [],
      mediaRefs: [
        { field: hanziField, audioFilename: hanziRaw.audioFilename, imageFilename: hanziRaw.imageFilename },
        { field: pinyinField, audioFilename: pinyinRaw.audioFilename, imageFilename: pinyinRaw.imageFilename },
        { field: translationField, audioFilename: translationRaw.audioFilename, imageFilename: translationRaw.imageFilename },
      ],
      editorState: createNativeNoteEditorState({
        languageAppKey,
        cardGenerationMode: 'normal',
        fields: [hanziField, pinyinField, translationField],
        tags: note.tags,
      }),
      dedupKey: `${hanziRaw.text}\u0001${translationRaw.text}`.toLowerCase().trim(),
    };
  }

  if (classification.kind === 'type_answer'){
    const promptRaw = extractAnkiMediaRefs(rawFieldByName(classification.promptFieldName));
    const answerRaw = extractAnkiMediaRefs(rawFieldByName(classification.answerFieldName));
    if (!promptRaw.text || !answerRaw.text){
      return { ok: false, reason: 'empty_content', warning: 'Pergunta ou resposta ficou vazia depois de limpar HTML/mídia -- Note pulada.' };
    }
    const promptField = createFieldState({ lang: null, role: 'prompt', content: { value: promptRaw.text } });
    const answerField = createFieldState({ lang: null, role: 'answer', content: { value: answerRaw.text } });
    return {
      ok: true,
      warnings: [],
      mediaRefs: [{ field: promptField, audioFilename: promptRaw.audioFilename, imageFilename: promptRaw.imageFilename },
                  { field: answerField, audioFilename: answerRaw.audioFilename, imageFilename: answerRaw.imageFilename }],
      editorState: createNativeNoteEditorState({
        languageAppKey,
        cardGenerationMode: 'type_answer',
        fields: [promptField, answerField],
        tags: note.tags,
      }),
      dedupKey: `${promptRaw.text}\u0001${answerRaw.text}`.toLowerCase().trim(),
    };
  }

  if (classification.kind === 'cloze'){
    const rawText = note.flds[classification.textFieldIdx] || '';
    const rawTranslation = classification.translationFieldIdx >= 0 ? (note.flds[classification.translationFieldIdx] || '') : '';
    const textClean = extractAnkiMediaRefs(rawText);
    const translationClean = extractAnkiMediaRefs(rawTranslation);
    if (!translationClean.text){
      // Decisão D4 (ver relatório) -- sem tradução real, o modelo native
      // rejeitaria esta Note de qualquer jeito (validateNativeClozeStructure
      // exige tradução não-vazia); nunca inventamos uma. Erro recuperável,
      // não fatal.
      return { ok: false, reason: 'cloze_missing_translation', warning: 'Este cartão Cloze não tem um 2º campo de tradução preenchido no Anki -- o app exige uma tradução pra este formato, então a Note foi pulada. Pode ser criada manualmente depois.' };
    }
    const { text: nativeSyntax, hintsDropped } = convertAnkiClozeToNativeSyntax(textClean.text);
    const marks = parseClozeMarks(nativeSyntax);
    if (!marks.length){
      return { ok: false, reason: 'no_cloze_marks', warning: 'Nenhuma lacuna Cloze válida encontrada no texto -- Note pulada.' };
    }
    const textField = createFieldState({ lang: null, content: { value: nativeSyntax } });
    const translationField = createFieldState({ lang: null, content: { value: translationClean.text } });
    const warnings = [];
    if (hintsDropped > 0) warnings.push(`${hintsDropped} dica(s) de lacuna do Anki não foram preservadas (sem equivalente seguro neste app) -- a resposta em si foi mantida.`);
    return {
      ok: true,
      warnings,
      mediaRefs: [{ field: textField, audioFilename: textClean.audioFilename, imageFilename: textClean.imageFilename }],
      editorState: createNativeNoteEditorState({
        languageAppKey,
        cardGenerationMode: 'cloze',
        fields: [textField, translationField],
        tags: note.tags,
      }),
      dedupKey: nativeSyntax.toLowerCase().trim(),
    };
  }

  return { ok: false, reason: 'unrecognized_note_type', warning: 'Formato de cartão não reconhecido (não é um Básico/Básico invertido/Cloze/Digite a resposta reconhecível) -- Note pulada.' };
}

// ============================================================
// Deduplicação (Section 11) -- conservadora: detectar + informar + deixar o
// usuário decidir, nunca sobrescrever/pular silenciosamente.
// ============================================================

function normalizeForDedup(text){
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Compara contra os cartões JÁ existentes na conta (front/back_trans --
// coluna que TODO own_flashcards já tem, nativo ou legado, via o mirror
// write-only de nativeContentColumnsFromEditorState -- reaproveita dado que
// já existe, não cria nenhuma infra de dedup nova).
function existingOwnFlashcardsDedupSignatures(existingRows){
  return new Set(existingRows.map(r => normalizeForDedup(`${r.front || ''}\u0001${r.back_trans || ''}`)));
}

// ============================================================
// Resolução + upload de mídia (só chamada na hora de persistir de verdade,
// nunca durante o preview -- Section 26)
// ============================================================

// `uploadFn` é uploadOwnFlashcardMedia (injetado, nunca hardcoded, mesmo
// padrão de shared/flashcard-field-editor.js que já recebe uploadFn/ttsFn
// via `opts` em vez de chamar a função global direto -- facilita teste).
// `mediaCache` (Map filename->{ok,url,error}) evita subir o MESMO arquivo
// Anki mais de uma vez quando várias Notes referenciam o mesmo som/imagem
// (comum em decks compartilhados -- ex: o mesmo áudio de pronúncia usado
// em várias notas).
async function resolveAndAttachAnkiMedia(mediaRefs, { parseResult, uploadFn, mediaCache }){
  const warnings = [];
  const filenameToIndex = new Map(Object.entries(parseResult.mediaManifest).map(([idx, name]) => [name, idx]));

  async function resolveOne(filename, kind, fieldId){
    if (!filename) return null;
    if (mediaCache.has(filename)) return mediaCache.get(filename);
    const zipIndex = filenameToIndex.get(filename);
    if (zipIndex === undefined){
      const result = { ok: false, error: `Mídia "${filename}" referenciada mas não encontrada no pacote .apkg.` };
      mediaCache.set(filename, result);
      return result;
    }
    const entry = parseResult.zip.file(String(zipIndex));
    if (!entry){
      const result = { ok: false, error: `Mídia "${filename}" listada no manifesto mas ausente do pacote.` };
      mediaCache.set(filename, result);
      return result;
    }
    let blob;
    try {
      blob = await entry.async('blob');
    } catch (e) {
      const result = { ok: false, error: `Não foi possível ler o arquivo de mídia "${filename}" do pacote.` };
      mediaCache.set(filename, result);
      return result;
    }
    const file = (typeof File !== 'undefined') ? new File([blob], filename, { type: blob.type }) : blob;
    const uploadRes = await uploadFn(file, kind, fieldId);
    const result = uploadRes.ok ? { ok: true, url: uploadRes.url } : { ok: false, error: uploadRes.error || `Falha ao enviar "${filename}".` };
    mediaCache.set(filename, result);
    return result;
  }

  for (const ref of mediaRefs){
    if (ref.audioFilename){
      const res = await resolveOne(ref.audioFilename, 'audio', ref.field.id);
      if (res && res.ok) ref.field.audio = { type: 'upload', url: res.url };
      else if (res) warnings.push(res.error);
    }
    if (ref.imageFilename){
      const res = await resolveOne(ref.imageFilename, 'image', ref.field.id);
      if (res && res.ok) ref.field.image = { url: res.url };
      else if (res) warnings.push(res.error);
    }
  }
  return { warnings };
}

// ============================================================
// Orquestração de alto nível: parse -> classifica -> mapeia -> resume
// (preview, NUNCA persiste nada -- Section 26)
// ============================================================

// Devolve um plano de importação: 1 entrada por Anki Note, cada uma já
// classificada/mapeada (sem mídia resolvida, sem nada persistido). É isto
// que a UI usa pra montar a tela de resumo (Section 25/26) -- nunca chama
// Supabase.
// ============================================================
// Gap 1 (Fase 7j, fechamento -- ver CLAUDE.md, "Deck hierarchy") --
// estrutura de Deck do Anki, capturada como DADO puro, NUNCA persistida.
//
// Auditoria feita antes de escrever isto (obrigatória, ver relatório):
// grep no repositório inteiro por "deck"/"collection"/"category" (fora
// de comentários/nomes de coluna não relacionados de notification_rules)
// -- NENHUM motor de Deck existe hoje neste app (confirmado, não
// presumido). A arquitetura consolidada (seção 22, ver CLAUDE.md) exige
// 3 modos de destino (preservar hierarquia sob um Deck escolhido /
// importar tudo pra um Deck existente / escolher raiz pessoal e
// preservar hierarquia relativa) -- os 3 exigem um Deck Engine de
// verdade (Fase C daquela arquitetura, ainda NÃO implementada) pra
// sequer existir "Deck pessoal existente" pra escolher. Em vez de
// inventar uma estrutura paralela (uma coluna de Deck solta na Note, ou
// uma tabela de Deck própria só pro importador Anki -- proibido
// explicitamente: "Não crie um campo textual 'anki_deck' na Note como
// substituto"), este importador só PREPARA a hierarquia como dado
// estruturado (deckPath por Note + deckTree agregado) e NUNCA persiste
// nada com ela -- todo cartão confirmado ainda entra plano em
// own_flashcards, exatamente como antes desta entrega. ATUALIZAÇÃO: o
// Deck Engine já existe -- planAnkiDeckDestinations/executeAnkiDeckCreations
// (fim deste arquivo) mapeiam deckPath pra Decks reais dentro de "Meus
// Decks" (seção 5.3/22 da arquitetura consolidada), só depois da confirmação.
//
// deckPath -- Anki usa "::" como separador de hierarquia dentro do
// PRÓPRIO nome do deck (ex: "Vocabulário::Animais") -- split() é o
// inverso exato disso, preserva a ordem/profundidade original sem
// nenhuma perda.
function ankiDeckPathFromName(deckName){
  return deckName ? deckName.split('::').filter(Boolean) : [];
}

// Árvore agregada de TODOS os deckPaths do plano -- cada nó soma as
// Notes de si mesmo E de todos os descendentes (`count`), mesmo
// princípio de agregação já travado na arquitetura consolidada (seção
// 3.3: "Deck pai soma os Cards de todos os descendentes") -- construído
// aqui já nesse formato pra ser diretamente reaproveitável pelo Deck
// Engine futuro, não só uma lista solta.
function buildAnkiDeckTree(notes){
  const root = { name: null, path: [], count: 0, children: [] };
  notes.forEach(n => {
    const path = n.deckPath || [];
    root.count += 1;
    let node = root;
    let acc = [];
    path.forEach(segment => {
      acc = acc.concat([segment]);
      let child = node.children.find(c => c.name === segment);
      if (!child){
        child = { name: segment, path: acc.slice(), count: 0, children: [] };
        node.children.push(child);
      }
      child.count += 1;
      node = child;
    });
  });
  const sortChildren = (node) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  };
  sortChildren(root);
  return root;
}

function buildAnkiImportPlan(parseResult, { languageAppKey, existingRows }){
  const modelCache = new Map();
  const dedupSignatures = existingOwnFlashcardsDedupSignatures(existingRows || []);
  const seenBatchSignatures = new Set();

  const notes = parseResult.notes.map(note => {
    const normalizedTags = (typeof normalizeNoteTags === 'function') ? normalizeNoteTags(note.tags) : (note.tags || []);
    const model = parseResult.models[note.mid];
    const deckIds = (parseResult.cardsByNoteId.get(note.id) || []).map(c => c.deckId);
    const deckNames = deckIds.map(id => (parseResult.decks[id] && parseResult.decks[id].name) || null).filter(Boolean);
    const deckName = deckNames[0] || null;
    const deckPath = ankiDeckPathFromName(deckName);
    if (!model){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: 'missing_model', warning: 'Modelo de cartão referenciado por esta Note não existe na coleção -- Note pulada.', deckName, deckPath, tags: note.tags, normalizedTags };
    }
    if (!modelCache.has(note.mid)) modelCache.set(note.mid, classifyAnkiNoteType(model));
    const classification = modelCache.get(note.mid);

    if (classification.kind === 'unrecognized'){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: classification.reason || 'unrecognized_note_type', warning: 'Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro) -- Note pulada.', deckName, deckPath, tags: note.tags, normalizedTags };
    }

    const mapped = mapAnkiNoteToNativeEditorState(note, model, classification, languageAppKey);
    if (!mapped.ok){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: mapped.reason, warning: mapped.warning, deckName, deckPath, tags: note.tags, normalizedTags };
    }

    // Fase I (Tags): limites (20 por Note / 50 caracteres por tag). Numa
    // importação em lote, recusar a Note inteira por causa de tags seria
    // pior; então mantém as tags válidas e AVISA (nunca silencioso) o que
    // ficou de fora e por quê -- o aviso aparece no resumo antes de confirmar.
    const tagLimitWarnings = [];
    if (typeof partitionNoteTagsByLimits === 'function'){
      const part = partitionNoteTagsByLimits(mapped.editorState.tags);
      if (part.dropped.length){
        mapped.editorState.tags = part.tags;
        const sysTags = part.dropped.filter(d => d.reason === 'system_tag').map(d => d.tag);
        if (sysTags.length) tagLimitWarnings.push(`${sysTags.length} tag(s) de sistema (${sysTags.join(', ')}) não podem ser importadas: a atribuição de autoria só é criada pelo próprio app.`);
        const tooLong = part.dropped.filter(d => d.reason === 'too_long').map(d => d.tag);
        const overLimit = part.dropped.filter(d => d.reason === 'over_limit').map(d => d.tag);
        if (tooLong.length) tagLimitWarnings.push(`${tooLong.length} tag(s) acima de ${TAG_MAX_LENGTH} caracteres não foram importadas: ${tooLong.map(t => t.slice(0, 20) + '…').join(', ')}.`);
        if (overLimit.length) tagLimitWarnings.push(`Limite de ${TAG_MAX_PER_NOTE} tags por cartão: ${overLimit.length} tag(s) não foram importadas: ${overLimit.join(', ')}.`);
      }
    }

    const validation = validateNoteEditorStateForSave(mapped.editorState);
    if (!validation.ok){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: 'validation_failed', warning: `Cartão inválido depois de mapeado: ${validation.error}`, deckName, deckPath, tags: note.tags, normalizedTags };
    }

    const isDuplicateOfExisting = dedupSignatures.has(mapped.dedupKey);
    const isDuplicateWithinBatch = seenBatchSignatures.has(mapped.dedupKey);
    seenBatchSignatures.add(mapped.dedupKey);

    return {
      ankiNoteId: note.id,
      ankiGuid: note.guid,
      ok: true,
      cardTypeLabel: classification.kind === 'basic_reversed' ? 'normal_reversed'
        : classification.kind === 'zh_pinyin_normal' ? 'normal'
        : classification.kind,
      editorState: mapped.editorState,
      mediaRefs: mapped.mediaRefs,
      warnings: mapped.warnings.concat(tagLimitWarnings).concat(classification.extraTemplatesDropped ? [`${classification.extraTemplatesDropped} template(s) extra deste tipo de cartão não foram preservados (só o 1º foi importado).`] : []),
      hasMedia: mapped.mediaRefs.some(r => r.audioFilename || r.imageFilename),
      isDuplicate: isDuplicateOfExisting || isDuplicateWithinBatch,
      deckName,
      deckPath,
      tags: note.tags,
      normalizedTags: mapped.editorState.tags, // já normalizadas por createNativeNoteEditorState() -- nunca recalculado 2x
    };
  });

  const okCount = notes.filter(n => n.ok).length;
  const skippedCount = notes.length - okCount;
  const duplicateCount = notes.filter(n => n.ok && n.isDuplicate).length;
  const mediaCount = notes.filter(n => n.ok && n.hasMedia).length;
  const allTags = new Set();
  notes.forEach(n => (n.normalizedTags || []).forEach(t => allTags.add(t)));

  return {
    notes,
    totalNotes: notes.length,
    okCount,
    skippedCount,
    duplicateCount,
    mediaCount,
    tagsPresent: allTags.size > 0,
    uniqueTags: Array.from(allTags).sort(),
    deckTree: buildAnkiDeckTree(notes),
    schemaGeneration: parseResult.schemaGeneration,
  };
}

// ============================================================
// Persistência em lote -- Section 24 (import atômico), Section 23 (limite)
// ============================================================

// Tamanho de lote conservador -- payload de N Notes com fields/mídia num
// único INSERT multi-row; cada lote é 1 chamada supabase-js só (1 statement
// SQL, atômico de verdade por lote -- melhor que o padrão de N chamadas
// sequenciais já usado pelo import JSON/perfil público, Section 24: "não
// deixar metade de um .apkg importado se ocorrer falha fatal no meio" --
// aqui, uma falha de rede a meio de um LOTE não deixa metade daquele lote
// gravada, só os lotes ANTERIORES já confirmados).
const ANKI_IMPORT_BATCH_SIZE = 40;

// Persiste as Notes SELECIONADAS (já mapeadas+validadas pelo plano acima),
// com mídia resolvida a esta altura (chamador já rodou
// resolveAndAttachAnkiMedia pra cada uma). Devolve progresso por lote --
// quem chama decide re-tentar só os lotes que faltam (nunca reimporta um
// lote já confirmado, evita duplicar em retry -- Section 24).
async function persistAnkiImportBatches(planEntries, { identity, onBatchDone }){
  // `entry.deckId` (opcional) sobrepõe identity.deck_id por Note -- usado
  // quando o import recria as pastas do Anki (cada Note no seu Deck).
  const rows = planEntries.map(entry => Object.assign({}, identity,
    entry.deckId != null ? { deck_id: entry.deckId } : null,
    nativeContentColumnsFromEditorState(entry.editorState)));
  const batches = [];
  for (let i = 0; i < rows.length; i += ANKI_IMPORT_BATCH_SIZE) batches.push(rows.slice(i, i + ANKI_IMPORT_BATCH_SIZE));

  const createdRows = [];
  for (let b = 0; b < batches.length; b++){
    const batch = batches[b];
    const { data, error } = await supabaseClient.from('own_flashcards').insert(batch).select();
    if (error){
      if (onBatchDone) onBatchDone({ batchIndex: b, ok: false, error, count: batch.length });
      return { ok: false, createdRows, failedAtBatch: b, error };
    }
    (data || []).forEach(r => createdRows.push(r));
    if (onBatchDone) onBatchDone({ batchIndex: b, ok: true, count: batch.length });
  }
  return { ok: true, createdRows };
}

// Fase F -- o limite do plano grátis NÃO é mais calculado aqui: importar é
// só mais uma forma de criar cartões próprios, então usa a MESMA regra
// canônica por CardInstance (preflightOwnCardInstanceCreation,
// shared/deck-engine.js) que a criação manual e os outros imports.

// ============================================================
// Destino em Deck (docs/arquitetura-total-decks-tags-painel.md, seções
// 5.3, 22 e 23) -- importar pra um Deck escolhido dentro de Meus Decks,
// opcionalmente recriando as pastas do Anki abaixo dele.
// ============================================================
//
// Funções PURAS (sem rede): o planejamento decide o que existe, o que será
// criado e onde cada Note cai; a execução (executeAnkiDeckCreations)
// recebe a função de criação injetada (createPersonalDeck, shared/deck-data.js)
// e só roda DEPOIS da confirmação. Nunca existe um Deck global "Importado".
//
// Conflito de nome (mesmo nome no mesmo nível, sem diferenciar maiúsculas):
// UMA escolha aplicada a todos os conflitos do import -- 'suffix' cria
// "Nome (2)" (ou (3)... até achar livre) e 'merge' insere no Deck que já
// existe (os subdecks do .apkg passam a ser procurados dentro dele também).
// Escolha única em vez de uma por conflito: um .apkg costuma ter muitas
// pastas, e perguntar uma a uma seria cansativo; a lista de conflitos é
// mostrada na tela pra pessoa decidir sabendo quais são.

function ankiDeckNameKey(name){
  return String(name || '').trim().toLocaleLowerCase();
}

function ankiDeckPathKey(path){
  return (path || []).join('::');
}

// Nome livre entre os irmãos: "Nome", senão "Nome (2)", "Nome (3)"...
function ankiFreeDeckName(name, takenKeys){
  if (!takenKeys.has(ankiDeckNameKey(name))) return name;
  for (let i = 2; i < 1000; i++){
    const candidate = `${name} (${i})`;
    if (!takenKeys.has(ankiDeckNameKey(candidate))) return candidate;
  }
  return `${name} (${Date.now()})`;
}

// Planeja o destino. `decks`: lista de Decks do idioma (linhas cruas);
// `destDeckId`: Deck pessoal escolhido (personal_root ou personal);
// `notes`: Notes (do plano) que serão de fato criadas -- só as pastas que
// têm Notes viram Deck; `keepFolders`: recriar a hierarquia do .apkg;
// `conflictMode`: 'suffix' | 'merge' (sem escolha = trata como 'merge' só
// pra DETECTAR conflitos em todos os níveis).
// Retorno: { conflicts, creations, targetByKey } onde targetByKey mapeia
// a chave do caminho ('' = destino) para { deckId } (já existe) ou
// { createKey } (será criado), e creations vem com o pai antes do filho.
function planAnkiDeckDestinations({ decks, destDeckId, notes, keepFolders, conflictMode }){
  const targetByKey = new Map([['', { deckId: destDeckId }]]);
  const conflicts = [];
  const creations = [];
  if (!keepFolders) return { conflicts, creations, targetByKey };
  const mode = conflictMode === 'suffix' ? 'suffix' : 'merge';
  const tree = buildAnkiDeckTree(notes || []);
  const existingChildren = (parentId) => (decks || []).filter(d => d.parent_deck_id === parentId && d.kind === 'personal');
  const walk = (node, parentKey) => {
    const parentTarget = targetByKey.get(parentKey);
    const siblingsExisting = parentTarget.deckId != null ? existingChildren(parentTarget.deckId) : [];
    const taken = new Set(siblingsExisting.map(d => ankiDeckNameKey(d.name)));
    node.children.forEach(child => {
      const key = ankiDeckPathKey(child.path);
      const existing = siblingsExisting.find(d => ankiDeckNameKey(d.name) === ankiDeckNameKey(child.name));
      if (existing){
        conflicts.push({ key, path: child.path.slice(), name: child.name, existingDeckId: existing.id });
        if (mode === 'merge'){
          targetByKey.set(key, { deckId: existing.id });
          walk(child, key);
          return;
        }
      }
      const name = ankiFreeDeckName(child.name.trim() || 'Sem nome', taken);
      taken.add(ankiDeckNameKey(name));
      creations.push({ key, name, originalName: child.name, parentKey });
      targetByKey.set(key, { createKey: key });
      walk(child, key);
    });
  };
  walk(tree, '');
  return { conflicts, creations, targetByKey };
}

// Chave do Deck de uma Note: a pasta mais funda que existe no plano.
function ankiNoteDeckKey(note, destPlan){
  const path = note.deckPath || [];
  for (let i = path.length; i > 0; i--){
    const key = ankiDeckPathKey(path.slice(0, i));
    if (destPlan.targetByKey.has(key)) return key;
  }
  return '';
}

// Cria os Decks planejados (pai antes do filho) e devolve o id de cada
// chave. Falha num Deck marca ele E todos os descendentes como falhos --
// as Notes desse ramo não são importadas (o chamador avisa). `createFn`
// recebe { name, parentDeckId, languageAppKey, decks } (mesma assinatura
// de createPersonalDeck) e devolve { ok, deck } | { ok:false, error }.
async function executeAnkiDeckCreations(destPlan, { createFn, decks, languageAppKey }){
  const idByKey = new Map();
  const failedKeys = new Set();
  const errors = [];
  const createdDecks = [];
  const list = (decks || []).slice();
  destPlan.targetByKey.forEach((t, key) => { if (t.deckId != null) idByKey.set(key, t.deckId); });
  for (const c of destPlan.creations){
    if (failedKeys.has(c.parentKey)){ failedKeys.add(c.key); continue; }
    const parentDeckId = idByKey.get(c.parentKey);
    let res;
    try {
      res = await createFn({ name: c.name, parentDeckId, languageAppKey, decks: list });
    } catch (e){
      res = { ok: false, error: 'Não foi possível criar o Deck agora.' };
    }
    if (res && res.ok && res.deck){
      idByKey.set(c.key, res.deck.id);
      list.push(res.deck);
      createdDecks.push(res.deck);
    } else {
      failedKeys.add(c.key);
      errors.push(`Não foi possível criar o Deck "${c.name}"${res && res.error ? ` (${res.error})` : ''}. Os cartões dessa pasta não foram importados.`);
    }
  }
  return { idByKey, failedKeys, errors, createdDecks, decks: list };
}
