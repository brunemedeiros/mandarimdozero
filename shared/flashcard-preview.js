// ---------- Preview nativo do editor -- Fase 6D.7 da reestruturação
// Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Mostra exatamente como um cartão vai aparecer na Revisão de verdade,
// reaproveitando o MESMO pipeline de produção (Fases 6D.1-6D.6) e os
// MESMOS 4 renderers da Fase 6C -- nunca uma segunda implementação de
// render (nenhum renderPreviewNormalCard/renderPreviewMultipleChoiceCard/
// renderPreviewTypeAnswerCard/renderPreviewClozeCard).
//
// Pipeline: editorState (rascunho não salvo) ou row já persistida (native
// ou legacy) -> noteEditorStateToRow()/row crua -> buildEngineCardsFromRow()
// (a MESMA função que buildCardFromTeacherFlashcard()/buildCardFromSelfFlashcard()
// -- fr/zh app.js -- já usam em produção, sem nenhum atalho paralelo) ->
// 1..N cards com card.cardInstance -> os MESMOS renderers globais
// (renderNormalCard/renderMultipleChoiceCard/renderTypeAnswerCard/
// renderClozeCard, definidos em fr/app.js e zh/app.js) via o dispatcher
// local abaixo, que espelha -- sem duplicar -- o despacho por cardTypeId
// que renderReviewView() já faz.
//
// Preview NUNCA:
//   - persiste (nenhum INSERT/UPDATE/DELETE);
//   - chama startReviewSession()/gradeCurrentCard()/reviewMoreCurrentCard();
//   - toca STATE.reviewQueue/STATE.reviewIndex/STATE.reviewCardState/
//     STATE.reviewShowingAnswer/STATE.reviewMCPicked/STATE.reviewClozeAnswered
//     -- tem seu PRÓPRIO estado de sessão (FLASHCARD_PREVIEW_SESSION,
//     módulo-local), estruturalmente separado do Review real;
//   - aplica FSRS/XP/streak.
//
// `card.__isPreviewCard = true` (setado só aqui, nunca em nenhum card real
// de STATE.cards) é o único sinal que os renderers compartilhados
// precisam pra desenhar "👁️ Pré-visualização" em vez da barra de
// progresso de sessão (reviewProgressBarHTML(), fr/zh app.js, Fase 6D.7)
// -- byte a byte idêntico ao HTML de sempre quando o sinal está ausente.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- depois de
// shared/flashcard-native-persistence.js, antes de shared/teacher-flashcards.js):
//   - shared/flashcard-editor-state.js    (isNativeNoteEditorState, noteEditorStateToRow)
//   - shared/flashcard-native-persistence.js (validateNoteEditorStateForSave)
//   - shared/flashcard-model.js           (buildEngineCardsFromRow)
//   - fr/zh app.js (carregado DEPOIS -- só referenciado dentro de corpos de
//     função chamados após o boot completo, então a ordem de carregamento
//     não é um problema de correção): renderNormalCard/
//     renderMultipleChoiceCard/renderTypeAnswerCard/renderClozeCard

// Estado de sessão do Preview -- módulo-local, NUNCA STATE.review* (ver
// comentário acima). Um único Preview por vez no app inteiro (mesmo
// padrão de todo modal singleton já existente, ex: flashcard-reset-confirm-modal).
const FLASHCARD_PREVIEW_SESSION = {
  cards: [],
  index: 0,
  localState: null,
};

// Mesmos 4 shapes que renderReviewView() já cria pra STATE.reviewCardState
// (Fases 6C.1-6C.3) -- reaproveitados aqui, nunca reinventados. Um
// CardInstance de Cloze carrega seu próprio `markId` (ver renderClozeCard).
function createFlashcardPreviewLocalState(card){
  const cardTypeId = card.cardInstance ? card.cardInstance.cardTypeId : 'normal';
  if (cardTypeId === 'multiple_choice') return { kind: 'multiple_choice', shuffledOptions: null, selectedIndex: null, answered: false, wasCorrect: null };
  if (cardTypeId === 'type_answer') return { kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null };
  if (cardTypeId === 'cloze') return { kind: 'cloze', markId: card.cardInstance.markId, typedAnswer: '', answered: false, wasCorrect: null };
  return { kind: 'normal', revealed: false };
}

// ---------- Construção dos cards de preview ----------

