// ============================================================
// Navegador de Decks (doc de arquitetura total, seções 5.4, 12, 13, 14)
//
//   Revisão (início)  -> tabela "Deck | Novo | Aprendendo | Revisar",
//                        começando pela raiz do idioma. Sem botão
//                        "Estudar" na tabela (seção 12).
//   Clique no Deck    -> Detalhe do Deck (seção 13): contagens +
//                        "Estudar agora", "Adicionar cartão", "Painel".
//   Painel            -> navegador de conteúdo (seção 14): lista de Notes
//                        do Deck (e subdecks), busca, filtro por Tag,
//                        editar, mover vários, excluir vários.
//   Excluir Deck      -> diálogo da seção 5.4 (mover os cartões para outro
//                        Deck ou excluir permanentemente, considerando a
//                        subárvore inteira).
//
// Compartilhado entre fr e zh. Só COMPÕE peças que já existem:
//   - contagens: getDeckCounts/structuralCounts (K1/K.5), sobre o pool
//     elegível eligibleDeckReviewPool() (o mesmo de "Estudar este Deck");
//   - estudo: startDeckReviewSession (Fase D); a raiz do idioma estuda o
//     pool elegível inteiro (a raiz agrega curso + pessoais + professora);
//   - escrita: setOwnFlashcardDeck / deleteOwnFlashcardPermanently /
//     deletePersonalDeckTree (shared/deck-data.js). Nada de fila, FSRS,
//     contagem ou permissão nova. RLS e triggers continuam a autoridade.
//
// Estado só de interface (qual tela, busca, seleção); nada é persistido
// além da preferência de abrir/fechar ramos (localStorage, por idioma).
// ============================================================

const DECK_BROWSER = {
  view: 'home',      // 'home' | 'detail' | 'panel'
  nodeId: null,      // 'lang' (raiz do idioma) ou id numérico do Deck
  panel: { query: '', tags: [], selected: new Set() },
};

const DECK_BROWSER_LANG_LABELS = { frances: 'Francês', mandarim: 'Mandarim', portugues: 'Português' };

function deckBrowserCollapsedKey(){ return 'deckBrowserCollapsed:' + (typeof APP_KEY !== 'undefined' ? APP_KEY : ''); }
function deckBrowserLoadCollapsed(){
  try {
    const raw = localStorage.getItem(deckBrowserCollapsedKey());
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) { /* sem storage: usa o padrão */ }
  return null;
}
function deckBrowserSaveCollapsed(set){
  try { localStorage.setItem(deckBrowserCollapsedKey(), JSON.stringify(Array.from(set))); } catch (e) { /* ignora */ }
}

// ---------- Árvore exibida ----------

function deckBrowserDecks(){
  const list = (typeof STATE !== 'undefined' && STATE.decks) || [];
  return list.filter(d => d.language_app_key === APP_KEY);
}
function deckBrowserUserId(){ return (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER.id : null; }

function deckBrowserRootDeck(decks){
  const uid = deckBrowserUserId();
  return decks.find(d => d.kind === 'root' && d.owner_id === uid) || null;
}
function deckBrowserCourseRoot(decks){
  return decks.find(d => d.kind === 'course' && (d.course_unit_id == null) && d.parent_deck_id == null) || null;
}

// Rótulo de um Deck (personal_root aparece como "Meus Decks").
function deckBrowserDeckLabel(deck){
  if (!deck) return '';
  if (deck.kind === 'personal_root') return 'Meus Decks';
  if (deck.kind === 'teacher_root') return 'Cartões da professora';
  return deck.name || '';
}
function deckBrowserLangLabel(decks){
  const root = deckBrowserRootDeck(decks);
  return (root && root.name) || DECK_BROWSER_LANG_LABELS[APP_KEY] || 'Idioma';
}

// Filhos exibidos. A raiz do idioma é virtual ('lang'): mostra o curso, os
// filhos do Deck raiz (Meus Decks, Cartões da professora) e nada mais.
// O curso NÃO é filho estrutural do Deck raiz (Course Decks são globais por
// idioma, migration 051) -- a raiz é só o agregador da tela, como no Anki.
function deckBrowserChildren(decks, nodeId){
  const kindOrder = { course: 0, personal_root: 1, teacher_root: 2 };
  if (nodeId === 'lang'){
    const out = [];
    const course = deckBrowserCourseRoot(decks);
    if (course) out.push(course);
    const root = deckBrowserRootDeck(decks);
    if (root) getDeckChildren(decks, root.id).forEach(d => out.push(d));
    return out.sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9) || a.id - b.id);
  }
  return getDeckChildren(decks, nodeId).slice().sort((a, b) => {
    // Unidades do curso seguem a ordem do currículo (UNITS); o resto por id.
    if (a.kind === 'course' && b.kind === 'course' && typeof UNITS !== 'undefined'){
      const ia = UNITS.findIndex(u => String(u.id) === String(a.course_unit_id));
      const ib = UNITS.findIndex(u => String(u.id) === String(b.course_unit_id));
      return ia - ib;
    }
    return a.id - b.id;
  });
}

