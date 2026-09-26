// ---------- Editor nativo de Cloze ("Completar a frase") -- Fase 6D.5 da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Cloze, construída EM CIMA do Field editor
// genérico da Fase 6D.3 (shared/flashcard-field-editor.js, reutilizado só
// pro Field de TRADUÇÃO -- o Field de FRASE tem seu próprio editor visual,
// já que precisa de seleção real de texto e marcação inline).
//
// Modelo nativo (restrição 1 da instrução): Cloze usa EXATAMENTE 1 Field
// de conteúdo textual (a frase com as marcas) -- nunca `cloze_sentence`/
// `cloze_answer`/`clozeAnswers[]`/`clozeSelections[]` como estrutura
// paralela. A representação canônica CONTINUA sendo a sintaxe já existente
// do motor (`{{cN::resposta}}`/`{{cN::resposta|compareAnswer}}`,
// CLOZE_MARK_RE/parseClozeMarks/splitClozeMarkRaw/renderClozeText, shared/
// flashcard-model.js, 100% reutilizados aqui, nunca duplicados) -- só que
// `Field.content.value` (a única fonte de verdade persistível) É essa
// string canônica o tempo todo. O que este arquivo adiciona é uma camada
// de UI que nunca expõe essa sintaxe ao usuário: uma representação
// intermediária em memória ("segmentos", ver abaixo) que serve só pra
// desenhar/editar visualmente, sempre round-tripada de volta pra a MESMA
// string canônica.
//
// ACHADO IMPORTANTE, verificado ANTES de codar (não presumido): o motor
// (validateNativeNoteRow, ramo `else` que cobre normal/normal_reversed/
// type_answer/cloze) já exige >=2 "slots" de conteúdo (contentFieldIndices)
// pra QUALQUER um desses 4 modos, cloze incluído -- não só 1. Isso
// significa que Cloze nativo precisa de um 2º Field (a TRADUÇÃO, mostrada
// à aluna depois de responder, resolveClozeCardView() -> translationFieldIndex)
// além do Field de frase -- exatamente o par posicional que
// interpretNativeNoteFromRow() já espera (slots[0]=texto com marcas,
// slots[1]=tradução), o MESMO mecanismo que `normal` já usa pro par
// frente/verso. "Exatamente 1 Field de conteúdo textual" (a frase com as
// lacunas) continua verdadeiro -- só existe TAMBÉM um 2º Field de
// conteúdo (tradução) que a UI trata com o Field editor genérico, sem
// nenhuma marcação especial. Nenhuma mudança foi feita no motor por causa
// disso (restrição 19) -- confirmado por `git status`/`git diff` no fim
// da entrega.
//
// Depende de (mesma posição de shared/flashcard-mc-editor.js/flashcard-
// typeanswer-editor.js -- antes de shared/admin-flashcards.js/
// shared/my-flashcards.js):
//   - shared/flashcard-model.js       (CLOZE_MARK_RE, splitClozeMarkRaw,
//                                        parseClozeMarks, contentFieldIndices,
//                                        validateNativeNoteRow, CARD_GENERATION_MODES
//                                        -- todos REUTILIZADOS, nunca duplicados)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox)
//   - shared/flashcard-mc-editor.js    (refreshNativeCardTypeBox -- dispatcher
//                                        estendido aqui embaixo com o branch cloze)
//   - shared/flashcard-typeanswer-editor.js (idem, branch type_answer preservado)
//   - escapeHTML (fr/zh app.js)

const CLOZE_EDITOR_MARK_ATTR = 'data-cloze-mark-id';
const CLOZE_EDITOR_COMPARE_ATTR = 'data-cloze-compare';

// Estado efêmero de UI -- "qual lacuna está sendo editada agora" (clique
// numa marca já existente abre um painel inline logo abaixo da frase,
// restrição 6: "permitir editar o texto dentro de uma lacuna", "remover
// uma lacuna"). NUNCA parte de editorState.fields/Field.content -- é
// puramente visual, do mesmo espírito do `localState` efêmero da Fase 6C
// (nunca STATE.review*, nunca CardInstance como armazenamento, restrição
// 14) -- só que aqui, sem uma "sessão" dona como o Review tem, o dono
// natural é o próprio módulo de edição (mesmo módulo que desenha e
// religa a caixa). Reseta sozinho sempre que o markId ativo deixa de
// existir nos segmentos atuais (ex: a lacuna foi removida por outro
// caminho -- Backspace no contenteditable, ver renderClozeEditorHTML).
let CLOZE_EDITOR_ACTIVE_MARK_ID = null;