// A partir do RASCUNHO ATUAL do editor nativo (não salvo) -- Seção 13
// ("Preview do estado atual, não do último save"). Reaproveita a MESMA
// validação central da Fase 6D.6 (validateNoteEditorStateForSave) -- um
// estado inválido bloqueia o Preview com a MESMA mensagem que bloquearia
// o Salvar, nunca uma tentativa de renderizar um CardInstance incompleto.
function buildPreviewCardsFromNativeEditorState(editorState, opts){
  opts = opts || {};
  if (!isNativeNoteEditorState(editorState)){
    return { ok: false, error: 'Adicione pelo menos 1 campo em "Campos nativos" pra pré-visualizar.' };
  }
  const v = validateNoteEditorStateForSave(editorState);
  if (!v.ok) return { ok: false, error: v.error };

  let row;
  try {
    // id/status sintéticos, nunca gravados -- Preview nunca chama
    // createFlashcard()/createOwnFlashcard()/updateFlashcardContent()/
    // updateOwnFlashcardContent() em lugar nenhum deste arquivo.
    row = noteEditorStateToRow(editorState, {
      id: editorState.noteId != null ? editorState.noteId : 'draft',
      status: 'active',
    });
  } catch (e){
    return { ok: false, error: 'Não foi possível montar a pré-visualização.' };
  }
  return buildPreviewCardsFromRow(row, opts);
}

// A partir de uma linha JÁ PERSISTIDA (nativa ou legada) -- entrada usada
// pelo botão "👁" de cada linha em "Cartões ativos"/"Arquivados". Cobre o
// caso legado (Seção 15) sem inventar um rastreador de estado ao vivo pro
// formulário legado, que hoje só lê valores no momento do submit --
// reflete a linha exatamente como está salva, nunca converte pro modelo
// nativo silenciosamente (interpretNoteFromRow(), chamado por dentro de
// buildEngineCardsFromRow(), já lida com os dois formatos sem diferença
// nenhuma pro chamador).
function buildPreviewCardsFromRow(row, opts){
  opts = opts || {};
  let cards;
  try {
    cards = buildEngineCardsFromRow(row, {
      origin: opts.origin || 'teacher',
      appKey: opts.appKey,
      idPrefix: 'preview-',
    });
  } catch (e){
    return { ok: false, error: 'Não foi possível montar a pré-visualização' + (e && e.message ? ` (${e.message})` : '') + '.' };
  }
  if (!cards || !cards.length){
    return { ok: false, error: 'Nenhum cartão seria gerado por este conteúdo.' };
  }
  cards.forEach(c => { c.__isPreviewCard = true; });
  return { ok: true, cards };
}

// ---------- Modal (abrir/fechar/navegar) ----------

// Fecha e descarta SÓ o estado do Preview -- nunca toca em nenhum estado
// do editor (ADMIN_FLASHCARDS_STATE.nativeCardState/MY_FLASHCARDS_STATE.
// nativeCardState, Fields já digitados, seleção de alunos, Card Type
// escolhido) -- cancelar o Preview nunca limpa o formulário.
function closeFlashcardPreview(){
  const modal = document.getElementById('flashcard-preview-modal');
  if (modal) modal.style.display = 'none';
  FLASHCARD_PREVIEW_SESSION.cards = [];
  FLASHCARD_PREVIEW_SESSION.index = 0;
  FLASHCARD_PREVIEW_SESSION.localState = null;
}

function openFlashcardPreviewWithError(message){
  const modal = document.getElementById('flashcard-preview-modal');
  if (!modal) return;
  FLASHCARD_PREVIEW_SESSION.cards = [];
  FLASHCARD_PREVIEW_SESSION.index = 0;
  FLASHCARD_PREVIEW_SESSION.localState = null;
  modal.style.display = 'flex';
  document.getElementById('flashcard-preview-modal-body').innerHTML = `<p class="profile-edit-error">${escapeHTML(message)}</p>`;
  document.getElementById('flashcard-preview-modal-nav').innerHTML = '';
}

function openFlashcardPreviewWithCards(cards){
  const modal = document.getElementById('flashcard-preview-modal');
  if (!modal) return;
  FLASHCARD_PREVIEW_SESSION.cards = cards;
  FLASHCARD_PREVIEW_SESSION.index = 0;
  FLASHCARD_PREVIEW_SESSION.localState = null;
  modal.style.display = 'flex';
  renderFlashcardPreviewChrome();
}