function deckBrowserPool(){
  if (typeof eligibleDeckReviewPool === 'function') return eligibleDeckReviewPool();
  return ((typeof STATE !== 'undefined' && STATE.cards) || []).filter(c => typeof isCardLessonCompleted !== 'function' || isCardLessonCompleted(c));
}

// Cartões do escopo de um nó. A raiz do idioma = todo o pool elegível do
// idioma (inclui cartões de trilha cujo Course Deck ainda não existe).
function deckBrowserScope(decks, nodeId, cards){
  if (nodeId === 'lang') return cards;
  return getStudyScopeForDeck(decks, nodeId, cards);
}

// Contagens da tabela: Novo / Aprendendo / Revisar (= revisões devidas
// agora), como as colunas do Anki. Fonte única: structuralCounts (K.5).
// Como no Anki, "Novo" mostra o que entra numa sessão: no máximo
// "Novas palavras por dia" (STATE.studySettings.newCardsPerDay, o mesmo
// newCardsLimit que a fila usa). O total de novos fica em `newTotal`.
// Filtro de tag da Revisão não entra (contagem estrutural, decisão da Fase I).
function deckBrowserCounts(decks, nodeId, pool){
  const sc = structuralCounts(deckBrowserScope(decks, nodeId, pool));
  const cap = (typeof STATE !== 'undefined' && STATE.studySettings && Number.isFinite(Number(STATE.studySettings.newCardsPerDay)))
    ? Number(STATE.studySettings.newCardsPerDay) : Infinity;
  return { total: sc.cards, new: Math.min(sc.new, cap), newTotal: sc.new, learning: sc.learning, review: sc.reviewDue, due: sc.due };
}

function deckBrowserNodeLabel(decks, nodeId){
  if (nodeId === 'lang') return deckBrowserLangLabel(decks);
  return deckBrowserDeckLabel(getDeckById(decks, nodeId));
}

// Caminho "Francês › Meus Decks › Verbos" para o cabeçalho do detalhe.
function deckBrowserBreadcrumb(decks, nodeId){
  const parts = [deckBrowserLangLabel(decks)];
  if (nodeId !== 'lang'){
    const chain = getDeckAncestors(decks, nodeId).slice().reverse()
      .filter(d => d.kind !== 'root')
      .map(deckBrowserDeckLabel);
    parts.push(...chain, deckBrowserNodeLabel(decks, nodeId));
  }
  return parts;
}

// Cartões próprios antigos (antes dos Decks) sem deck_id: contam na raiz do
// idioma, mas em nenhum filho.
function deckBrowserOrphanCount(){
  const cards = (typeof STATE !== 'undefined' && STATE.cards) || [];
  return new Set(cards.filter(c => c.origin === 'self' && c.deckId == null && c.flashcardStatus !== 'archived').map(c => c.rowId)).size;
}

// ---------- Containers (o bloco de Revisão tem 3 telas irmãs) ----------

function deckBrowserShow(which){
  const modes = document.getElementById('review-mode-select-wrap');
  const deckWrap = document.getElementById('review-deck-wrap');
  const session = document.getElementById('review-session-wrap');
  if (session) session.style.display = 'none';
  if (modes) modes.style.display = which === 'home' ? 'block' : 'none';
  if (deckWrap) deckWrap.style.display = which === 'home' ? 'none' : 'block';
}

// ---------- Tela inicial: tabela de Decks ----------

let DECK_BROWSER_RENDER_TOKEN = 0;

async function renderReviewDeckTable(){
  const box = document.getElementById('review-decks-table');
  if (!box) return;
  const token = ++DECK_BROWSER_RENDER_TOKEN;
  if (!((STATE.decks || []).length)) box.innerHTML = `<p class="profile-edit-hint">Carregando seus Decks…</p>`;
  try {
    if (typeof ensureDecksLoadedForReview === 'function') await ensureDecksLoadedForReview();
  } catch (e) {
    console.error('Erro ao carregar Decks da Revisão:', e);
  }
  if (token !== DECK_BROWSER_RENDER_TOKEN) return;
  box.innerHTML = deckBrowserTableHTML();
  wireDeckBrowserTable(box);
}