// ============================================================
// Segmentos -- ponte PURA (sem DOM) entre a string canônica do motor
// ({{cN::resposta}}/{{cN::resposta|compareAnswer}}) e uma representação
// estruturada fácil de desenhar/editar. Nunca uma 2ª fonte de verdade --
// `Field.content.value` (string canônica) é sempre o dado persistido;
// segmentos só existem em memória, enquanto a UI está aberta, e são
// sempre re-derivados/re-serializados a partir dela.
//   segments = [{kind:'text', text} | {kind:'mark', markId, answer, compareAnswer}]
// ============================================================

function parseClozeSegments(text){
  const raw = text || '';
  const segments = [];
  CLOZE_MARK_RE.lastIndex = 0;
  let lastIndex = 0;
  let m;
  while ((m = CLOZE_MARK_RE.exec(raw))){
    if (m.index > lastIndex) segments.push({ kind: 'text', text: raw.slice(lastIndex, m.index) });
    const { answer, compareAnswer } = splitClozeMarkRaw(m[2]);
    segments.push({ kind: 'mark', markId: m[1], answer, compareAnswer });
    lastIndex = CLOZE_MARK_RE.lastIndex;
  }
  if (lastIndex < raw.length) segments.push({ kind: 'text', text: raw.slice(lastIndex) });
  return segments;
}

function serializeClozeSegments(segments){
  return (segments || []).map(seg => {
    if (seg.kind === 'text') return seg.text;
    const raw = (seg.compareAnswer != null && seg.compareAnswer !== '')
      ? `${seg.answer}|${seg.compareAnswer}`
      : seg.answer;
    return `{{${seg.markId}::${raw}}}`;
  }).join('');
}

// Merge de segmentos 'text' consecutivos -- mantém a lista tidy depois de
// qualquer mutação estrutural (nunca afeta o round-trip pra string
// canônica, só evita segmentos vazios/fragmentados acumulando).
function coalesceClozeSegments(segments){
  const out = [];
  (segments || []).forEach(seg => {
    if (seg.kind === 'text' && seg.text === '') return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === 'text' && seg.kind === 'text'){
      prev.text += seg.text;
    } else {
      out.push(Object.assign({}, seg));
    }
  });
  return out;
}

