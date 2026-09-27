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

// Classifica um MODEL inteiro (todos os templates juntos) -- combina os
// resultados de classifyAnkiTemplate() dos seus tmpls (ordenados por `ord`,
// a mesma ordem que o Anki usa pra gerar Card 1/Card 2/...) numa decisão
// única de Card Type native, seguindo a Seção 17 ("não simplesmente assumir
// que 'dois templates' significa reversed -- analisar as referências aos
// Fields"). Resultado cacheável por model.id (mesmo model = mesma
// classificação pra toda Note que o usa) -- quem chama decide o cache.
function classifyAnkiNoteType(model){
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
      }),
      dedupKey: `${frontRaw.text}\u0001${backRaw.text}`.toLowerCase().trim(),
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
function buildAnkiImportPlan(parseResult, { languageAppKey, existingRows }){
  const modelCache = new Map();
  const dedupSignatures = existingOwnFlashcardsDedupSignatures(existingRows || []);
  const seenBatchSignatures = new Set();

  const notes = parseResult.notes.map(note => {
    const model = parseResult.models[note.mid];
    if (!model){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: 'missing_model', warning: 'Modelo de cartão referenciado por esta Note não existe na coleção -- Note pulada.', deckName: null, tags: note.tags };
    }
    if (!modelCache.has(note.mid)) modelCache.set(note.mid, classifyAnkiNoteType(model));
    const classification = modelCache.get(note.mid);
    const deckIds = (parseResult.cardsByNoteId.get(note.id) || []).map(c => c.deckId);
    const deckNames = deckIds.map(id => (parseResult.decks[id] && parseResult.decks[id].name) || null).filter(Boolean);
    const deckName = deckNames[0] || null;

    if (classification.kind === 'unrecognized'){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: classification.reason || 'unrecognized_note_type', warning: 'Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro) -- Note pulada.', deckName, tags: note.tags };
    }

    const mapped = mapAnkiNoteToNativeEditorState(note, model, classification, languageAppKey);
    if (!mapped.ok){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: mapped.reason, warning: mapped.warning, deckName, tags: note.tags };
    }

    const validation = validateNoteEditorStateForSave(mapped.editorState);
    if (!validation.ok){
      return { ankiNoteId: note.id, ankiGuid: note.guid, ok: false, reason: 'validation_failed', warning: `Cartão inválido depois de mapeado: ${validation.error}`, deckName, tags: note.tags };
    }

    const isDuplicateOfExisting = dedupSignatures.has(mapped.dedupKey);
    const isDuplicateWithinBatch = seenBatchSignatures.has(mapped.dedupKey);
    seenBatchSignatures.add(mapped.dedupKey);

    return {
      ankiNoteId: note.id,
      ankiGuid: note.guid,
      ok: true,
      cardTypeLabel: classification.kind === 'basic_reversed' ? 'normal_reversed' : classification.kind,
      editorState: mapped.editorState,
      mediaRefs: mapped.mediaRefs,
      warnings: mapped.warnings.concat(classification.extraTemplatesDropped ? [`${classification.extraTemplatesDropped} template(s) extra deste tipo de cartão não foram preservados (só o 1º foi importado).`] : []),
      hasMedia: mapped.mediaRefs.some(r => r.audioFilename || r.imageFilename),
      isDuplicate: isDuplicateOfExisting || isDuplicateWithinBatch,
      deckName,
      tags: note.tags,
    };
  });

  const okCount = notes.filter(n => n.ok).length;
  const skippedCount = notes.length - okCount;
  const duplicateCount = notes.filter(n => n.ok && n.isDuplicate).length;
  const mediaCount = notes.filter(n => n.ok && n.hasMedia).length;
  const tagsPresent = parseResult.notes.some(n => n.tags && n.tags.length);

  return {
    notes,
    totalNotes: notes.length,
    okCount,
    skippedCount,
    duplicateCount,
    mediaCount,
    tagsPresent,
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
  const rows = planEntries.map(entry => Object.assign({}, identity, nativeContentColumnsFromEditorState(entry.editorState)));
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

// Calcula quantos slots restam no plano gratuito (Section 23) -- MESMA
// fórmula já usada por shared/public-profile.js (importSelectedPublicFlashcards)
// e pela tela "Meus Cartões" -- nunca uma exceção especial pra import Anki.
function computeAnkiImportRemainingSlots(activeOwnCardCount, hasTeacherLink){
  if (hasTeacherLink) return Infinity;
  return Math.max(0, FREE_OWN_FLASHCARD_LIMIT - activeOwnCardCount);
}