function deckBrowserTableHTML(){
  const decks = deckBrowserDecks();
  const pool = deckBrowserPool();
  let collapsed = deckBrowserLoadCollapsed();
  if (!collapsed){
    // Padrão: o curso começa fechado (dezenas de unidades).
    collapsed = new Set();
    const course = deckBrowserCourseRoot(decks);
    if (course) collapsed.add(String(course.id));
  }
  const rows = [];
  const walk = (nodeId, depth) => {
    const kids = deckBrowserChildren(decks, nodeId);
    const c = deckBrowserCounts(decks, nodeId, pool);
    const isCollapsed = collapsed.has(String(nodeId));
    const toggle = kids.length
      ? `<button type="button" class="deck-table-toggle" data-deck-toggle="${nodeId}" aria-label="${isCollapsed ? 'Abrir' : 'Fechar'} ${escapeHTML(deckBrowserNodeLabel(decks, nodeId))}" aria-expanded="${isCollapsed ? 'false' : 'true'}">${isCollapsed ? '+' : '−'}</button>`
      : `<span class="deck-table-toggle-spacer"></span>`;
    const num = (n, cls) => `<td class="deck-table-num ${n ? cls : 'is-zero'}">${n}</td>`;
    rows.push(`<tr data-deck-row="${nodeId}">
      <td class="deck-table-name" style="padding-left:${8 + depth * 18}px;">${toggle}<button type="button" class="deck-table-link" data-deck-open="${nodeId}">${escapeHTML(deckBrowserNodeLabel(decks, nodeId))}</button></td>
      ${num(c.new, 'is-new')}${num(c.learning, 'is-learning')}${num(c.review, 'is-review')}
    </tr>`);
    if (!isCollapsed) kids.forEach(k => walk(k.id, depth + 1));
  };
  walk('lang', 0);
  return `<table class="deck-table">
      <thead><tr><th scope="col">Deck</th><th scope="col">Novo</th><th scope="col">Aprendendo</th><th scope="col">Revisar</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <p class="profile-edit-hint deck-table-hint">Toque no nome de um Deck para estudar, adicionar cartões ou abrir o Painel.</p>`;
}

function wireDeckBrowserTable(box){
  box.querySelectorAll('[data-deck-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.deckToggle;
    let set = deckBrowserLoadCollapsed();
    if (!set){
      set = new Set();
      const course = deckBrowserCourseRoot(deckBrowserDecks());
      if (course) set.add(String(course.id));
    }
    if (set.has(id)) set.delete(id); else set.add(id);
    deckBrowserSaveCollapsed(set);
    box.innerHTML = deckBrowserTableHTML();
    wireDeckBrowserTable(box);
  }));
  box.querySelectorAll('[data-deck-open]').forEach(btn => btn.addEventListener('click', () => {
    const raw = btn.dataset.deckOpen;
    openDeckDetail(raw === 'lang' ? 'lang' : Number(raw));
  }));
}

// ---------- Detalhe do Deck ----------

function deckBrowserCanAddCard(deck, nodeId){
  if (!deckBrowserUserId()) return false;
  if (nodeId === 'lang') return true; // vai para "Meus Decks"
  return !!deck && (deck.kind === 'personal_root' || deck.kind === 'personal');
}

function openDeckDetail(nodeId){
  DECK_BROWSER.view = 'detail';
  DECK_BROWSER.nodeId = nodeId;
  deckBrowserShow('detail');
  renderDeckDetail();
}

function renderDeckDetail(){
  const wrap = document.getElementById('review-deck-wrap');
  if (!wrap) return;
  const decks = deckBrowserDecks();
  const nodeId = DECK_BROWSER.nodeId;
  const deck = nodeId === 'lang' ? null : getDeckById(decks, nodeId);
  if (nodeId !== 'lang' && !deck){ backToDeckTable(); return; }
  const pool = deckBrowserPool();
  const c = deckBrowserCounts(decks, nodeId, pool);
  const canAdd = deckBrowserCanAddCard(deck, nodeId);
  const isPersonal = !!deck && deck.kind === 'personal';
  let addHint = '';
  if (!canAdd && deck && deck.kind === 'course') addHint = 'Os cartões do curso vêm das lições. Para criar os seus, use "Meus Decks".';
  else if (!canAdd && deck && (deck.kind === 'teacher_root' || deck.kind === 'teacher')) addHint = 'Estes cartões são organizados pela sua professora.';
  else if (!canAdd && !deckBrowserUserId()) addHint = 'Entre na sua conta para criar cartões.';
  const crumbs = deckBrowserBreadcrumb(decks, nodeId);
  wrap.innerHTML = `
    <button class="back-link" data-deck-back>← Voltar aos Decks</button>
    <div class="deck-detail">
      <p class="deck-detail-path">${crumbs.slice(0, -1).map(escapeHTML).join(' › ')}</p>
      <h2 class="deck-detail-title">${escapeHTML(crumbs[crumbs.length - 1])}</h2>
      <div class="deck-detail-counts">
        <div><span class="deck-detail-num ${c.new ? 'is-new' : 'is-zero'}">${c.new}</span><span class="deck-detail-label">Novo</span></div>
        <div><span class="deck-detail-num ${c.learning ? 'is-learning' : 'is-zero'}">${c.learning}</span><span class="deck-detail-label">Aprendendo</span></div>
        <div><span class="deck-detail-num ${c.review ? 'is-review' : 'is-zero'}">${c.review}</span><span class="deck-detail-label">Revisar</span></div>
      </div>
      <p class="profile-edit-hint">${c.total} ${c.total === 1 ? 'cartão' : 'cartões'} neste Deck${nodeId === 'lang' ? '' : ' e nos subdecks'}${c.newTotal > c.new ? ` · ${c.newTotal} novos no total (entram até ${c.new} por sessão, conforme "Novas palavras por dia")` : ''}.</p>
      <div class="deck-detail-actions">
        <button type="button" class="btn btn-primary" data-deck-study ${c.total ? '' : 'disabled'}>Estudar agora</button>
        ${canAdd ? `<button type="button" class="btn btn-secondary" data-deck-add>Adicionar cartão</button>` : ''}
        <button type="button" class="btn btn-secondary" data-deck-panel>Painel</button>
      </div>
      ${addHint ? `<p class="profile-edit-hint">${escapeHTML(addHint)}</p>` : ''}
      ${nodeId === 'lang' && deckBrowserOrphanCount() ? `<p class="profile-edit-hint">${deckBrowserOrphanCount()} dos seus cartões antigos ainda não estão em nenhum Deck. Eles aparecem só aqui, na raiz; no Painel você pode movê-los para um Deck.</p>` : ''}
      ${isPersonal ? `<div class="deck-detail-danger"><button type="button" class="admin-select-link" data-deck-delete style="background:none;border:none;cursor:pointer;padding:0;">🗑 Excluir este Deck</button></div><div data-deck-delete-box></div>` : ''}
    </div>`;
  wrap.querySelector('[data-deck-back]').addEventListener('click', backToDeckTable);
  wrap.querySelector('[data-deck-study]').addEventListener('click', () => deckBrowserStudy(nodeId));
  wrap.querySelector('[data-deck-add]')?.addEventListener('click', () => deckBrowserAddCard(deck, nodeId));
  wrap.querySelector('[data-deck-panel]').addEventListener('click', () => openDeckPanel(nodeId));
  wrap.querySelector('[data-deck-delete]')?.addEventListener('click', () => openDeckDeleteDialog(deck, wrap.querySelector('[data-deck-delete-box]')));
}