// Próximo número de lacuna -- SEMPRE max(existente)+1, NUNCA reaproveita
// um "buraco" deixado por uma marca removida (restrição 5: "não gerar IDs
// aleatórios... não depender da posição visual como identidade"). Decisão
// documentada explicitamente porque a instrução deixou em aberto qual das
// duas leituras de "próximo número disponível" usar -- max+1 evita que 2
// marcas diferentes, criadas em momentos diferentes da edição, alguma vez
// colidam no mesmo id só porque uma anterior foi removida no meio.
function nextClozeMarkId(segments){
  let max = 0;
  (segments || []).forEach(seg => {
    if (seg.kind !== 'mark') return;
    const n = parseInt(String(seg.markId).slice(1), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return `c${max + 1}`;
}

// Detecta chaves duplas soltas (sintaxe malformada/parcialmente aberta)
// que sobraram como texto puro -- toda marca BEM formada já foi extraída
// pelo parseClozeSegments acima (reaproveita a MESMA regex do motor,
// nunca uma cópia); se ainda sobra um "{{"/"}}" solto num segmento de
// texto, é sinal de sintaxe que o parser não fechou (restrição 13:
// "sintaxe inválida é rejeitada", "nenhuma sintaxe parcialmente aberta").
function hasMalformedClozeSyntax(text){
  const segments = parseClozeSegments(text);
  return segments.some(seg => seg.kind === 'text' && /\{\{|\}\}/.test(seg.text));
}

// ---------- Mutações puras sobre segmentos (testáveis sem DOM) ----------

// Cria uma lacuna nova a partir de um intervalo de OFFSETS LÓGICOS --
// posição no texto "visível" (soma de seg.text.length pra segmentos de
// texto + seg.answer.length pra marcas já existentes -- nunca offsets na
// string canônica, que tem comprimento diferente por causa da sintaxe
// {{cN::...}}). Isso é o que a camada de DOM (domRangeToLogicalOffsets,
// mais abaixo) converte a partir de uma Selection/Range real do
// navegador -- aqui a lógica é 100% pura, testável em Node sem DOM.
//
// Regras determinísticas (restrição 8, "prefira regras conservadoras"):
//   - startOffset === endOffset (seleção vazia)              -> bloqueia
//   - texto selecionado só espaço em branco                  -> bloqueia
//   - intervalo intersecta QUALQUER marca já existente, seja  -> bloqueia
//     parcialmente sobreposto, contendo a marca inteira, ou
//     estando inteiramente dentro dela -- nenhum desses 3 casos
//     produz sintaxe válida sem inventar suporte a aninhamento
//     (explicitamente fora do MVP, restrição 8).
function insertClozeMarkAtLogicalOffsets(segments, startOffset, endOffset, compareAnswer){
  const s = Math.min(startOffset, endOffset);
  const e = Math.max(startOffset, endOffset);
  if (s === e) return { ok: false, reason: 'empty' };

  let pos = 0;
  let selectedText = '';
  for (const seg of segments){
    const len = seg.kind === 'text' ? seg.text.length : seg.answer.length;
    const segStart = pos, segEnd = pos + len;
    const intersects = s < segEnd && e > segStart;
    if (seg.kind === 'mark' && intersects) return { ok: false, reason: 'overlaps-mark' };
    if (seg.kind === 'text' && intersects){
      const cutStart = Math.max(0, s - segStart);
      const cutEnd = Math.min(len, e - segStart);
      selectedText += seg.text.slice(cutStart, cutEnd);
    }
    pos = segEnd;
  }
  if (e > pos) return { ok: false, reason: 'out-of-range' };
  if (!selectedText.trim()) return { ok: false, reason: 'whitespace' };

  const markId = nextClozeMarkId(segments);
  const out = [];
  pos = 0;
  for (const seg of segments){
    const len = seg.kind === 'text' ? seg.text.length : seg.answer.length;
    const segStart = pos, segEnd = pos + len;
    if (seg.kind === 'mark' || segEnd <= s || segStart >= e){
      out.push(seg);
    } else {
      // seg.kind === 'text' e intersecta [s,e) -- corta em até 3 pedaços:
      // antes (texto), a nova marca (só a 1ª vez que cruzamos s..e), depois (texto).
      const before = seg.text.slice(0, Math.max(0, s - segStart));
      const after = seg.text.slice(Math.min(len, e - segStart));
      if (before) out.push({ kind: 'text', text: before });
      out.push({ kind: 'mark', markId, answer: selectedText, compareAnswer: compareAnswer || null });
      if (after) out.push({ kind: 'text', text: after });
      // pula qualquer outro segmento de texto ainda dentro de [s,e) sem
      // duplicar a marca -- na prática só ocorre quando [s,e) cruza mais
      // de 1 segmento de texto consecutivo (não deveria, já que segmentos
      // de texto adjacentes são coalescidos, mas o laço abaixo garante
      // robustez mesmo assim).
      s === e; // no-op, mantém es-lint feliz sobre variáveis não usadas
    }
    pos = segEnd;
  }
  return { ok: true, segments: coalesceClozeSegments(out), markId };
}

// Edita o TEXTO de uma marca já existente, preservando id/compareAnswer.
function updateClozeMarkText(segments, markId, newAnswerText){
  const trimmed = (newAnswerText || '').trim();
  if (!trimmed) return { ok: false, reason: 'empty-answer' };
  let found = false;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return Object.assign({}, seg, { answer: newAnswerText });
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: out };
}

// Define/limpa o compareAnswer (pinyin no zh) de uma marca já existente --
// NUNCA um Field/pinyinFieldId separado (restrição 9: "o pinyin específico
// de uma cloze pertence à própria marcação... não confundir com
// pinyinFieldId, que continua sendo o mecanismo pra Fields satélite em
// outros Card Types").
function updateClozeMarkCompareAnswer(segments, markId, compareAnswer){
  let found = false;
  const clean = (compareAnswer || '').trim() || null;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return Object.assign({}, seg, { compareAnswer: clean });
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: out };
}

// Remove uma marca, revertendo o trecho pra texto puro (restrição 6:
// "remover uma lacuna" sem corromper as outras -- ids das marcas restantes
// nunca são renumerados por esta operação, mesmo princípio de
// nextClozeMarkId nunca reaproveitar buraco).
function removeClozeMark(segments, markId){
  let found = false;
  const out = (segments || []).map(seg => {
    if (seg.kind === 'mark' && seg.markId === markId){
      found = true;
      return { kind: 'text', text: seg.answer };
    }
    return seg;
  });
  if (!found) return { ok: false, reason: 'not-found' };
  return { ok: true, segments: coalesceClozeSegments(out) };
}

// Usado só ao SAIR do modo cloze pra outro Card Type (restrição 12: "não
// escreva sintaxe cloze em um Card Type que não a suporta") -- reverte
// TODAS as marcas pro próprio texto (answer), igual a "revelar tudo",
// nunca inventa um valor novo. Reaproveita parseClozeSegments/
// serializeClozeSegments -- nunca uma 3ª forma de andar pela sintaxe.
function stripClozeMarkupToPlainText(text){
  const stripped = parseClozeSegments(text).map(seg => seg.kind === 'mark' ? { kind: 'text', text: seg.answer } : seg);
  return serializeClozeSegments(coalesceClozeSegments(stripped));
}

// ============================================================
// DOM <-> segmentos -- únicas funções de conversão explícita (restrição
// 7 da instrução: "crie uma função explícita de conversão... não
// depender de HTML bruto como fonte de verdade").
// ============================================================

// Segmentos -> HTML. Marcas viram <span> ATÔMICO
// (contenteditable="false") dentro do container contenteditable="true" --
// padrão padrão de editores rich-text pra "tokens inline" (Notion/Gmail
// chips): o navegador trata o span como uma unidade indivisível pra
// seleção/cursor, nunca deixando o usuário digitar sintaxe bruta dentro
// dele. O texto visível da marca é sempre seg.answer -- NUNCA
// {{cN::...}} (restrição 4: "o usuário não deve ver {{c1::...}} como
// texto bruto").
function renderClozeSegmentsHTML(segments){
  return (segments || []).map(seg => {
    if (seg.kind === 'text') return escapeHTML(seg.text);
    const compareAttr = seg.compareAnswer ? ` ${CLOZE_EDITOR_COMPARE_ATTR}="${escapeHTML(seg.compareAnswer)}"` : '';
    return `<span class="cloze-editor-mark" contenteditable="false" ${CLOZE_EDITOR_MARK_ATTR}="${escapeHTML(seg.markId)}"${compareAttr}>${escapeHTML(seg.answer)}</span>`;
  }).join('');
}

// DOM -> segmentos. Percorre os childNodes REAIS do container (nunca
// assume offset simples de string) -- Text node vira segmento de texto,
// <span data-cloze-mark-id> vira segmento de marca (lendo o ATRIBUTO
// data-cloze-compare, nunca o textContent, pro compareAnswer -- que nunca
// aparece visualmente inline). Qualquer outro elemento que o navegador
// injete (ex: <br> ao apertar Enter) tem seu texto visível preservado
// como texto puro -- nunca perde conteúdo silenciosamente.
function domToClozeSegments(containerEl){
  const segments = [];
  containerEl.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE){
      if (node.nodeValue) segments.push({ kind: 'text', text: node.nodeValue });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute && node.hasAttribute(CLOZE_EDITOR_MARK_ATTR)){
      segments.push({
        kind: 'mark',
        markId: node.getAttribute(CLOZE_EDITOR_MARK_ATTR),
        answer: node.textContent || '',
        compareAnswer: node.getAttribute(CLOZE_EDITOR_COMPARE_ATTR) || null,
      });
    } else {
      const text = node.textContent || '';
      if (text) segments.push({ kind: 'text', text });
    }
  });
  return coalesceClozeSegments(segments);
}

