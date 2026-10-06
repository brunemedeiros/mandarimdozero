// ============================================================
// Navegador de Decks (doc de arquitetura total, seções 5.4, 12, 13, 14)
//
//   Barra no topo     -> "Decks | Adicionar | Painel", centralizada, igual
//                        em todas as telas de Decks (como a barra do Anki).
//                        Na tela de um Deck, Adicionar já vem com aquele
//                        Deck e o Painel já abre filtrado nele.
//   Revisão (início)  -> tabela "Deck | Novo | Aprendendo | Revisar",
//                        começando pelos Decks de topo (Trilha de Estudo,
//                        Meus Decks, Cartões da professora). Sem botão
//                        "Estudar" na tabela (seção 12). Embaixo: Criar
//                        Deck, Importar arquivo, Exportar.
//   Clique no Deck    -> tela do Deck (seção 13), no formato do Anki:
//                        nome, Novo/Aprendendo/Revisar e "Estudar agora".
//   Painel            -> JANELA por cima da tela (seção 14), no formato do
//                        navegador do Anki: filtros à esquerda (Decks,
//                        Estado, Tags), lista no meio, editor à direita.
//   Adicionar         -> JANELA com o formulário de criação.
//   Excluir Deck      -> diálogo da seção 5.4 (mover ou excluir, subárvore
//                        inteira).
//
// Esta tela substitui a antiga "Meus Cartões" (pedido da autora,
// 2026-10-06): criar/editar/excluir cartões, Decks, tags, importar e
// exportar vivem aqui agora.
//
// Compartilhado entre fr e zh. Só COMPÕE peças que já existem:
//   - contagens: structuralCounts (K.5) sobre eligibleDeckReviewPool();
//   - estudo: startDeckReviewSession (Fase D);
//   - criação/edição: formulários de shared/my-flashcards.js (mesmo editor
//     nativo, mesmo limite do plano);
//   - escrita: shared/deck-data.js / shared/own-flashcards.js. RLS e
//     triggers continuam a autoridade.
// ============================================================

const DECK_BROWSER = {
  view: 'home',      // 'home' | 'detail' (tela por baixo do Painel)
  nodeId: null,      // id numérico do Deck aberto ('lang' = todos)
  panelOpen: false,
  panel: null,
  teacherLink: {},   // { 'uid:APP_KEY': true|false } -- vínculo ATIVO com professora neste idioma
};

// "Cartões da professora" só aparece para quem é aluno vinculado a uma
// professora NESTE idioma (vínculo teacher_students ativo). Um teacher_root
// antigo (vínculo removido; a migration 054 não deixa apagá-lo) fica
// escondido da tabela e do Painel. Enquanto a checagem não volta, esconde.
async function deckBrowserLoadTeacherLink(){
  const uid = deckBrowserUserId();
  if (!uid || typeof supabaseClient === 'undefined' || !supabaseClient) return false;
  const key = uid + ':' + APP_KEY;
  if (typeof DECK_BROWSER.teacherLink[key] === 'boolean') return DECK_BROWSER.teacherLink[key];
  try {
    const { data, error } = await supabaseClient
      .from('teacher_students')
      .select('id')
      .eq('student_id', uid)
      .eq('language_app_key', APP_KEY)
      .eq('status', 'active');
    if (error) throw error;
    DECK_BROWSER.teacherLink[key] = (data || []).length > 0;
  } catch (e) {
    console.error('Erro ao checar vínculo com professora:', e);
    return false; // não guarda: tenta de novo na próxima abertura
  }
  return DECK_BROWSER.teacherLink[key];
}
function deckBrowserIsTeacherDeck(deck){ return !!deck && (deck.kind === 'teacher_root' || deck.kind === 'teacher'); }
function deckBrowserHasTeacherLink(){ const uid = deckBrowserUserId(); return !!uid && DECK_BROWSER.teacherLink[uid + ':' + APP_KEY] === true; }

async function deckBrowserEnsureLoaded(){
  if (typeof ensureDecksLoadedForReview === 'function') await ensureDecksLoadedForReview();
  await deckBrowserLoadTeacherLink();
}

const DECK_BROWSER_LANG_LABELS = { frances: 'Francês', mandarim: 'Mandarim', portugues: 'Português' };