function backToDeckTable(){
  DECK_BROWSER.view = 'home';
  DECK_BROWSER.nodeId = null;
  deckBrowserShow('home');
  if (typeof renderReviewModeSelect === 'function') renderReviewModeSelect();
}

// Estudar: Deck real -> startDeckReviewSession (Deck + subdecks, mesma fila
// e FSRS de sempre). Raiz do idioma -> o mesmo fluxo, sobre o pool elegível
// inteiro (curso + pessoais + professora), com o filtro de tag da Revisão.
function deckBrowserStudy(nodeId){
  if (nodeId !== 'lang'){
    if (typeof startDeckReviewSession === 'function') startDeckReviewSession(nodeId);
    return;
  }
  const pool = deckBrowserPool().filter(c => (typeof matchesReviewTagFilter === 'function') ? matchesReviewTagFilter(c) : true);
  STATE.reviewSessionUnitFilter = null;
  STATE.reviewSessionDeckId = null;
  STATE.reviewActiveMode = 'flashcard';
  STATE.reviewQueue = reviewFilterQueue('oldest', pool);
  STATE.reviewIndex = 0;
  STATE.reviewCardState = null;
  const deckWrap = document.getElementById('review-deck-wrap');
  if (deckWrap) deckWrap.style.display = 'none';
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = 'block';
  document.getElementById('speed-review-content').style.display = 'none';
  const match = document.getElementById('match-review-content');
  if (match) match.style.display = 'none';
  renderReviewView();
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'reviewSession', mode: 'flashcard' });
}