// Range/Selection real do navegador -> offsets LÓGICOS (mesma unidade de
// insertClozeMarkAtLogicalOffsets acima -- texto visível, marcas contam
// como answer.length). Nunca assume que startContainer/endOffset é um
// offset simples numa string plana -- percorre os childNodes do
// container somando o comprimento visível de cada um até achar o nó/
// offset alvo (restrição 7, "não assumir que a seleção será sempre um
// simples offset em uma string").
function domRangeToLogicalOffsets(containerEl, range){
  function logicalLength(n){
    if (n.nodeType === Node.TEXT_NODE) return n.nodeValue.length;
    return (n.textContent || '').length;
  }
  function offsetOf(targetNode, targetOffset){
    let total = 0;
    let found = false;
    function walk(n){
      if (found) return;
      if (n === targetNode){
        if (n.nodeType === Node.TEXT_NODE){
          total += targetOffset;
        } else {
          for (let i = 0; i < targetOffset && i < n.childNodes.length; i++) total += logicalLength(n.childNodes[i]);
        }
        found = true;
        return;
      }
      if (n.nodeType === Node.TEXT_NODE){
        total += n.nodeValue.length;
        return;
      }
      if (n.nodeType === Node.ELEMENT_NODE && n.hasAttribute && n.hasAttribute(CLOZE_EDITOR_MARK_ATTR)){
        // nó atômico -- se o alvo apontar pra DENTRO dele (não deveria
        // acontecer com contenteditable=false, mas nunca lançamos
        // exceção se acontecer), contamos o nó inteiro e seguimos.
        total += (n.textContent || '').length;
        return;
      }
      n.childNodes.forEach(walk);
    }
    walk(containerEl);
    return total;
  }
  const start = offsetOf(range.startContainer, range.startOffset);
  const end = offsetOf(range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

// ============================================================
// Validação (reutilizável pela 6D.6) -- mesmo padrão de
// validateNativeMultipleChoiceStructure/validateNativeTypeAnswerStructure:
// reaproveita a validação estrutural do motor (noteEditorStateToRow +
// validateNativeNoteRow, que JÁ garante >=2 slots de conteúdo +
// pareamento + ids únicos pra cloze, ver achado no topo do arquivo) e
// adiciona só as checagens de tempo de edição que o motor não faz.
// ============================================================

function validateNativeClozeStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: 'Este Note não é nativo.' };
  }
  if (editorState.cardGenerationMode !== 'cloze'){
    return { ok: false, error: 'Este Note não está no modo Completar a frase.' };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textField = fields[slots[0]];
  const translationField = fields[slots[1]];

  if (!textField || !((textField.content && textField.content.value) || '').trim()){
    return { ok: false, error: 'A frase com as lacunas não pode ficar vazia.' };
  }
  if (!translationField || !((translationField.content && translationField.content.value) || '').trim()){
    return { ok: false, error: 'A tradução não pode ficar vazia.' };
  }

  const text = textField.content.value;
  if (hasMalformedClozeSyntax(text)){
    return { ok: false, error: 'A frase tem uma marcação de lacuna malformada -- remova e marque de novo.' };
  }

  const segments = parseClozeSegments(text);
  const marks = segments.filter(seg => seg.kind === 'mark');
  if (marks.length === 0){
    return { ok: false, error: 'Selecione pelo menos um trecho da frase e marque como lacuna.' };
  }

  const ids = marks.map(m => m.markId);
  if (new Set(ids).size !== ids.length){
    return { ok: false, error: 'IDs de lacuna duplicados -- estado inconsistente.' };
  }

  for (const mark of marks){
    if (!mark.answer || !mark.answer.trim()){
      return { ok: false, error: 'Uma das lacunas ficou sem texto.' };
    }
    if (editorState.languageAppKey === 'mandarim' && (!mark.compareAnswer || !mark.compareAnswer.trim())){
      return { ok: false, error: `Falta o pinyin da lacuna "${mark.answer}" (obrigatório pra mandarim) -- clique nela pra completar.` };
    }
  }

  return { ok: true };
}