// Link de compartilhamento de cartões (#import=...) capturado no carregamento
// da página, antes de o roteador trocar o endereço.
const DECK_BROWSER_PENDING_IMPORT = (() => {
  try {
    const m = (location.hash || '').match(/[#&]import=([^&]+)/);
    return m ? m[1] : null;
  } catch (e) { return null; }
})();
let DECK_BROWSER_IMPORT_DONE = false;

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

// Rótulo de um Deck. A raiz do curso aparece como "Trilha de Estudo"
// (pedido da autora); personal_root como "Meus Decks".
function deckBrowserDeckLabel(deck){
  if (!deck) return '';
  if (deck.kind === 'personal_root') return 'Meus Decks';
  if (deck.kind === 'teacher_root') return 'Cartões da professora';
  if (deck.kind === 'course' && deck.course_unit_id == null && deck.parent_deck_id == null) return 'Trilha de Estudo';
  return deck.name || '';
}
function deckBrowserLangLabel(){
  return DECK_BROWSER_LANG_LABELS[APP_KEY] || 'Idioma';
}

// Filhos exibidos. 'lang' é a raiz virtual (todos os Decks do idioma): a
// Trilha de Estudo + os filhos do Deck raiz da conta. Ela NÃO aparece como
// linha na tabela (não há outro Deck do mesmo nível); continua existindo
// para o Painel e o Adicionar da tela inicial.
function deckBrowserChildren(decks, nodeId){
  const kindOrder = { course: 0, personal_root: 1, teacher_root: 2 };
  if (nodeId === 'lang'){
    const out = [];
    const course = deckBrowserCourseRoot(decks);
    if (course) out.push(course);
    const root = deckBrowserRootDeck(decks);
    if (root) getDeckChildren(decks, root.id)
      .filter(d => d.kind !== 'teacher_root' || deckBrowserHasTeacherLink())
      .forEach(d => out.push(d));
    return out.sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9) || a.id - b.id);
  }
  return getDeckChildren(decks, nodeId).slice().sort((a, b) => {
    // Unidades da Trilha seguem a ordem do currículo (UNITS); o resto por id.
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

// Cartões do escopo de um nó ('lang' = todo o pool do idioma).
function deckBrowserScope(decks, nodeId, cards){
  if (nodeId === 'lang') return cards;
  return getStudyScopeForDeck(decks, nodeId, cards);
}

// Contagens: Novo / Aprendendo / Revisar (= revisões devidas agora), como
// as colunas do Anki. Fonte única: structuralCounts (K.5). "Novo" mostra o
// que entra numa sessão (no máximo "Novas palavras por dia"); o total de
// novos fica em `newTotal`. Filtro de tag da Revisão não entra.
function deckBrowserCounts(decks, nodeId, pool){
  const sc = structuralCounts(deckBrowserScope(decks, nodeId, pool));
  const cap = (typeof STATE !== 'undefined' && STATE.studySettings && Number.isFinite(Number(STATE.studySettings.newCardsPerDay)))
    ? Number(STATE.studySettings.newCardsPerDay) : Infinity;
  return { total: sc.cards, new: Math.min(sc.new, cap), newTotal: sc.new, learning: sc.learning, review: sc.reviewDue, due: sc.due };
}

function deckBrowserNodeLabel(decks, nodeId){
  if (nodeId === 'lang') return 'Todos os Decks';
  return deckBrowserDeckLabel(getDeckById(decks, nodeId));
}

// Caminho do Deck ("Meus Decks › Verbos"), sem a raiz da conta.
function deckBrowserBreadcrumb(decks, nodeId){
  if (nodeId === 'lang') return ['Todos os Decks'];
  const chain = getDeckAncestors(decks, nodeId).slice().reverse()
    .filter(d => d.kind !== 'root')
    .map(deckBrowserDeckLabel);
  return [...chain, deckBrowserNodeLabel(decks, nodeId)];
}

// Cartões próprios antigos (antes dos Decks) sem deck_id.
function deckBrowserOrphanCount(){
  const cards = (typeof STATE !== 'undefined' && STATE.cards) || [];
  return new Set(cards.filter(c => c.origin === 'self' && c.deckId == null && c.flashcardStatus !== 'archived').map(c => c.rowId)).size;
}

// Contexto dos cartões próprios (linhas, plano, Decks). Mesmo carregamento
// do formulário de criação; usado por Exportar, Importar e pelo Painel.
async function deckBrowserLoadOwnContext(){
  if (!deckBrowserUserId() || typeof loadMyFlashcardsContext !== 'function') return null;
  try {
    return await loadMyFlashcardsContext();
  } catch (e) {
    console.error('Erro ao carregar seus cartões:', e);
    return null;
  }
}

// ---------- Barra superior (Decks | Adicionar | Painel | Configurar) ----------

// Mesma barra em todas as telas de Decks. Na tela de um Deck, Adicionar
// usa aquele Deck (se for seu) e o Painel abre filtrado nele.
function deckTopbarHTML(nodeId){
  const canAdd = !!deckBrowserUserId();
  const onHome = nodeId === 'lang';
  // "Decks" fica marcado também dentro de um Deck (a pessoa está na área de
  // Decks); só a tela inicial é a "página atual".
  return `<nav class="deck-topbar" aria-label="Decks">
      <button type="button" class="deck-topbar-btn is-active" data-topbar-decks aria-current="${onHome ? 'page' : 'location'}">Decks</button>
      ${canAdd ? `<button type="button" class="deck-topbar-btn" data-topbar-add>Adicionar</button>` : ''}
      <button type="button" class="deck-topbar-btn" data-topbar-panel>Painel</button>
      ${typeof toggleReviewSettingsPanel === 'function' ? `<button type="button" class="deck-topbar-btn" data-topbar-settings>Configurar</button>` : ''}
    </nav>`;
}

function wireDeckTopbar(container, nodeId){
  container.querySelector('[data-topbar-decks]')?.addEventListener('click', () => { if (nodeId !== 'lang') backToDeckTable(); });
  container.querySelector('[data-topbar-add]')?.addEventListener('click', () => {
    const deck = nodeId === 'lang' ? null : getDeckById(deckBrowserDecks(), nodeId);
    openAddCardModal({ deckId: deck && ['personal_root', 'personal'].includes(deck.kind) ? deck.id : null });
  });
  container.querySelector('[data-topbar-panel]')?.addEventListener('click', () => openDeckPanel(nodeId));
  // Abre os ajustes numa janela, sem sair da tela atual.
  container.querySelector('[data-topbar-settings]')?.addEventListener('click', () => openReviewSettingsModal());
}

// ---------- Configurar (janela) ----------

// O painel de ajustes (#review-settings-panel, com os listeners do app)
// é movido para dentro da janela ao abrir e devolvido ao lugar ao fechar
// -- nunca duplicado. Ao fechar, as contagens são refeitas (o limite de
// "Novas palavras por dia" muda os números dos Decks).
const REVIEW_SETTINGS_MODAL_ID = 'review-settings-modal';
let REVIEW_SETTINGS_HOME = null;

function closeReviewSettingsModal(){
  const el = document.getElementById(REVIEW_SETTINGS_MODAL_ID);
  if (!el) return;
  const panel = document.getElementById('review-settings-panel');
  if (panel){
    panel.setAttribute('hidden', '');
    if (REVIEW_SETTINGS_HOME && REVIEW_SETTINGS_HOME.parentNode) REVIEW_SETTINGS_HOME.parentNode.insertBefore(panel, REVIEW_SETTINGS_HOME);
  }
  el.remove();
  document.removeEventListener('keydown', reviewSettingsModalOnKey);
  deckBrowserRefresh();
}
function reviewSettingsModalOnKey(e){
  if (e.key !== 'Escape') return;
  if (deckBrowserTopModalIs(REVIEW_SETTINGS_MODAL_ID)) closeReviewSettingsModal();
}

function openReviewSettingsModal(){
  const panel = document.getElementById('review-settings-panel');
  if (!panel) return;
  if (document.getElementById(REVIEW_SETTINGS_MODAL_ID)) return;
  if (!REVIEW_SETTINGS_HOME){
    REVIEW_SETTINGS_HOME = document.createComment('review-settings-panel');
    panel.parentNode.insertBefore(REVIEW_SETTINGS_HOME, panel);
  }
  const overlay = document.createElement('div');
  overlay.id = REVIEW_SETTINGS_MODAL_ID;
  overlay.className = 'app-modal-overlay';
  overlay.style.zIndex = 'calc(var(--z-modal-backdrop) - 1)';
  overlay.innerHTML = `
    <div class="app-modal review-settings-modal" role="dialog" aria-modal="true" aria-labelledby="review-settings-modal-title">
      <div class="app-modal-header">
        <h3 id="review-settings-modal-title">Configurar</h3>
        <button type="button" class="app-modal-close" data-review-settings-close aria-label="Fechar">✕</button>
      </div>
      <div class="app-modal-body" id="review-settings-modal-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#review-settings-modal-body').appendChild(panel);
  panel.removeAttribute('hidden');
  if (typeof renderReviewSettingsView === 'function') renderReviewSettingsView();
  overlay.querySelector('[data-review-settings-close]').addEventListener('click', closeReviewSettingsModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeReviewSettingsModal(); });
  document.addEventListener('keydown', reviewSettingsModalOnKey);
}

// ---------- Containers ----------

function deckBrowserShow(which){
  const modes = document.getElementById('review-mode-select-wrap');
  const deckWrap = document.getElementById('review-deck-wrap');
  const session = document.getElementById('review-session-wrap');
  if (session) session.style.display = 'none';
  if (modes) modes.style.display = which === 'home' ? 'block' : 'none';
  if (deckWrap) deckWrap.style.display = which === 'home' ? 'none' : 'block';
}

// Redesenha a tela que está aberta (depois de criar/importar/excluir).
function deckBrowserRefresh(){
  if (DECK_BROWSER.panelOpen){ deckPanelReload(); return; }
  if (DECK_BROWSER.view === 'detail') renderDeckDetail();
  else if (typeof renderReviewModeSelect === 'function') renderReviewModeSelect();
  else renderReviewDeckTable();
}

// ---------- Tela inicial: tabela de Decks ----------

let DECK_BROWSER_RENDER_TOKEN = 0;

async function renderReviewDeckTable(){
  const box = document.getElementById('review-decks-table');
  const top = document.getElementById('review-deck-topbar-home');
  if (top){ top.innerHTML = deckTopbarHTML('lang'); wireDeckTopbar(top, 'lang'); }
  if (!box) return;
  const token = ++DECK_BROWSER_RENDER_TOKEN;
  if (!((STATE.decks || []).length)) box.innerHTML = `<p class="profile-edit-hint">Carregando seus Decks…</p>`;
  try {
    await deckBrowserEnsureLoaded();
  } catch (e) {
    console.error('Erro ao carregar Decks da Revisão:', e);
  }
  if (token !== DECK_BROWSER_RENDER_TOKEN) return;
  box.innerHTML = deckBrowserTableHTML();
  wireDeckBrowserTable(box);
  deckBrowserMaybeImportFromLink();
}

function deckBrowserDefaultCollapsed(decks){
  // Padrão: a Trilha de Estudo começa fechada (dezenas de unidades).
  const set = new Set();
  const course = deckBrowserCourseRoot(decks);
  if (course) set.add(String(course.id));
  return set;
}

function deckBrowserTableHTML(){
  const decks = deckBrowserDecks();
  const pool = deckBrowserPool();
  const collapsed = deckBrowserLoadCollapsed() || deckBrowserDefaultCollapsed(decks);
  const rows = [];
  const walk = (nodeId, depth) => {
    const kids = deckBrowserChildren(decks, nodeId);
    const c = deckBrowserCounts(decks, nodeId, pool);
    const isCollapsed = collapsed.has(String(nodeId));
    const label = deckBrowserNodeLabel(decks, nodeId);
    const toggle = kids.length
      ? `<button type="button" class="deck-table-toggle" data-deck-toggle="${nodeId}" aria-label="${isCollapsed ? 'Abrir' : 'Fechar'} ${escapeHTML(label)}" aria-expanded="${isCollapsed ? 'false' : 'true'}">${isCollapsed ? '+' : '−'}</button>`
      : `<span class="deck-table-toggle-spacer"></span>`;
    const num = (n, cls) => `<td class="deck-table-num ${n ? cls : 'is-zero'}">${n}</td>`;
    rows.push(`<tr data-deck-row="${nodeId}">
      <td><div class="deck-table-name" style="padding-left:${depth * 18}px;">${toggle}<button type="button" class="deck-table-link" data-deck-open="${nodeId}">${escapeHTML(label)}</button></div></td>
      ${num(c.new, 'is-new')}${num(c.learning, 'is-learning')}${num(c.review, 'is-review')}
    </tr>`);
    if (!isCollapsed) kids.forEach(k => walk(k.id, depth + 1));
  };
  deckBrowserChildren(decks, 'lang').forEach(d => walk(d.id, 0));
  const logged = !!deckBrowserUserId();
  const orphans = deckBrowserOrphanCount();
  return `<table class="deck-table">
      <thead><tr><th scope="col">Deck</th><th scope="col">Novo</th><th scope="col">Aprendendo</th><th scope="col">Revisar</th></tr></thead>
      <tbody>${rows.length ? rows.join('') : `<tr><td colspan="4" class="profile-edit-hint">Nenhum Deck ainda. Conclua uma lição ou crie um Deck.</td></tr>`}</tbody>
    </table>
    ${orphans ? `<p class="profile-edit-hint deck-table-hint">${orphans} dos seus cartões antigos ainda não estão em nenhum Deck. Abra o Painel para vê-los e movê-los.</p>` : ''}
    ${logged ? `<div class="deck-home-actions">
      <button type="button" class="btn btn-secondary deck-home-btn" data-deck-create>Criar Deck</button>
      <button type="button" class="btn btn-secondary deck-home-btn" data-deck-import>Importar arquivo</button>
      <button type="button" class="btn btn-secondary deck-home-btn" data-deck-export>Exportar</button>
      <input type="file" data-deck-import-file accept=".apkg,.json,application/json" hidden>
    </div>
    <div data-deck-create-box></div>` : ''}`;
}

function wireDeckBrowserTable(box){
  box.querySelectorAll('[data-deck-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.deckToggle;
    const set = deckBrowserLoadCollapsed() || deckBrowserDefaultCollapsed(deckBrowserDecks());
    if (set.has(id)) set.delete(id); else set.add(id);
    deckBrowserSaveCollapsed(set);
    box.innerHTML = deckBrowserTableHTML();
    wireDeckBrowserTable(box);
  }));
  box.querySelectorAll('[data-deck-open]').forEach(btn => btn.addEventListener('click', () => openDeckDetail(Number(btn.dataset.deckOpen))));
  box.querySelector('[data-deck-create]')?.addEventListener('click', () => openCreateDeckForm(box.querySelector('[data-deck-create-box]'), null));
  const fileInput = box.querySelector('[data-deck-import-file]');
  box.querySelector('[data-deck-import]')?.addEventListener('click', () => fileInput && fileInput.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (file) deckBrowserImportFile(file);
  });
  box.querySelector('[data-deck-export]')?.addEventListener('click', deckBrowserExport);
}

// ---------- Criar Deck / Renomear ----------

// Formulário curto (nome + onde fica). `parentId` já escolhido quando vem
// da tela de um Deck ("Criar subdeck").
function openCreateDeckForm(box, parentId){
  if (!box) return;
  const decks = deckBrowserDecks();
  const options = (typeof orderedPersonalDecks === 'function' ? orderedPersonalDecks(decks) : []);
  if (!options.length){ box.innerHTML = `<p class="profile-edit-error">Não foi possível carregar "Meus Decks". Recarregue a página.</p>`; return; }
  box.innerHTML = `<div class="deck-inline-form" role="group" aria-label="Criar Deck">
      <label class="profile-edit-label" for="deck-create-name">Nome do Deck</label>
      <input type="text" id="deck-create-name" class="profile-edit-input" maxlength="60" placeholder="Ex.: Verbos">
      <label class="profile-edit-label" for="deck-create-parent">Dentro de</label>
      <select id="deck-create-parent" class="profile-edit-input">${options.map(d => `<option value="${d.id}" ${d.id === parentId ? 'selected' : ''}>${'  '.repeat(Math.max(0, personalDeckDepth(decks, d) - 1))}${escapeHTML(deckBrowserDeckLabel(d))}</option>`).join('')}</select>
      <p class="profile-edit-error" data-deck-create-error></p>
      <div class="deck-inline-actions">
        <button type="button" class="btn btn-secondary" data-deck-create-cancel>Cancelar</button>
        <button type="button" class="btn btn-primary" data-deck-create-save>Criar Deck</button>
      </div>
    </div>`;
  const nameEl = box.querySelector('#deck-create-name');
  nameEl.focus();
  box.querySelector('[data-deck-create-cancel]').addEventListener('click', () => { box.innerHTML = ''; });
  const save = async () => {
    const errEl = box.querySelector('[data-deck-create-error]');
    const btn = box.querySelector('[data-deck-create-save]');
    errEl.textContent = '';
    btn.disabled = true;
    const res = await createPersonalDeck({ name: nameEl.value, parentDeckId: Number(box.querySelector('#deck-create-parent').value), languageAppKey: APP_KEY, decks });
    btn.disabled = false;
    if (!res.ok){ errEl.textContent = res.error; return; }
    STATE.decks = (STATE.decks || []).concat([res.deck]);
    if (typeof MY_FLASHCARDS_STATE !== 'undefined') MY_FLASHCARDS_STATE._decks = STATE.decks;
    if (typeof showToast === 'function') showToast(`✓ Deck "${res.deck.name}" criado.`);
    box.innerHTML = '';
    deckBrowserRefresh();
  };
  box.querySelector('[data-deck-create-save]').addEventListener('click', save);
  nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); save(); } });
}

function openRenameDeckForm(box, deck){
  if (!box) return;
  box.innerHTML = `<div class="deck-inline-form" role="group" aria-label="Renomear Deck">
      <label class="profile-edit-label" for="deck-rename-name">Novo nome</label>
      <input type="text" id="deck-rename-name" class="profile-edit-input" maxlength="60" value="${escapeHTML(deck.name || '')}">
      <p class="profile-edit-error" data-deck-rename-error></p>
      <div class="deck-inline-actions">
        <button type="button" class="btn btn-secondary" data-deck-rename-cancel>Cancelar</button>
        <button type="button" class="btn btn-primary" data-deck-rename-save>Salvar</button>
      </div>
    </div>`;
  const nameEl = box.querySelector('#deck-rename-name');
  nameEl.focus();
  nameEl.select();
  box.querySelector('[data-deck-rename-cancel]').addEventListener('click', () => { box.innerHTML = ''; });
  const save = async () => {
    const errEl = box.querySelector('[data-deck-rename-error]');
    errEl.textContent = '';
    const res = await renamePersonalDeck(deck.id, nameEl.value);
    if (!res.ok){ errEl.textContent = res.error; return; }
    deck.name = nameEl.value.trim();
    renderDeckDetail();
  };
  box.querySelector('[data-deck-rename-save]').addEventListener('click', save);
  nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); save(); } });
}

// ---------- Importar / Exportar ----------

// Um botão só: .apkg vai para o importador do Anki; .json (arquivo
// exportado por outra conta) para o importador de cartões.
async function deckBrowserImportFile(file){
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.apkg')){
    if (typeof handleAnkiImportFileSelected === 'function') handleAnkiImportFileSelected(file);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (e) {
    if (typeof showToast === 'function') showToast('Não foi possível ler este arquivo. Use um .apkg do Anki ou um .json exportado por este site.');
    return;
  }
  await deckBrowserImportPayload(payload);
}

async function deckBrowserImportPayload(payload){
  const ctx = await deckBrowserLoadOwnContext();
  if (!ctx){ if (typeof showToast === 'function') showToast('Entre na sua conta para importar cartões.'); return; }
  const errorEl = { set textContent(v){ if (v && typeof showToast === 'function') showToast(v); } };
  await confirmAndImportMyFlashcards(payload, errorEl);
}

// Link de compartilhamento (#import=...): importa uma vez, já logada.
function deckBrowserMaybeImportFromLink(){
  if (!DECK_BROWSER_PENDING_IMPORT || DECK_BROWSER_IMPORT_DONE || !deckBrowserUserId()) return;
  DECK_BROWSER_IMPORT_DONE = true;
  let payload = null;
  try {
    payload = JSON.parse(decodeURIComponent(escape(atob(DECK_BROWSER_PENDING_IMPORT))));
  } catch (e) {
    if (typeof showToast === 'function') showToast('O link de cartões compartilhados está incompleto ou corrompido.');
    return;
  }
  deckBrowserImportPayload(payload);
}

async function deckBrowserExport(){
  const ctx = await deckBrowserLoadOwnContext();
  if (!ctx) return;
  if (!ctx.activeCards.length){
    if (typeof showToast === 'function') showToast('Você ainda não tem cartões próprios para exportar.');
    return;
  }
  openMyFlashcardsExportModal(ctx.activeCards);
}

// ---------- Tela do Deck (formato do Anki) ----------

function deckBrowserCanAddCard(deck){
  if (!deckBrowserUserId()) return false;
  return !!deck && (deck.kind === 'personal_root' || deck.kind === 'personal');
}

function deckBrowserRoute(view, nodeId){
  return { type: 'deckBrowser', view, nodeId };
}

function openDeckDetail(nodeId){
  if (nodeId === 'lang'){ backToDeckTable(); return; }
  DECK_BROWSER.view = 'detail';
  DECK_BROWSER.nodeId = nodeId;
  deckBrowserShow('detail');
  renderDeckDetail();
  if (DECK_BROWSER.view === 'detail' && typeof routerNavigate === 'function') routerNavigate(deckBrowserRoute('detail', nodeId));
}

// Recarregar a página (ou Voltar/Avançar) num endereço #/review/decks/...:
// espera os Decks carregarem e reabre a mesma tela. Deck que não existe mais
// volta para a tabela.
let DECK_BROWSER_RESTORE_TOKEN = 0;
async function restoreDeckBrowserRoute(route){
  const token = ++DECK_BROWSER_RESTORE_TOKEN;
  try {
    await deckBrowserEnsureLoaded();
  } catch (e) {
    console.error('Erro ao carregar Decks para restaurar a tela:', e);
  }
  if (token !== DECK_BROWSER_RESTORE_TOKEN) return;
  const app = document.getElementById('app');
  if (app && app.dataset.activeTab && app.dataset.activeTab !== 'review') return; // a pessoa já saiu da Revisão
  const routeDeck = route.nodeId !== 'lang' ? getDeckById(deckBrowserDecks(), route.nodeId) : null;
  if (route.nodeId !== 'lang' && (!routeDeck || (deckBrowserIsTeacherDeck(routeDeck) && !deckBrowserHasTeacherLink()))){ backToDeckTable(); return; }
  if (route.view === 'panel') openDeckPanel(route.nodeId);
  else openDeckDetail(route.nodeId);
}

function renderDeckDetail(){
  const wrap = document.getElementById('review-deck-wrap');
  if (!wrap) return;
  const decks = deckBrowserDecks();
  const nodeId = DECK_BROWSER.nodeId;
  const deck = getDeckById(decks, nodeId);
  if (!deck){ backToDeckTable(); return; }
  const pool = deckBrowserPool();
  const c = deckBrowserCounts(decks, nodeId, pool);
  const isPersonal = deck.kind === 'personal';
  const canHaveChildren = deck.kind === 'personal_root' || isPersonal;
  let hint = '';
  if (deck.kind === 'course') hint = 'Os cartões da Trilha de Estudo vêm das lições: cada lição concluída libera os cartões dela.';
  else if (deck.kind === 'teacher_root' || deck.kind === 'teacher') hint = 'Estes cartões são organizados pela sua professora. Aqui você só estuda.';
  const crumbs = deckBrowserBreadcrumb(decks, nodeId);
  const totalLine = `${c.total} ${c.total === 1 ? 'cartão' : 'cartões'}${getDeckChildren(decks, nodeId).length ? ' neste Deck e nos subdecks' : ''}${c.newTotal > c.new ? ` · até ${c.new} ${c.new === 1 ? 'novo' : 'novos'} por dia` : ''}`;
  const canAddHere = deckBrowserCanAddCard(deck);
  const count = (n, cls, label) => `<div class="deck-overview-count"><dt>${label}</dt><dd class="${n ? cls : 'is-zero'}">${n}</dd></div>`;
  const pathHTML = crumbs.length > 1 ? `<span class="deck-overview-path">${crumbs.slice(0, -1).map(escapeHTML).join(' › ')} › </span>` : '';
  const studyHTML = c.total
    ? `<button type="button" class="btn btn-primary deck-overview-study" data-deck-study>Estudar agora</button>`
    : `<div class="deck-overview-empty"><p class="deck-overview-empty-msg">Este Deck ainda não tem cartões.</p>${canAddHere ? `<button type="button" class="btn btn-primary deck-overview-study" data-deck-empty-add>Adicionar cartão</button>` : ''}</div>`;
  wrap.innerHTML = `
    <div class="path-header"><h2>Revisão</h2></div>
    ${deckTopbarHTML(nodeId)}
    <div class="deck-overview">
      <h2 class="deck-overview-title">${pathHTML}<span class="deck-overview-name">${escapeHTML(crumbs[crumbs.length - 1] || '')}</span></h2>
      <div class="deck-overview-body">
        <dl class="deck-overview-counts">
          ${count(c.new, 'is-new', 'Novo')}${count(c.learning, 'is-learning', 'Aprendendo')}${count(c.review, 'is-review', 'Revisar')}
        </dl>
        ${studyHTML}
      </div>
      ${c.total ? `<p class="deck-overview-total">${escapeHTML(totalLine)}</p>` : ''}
      ${hint ? `<p class="profile-edit-hint deck-overview-hint">${escapeHTML(hint)}</p>` : ''}
    </div>
    ${canHaveChildren ? `<div class="deck-overview-footer">
      <button type="button" class="btn btn-secondary deck-home-btn" data-deck-subdeck>Criar subdeck</button>
      ${isPersonal ? `<button type="button" class="btn btn-secondary deck-home-btn" data-deck-rename>Renomear</button>` : ''}
      ${isPersonal && typeof openPublishBox === 'function' ? `<button type="button" class="btn btn-secondary deck-home-btn" data-deck-publish>${deck.is_public ? '🌐 Público' : 'Publicar'}</button>` : ''}
      ${isPersonal ? `<button type="button" class="btn btn-secondary deck-home-btn deck-overview-danger" data-deck-delete>Excluir</button>` : ''}
    </div>
    <div class="deck-overview-extra" data-deck-extra-box></div>` : ''}`;
  wireDeckTopbar(wrap, nodeId);
  const extra = wrap.querySelector('[data-deck-extra-box]');
  wrap.querySelector('[data-deck-study]')?.addEventListener('click', () => deckBrowserStudy(nodeId));
  wrap.querySelector('[data-deck-empty-add]')?.addEventListener('click', () => openAddCardModal({ deckId: deck.id }));
  wrap.querySelector('[data-deck-subdeck]')?.addEventListener('click', () => openCreateDeckForm(extra, deck.id));
  wrap.querySelector('[data-deck-rename]')?.addEventListener('click', () => openRenameDeckForm(extra, deck));
  wrap.querySelector('[data-deck-publish]')?.addEventListener('click', (ev) => {
    const btn = ev.currentTarget;
    openPublishBox(deck, extra, (d) => { btn.textContent = d.is_public ? '🌐 Público' : 'Publicar'; });
  });
  wrap.querySelector('[data-deck-delete]')?.addEventListener('click', () => openDeckDeleteDialog(deck, extra));
}

function backToDeckTable(){
  DECK_BROWSER.view = 'home';
  DECK_BROWSER.nodeId = null;
  deckBrowserShow('home');
  if (typeof renderReviewModeSelect === 'function') renderReviewModeSelect();
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'tab', tab: 'review' });
}

// Estudar: startDeckReviewSession (Deck + subdecks, mesma fila e FSRS).
function deckBrowserStudy(nodeId){
  if (typeof startDeckReviewSession === 'function') startDeckReviewSession(nodeId);
}

// ---------- Adicionar (janela) ----------

const ADD_CARD_MODAL_ID = 'add-card-modal';
let ADD_CARD_MODAL_CREATED = 0;

function closeAddCardModal(){
  const el = document.getElementById(ADD_CARD_MODAL_ID);
  if (!el) return;
  el.remove();
  document.removeEventListener('keydown', addCardModalOnKey);
  if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
  if (ADD_CARD_MODAL_CREATED){
    ADD_CARD_MODAL_CREATED = 0;
    deckBrowserRefresh();
  }
}
// A janela `id` é a de cima? (Esc só fecha a janela mais alta.) Overlays
// são position:fixed (offsetParent é sempre null), por isso o display
// calculado decide se está aberta.
function deckBrowserTopModalIs(id){
  const me = document.getElementById(id);
  if (!me) return false;
  const z = el => Number(getComputedStyle(el).zIndex) || 0;
  const others = Array.from(document.querySelectorAll('.app-modal-overlay'))
    .filter(o => o !== me && getComputedStyle(o).display !== 'none');
  return others.every(o => z(o) < z(me));
}
function addCardModalOnKey(e){
  if (e.key !== 'Escape') return;
  if (deckBrowserTopModalIs(ADD_CARD_MODAL_ID)) closeAddCardModal();
}

// Cria um campo de cada lado já com o idioma certo (1º = idioma estudado,
// 2º = português), como a nota "Básico" do Anki já vem com Frente e Verso.
function deckBrowserNewNoteState(){
  const st = createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: APP_KEY });
  if (typeof addFieldToEditorState === 'function'){ addFieldToEditorState(st, {}); addFieldToEditorState(st, {}); }
  return st;
}

async function openAddCardModal(opts){
  const deckId = opts && opts.deckId != null ? opts.deckId : null;
  if (!deckBrowserUserId()){
    if (typeof showToast === 'function') showToast('Entre na sua conta para criar cartões.');
    return;
  }
  closeAddCardModal();
  ADD_CARD_MODAL_CREATED = 0;
  // O formulário usa ids fixos: limpa qualquer cópia escondida.
  const mine = document.getElementById('my-flashcards-content');
  if (mine) mine.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.id = ADD_CARD_MODAL_ID;
  overlay.className = 'app-modal-overlay';
  // Abaixo das janelas fixas (pré-visualização, limite, confirmação), que
  // podem abrir por cima desta; acima do Painel.
  overlay.style.zIndex = 'calc(var(--z-modal-backdrop) - 1)';
  overlay.innerHTML = `
    <div class="app-modal add-card-modal" role="dialog" aria-modal="true" aria-labelledby="add-card-modal-title">
      <div class="app-modal-header">
        <h3 id="add-card-modal-title">Adicionar cartão</h3>
        <button type="button" class="app-modal-close" data-add-card-close aria-label="Fechar">✕</button>
      </div>
      <div class="app-modal-body" id="add-card-modal-body"><p class="profile-edit-hint">Carregando…</p></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-add-card-close]').addEventListener('click', closeAddCardModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAddCardModal(); });
  document.addEventListener('keydown', addCardModalOnKey);
  await renderAddCardModalBody(deckId);
}

async function renderAddCardModalBody(deckId){
  const body = document.getElementById('add-card-modal-body');
  if (!body) return;
  let ctx;
  try {
    ctx = await loadMyFlashcardsContext();
  } catch (e) {
    console.error('Erro ao abrir Adicionar cartão:', e);
    if (document.getElementById('add-card-modal-body')) body.innerHTML = `<p class="profile-edit-error">Não foi possível carregar. Tente de novo.</p>`;
    return;
  }
  if (!document.getElementById('add-card-modal-body')) return; // fechou enquanto carregava
  MY_FLASHCARDS_STATE.nativeCardState = deckBrowserNewNoteState();
  body.innerHTML = myCreateFlashcardFormHTML(ctx);
  const sel = document.getElementById('my-flashcard-deck');
  if (sel && deckId != null && Array.from(sel.options).some(o => Number(o.value) === deckId)) sel.value = String(deckId);
  wireMyFlashcardsForm(body, ctx.atLimit, ctx.premium, () => {
    // Como no Anki: depois de criar, a janela continua aberta e limpa,
    // no mesmo Deck, para adicionar o próximo.
    ADD_CARD_MODAL_CREATED++;
    const keepDeck = document.getElementById('my-flashcard-deck');
    renderAddCardModalBody(keepDeck && keepDeck.value ? Number(keepDeck.value) : deckId).then(() => {
      if (ADD_CARD_MODAL_CREATED){
        const h = document.querySelector('#add-card-modal-body .section-label');
        if (h && !h.querySelector('.add-card-done')) h.insertAdjacentHTML('beforeend', `<span class="pill add-card-done">✓ ${ADD_CARD_MODAL_CREATED} criado${ADD_CARD_MODAL_CREATED === 1 ? '' : 's'}</span>`);
      }
    });
  });
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
      <div class="deck-inline-actions">
        ${noteCount ? `<button type="button" class="btn btn-secondary" data-deck-delete-move>Mover para outro deck</button>` : ''}
        <button type="button" class="btn btn-primary deck-delete-confirm" data-deck-delete-perm>Excluir permanentemente</button>
        <button type="button" class="btn btn-secondary" data-deck-delete-cancel>Cancelar</button>
      </div>
      <p class="profile-edit-error" data-deck-delete-error></p>
    </div>`;
  const errEl = box.querySelector('[data-deck-delete-error]');
  const setBusy = (busy) => box.querySelectorAll('button').forEach(b => { b.disabled = busy; });
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

// Espelha a exclusão no estado já carregado (fila, contagens).
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

// ---------- Painel (seção 14), em janela ----------

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
const DECK_BROWSER_ORIGIN_LABELS = { study: 'Trilha de Estudo', self: 'Meus cartões', teacher: 'Professora' };

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
      archived: first.origin !== 'study' && siblings.every(c => c.flashcardStatus === 'archived'),
      // Trilha: cartão de lição ainda não estudada (fica fora da Revisão).
      locked: first.origin === 'study' && typeof isCardLessonCompleted === 'function' && !siblings.some(c => isCardLessonCompleted(c)),
      typeLabel: DECK_BROWSER_CARD_TYPE_LABELS[mode] || DECK_BROWSER_CARD_TYPE_LABELS[first.cardInstance && first.cardInstance.cardTypeId] || 'Normal',
    };
  });
}

function deckBrowserNoteState(note){
  const b = note.cards.map(c => cardStudyBucket(c));
  if (b.every(x => x === 'new')) return 'Novo';
  if (b.some(x => x === 'learning')) return 'Aprendendo';
  return 'Revisar';
}

const DECK_PANEL_ID = 'deck-panel-modal';
const DECK_PANEL_STATES = [
  { id: 'all', label: 'Todos' }, { id: 'Novo', label: 'Novo' },
  { id: 'Aprendendo', label: 'Aprendendo' }, { id: 'Revisar', label: 'Revisar' },
];

function deckPanelIsMobile(){ return window.matchMedia ? window.matchMedia('(max-width: 760px)').matches : window.innerWidth <= 760; }

// Abre o Painel por cima da tela atual. `nodeId` = Deck aberto (o Painel
// começa filtrado nele) ou 'lang' (todos os Decks).
function openDeckPanel(nodeId){
  // A tela por baixo: a do Deck, ou a tabela.
  if (nodeId === 'lang'){
    if (DECK_BROWSER.view !== 'home'){
      DECK_BROWSER.view = 'home';
      DECK_BROWSER.nodeId = null;
      deckBrowserShow('home');
    }
  } else if (DECK_BROWSER.view !== 'detail' || DECK_BROWSER.nodeId !== nodeId){
    DECK_BROWSER.view = 'detail';
    DECK_BROWSER.nodeId = nodeId;
    deckBrowserShow('detail');
    renderDeckDetail();
  }
  DECK_BROWSER.panel = { nodeId, scopeId: nodeId, query: '', tags: [], state: 'all', archived: false, selected: new Set(), activeKey: null, mode: 'note', ctx: null };
  DECK_BROWSER.panelOpen = true;
  deckPanelMount();
  if (typeof routerNavigate === 'function') routerNavigate(deckBrowserRoute('panel', nodeId));
  deckPanelLoadContext();
}

function deckPanelMount(){
  document.getElementById(DECK_PANEL_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.id = DECK_PANEL_ID;
  overlay.className = 'app-modal-overlay deck-panel-overlay';
  overlay.style.zIndex = 'calc(var(--z-modal-backdrop) - 2)';
  overlay.innerHTML = `
    <div class="app-modal deck-panel-modal" role="dialog" aria-modal="true" aria-labelledby="deck-panel-title">
      <div class="deck-panel-head">
        <h3 id="deck-panel-title">Painel</h3>
        <input type="search" class="profile-edit-input deck-panel-search" data-panel-search placeholder="Buscar cartões e notas" aria-label="Buscar cartões">
        <button type="button" class="app-modal-close" data-panel-close aria-label="Fechar">✕</button>
      </div>
      <div class="deck-panel-grid" data-panel-grid>
        <details class="deck-panel-side" data-panel-side ${deckPanelIsMobile() ? '' : 'open'}>
          <summary>Filtros</summary>
          <div data-panel-side-body></div>
        </details>
        <section class="deck-panel-listpane" aria-label="Cartões">
          <div class="deck-panel-bulk" data-panel-bulk hidden></div>
          <div class="deck-panel-listhead"><span>Frente</span><span>Verso</span></div>
          <div class="deck-panel-list" data-panel-list role="listbox" aria-label="Lista de cartões"></div>
          <p class="profile-edit-hint deck-panel-count" data-panel-count></p>
        </section>
        <section class="deck-panel-editor" data-panel-editor aria-label="Editor"></section>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-panel-close]').addEventListener('click', () => closeDeckPanel());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDeckPanel(); });
  const search = overlay.querySelector('[data-panel-search]');
  search.addEventListener('input', () => { DECK_BROWSER.panel.query = search.value; renderDeckPanelList(); });
  document.addEventListener('keydown', deckPanelOnKey);
  if (typeof MY_FLASHCARDS_STATE !== 'undefined') MY_FLASHCARDS_STATE.onChange = deckPanelAfterEdit;
  renderDeckPanel();
  // No celular, não abre o teclado sozinho.
  if (!window.matchMedia || !window.matchMedia('(max-width: 600px)').matches) search.focus();
}

function deckPanelOnKey(e){
  if (e.key !== 'Escape' || !DECK_BROWSER.panelOpen) return;
  if (document.getElementById(ADD_CARD_MODAL_ID)) return;
  if (deckBrowserTopModalIs(DECK_PANEL_ID)) closeDeckPanel();
}

function closeDeckPanel(opts){
  const el = document.getElementById(DECK_PANEL_ID);
  const wasOpen = DECK_BROWSER.panelOpen;
  DECK_BROWSER.panelOpen = false;
  document.removeEventListener('keydown', deckPanelOnKey);
  if (typeof MY_FLASHCARDS_STATE !== 'undefined'){
    MY_FLASHCARDS_STATE.onChange = null;
    MY_FLASHCARDS_STATE.editingCardId = null;
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
  }
  if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
  if (el) el.remove();
  if (!wasOpen || (opts && opts.silent)) return;
  // Volta para a tela de baixo (com contagens atualizadas).
  if (DECK_BROWSER.view === 'detail' && DECK_BROWSER.nodeId != null){
    renderDeckDetail();
    if (typeof routerNavigate === 'function') routerNavigate(deckBrowserRoute('detail', DECK_BROWSER.nodeId));
  } else {
    backToDeckTable();
  }
}

// Cartões próprios (linhas do banco): o editor precisa da linha, do plano
// e do "visível no perfil".
async function deckPanelLoadContext(){
  const ctx = await deckBrowserLoadOwnContext();
  if (!DECK_BROWSER.panelOpen) return;
  DECK_BROWSER.panel.ctx = ctx;
  renderDeckPanel();
}

// Depois de salvar/cancelar/excluir no editor (MY_FLASHCARDS_STATE.onChange).
async function deckPanelAfterEdit(opts){
  if (!DECK_BROWSER.panelOpen) return;
  if (opts && opts.preserveEditingNativeState){ renderDeckPanelEditor({ keepEditing: true }); return; }
  await deckPanelReload();
}

async function deckPanelReload(){
  await deckBrowserLoadTeacherLink();
  if (!DECK_BROWSER.panelOpen) return;
  const ctx = await deckBrowserLoadOwnContext();
  if (!DECK_BROWSER.panelOpen) return;
  DECK_BROWSER.panel.ctx = ctx;
  if (typeof MY_FLASHCARDS_STATE !== 'undefined'){
    MY_FLASHCARDS_STATE.editingCardId = null;
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
  }
  renderDeckPanel();
}

// O Painel lista as Notes do escopo. Diferente do Anki, os cartões da Trilha
// nascem do avanço do aluno: os de lições ainda não estudadas nunca aparecem
// (nem em filtro). Arquivados só no filtro "Arquivados".
function deckBrowserPanelNotes(){
  const decks = deckBrowserDecks();
  const all = (STATE && STATE.cards) || [];
  const scopeId = DECK_BROWSER.panel.scopeId;
  const scoped = scopeId === 'lang' ? all : getStudyScopeForDeck(decks, scopeId, all);
  return deckBrowserNotes(scoped).filter(n => !n.locked);
}

function deckBrowserFilterNotes(notes){
  const p = DECK_BROWSER.panel;
  const q = (p.query || '').trim().toLowerCase();
  return notes.filter(n => {
    if (p.archived ? !n.archived : n.archived) return false;
    if (p.state !== 'all' && deckBrowserNoteState(n) !== p.state) return false;
    if (p.tags.length && !p.tags.some(t => n.tags.includes(t))) return false;
    if (!q) return true;
    const hay = (n.front + ' ' + n.back + ' ' + n.tags.join(' ')).toLowerCase();
    return hay.includes(q);
  });
}

function renderDeckPanel(){
  if (!document.getElementById(DECK_PANEL_ID)) return;
  renderDeckPanelSide();
  renderDeckPanelList();
  renderDeckPanelEditor();
}

// Coluna da esquerda: Decks, Estado, Tags, Arquivados.
function renderDeckPanelSide(){
  const body = document.querySelector(`#${DECK_PANEL_ID} [data-panel-side-body]`);
  if (!body) return;
  const decks = deckBrowserDecks();
  const p = DECK_BROWSER.panel;
  const course = deckBrowserCourseRoot(decks);
  const scopeInCourse = course && p.scopeId !== 'lang' && (p.scopeId === course.id || getDeckSubtreeIds(decks, course.id).includes(p.scopeId));
  const deckItems = [];
  const deckBtn = (id, label, depth) => `<button type="button" class="deck-panel-side-item ${p.scopeId === id ? 'is-active' : ''}" data-panel-scope="${id}" style="padding-left:${10 + depth * 14}px;" ${p.scopeId === id ? 'aria-current="true"' : ''}>${escapeHTML(label)}</button>`;
  deckItems.push(deckBtn('lang', 'Todos os Decks', 0));
  const walk = (deck, depth) => {
    deckItems.push(deckBtn(deck.id, deckBrowserDeckLabel(deck), depth));
    // Unidades da Trilha só aparecem quando a Trilha está selecionada.
    if (course && deck.id === course.id && !scopeInCourse) return;
    deckBrowserChildren(decks, deck.id).forEach(k => walk(k, depth + 1));
  };
  deckBrowserChildren(decks, 'lang').forEach(d => walk(d, 1));
  // Tags: as gerais + as de cartões próprios/professora (as finas da Trilha,
  // unidade-*/licao-*, viram centenas; a busca encontra qualquer uma). Mesma
  // regra dos chips de tag da Revisão.
  const scopeCards = deckBrowserPanelNotes().flatMap(n => n.cards);
  const tags = typeof reviewFilterVisibleTags === 'function'
    ? Array.from(new Set(reviewFilterVisibleTags(scopeCards).concat(p.tags))).sort()
    : collectTagsFromCards(scopeCards);
  const archivedCount = deckBrowserPanelNotes().filter(n => n.archived).length;
  const logged = !!deckBrowserUserId();
  body.innerHTML = `
    <div class="deck-panel-side-group"><div class="deck-panel-side-label">Decks</div>${deckItems.join('')}</div>
    <div class="deck-panel-side-group"><div class="deck-panel-side-label">Estado</div>
      ${DECK_PANEL_STATES.map(s => `<button type="button" class="deck-panel-side-item ${!p.archived && p.state === s.id ? 'is-active' : ''}" data-panel-state="${s.id}">${s.label}</button>`).join('')}
      ${archivedCount ? `<button type="button" class="deck-panel-side-item ${p.archived ? 'is-active' : ''}" data-panel-archived>Arquivados (${archivedCount})</button>` : ''}
    </div>
    <div class="deck-panel-side-group"><div class="deck-panel-side-label">Tags</div>
      ${tags.length ? tags.map(t => `<button type="button" class="deck-panel-side-item ${p.tags.includes(t) ? 'is-active' : ''}" data-panel-tag="${escapeHTML(t)}" aria-pressed="${p.tags.includes(t) ? 'true' : 'false'}">#${escapeHTML(t)}</button>`).join('') : `<p class="profile-edit-hint deck-panel-side-empty">Nenhuma tag.</p>`}
      ${logged ? `<button type="button" class="deck-panel-side-item deck-panel-side-link ${p.mode === 'tags' ? 'is-active' : ''}" data-panel-manage-tags>Gerenciar tags</button>` : ''}
    </div>`;
  body.querySelectorAll('[data-panel-scope]').forEach(b => b.addEventListener('click', () => {
    const raw = b.dataset.panelScope;
    p.scopeId = raw === 'lang' ? 'lang' : Number(raw);
    p.selected.clear();
    renderDeckPanelSide(); renderDeckPanelList();
  }));
  body.querySelectorAll('[data-panel-state]').forEach(b => b.addEventListener('click', () => {
    p.state = b.dataset.panelState; p.archived = false;
    renderDeckPanelSide(); renderDeckPanelList();
  }));
  body.querySelector('[data-panel-archived]')?.addEventListener('click', () => {
    p.archived = !p.archived; p.state = 'all';
    renderDeckPanelSide(); renderDeckPanelList();
  });
  body.querySelectorAll('[data-panel-tag]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.panelTag;
    const i = p.tags.indexOf(t);
    if (i >= 0) p.tags.splice(i, 1); else p.tags.push(t);
    renderDeckPanelSide(); renderDeckPanelList();
  }));
  body.querySelector('[data-panel-manage-tags]')?.addEventListener('click', () => {
    p.mode = 'tags'; p.activeKey = null;
    renderDeckPanelSide(); renderDeckPanelList(); renderDeckPanelEditor();
  });
}

function renderDeckPanelList(){
  const root = document.getElementById(DECK_PANEL_ID);
  const list = root && root.querySelector('[data-panel-list]');
  if (!list) return;
  const p = DECK_BROWSER.panel;
  const notes = deckBrowserFilterNotes(deckBrowserPanelNotes());
  const visibleKeys = new Set(notes.map(n => n.key));
  Array.from(p.selected).forEach(k => { if (!visibleKeys.has(k)) p.selected.delete(k); });
  root.querySelector('[data-panel-count]').textContent = notes.length
    ? `${notes.length} ${notes.length === 1 ? 'cartão' : 'cartões'}`
    : '';
  if (!notes.length){
    const filtered = p.query || p.tags.length || p.state !== 'all' || p.archived;
    list.innerHTML = `<p class="profile-empty-note">${filtered ? 'Nenhum cartão encontrado com esse filtro.' : 'Nenhum cartão aqui ainda. Os cartões da Trilha aparecem conforme você conclui as lições.'}</p>`;
  } else {
    list.innerHTML = notes.map(n => {
      const own = n.origin === 'self';
      const active = p.mode === 'note' && p.activeKey === n.key;
      return `<div class="deck-panel-item ${active ? 'is-active' : ''} ${n.archived ? 'is-archived' : ''}" role="option" aria-selected="${active ? 'true' : 'false'}" tabindex="0" data-panel-open-note="${escapeHTML(n.key)}">
        ${own ? `<input type="checkbox" data-panel-select="${escapeHTML(n.key)}" ${p.selected.has(n.key) ? 'checked' : ''} aria-label="Selecionar ${escapeHTML(n.front)}">` : `<span class="deck-panel-lock" title="Somente leitura" aria-label="Somente leitura">🔒</span>`}
        <span class="deck-panel-cell deck-panel-front">${escapeHTML(n.front)}</span>
        <span class="deck-panel-cell deck-panel-back">${escapeHTML(n.back)}</span>
      </div>`;
    }).join('');
  }
  list.querySelectorAll('[data-panel-select]').forEach(cb => {
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => {
      if (cb.checked) p.selected.add(cb.dataset.panelSelect); else p.selected.delete(cb.dataset.panelSelect);
      renderDeckPanelBulk();
    });
  });
  list.querySelectorAll('[data-panel-open-note]').forEach(row => {
    const open = () => {
      if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
      p.mode = 'note';
      p.activeKey = row.dataset.panelOpenNote;
      list.querySelectorAll('.deck-panel-item').forEach(r => { const on = r === row; r.classList.toggle('is-active', on); r.setAttribute('aria-selected', on ? 'true' : 'false'); });
      renderDeckPanelEditor();
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === row){ e.preventDefault(); open(); } });
  });
  renderDeckPanelBulk();
}

function renderDeckPanelBulk(){
  const root = document.getElementById(DECK_PANEL_ID);
  const bulk = root && root.querySelector('[data-panel-bulk]');
  if (!bulk) return;
  const n = DECK_BROWSER.panel.selected.size;
  bulk.hidden = n === 0;
  if (!n){ bulk.innerHTML = ''; return; }
  const uid = deckBrowserUserId();
  const targets = deckBrowserDecks().filter(d => ['personal_root', 'personal'].includes(d.kind) && d.owner_id === uid);
  bulk.innerHTML = `<span>${n} ${n === 1 ? 'selecionado' : 'selecionados'}</span>
    ${targets.length ? `<select class="profile-edit-input" data-panel-move-target aria-label="Mover para">${targets.map(d => `<option value="${d.id}">${escapeHTML(deckBrowserDeckLabel(d))}</option>`).join('')}</select>
    <button type="button" class="btn btn-secondary btn-sm" data-panel-move>Mover</button>` : ''}
    <button type="button" class="btn btn-secondary btn-sm" data-panel-delete>Excluir</button>
    <button type="button" class="admin-select-link deck-panel-linkbtn" data-panel-clear>Limpar seleção</button>
    <p class="profile-edit-error" data-panel-error></p>`;
  bulk.querySelector('[data-panel-clear]').addEventListener('click', () => { DECK_BROWSER.panel.selected.clear(); renderDeckPanelList(); });
  bulk.querySelector('[data-panel-move]')?.addEventListener('click', deckPanelMoveSelected);
  bulk.querySelector('[data-panel-delete]').addEventListener('click', deckPanelDeleteSelected);
}

function deckPanelActiveNote(){
  const key = DECK_BROWSER.panel.activeKey;
  if (!key) return null;
  return deckBrowserNotes((STATE && STATE.cards) || []).find(n => n.key === key) || null;
}

// Coluna da direita: editor do cartão selecionado (o mesmo editor de
// sempre; cartões da Trilha e da professora ficam só para leitura), ou o
// gerenciador de tags.
function renderDeckPanelEditor(opts){
  const root = document.getElementById(DECK_PANEL_ID);
  const pane = root && root.querySelector('[data-panel-editor]');
  if (!pane) return;
  const p = DECK_BROWSER.panel;
  const grid = root.querySelector('[data-panel-grid]');
  const backBtn = `<button type="button" class="back-link deck-panel-backbtn" data-panel-back>← Lista</button>`;
  grid.classList.toggle('has-editor', p.mode === 'tags' || !!p.activeKey);
  if (p.mode === 'tags'){
    pane.innerHTML = `${backBtn}<div class="section-label">Gerenciar tags</div><div data-panel-tag-manager></div>`;
    pane.querySelector('[data-panel-back]').addEventListener('click', deckPanelBackToList);
    renderTagManagerInto(pane.querySelector('[data-panel-tag-manager]'), { scope: 'own', onChanged: () => deckPanelReload() });
    return;
  }
  const note = deckPanelActiveNote();
  if (!note){
    pane.innerHTML = `<p class="profile-empty-note deck-panel-editor-empty">Escolha um cartão na lista para ver ou editar.</p>`;
    return;
  }
  const decks = deckBrowserDecks();
  const deck = getDeckById(decks, note.deckId);
  const meta = `${escapeHTML(note.typeLabel)} · ${note.cards.length > 1 ? `${note.cards.length} cartões` : '1 cartão'} · ${deckBrowserNoteState(note)}${deck ? ' · ' + escapeHTML(deckBrowserDeckLabel(deck)) : ''}${note.archived ? ' · arquivado' : ''}`;
  if (note.origin !== 'self'){
    const why = note.origin === 'study' ? 'Os cartões da Trilha de Estudo vêm das lições e não podem ser editados aqui.' : 'Cartões da professora: só ela pode editar.';
    pane.innerHTML = `${backBtn}
      <p class="deck-panel-meta">${meta}</p>
      <div class="deck-panel-field"><div class="deck-panel-field-label">Frente</div><div class="deck-panel-field-value">${escapeHTML(note.front)}</div></div>
      <div class="deck-panel-field"><div class="deck-panel-field-label">Verso</div><div class="deck-panel-field-value">${escapeHTML(note.back)}</div></div>
      ${note.tags.length ? `<div class="deck-panel-field"><div class="deck-panel-field-label">Tags</div><div>${noteTagChipsHTML(note.tags)}</div></div>` : ''}
      <p class="profile-edit-hint">🔒 ${escapeHTML(why)}</p>`;
    pane.querySelector('[data-panel-back]').addEventListener('click', deckPanelBackToList);
    return;
  }
  const ctx = p.ctx;
  const row = ctx && ctx.cards.find(r => r.id === note.rowId);
  if (!row){
    pane.innerHTML = `${backBtn}<p class="deck-panel-meta">${meta}</p><p class="profile-edit-hint">${ctx ? 'Não foi possível carregar este cartão.' : 'Carregando…'}</p>`;
    pane.querySelector('[data-panel-back]').addEventListener('click', deckPanelBackToList);
    return;
  }
  if (!(opts && opts.keepEditing) || MY_FLASHCARDS_STATE.editingCardId !== row.id){
    MY_FLASHCARDS_STATE.editingNativeState = null;
    MY_FLASHCARDS_STATE.editingNativeConversionBaseline = null;
    MY_FLASHCARDS_STATE._legacyConversionError = null;
  }
  MY_FLASHCARDS_STATE.editingCardId = row.id;
  const premium = !!ctx.premium;
  pane.innerHTML = `${backBtn}
    <p class="deck-panel-meta">${meta}</p>
    <div class="deck-panel-editor-actions">
      ${row.status === 'archived' ? `<button type="button" class="btn btn-secondary btn-sm" data-panel-reactivate>↺ Reativar</button>` : ''}
      <button type="button" class="btn btn-secondary btn-sm" data-panel-visibility aria-pressed="${row.hidden_from_profile ? 'false' : 'true'}">${row.hidden_from_profile ? '🙈 Escondido do perfil' : '👁️ Visível no perfil'}</button>
      <button type="button" class="btn btn-secondary btn-sm deck-overview-danger" data-panel-delete-one>🗑 Excluir</button>
    </div>
    <div class="deck-panel-editor-form">${myFlashcardRowHTML(row, premium)}</div>`;
  pane.querySelector('[data-panel-back]').addEventListener('click', deckPanelBackToList);
  pane.querySelector('[data-panel-reactivate]')?.addEventListener('click', async () => {
    await setOwnFlashcardStatus(row.id, 'active');
    if (typeof updateSelfFlashcardStatusInState === 'function') updateSelfFlashcardStatusInState(row.id, 'active');
    if (typeof showToast === 'function') showToast('✓ Cartão reativado.');
    DECK_BROWSER.panel.archived = false;
    deckPanelReload();
  });
  pane.querySelector('[data-panel-visibility]').addEventListener('click', async () => {
    const res = await setOwnFlashcardHidden(row.id, !row.hidden_from_profile);
    if (res && res.ok === false){ if (typeof showToast === 'function') showToast('Não foi possível mudar agora.'); return; }
    row.hidden_from_profile = !row.hidden_from_profile;
    renderDeckPanelEditor();
  });
  pane.querySelector('[data-panel-delete-one]').addEventListener('click', async () => {
    if (!window.confirm('Isso vai apagar o cartão e todo o histórico de revisão permanentemente. Não pode ser desfeito. Continuar?')) return;
    const res = await deleteOwnFlashcardPermanently(row.id);
    if (!res.ok){ if (typeof showToast === 'function') showToast('Não foi possível apagar o cartão agora.'); return; }
    if (typeof removeSelfFlashcardFromState === 'function') removeSelfFlashcardFromState(row.id);
    if (typeof saveState === 'function') saveState();
    if (typeof showToast === 'function') showToast('✓ Cartão apagado.');
    DECK_BROWSER.panel.activeKey = null;
    deckPanelReload();
  });
  if (MY_FLASHCARDS_STATE.editingNativeState) wireMyFlashcardNativeEditForm(row, MY_FLASHCARDS_STATE.editingNativeState, pane, premium);
  else wireMyFlashcardEditForm(row, pane, premium);
}

function deckPanelBackToList(){
  const p = DECK_BROWSER.panel;
  if (typeof releaseAllFieldAudioRecorders === 'function') releaseAllFieldAudioRecorders();
  p.activeKey = null;
  p.mode = 'note';
  if (typeof MY_FLASHCARDS_STATE !== 'undefined'){ MY_FLASHCARDS_STATE.editingCardId = null; MY_FLASHCARDS_STATE.editingNativeState = null; }
  renderDeckPanelSide(); renderDeckPanelList(); renderDeckPanelEditor();
}

function deckPanelSelectedNotes(){
  const keys = DECK_BROWSER.panel.selected;
  return deckBrowserPanelNotes().filter(n => keys.has(n.key) && n.origin === 'self');
}

async function deckPanelMoveSelected(){
  const root = document.getElementById(DECK_PANEL_ID);
  const decks = deckBrowserDecks();
  const dest = getDeckById(decks, Number(root.querySelector('[data-panel-move-target]').value));
  const notes = deckPanelSelectedNotes();
  if (!dest || !notes.length) return;
  root.querySelectorAll('[data-panel-bulk] button').forEach(b => { b.disabled = true; });
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
  renderDeckPanel();
  if (failed.length && typeof showToast === 'function') showToast(`Não foi possível mover: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}`);
}

async function deckPanelDeleteSelected(){
  const root = document.getElementById(DECK_PANEL_ID);
  const notes = deckPanelSelectedNotes();
  if (!notes.length) return;
  const total = notes.reduce((s, n) => s + n.cards.length, 0);
  if (!window.confirm(`Excluir ${notes.length} ${notes.length === 1 ? 'conteúdo' : 'conteúdos'} (${total} ${total === 1 ? 'cartão' : 'cartões'}) para sempre? O histórico de revisão também será apagado.`)) return;
  root.querySelectorAll('[data-panel-bulk] button').forEach(b => { b.disabled = true; });
  let deleted = 0;
  for (const n of notes){
    const res = await deleteOwnFlashcardPermanently(n.rowId);
    if (res.ok){
      deleted++;
      if (typeof removeSelfFlashcardFromState === 'function') removeSelfFlashcardFromState(n.rowId);
    }
  }
  DECK_BROWSER.panel.selected.clear();
  if (notes.some(n => n.key === DECK_BROWSER.panel.activeKey)) DECK_BROWSER.panel.activeKey = null;
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function') showToast(`${deleted} ${deleted === 1 ? 'conteúdo excluído' : 'conteúdos excluídos'}.`);
  deckPanelReload();
}