// "Adicionar cartão": abre Meus Cartões com o Deck já escolhido no seletor
// "Deck de destino" (raiz do idioma -> "Meus Decks").
function deckBrowserAddCard(deck, nodeId){
  const targetId = nodeId === 'lang' ? null : deck.id;
  if (typeof switchTab === 'function') switchTab('my-flashcards');
  if (targetId == null) return;
  let tries = 0;
  const pick = () => {
    const sel = document.getElementById('my-flashcard-deck');
    if (sel && Array.from(sel.options).some(o => Number(o.value) === targetId)){
      sel.value = String(targetId);
      sel.dispatchEvent(new Event('change'));
      sel.closest('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (++tries < 40) setTimeout(pick, 100);
  };
  pick();
}

// ---------- Excluir Deck pessoal (seção 5.4) ----------

// Destinos válidos para os cartões de um Deck que vai ser excluído:
// Meus Decks + Decks pessoais fora da subárvore excluída.
function deckBrowserMoveTargets(decks, deck){
  const removed = new Set(getDeckSubtreeIds(decks, deck.id));
  const uid = deckBrowserUserId();
  return decks.filter(d => ['personal_root', 'personal'].includes(d.kind) && d.owner_id === uid && !removed.has(d.id));
}

function openDeckDeleteDialog(deck, box){
  if (!box) return;
  const decks = deckBrowserDecks();
  const subtree = getDeckSubtreeIds(decks, deck.id);
  const subdecks = subtree.length - 1;
  const cards = ((STATE && STATE.cards) || []).filter(c => c.origin === 'self' && c.deckId != null && subtree.includes(c.deckId));
  const noteCount = new Set(cards.map(c => c.rowId)).size;
  const targets = deckBrowserMoveTargets(decks, deck);
  box.innerHTML = `
    <div class="deck-delete-dialog" role="alertdialog" aria-labelledby="deck-delete-title">
      <p id="deck-delete-title"><strong>Excluir este deck irá excluir todos os cartões dentro dele</strong></p>
      <p class="profile-edit-hint">"${escapeHTML(deck.name)}" tem ${noteCount} ${noteCount === 1 ? 'cartão' : 'cartões'}${subdecks ? ` e ${subdecks} ${subdecks === 1 ? 'subdeck' : 'subdecks'} (que também serão excluídos)` : ''}. Se preferir guardar os cartões, mova-os antes.</p>
      ${noteCount ? `<label class="profile-edit-label" for="deck-delete-target">Mover os cartões para</label>
      <select id="deck-delete-target" class="profile-edit-input">${targets.map(d => `<option value="${d.id}">${escapeHTML(deckBrowserDeckLabel(d))}</option>`).join('')}</select>` : ''}
      <div class="deck-detail-actions">
        ${noteCount ? `<button type="button" class="btn btn-secondary" data-deck-delete-move>Mover para outro deck</button>` : ''}
        <button type="button" class="btn btn-primary deck-delete-confirm" data-deck-delete-perm>Excluir permanentemente</button>
        <button type="button" class="btn btn-secondary" data-deck-delete-cancel>Cancelar</button>
      </div>
      <p class="profile-edit-error" data-deck-delete-error></p>
    </div>`;
  const errEl = box.querySelector('[data-deck-delete-error]');
  const buttons = () => box.querySelectorAll('button');
  const setBusy = (busy) => buttons().forEach(b => { b.disabled = busy; });
  box.querySelector('[data-deck-delete-cancel]').addEventListener('click', () => { box.innerHTML = ''; });
  box.querySelector('[data-deck-delete-move]')?.addEventListener('click', async () => {
    const dest = getDeckById(decks, Number(box.querySelector('#deck-delete-target').value));
    setBusy(true); errEl.textContent = '';
    const res = await deletePersonalDeckTree({ deck, decks, mode: 'move', destination: dest, expectedNotes: noteCount });
    setBusy(false);
    if (!res.ok){ errEl.textContent = res.error; return; }
    deckBrowserAfterDelete(subtree, res, dest);
  });
  box.querySelector('[data-deck-delete-perm]').addEventListener('click', async () => {
    if (!window.confirm(`Excluir "${deck.name}" e ${noteCount} ${noteCount === 1 ? 'cartão' : 'cartões'} para sempre? O histórico de revisão também será apagado. Isso não pode ser desfeito.`)) return;
    setBusy(true); errEl.textContent = '';
    const res = await deletePersonalDeckTree({ deck, decks, mode: 'delete', expectedNotes: noteCount });
    setBusy(false);
    if (!res.ok){ errEl.textContent = res.error; return; }
    deckBrowserAfterDelete(subtree, res, null);
  });
}

// Espelha a exclusão no estado já carregado (fila, contagens, Meus Cartões)
// sem precisar recarregar a página.
function deckBrowserAfterDelete(subtree, res, destination){
  const removed = new Set(subtree);
  STATE.decks = (STATE.decks || []).filter(d => !removed.has(d.id));
  if (destination){
    (STATE.cards || []).forEach(c => { if (c.origin === 'self' && removed.has(c.deckId)) c.deckId = destination.id; });
  } else {
    STATE.cards = (STATE.cards || []).filter(c => !(c.origin === 'self' && removed.has(c.deckId)));
  }
  if (typeof MY_FLASHCARDS_STATE !== 'undefined') MY_FLASHCARDS_STATE._decks = STATE.decks;
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function'){
    showToast(destination
      ? `Deck excluído. ${res.notes} ${res.notes === 1 ? 'cartão foi movido' : 'cartões foram movidos'} para "${deckBrowserDeckLabel(destination)}".`
      : `Deck excluído com ${res.notes} ${res.notes === 1 ? 'cartão' : 'cartões'}.`);
  }
  backToDeckTable();
}

// ---------- Painel (seção 14) ----------

// Texto de exibição de um card, sem quebrar em nenhum Card Type.
function deckBrowserCardTexts(card){
  try {
    const v = resolveCardContentView(card);
    if (v.kind === 'cloze'){
      return { front: renderClozeText(v.rawSentenceText || '', v.markId, { reveal: true }), back: (v.translation && v.translation.text) || '' };
    }
    if (v.kind === 'multiple_choice') return { front: (v.prompt && v.prompt.text) || '', back: v.correctText || '' };
    if (v.kind === 'type_answer') return { front: (v.prompt && v.prompt.text) || '', back: v.displayAnswerText || '' };
    return { front: (v.front && v.front.text) || '', back: (v.back && v.back.text) || '' };
  } catch (e) {
    return { front: card.front || '', back: card.back_trans || '' };
  }
}

const DECK_BROWSER_CARD_TYPE_LABELS = {
  normal: 'Normal', normal_reversed: 'Normal com reverso', multiple_choice: 'Múltipla escolha',
  type_answer: 'Digite a resposta', cloze: 'Completar a frase',
};
const DECK_BROWSER_ORIGIN_LABELS = { study: 'Curso', self: 'Meus cartões', teacher: 'Professora' };

// Agrupa CardInstances irmãs pela Note (mesmo objeto `note`): o Painel
// trabalha no nível de Note (seção 14) e mostra os cartões dela juntos.
function deckBrowserNotes(cards){
  const map = new Map();
  cards.forEach(c => {
    const key = c.note || c;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  });
  return Array.from(map.values()).map(siblings => {
    const first = siblings[0];
    const texts = deckBrowserCardTexts(first);
    const mode = (first.note && first.note.cardGenerationMode) || (first.cardInstance && first.cardInstance.cardTypeId) || 'normal';
    return {
      key: (first.origin || '') + ':' + (first.origin === 'study' ? first.id.replace(/-b$/, '') : String(first.rowId)),
      origin: first.origin,
      rowId: first.rowId,
      deckId: first.deckId,
      cards: siblings,
      front: texts.front,
      back: texts.back,
      tags: first.tags || [],
      typeLabel: DECK_BROWSER_CARD_TYPE_LABELS[mode] || DECK_BROWSER_CARD_TYPE_LABELS[first.cardInstance && first.cardInstance.cardTypeId] || 'Normal',
    };
  });
}

function deckBrowserNoteState(note){
  const b = note.cards.map(c => cardStudyBucket(c));
  if (b.every(x => x === 'new')) return 'Novo';
  if (b.some(x => x === 'learning')) return 'Aprendendo';
  return 'Revisão';
}

function openDeckPanel(nodeId){
  DECK_BROWSER.view = 'panel';
  DECK_BROWSER.nodeId = nodeId;
  DECK_BROWSER.panel = { query: '', tags: [], selected: new Set() };
  deckBrowserShow('panel');
  renderDeckPanel();
}

// O Painel mostra TODAS as Notes do escopo (inclusive cartões de lições
// ainda não estudadas), porque é uma tela de conteúdo, não de estudo.
function deckBrowserPanelNotes(){
  const decks = deckBrowserDecks();
  const all = (STATE && STATE.cards) || [];
  const scoped = DECK_BROWSER.nodeId === 'lang' ? all : getStudyScopeForDeck(decks, DECK_BROWSER.nodeId, all);
  return deckBrowserNotes(scoped);
}

function deckBrowserFilterNotes(notes){
  const q = (DECK_BROWSER.panel.query || '').trim().toLowerCase();
  const tags = DECK_BROWSER.panel.tags;
  return notes.filter(n => {
    if (tags.length && !tags.some(t => n.tags.includes(t))) return false;
    if (!q) return true;
    const hay = (n.front + ' ' + n.back + ' ' + n.tags.join(' ')).toLowerCase();
    return hay.includes(q);
  });
}

function renderDeckPanel(){
  const wrap = document.getElementById('review-deck-wrap');
  if (!wrap) return;
  const decks = deckBrowserDecks();
  const nodeId = DECK_BROWSER.nodeId;
  if (nodeId !== 'lang' && !getDeckById(decks, nodeId)){ backToDeckTable(); return; }
  const notes = deckBrowserPanelNotes();
  // Tags como filtro (seção 14). Num escopo grande (ex.: a raiz do idioma,
  // com todas as unidades do curso) as tags finas da trilha (unidade-*,
  // licao-*, palavra, na-frase) virariam centenas de botões: aí mostramos só
  // as gerais + as de cartões próprios/professora (mesma regra do filtro da
  // Revisão). A busca continua encontrando qualquer tag pelo texto.
  const scopeCards = notes.flatMap(n => n.cards);
  let allTags = collectTagsFromCards(scopeCards);
  if (allTags.length > 30 && typeof reviewFilterVisibleTags === 'function'){
    allTags = Array.from(new Set(reviewFilterVisibleTags(scopeCards).concat(DECK_BROWSER.panel.tags))).sort();
  }
  const uid = deckBrowserUserId();
  const moveTargets = decks.filter(d => ['personal_root', 'personal'].includes(d.kind) && d.owner_id === uid);
  wrap.innerHTML = `
    <button class="back-link" data-panel-back>← Voltar ao Deck</button>
    <div class="deck-panel">
      <h2 class="deck-detail-title">Painel · ${escapeHTML(deckBrowserNodeLabel(decks, nodeId))}</h2>
      <input type="search" class="profile-edit-input" data-panel-search placeholder="Buscar na frente, no verso ou nas tags (ex.: licao-2)" aria-label="Buscar cartões" value="${escapeHTML(DECK_BROWSER.panel.query)}">
      ${allTags.length ? `<div class="deck-panel-tags" data-panel-tags>
        <span class="profile-edit-hint">Filtrar por tag:</span>
        ${allTags.map(t => `<button type="button" class="leaderboard-tab ${DECK_BROWSER.panel.tags.includes(t) ? 'active' : ''}" data-panel-tag="${escapeHTML(t)}" aria-pressed="${DECK_BROWSER.panel.tags.includes(t) ? 'true' : 'false'}">#${escapeHTML(t)}</button>`).join('')}
      </div>` : ''}
      <div class="deck-panel-bulk" data-panel-bulk hidden>
        <span data-panel-selcount></span>
        ${moveTargets.length ? `<select class="profile-edit-input" data-panel-move-target aria-label="Mover para">${moveTargets.map(d => `<option value="${d.id}">${escapeHTML(deckBrowserDeckLabel(d))}</option>`).join('')}</select>
        <button type="button" class="btn btn-secondary" data-panel-move>Mover</button>` : ''}
        <button type="button" class="btn btn-secondary" data-panel-delete>Excluir</button>
        <button type="button" class="admin-select-link" data-panel-clear style="background:none;border:none;cursor:pointer;padding:0;">Limpar seleção</button>
      </div>
      <p class="profile-edit-hint" data-panel-count></p>
      <div class="deck-panel-list" data-panel-list></div>
      <p class="profile-edit-error" data-panel-error></p>
    </div>`;
  wrap.querySelector('[data-panel-back]').addEventListener('click', () => openDeckDetail(nodeId));
  const search = wrap.querySelector('[data-panel-search]');
  search.addEventListener('input', () => { DECK_BROWSER.panel.query = search.value; renderDeckPanelList(); });
  wrap.querySelectorAll('[data-panel-tag]').forEach(btn => btn.addEventListener('click', () => {
    const t = btn.dataset.panelTag;
    const set = DECK_BROWSER.panel.tags;
    const i = set.indexOf(t);
    if (i >= 0) set.splice(i, 1); else set.push(t);
    btn.classList.toggle('active', i < 0);
    btn.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
    renderDeckPanelList();
  }));
  wrap.querySelector('[data-panel-clear]').addEventListener('click', () => { DECK_BROWSER.panel.selected.clear(); renderDeckPanelList(); });
  wrap.querySelector('[data-panel-move]')?.addEventListener('click', deckPanelMoveSelected);
  wrap.querySelector('[data-panel-delete]').addEventListener('click', deckPanelDeleteSelected);
  renderDeckPanelList();
}

const DECK_PANEL_PAGE = 200;

function renderDeckPanelList(){
  const wrap = document.getElementById('review-deck-wrap');
  const list = wrap && wrap.querySelector('[data-panel-list]');
  if (!list) return;
  const decks = deckBrowserDecks();
  const notes = deckBrowserFilterNotes(deckBrowserPanelNotes());
  const sel = DECK_BROWSER.panel.selected;
  // Seleção só sobrevive para Notes ainda visíveis.
  const visibleKeys = new Set(notes.map(n => n.key));
  Array.from(sel).forEach(k => { if (!visibleKeys.has(k)) sel.delete(k); });
  wrap.querySelector('[data-panel-count]').textContent = notes.length
    ? `${notes.length} ${notes.length === 1 ? 'conteúdo' : 'conteúdos'}${notes.length > DECK_PANEL_PAGE ? ` (mostrando os primeiros ${DECK_PANEL_PAGE}; use a busca para encontrar os demais)` : ''}.`
    : '';
  if (!notes.length){
    list.innerHTML = `<p class="profile-empty-note">${DECK_BROWSER.panel.query || DECK_BROWSER.panel.tags.length ? 'Nenhum cartão encontrado com esse filtro.' : 'Este Deck ainda não tem cartões.'}</p>`;
  } else {
    list.innerHTML = notes.slice(0, DECK_PANEL_PAGE).map(n => {
      const editable = n.origin === 'self';
      const deck = getDeckById(decks, n.deckId);
      const cardsLabel = n.cards.length > 1 ? `${n.cards.length} cartões` : '1 cartão';
      return `<div class="admin-badge-row deck-panel-row" data-panel-note="${escapeHTML(n.key)}">
        ${editable ? `<input type="checkbox" data-panel-select="${escapeHTML(n.key)}" ${sel.has(n.key) ? 'checked' : ''} aria-label="Selecionar ${escapeHTML(n.front)}">` : `<span class="deck-panel-lock" title="Somente leitura">🔒</span>`}
        <div class="deck-panel-main">
          <div class="deck-panel-front">${escapeHTML(n.front)}</div>
          <div class="deck-panel-back">${escapeHTML(n.back)}</div>
          <div class="profile-edit-hint">${escapeHTML(n.typeLabel)} · ${cardsLabel} · ${deckBrowserNoteState(n)} · ${escapeHTML(DECK_BROWSER_ORIGIN_LABELS[n.origin] || '')}${deck ? ' · ' + escapeHTML(deckBrowserDeckLabel(deck)) : ''}${n.tags.length ? ' · ' + n.tags.map(t => '#' + escapeHTML(t)).join(' ') : ''}</div>
        </div>
        ${editable ? `<button type="button" class="admin-badge-delete-btn" data-panel-edit="${escapeHTML(String(n.rowId))}" title="Editar">✏️</button>` : ''}
      </div>`;
    }).join('');
  }
  list.querySelectorAll('[data-panel-select]').forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) sel.add(cb.dataset.panelSelect); else sel.delete(cb.dataset.panelSelect);
    deckPanelUpdateBulk();
  }));
  list.querySelectorAll('[data-panel-edit]').forEach(btn => btn.addEventListener('click', () => deckPanelEdit(btn.dataset.panelEdit)));
  deckPanelUpdateBulk();
}