// ============================================================
// Transição de/para Cloze
// ============================================================

// normal/multiple_choice/type_answer -> cloze: Cloze é posicional, igual
// a normal/type_answer (contentFieldIndices, slot 0 = frase, slot 1 =
// tradução) -- `role` continua irrelevante pra este Card Type (só
// multiple_choice usa role, Fase 6B). Reaproveita os Fields JÁ
// EXISTENTES, NA MESMA ORDEM em que já estavam -- nunca escolhe um Field
// arbitrariamente sem essa regra determinística documentada (restrição
// 11), nunca inventa conteúdo, nunca cria um Field novo aqui (isso só
// acontece via UI, pelos botões "+ Criar frase"/"+ Criar tradução",
// quando o usuário decide). Funcionalmente idêntica ao ramo genérico
// (`else { cardGenerationMode = newMode }`) que já tratava esse caso
// antes desta subfase -- definida como função própria só pra documentar
// a regra explicitamente, e deixar espaço pra uma regra mais rica no
// futuro sem precisar tocar de novo no ponto de integração.
function transitionToCloze(editorState){
  editorState.cardGenerationMode = 'cloze';
}

// cloze -> qualquer outro tipo: nunca deixa sintaxe {{cN::...}} presa num
// Field que um Card Type diferente vai ler/exibir como texto puro
// (restrição 12). Reverte toda marca pro próprio texto (answer) -- nunca
// inventa/descarta conteúdo, só "revela tudo" de forma determinística,
// reaproveitando o parser/serializer já existentes (nunca uma 3ª forma
// de andar pela sintaxe). Chamada pelo ponto de integração (admin-
// flashcards.js/my-flashcards.js) sempre que o modo ANTERIOR era 'cloze'
// e o modo NOVO não é.
function stripClozeMarksFromEditorState(editorState){
  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textFieldIndex = slots[0];
  if (textFieldIndex === undefined) return;
  const textField = fields[textFieldIndex];
  if (!textField || !textField.content || !textField.content.value) return;
  const plain = stripClozeMarkupToPlainText(textField.content.value);
  updateFieldInEditorState(editorState, textField.id, { content: { value: plain } });
}