// Navegação "Preview N de M" -- Note com 2+ CardInstances (Normal com
// reverso -> 2, Cloze multi-marca -> N) nunca assume cards[0]; cada troca
// de card descarta o localState anterior (mesmo ciclo de vida de
// STATE.reviewCardState no Review real -- card diferente = estado novo).
function renderFlashcardPreviewChrome(){
  const navEl = document.getElementById('flashcard-preview-modal-nav');
  const { cards, index } = FLASHCARD_PREVIEW_SESSION;
  if (cards.length > 1){
    navEl.innerHTML = `
      <button type="button" class="btn btn-secondary" id="flashcard-preview-prev-btn" ${index === 0 ? 'disabled' : ''} style="flex:1;">← Anterior</button>
      <span class="profile-edit-hint" style="margin:0 12px; white-space:nowrap;">Cartão ${index + 1} de ${cards.length}</span>
      <button type="button" class="btn btn-secondary" id="flashcard-preview-next-btn" ${index === cards.length - 1 ? 'disabled' : ''} style="flex:1;">Próximo →</button>
    `;
    document.getElementById('flashcard-preview-prev-btn').addEventListener('click', () => {
      if (FLASHCARD_PREVIEW_SESSION.index <= 0) return;
      FLASHCARD_PREVIEW_SESSION.index--;
      FLASHCARD_PREVIEW_SESSION.localState = null;
      renderFlashcardPreviewChrome();
    });
    document.getElementById('flashcard-preview-next-btn').addEventListener('click', () => {
      if (FLASHCARD_PREVIEW_SESSION.index >= FLASHCARD_PREVIEW_SESSION.cards.length - 1) return;
      FLASHCARD_PREVIEW_SESSION.index++;
      FLASHCARD_PREVIEW_SESSION.localState = null;
      renderFlashcardPreviewChrome();
    });
  } else {
    navEl.innerHTML = '';
  }
  renderFlashcardPreviewCard();
}

// Dispatcher local -- espelha (nunca duplica) o despacho por cardTypeId
// que renderReviewView() (fr/zh app.js) já faz, chamando os MESMOS 4
// renderers globais da Fase 6C. `callbacks.onAnswered`/`onReviewMore` são
// no-ops de persistência/FSRS de propósito -- só dão um feedback visual
// leve (showToast), nunca gradeCurrentCard()/reviewMoreCurrentCard()/
// saveState() nem qualquer efeito colateral real.
function renderFlashcardPreviewCard(){
  const mountEl = document.getElementById('flashcard-preview-modal-body');
  const card = FLASHCARD_PREVIEW_SESSION.cards[FLASHCARD_PREVIEW_SESSION.index];
  if (!mountEl || !card) return;
  if (!FLASHCARD_PREVIEW_SESSION.localState){
    FLASHCARD_PREVIEW_SESSION.localState = createFlashcardPreviewLocalState(card);
  }
  const cardTypeId = card.cardInstance ? card.cardInstance.cardTypeId : 'normal';
  const callbacks = {
    onAnswered: () => {
      if (typeof showToast === 'function') showToast('👁️ Pré-visualização -- nada foi salvo ou avaliado.');
    },
    onReviewMore: () => {
      if (typeof showToast === 'function') showToast('👁️ Pré-visualização -- "Rever mais" não tem efeito aqui.');
    },
  };
  if (cardTypeId === 'multiple_choice') renderMultipleChoiceCard(mountEl, card, FLASHCARD_PREVIEW_SESSION.localState, callbacks);
  else if (cardTypeId === 'type_answer') renderTypeAnswerCard(mountEl, card, FLASHCARD_PREVIEW_SESSION.localState, callbacks);
  else if (cardTypeId === 'cloze') renderClozeCard(mountEl, card, FLASHCARD_PREVIEW_SESSION.localState, callbacks);
  else renderNormalCard(mountEl, card, FLASHCARD_PREVIEW_SESSION.localState, callbacks);
}

// ---------- Pontos de entrada públicos, chamados por
// shared/admin-flashcards.js e shared/my-flashcards.js ----------

// A partir do formulário de criação/edição nativa aberto agora (rascunho
// não salvo).
function openFlashcardPreviewFromEditorState(editorState, opts){
  const result = buildPreviewCardsFromNativeEditorState(editorState, opts);
  if (!result.ok){ openFlashcardPreviewWithError(result.error); return; }
  openFlashcardPreviewWithCards(result.cards);
}

// A partir de uma linha já salva (nativa ou legada), vinda da lista de
// cartões.
function openFlashcardPreviewFromRow(row, opts){
  const result = buildPreviewCardsFromRow(row, opts);
  if (!result.ok){ openFlashcardPreviewWithError(result.error); return; }
  openFlashcardPreviewWithCards(result.cards);
}

// Wiring do modal -- singleton compartilhado entre admin-flashcards.js e
// my-flashcards.js, então vive aqui (não em nenhum dos dois), mesmo
// padrão de fechar/clicar-fora já usado por todo modal do app.
document.getElementById('flashcard-preview-modal-close')?.addEventListener('click', closeFlashcardPreview);
document.getElementById('flashcard-preview-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'flashcard-preview-modal') closeFlashcardPreview();
});