function deckPanelUpdateBulk(){
  const wrap = document.getElementById('review-deck-wrap');
  const bulk = wrap && wrap.querySelector('[data-panel-bulk]');
  if (!bulk) return;
  const n = DECK_BROWSER.panel.selected.size;
  bulk.hidden = n === 0;
  wrap.querySelector('[data-panel-selcount]').textContent = `${n} ${n === 1 ? 'selecionado' : 'selecionados'}`;
}

function deckPanelSelectedNotes(){
  const keys = DECK_BROWSER.panel.selected;
  return deckBrowserPanelNotes().filter(n => keys.has(n.key) && n.origin === 'self');
}

async function deckPanelMoveSelected(){
  const wrap = document.getElementById('review-deck-wrap');
  const errEl = wrap.querySelector('[data-panel-error]');
  errEl.textContent = '';
  const decks = deckBrowserDecks();
  const dest = getDeckById(decks, Number(wrap.querySelector('[data-panel-move-target]').value));
  const notes = deckPanelSelectedNotes();
  if (!dest || !notes.length) return;
  wrap.querySelectorAll('[data-panel-bulk] button').forEach(b => { b.disabled = true; });
  let moved = 0; const failed = [];
  for (const n of notes){
    const res = await setOwnFlashcardDeck({ note: { id: n.rowId, owner_id: CURRENT_USER.id, language_app_key: APP_KEY }, destination: dest, decks });
    if (res.ok){
      moved++;
      n.cards.forEach(c => { c.deckId = dest.id; });
    } else failed.push(n.front);
  }
  DECK_BROWSER.panel.selected.clear();
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function' && moved) showToast(`${moved} ${moved === 1 ? 'conteúdo movido' : 'conteúdos movidos'} para "${deckBrowserDeckLabel(dest)}".`);
  if (failed.length) errEl.textContent = `Não foi possível mover: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}`;
  renderDeckPanel();
  if (failed.length) document.getElementById('review-deck-wrap').querySelector('[data-panel-error]').textContent = errEl.textContent;
}