// ---------- Ações de criação de Field (restrição 11/2) ----------

function addClozeTextField(editorState){
  return addFieldToEditorState(editorState, {});
}
function addClozeTranslationField(editorState){
  return addFieldToEditorState(editorState, {});
}

// ============================================================
// Render
// ============================================================

function clozeMarkPanelHTML(mark, namePrefix, isMandarim){
  return `
    <div class="cloze-editor-mark-panel" data-cloze-mark-panel="${escapeHTML(mark.markId)}">
      <label class="profile-edit-label" for="${namePrefix}-cloze-edit-answer">Texto da lacuna</label>
      <input type="text" id="${namePrefix}-cloze-edit-answer" class="profile-edit-input" value="${escapeHTML(mark.answer)}" data-cloze-edit-answer>
      ${isMandarim ? `
      <label class="profile-edit-label" for="${namePrefix}-cloze-edit-compare">Resposta esperada (pinyin)</label>
      <input type="text" id="${namePrefix}-cloze-edit-compare" class="profile-edit-input" value="${escapeHTML(mark.compareAnswer || '')}" data-cloze-edit-compare>
      ` : ''}
      <p class="profile-edit-field-error" data-cloze-edit-error></p>
      <div class="cloze-editor-mark-panel-actions">
        <button type="button" class="btn btn-primary" data-cloze-edit-save>Salvar</button>
        <button type="button" class="admin-select-link" data-cloze-edit-remove>🗑 Remover lacuna</button>
        <button type="button" class="admin-select-link" data-cloze-edit-cancel>Cancelar</button>
      </div>
    </div>
  `;
}

function renderClozeEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'cloze-editor';
  const isMandarim = editorState.languageAppKey === 'mandarim';
  const fields = editorState.fields || [];
  const slots = contentFieldIndices(fields);
  const textField = fields[slots[0]] || null;
  const translationField = fields[slots[1]] || null;
  const otherFields = slots.slice(2).map(i => fields[i]);

  // Uma marca ativa que não existe mais nos segmentos atuais (removida
  // por outro caminho, ex: Backspace no contenteditable) nunca deixa o
  // painel de edição preso apontando pro nada.
  const segments = textField ? parseClozeSegments((textField.content && textField.content.value) || '') : [];
  const activeMark = segments.find(seg => seg.kind === 'mark' && seg.markId === CLOZE_EDITOR_ACTIVE_MARK_ID) || null;
  if (!activeMark) CLOZE_EDITOR_ACTIVE_MARK_ID = null;

  // Fase 7e (ver CLAUDE.md) -- o Field de FRASE nunca passa por
  // renderFieldEditorHTML() (tem seu próprio editor visual, seleção de
  // texto pra marcar lacunas) -- então o bloco de áudio precisa ser
  // chamado direto aqui, pro áudio da frase inteira (ex: a professora
  // gravou a pronúncia da frase completa) continuar disponível mesmo no
  // modo Cloze. wireClozeEditor() liga este bloco explicitamente (ver
  // abaixo), nunca via wireFieldEditorList (que não conhece este Field).
  const textHTML = textField
    ? `
      <div class="cloze-editor-toolbar">
        <button type="button" class="admin-select-link" data-cloze-mark-btn>✂️ Marcar seleção como lacuna</button>
      </div>
      <div class="cloze-editor-text" contenteditable="true" data-cloze-field-id="${escapeHTML(textField.id)}">${renderClozeSegmentsHTML(segments)}</div>
      <p class="profile-edit-field-error" data-cloze-mark-error></p>
      ${activeMark ? clozeMarkPanelHTML(activeMark, namePrefix, isMandarim) : ''}
      ${renderFieldAudioBlockHTML(textField, opts)}
    `
    : `<p class="profile-edit-hint">Nenhuma frase ainda.</p><button type="button" class="admin-select-link" data-cloze-add-text>+ Criar frase</button>`;

  const translationHTML = translationField
    ? renderFieldEditorHTML(translationField, 0, { namePrefix, label: 'Tradução (mostrada depois de responder)', removable: false })
    : `<p class="profile-edit-hint">Nenhuma tradução ainda.</p><button type="button" class="admin-select-link" data-cloze-add-translation>+ Criar tradução</button>`;

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">Outros campos (sem papel definido em Completar a frase)</div>
    <p class="profile-edit-hint">Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os.</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: `Campo sem papel ${i + 1}`, removable: true })).join('')}
  ` : '';

  const validation = validateNativeClozeStructure(editorState);
  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">✓ Estrutura de Completar a frase completa.</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-cloze-editor>
      <div class="section-label" style="margin:0 0 4px;">Frase com lacunas</div>
      <p class="profile-edit-hint">Selecione uma palavra ou trecho da frase e clique em "Marcar seleção como lacuna" -- pode marcar mais de um trecho.</p>
      ${textHTML}
      <div class="section-label" style="margin:14px 0 4px;">Tradução</div>
      ${translationHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ============================================================
// Wiring
// ============================================================

// `opts` (Fase 7e -- ver CLAUDE.md) repassado pra wireFieldEditorList
// (Tradução/Outros campos) e chamado direto pra wireFieldAudioBlockFor
// (Field de frase, que não passa por wireFieldEditorList -- ver
// renderClozeEditorHTML acima).
function wireClozeEditor(container, editorState, onChange, opts){
  if (!container) return;

  // Reaproveita o wiring de conteúdo/idioma do Field editor genérico
  // (6D.3) pro campo de Tradução e pros "Outros campos" -- nunca
  // reimplementa (kind 'content'/'lang' nunca re-renderiza, mesma
  // disciplina anti-UX-fix-5 de todo o resto desta feature).
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  }, opts);

  // Fase 7e -- áudio do Field de FRASE, wireado direto (nunca via
  // wireFieldEditorList, que só conhece Fields renderizados por
  // renderFieldEditorHTML -- a frase tem seu próprio editor visual).
  // Identificado por EXCLUSÃO (nunca dentro de `[data-field-editor]`,
  // diferente do bloco de áudio da Tradução/"Outros campos" acima) --
  // robusto a qualquer reordenação futura do template, nunca "o
  // primeiro bloco da tela" por posição.
  const textFieldBlock = [...container.querySelectorAll('[data-field-audio-field]')].find(el => !el.closest('[data-field-editor]'));
  if (textFieldBlock){
    wireFieldAudioBlockFor(container, editorState, textFieldBlock.dataset.fieldAudioField, (kind, fieldId) => {
      if (onChange) onChange(kind, fieldId);
    }, opts);
  }

  const addTextBtn = container.querySelector('[data-cloze-add-text]');
  if (addTextBtn) addTextBtn.addEventListener('click', () => {
    addClozeTextField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addTranslationBtn = container.querySelector('[data-cloze-add-translation]');
  if (addTranslationBtn) addTranslationBtn.addEventListener('click', () => {
    addClozeTranslationField(editorState);
    if (onChange) onChange('structure', null);
  });

  const textEl = container.querySelector('.cloze-editor-text');
  if (textEl){
    const fieldId = textEl.getAttribute('data-cloze-field-id');

    // Digitar texto normal (fora de uma marca) nunca re-renderiza -- só
    // re-deriva os segmentos do DOM real (única fonte de verdade
    // enquanto o foco está aqui) e serializa de volta pra
    // Field.content.value. O navegador mantém o cursor sozinho porque
    // NUNCA reescrevemos o innerHTML em resposta a este evento (mesma
    // disciplina anti-UX-fix-5, agora aplicada a um contenteditable em
    // vez de <input>/<textarea>).
    textEl.addEventListener('input', () => {
      const segments = domToClozeSegments(textEl);
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(segments) } });
      if (onChange) onChange('content', fieldId);
    });

    // Clique numa marca já existente -- abre o painel de edição inline
    // (restrição 6). Clique fora de qualquer marca não faz nada aqui
    // (a seleção normal do navegador continua funcionando pro botão
    // "Marcar seleção como lacuna" abaixo).
    textEl.addEventListener('click', (e) => {
      const markEl = e.target.closest && e.target.closest(`[${CLOZE_EDITOR_MARK_ATTR}]`);
      if (!markEl) return;
      e.preventDefault();
      CLOZE_EDITOR_ACTIVE_MARK_ID = markEl.getAttribute(CLOZE_EDITOR_MARK_ATTR);
      if (onChange) onChange('structure', fieldId);
    });

    const markBtn = container.querySelector('[data-cloze-mark-btn]');
    if (markBtn) markBtn.addEventListener('click', () => {
      const errorEl = container.querySelector('[data-cloze-mark-error]');
      if (errorEl) errorEl.textContent = '';
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.rangeCount === 0){
        if (errorEl) errorEl.textContent = 'Selecione um trecho da frase primeiro.';
        return;
      }
      const range = sel.getRangeAt(0);
      if (!textEl.contains(range.commonAncestorContainer)){
        if (errorEl) errorEl.textContent = 'Selecione um trecho DENTRO da frase.';
        return;
      }
      const segments = domToClozeSegments(textEl);
      const { start, end } = domRangeToLogicalOffsets(textEl, range);
      const result = insertClozeMarkAtLogicalOffsets(segments, start, end, null);
      if (!result.ok){
        const messages = {
          empty: 'Selecione um trecho da frase primeiro.',
          whitespace: 'A seleção precisa conter algum texto, não só espaços.',
          'overlaps-mark': 'Essa seleção já inclui (total ou parcialmente) uma lacuna existente -- marque um trecho fora das lacunas já criadas.',
          'out-of-range': 'Seleção inválida.',
        };
        if (errorEl) errorEl.textContent = messages[result.reason] || 'Não foi possível marcar essa seleção.';
        return;
      }
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(result.segments) } });
      CLOZE_EDITOR_ACTIVE_MARK_ID = result.markId;
      if (onChange) onChange('structure', fieldId);
    });

    const savePanelBtn = container.querySelector('[data-cloze-edit-save]');
    if (savePanelBtn) savePanelBtn.addEventListener('click', () => {
      const markId = CLOZE_EDITOR_ACTIVE_MARK_ID;
      const panelErrorEl = container.querySelector('[data-cloze-edit-error]');
      const answerInput = container.querySelector('[data-cloze-edit-answer]');
      const compareInput = container.querySelector('[data-cloze-edit-compare]');
      let segments = domToClozeSegments(textEl);
      const textResult = updateClozeMarkText(segments, markId, answerInput ? answerInput.value : '');
      if (!textResult.ok){
        if (panelErrorEl) panelErrorEl.textContent = 'O texto da lacuna não pode ficar vazio.';
        return;
      }
      segments = textResult.segments;
      if (compareInput){
        const compareResult = updateClozeMarkCompareAnswer(segments, markId, compareInput.value);
        if (compareResult.ok) segments = compareResult.segments;
      }
      updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(segments) } });
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });

    const removePanelBtn = container.querySelector('[data-cloze-edit-remove]');
    if (removePanelBtn) removePanelBtn.addEventListener('click', () => {
      const markId = CLOZE_EDITOR_ACTIVE_MARK_ID;
      const segments = domToClozeSegments(textEl);
      const result = removeClozeMark(segments, markId);
      if (result.ok){
        updateFieldInEditorState(editorState, fieldId, { content: { value: serializeClozeSegments(result.segments) } });
      }
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });

    const cancelPanelBtn = container.querySelector('[data-cloze-edit-cancel]');
    if (cancelPanelBtn) cancelPanelBtn.addEventListener('click', () => {
      CLOZE_EDITOR_ACTIVE_MARK_ID = null;
      if (onChange) onChange('structure', fieldId);
    });
  }
}

// Helper de integração, mesmo padrão de refreshMultipleChoiceEditorBox/
// refreshTypeAnswerEditorBox -- re-renderiza só quando a mudança é
// 'structure' (add/remove/marcar/editar/remover lacuna -- nunca em
// digitação de texto normal, que já se atualiza sozinha via contenteditable).
function refreshClozeEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderClozeEditorHTML(editorState, opts);
  wireClozeEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshClozeEditorBox(boxEl, editorState, opts);
  }, opts);
}

// ---------- Extensão do dispatcher por Card Type ----------
// (shared/flashcard-mc-editor.js -> shared/flashcard-typeanswer-editor.js
// -> aqui) -- mesmo padrão das 2 subfases anteriores: a última definição
// carregada vence (ordem de <script> em fr/zh index.html), preservando os
// branches de multiple_choice/type_answer intactos e acrescentando cloze.
function refreshNativeCardTypeBox(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'type_answer'){
    refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'cloze'){
    refreshClozeEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}