async function deckPanelDeleteSelected(){
  const wrap = document.getElementById('review-deck-wrap');
  const notes = deckPanelSelectedNotes();
  if (!notes.length) return;
  const total = notes.reduce((s, n) => s + n.cards.length, 0);
  if (!window.confirm(`Excluir ${notes.length} ${notes.length === 1 ? 'conteúdo' : 'conteúdos'} (${total} ${total === 1 ? 'cartão' : 'cartões'}) para sempre? O histórico de revisão também será apagado.`)) return;
  wrap.querySelectorAll('[data-panel-bulk] button').forEach(b => { b.disabled = true; });
  let deleted = 0;
  for (const n of notes){
    const res = await deleteOwnFlashcardPermanently(n.rowId);
    if (res.ok){
      deleted++;
      if (typeof removeSelfFlashcardFromState === 'function') removeSelfFlashcardFromState(n.rowId);
    }
  }
  DECK_BROWSER.panel.selected.clear();
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function') showToast(`${deleted} ${deleted === 1 ? 'conteúdo excluído' : 'conteúdos excluídos'}.`);
  renderDeckPanel();
}

// Editar: usa o editor de sempre (Meus Cartões) -- nunca um 2º editor.
function deckPanelEdit(rowId){
  if (typeof switchTab === 'function') switchTab('my-flashcards');
  let tries = 0;
  const open = () => {
    const btn = document.querySelector(`[data-edit-own-flashcard="${CSS.escape(String(rowId))}"]`);
    if (btn){ btn.click(); setTimeout(() => btn.closest('.admin-badge-row, [data-own-flashcard-row]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) || document.getElementById('my-flashcards-content')?.querySelector('form')?.scrollIntoView({ behavior: 'smooth' }), 50); return; }
    if (++tries < 50) setTimeout(open, 100);
  };
  open();
}
