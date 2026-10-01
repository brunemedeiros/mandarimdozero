// ---------- Public Deck (P3-P6, ver docs/public-decks-contrato-tecnico.md v6) ----------
//
// Public Deck NÃO é uma entidade nova: é um `decks` (kind='personal') com
// `is_public=true` + `public_id` opaco (migration 061). A URL é `#/deck/<public_id>`.
// O `public_id` NÃO autoriza nada: toda RPC revalida dono/kind/is_public/perfil.
//
// Esta tela NÃO tem renderer próprio. Ela lista as Notes públicas e abre cada uma
// pelo Preview (shared/flashcard-preview.js), que usa os MESMOS 4 renderers da
// Revisão (Normal/Múltipla escolha/Digite a resposta/Cloze), pelo mesmo motor
// (buildEngineCardsFromRow). Cloze passa pelo parser central; Reverse continua
// sendo 2 CardInstances da mesma Note.
//
// Política (decidida pela autora):
//   anônimo/Free: vê só metadado (nome, autor, ícone, cor, nº de Notes, data);
//   Premium (e o dono): abre o conteúdo; Premium (não dono) importa.
//   Free NÃO importa (nem parcialmente; o corte dos 20 não vale para Public Deck).
//
// Mídia: as URLs entregues pela RPC de conteúdo são as do bucket `flashcard-media`
// (leitura pública, nome com sufixo aleatório) e só chegam a quem pode abrir o conteúdo.
// RISCO CONHECIDO (docs v6 §mídia): o caminho contém o auth.uid() do dono. Endurecimento
// proposto (não implementado): Edge Function de proxy que serve a mídia por public_id.

const PUBLIC_DECK_ICONS = {
  book: '📘', chat: '💬', globe: '🌍', star: '⭐', food: '🍽️', travel: '✈️',
  work: '💼', school: '🎓', music: '🎵', heart: '❤️', pencil: '✏️', lightbulb: '💡',
};
const PUBLIC_DECK_COLORS = {
  red: '#D62619', orange: '#E07B1F', gold: '#C9973A', green: '#3A7359', teal: '#2A8C8C',
  blue: '#3498D6', purple: '#7E57C2', pink: '#D6479B', gray: '#7A7A85',
};
const PUBLIC_DECK_LANG_LABELS = { frances: 'Francês', mandarim: 'Mandarim', portugues: 'Português' };
const PUBLIC_DECK_LANG_FOLDERS = { frances: 'fr', mandarim: 'zh' };
const PUBLIC_DECK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_DECK_RENDER_TOKENS = new WeakMap();
const PUBLIC_DECK_STATE = { current: null, notes: null };

function publicDeckIdFromHash(hash){
  const parts = String(hash == null ? window.location.hash : hash).replace(/^#/, '').split('/').filter(Boolean);
  if (parts[0] === 'deck' && PUBLIC_DECK_UUID_RE.test(parts[1] || '')) return parts[1].toLowerCase();
  return null;
}

function publicDeckLinkFor(publicId, languageAppKey){
  const folder = PUBLIC_DECK_LANG_FOLDERS[languageAppKey];
  const here = (typeof APP_KEY !== 'undefined') ? APP_KEY : null;
  if (folder && here !== languageAppKey){
    try { return new URL(`../${folder}/#/deck/${publicId}`, window.location.href).href; } catch (e) {}
  }
  return `#/deck/${publicId}`;
}

// Link compartilhável absoluto (o dono copia na tela de Meus Decks).
function publicDeckShareUrl(publicId, languageAppKey){
  const folder = PUBLIC_DECK_LANG_FOLDERS[languageAppKey];
  try { return new URL(folder ? `../${folder}/#/deck/${publicId}` : `#/deck/${publicId}`, window.location.href).href; }
  catch (e) { return `#/deck/${publicId}`; }
}

// true quando o app (#app) está carregado; false na página standalone (anônimo)
function publicDeckInApp(){
  const app = document.getElementById('app');
  return !!app && app.style.display !== 'none';
}

// ---------- Camada de dados (só RPCs; nunca lê decks/own_flashcards direto) ----------
async function fetchPublicDeck(publicId){
  const { data, error } = await supabaseClient.rpc('get_public_deck', { p_public_id: publicId });
  if (error || !data) return { ok: false, error: 'unavailable' };
  if (data.error) return { ok: false, error: data.error };
  return { ok: true, deck: data };
}

async function fetchPublicDeckNotes(publicId){
  const { data, error } = await supabaseClient.rpc('get_public_deck_notes', { p_public_id: publicId });
  if (error || !data) return { ok: false, error: 'unavailable' };
  if (data.error) return { ok: false, error: data.error };
  return { ok: true, language: data.language, total: data.total, notes: data.notes || [] };
}

async function fetchPublicDecksForUser(username, languageAppKey){
  const { data, error } = await supabaseClient.rpc('list_public_decks_for_user', {
    p_username: username, p_language_app_key: languageAppKey || null,
  });
  if (error || !data) return [];
  return data.decks || [];
}

async function publishDeckRpc(deckId, meta){
  meta = meta || {};
  const { data, error } = await supabaseClient.rpc('publish_deck', {
    p_deck_id: deckId, p_description: meta.description || null, p_icon: meta.icon || null, p_color: meta.color || null,
  });
  if (error) return { ok: false, error: publicDeckErrorMessage(error.message) };
  return { ok: true, publicId: data.public_id, publishedAt: data.published_at, visibleOnProfile: !!data.visible_on_profile };
}

async function unpublishDeckRpc(deckId){
  const { data, error } = await supabaseClient.rpc('unpublish_deck', { p_deck_id: deckId });
  if (error) return { ok: false, error: publicDeckErrorMessage(error.message) };
  return { ok: true, publicId: data.public_id };
}

async function fetchPublicDeckOwnerStatus(deckId){
  const { data, error } = await supabaseClient.rpc('get_public_deck_owner_status', { p_deck_id: deckId });
  if (error || !data) return null;
  return data;
}

// ---------- Cópia com mídia INDEPENDENTE ----------
// O arquivo de mídia do original nunca é reaproveitado: antes da RPC o cliente duplica cada
// objeto do bucket para a PRÓPRIA pasta (policy do bucket: só escreve em <uid>/...), e a RPC
// reescreve as URLs pelo mapa dentro da mesma transação da cópia. Falha => compensação.
const PUBLIC_DECK_MEDIA_BUCKET = 'flashcard-media';
const PUBLIC_DECK_MEDIA_CONCURRENCY = 4;

// Espelha public.flashcard_media_path (SQL): caminho do objeto no bucket, ou null para link externo.
function publicDeckMediaPathFromUrl(url){
  const m = /^https?:\/\/[^/?#]+\/storage\/v1\/object\/public\/flashcard-media\/([^?#]+)$/.exec(String(url || ''));
  return m && !m[1].includes('..') ? m[1] : null;
}

async function fetchPublicDeckMediaManifest(publicId){
  const { data, error } = await supabaseClient.rpc('get_public_deck_media_manifest', { p_public_id: publicId });
  if (error) return { ok: false, code: publicDeckErrorCode(error.message), error: publicDeckErrorMessage(error.message) };
  return { ok: true, items: (data && data.items) || [] };
}

// Remove (melhor esforço) APENAS os objetos que esta própria operação criou. Nunca lança.
async function removeCopiedPublicDeckMedia(paths){
  if (!paths || !paths.length) return;
  try { await supabaseClient.storage.from(PUBLIC_DECK_MEDIA_BUCKET).remove(paths); }
  catch (e) { console.error('Não foi possível limpar mídia temporária da importação:', e); }
}

// Duplica os objetos do manifest para a pasta do usuário atual. Devolve o mapa urlAntiga -> urlNova.
async function duplicatePublicDeckMedia(rawItems, uid, onProgress){
  const created = [], map = {};
  // O manifest já vem sem repetição; defesa: o mesmo objeto referenciado por várias Fields/Notes
  // é copiado UMA vez e o destino é reutilizado no media_map.
  const seen = new Set();
  const items = (rawItems || []).filter(it => it && it.url && !seen.has(it.url) && seen.add(it.url));
  const bucket = supabaseClient.storage.from(PUBLIC_DECK_MEDIA_BUCKET);
  const stamp = Date.now().toString(36);
  let next = 0, done = 0, failed = null;
  const worker = async () => {
    while (!failed && next < items.length){
      const i = next++, it = items[i];
      const srcPath = it.path || publicDeckMediaPathFromUrl(it.url);
      if (!srcPath){ failed = new Error('invalid_media_path'); return; }
      const ext = (srcPath.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin';
      const dest = `${uid}/pubcopy-${stamp}-${Math.random().toString(36).slice(2, 8)}-${i}.${ext}`;
      try {
        const { error } = await bucket.copy(srcPath, dest);
        if (error) throw error;
        created.push(dest);
        const { data: pub } = bucket.getPublicUrl(dest);
        map[it.url] = pub.publicUrl;
        done++;
        if (onProgress) onProgress(done, items.length);
      } catch (e) { failed = e; return; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PUBLIC_DECK_MEDIA_CONCURRENCY, items.length) }, worker));
  if (failed) return { ok: false, created, error: publicDeckErrorMessage('media_copy_failed') };
  return { ok: true, created, map };
}

async function copyPublicDeckRpc(publicId, destDeckId, mediaMap){
  const { data, error } = await supabaseClient.rpc('copy_public_deck', {
    p_public_id: publicId, p_dest_deck_id: destDeckId || null, p_media_map: mediaMap || {},
  });
  if (error){
    const code = publicDeckErrorCode(error.message);
    // Só é DEFINITIVO (a transação SQL foi revertida) quando o servidor respondeu com erro:
    // SQLSTATE no `code` ou uma das mensagens da própria RPC. Falha de rede/timeout/gateway
    // (sem code) é AMBÍGUA: o commit pode ter acontecido e só a resposta se perdeu.
    const definitive = !!code || (typeof error.code === 'string' && error.code !== '');
    return { ok: false, code, definitive, error: definitive ? publicDeckErrorMessage(error.message) : publicDeckErrorMessage('rpc_ambiguous') };
  }
  return { ok: true, result: data };
}

// Fluxo completo: manifest -> duplicar mídia -> RPC atômica. Se a RPC falhar, remove o que duplicou.
// Se o Deck mudou entre o manifest e a cópia (media_map_incomplete), tenta de novo uma vez.
const PUBLIC_DECK_IMPORTS_IN_FLIGHT = new Set();
async function copyPublicDeckWithMedia(publicId, destDeckId, onProgress){
  // duplo clique / chamada repetida da MESMA importação enquanto ela roda: ignora (cópias
  // intencionais separadas continuam possíveis depois que esta termina).
  if (PUBLIC_DECK_IMPORTS_IN_FLIGHT.has(publicId)) return { ok: false, error: 'Esta importação já está em andamento.' };
  PUBLIC_DECK_IMPORTS_IN_FLIGHT.add(publicId);
  try { return await copyPublicDeckWithMediaInner(publicId, destDeckId, onProgress); }
  finally { PUBLIC_DECK_IMPORTS_IN_FLIGHT.delete(publicId); }
}
async function copyPublicDeckWithMediaInner(publicId, destDeckId, onProgress){
  const uid = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id) || null;
  if (!uid) return { ok: false, error: 'Entre na sua conta para importar.' };
  for (let attempt = 0; attempt < 2; attempt++){
    const man = await fetchPublicDeckMediaManifest(publicId);
    if (!man.ok) return man;
    let map = {}, created = [];
    if (man.items.length){
      const dup = await duplicatePublicDeckMedia(man.items, uid, onProgress);
      created = dup.created;
      if (!dup.ok){ await removeCopiedPublicDeckMedia(created); return dup; }
      map = dup.map;
    }
    const res = await copyPublicDeckRpc(publicId, destDeckId, map);
    if (res.ok) return res;
    // Erro definitivo = nada foi criado no banco: não deixa órfãos. Erro AMBÍGUO (rede/timeout):
    // a cópia pode ter sido confirmada, então NUNCA apagar a mídia (Notes ficariam apontando para
    // arquivos inexistentes). Objetos órfãos são o custo aceito (ver contrato técnico, v7).
    if (res.definitive) await removeCopiedPublicDeckMedia(created);
    if (res.code === 'media_map_incomplete' && attempt === 0) continue;
    return res;
  }
  return { ok: false, error: publicDeckErrorMessage('media_map_incomplete') };
}

function publicDeckErrorCode(msg){
  const m = /(premium_required|unavailable|deck_too_large|deck_media_too_large|cannot_copy_own_deck|invalid_destination|media_map_incomplete|invalid_media_map|description_too_long|public_deck_kind_forbidden|deck_not_found)/.exec(String(msg || ''));
  return m ? m[1] : null;
}

function publicDeckErrorMessage(msg){
  const m = String(msg || '');
  if (/premium_required/.test(m)) return 'Importar Decks públicos é um recurso Premium.';
  if (/unavailable/.test(m)) return 'Este Deck não está mais disponível.';
  if (/deck_too_large/.test(m)) return 'Este Deck é grande demais para importar de uma vez.';
  if (/deck_media_too_large/.test(m)) return 'Este Deck tem arquivos de mídia demais para importar de uma vez.';
  if (/media_copy_failed/.test(m)) return 'Não foi possível copiar os arquivos de mídia. Nada foi importado; tente novamente.';
  if (/rpc_ambiguous/.test(m)) return 'A conexão falhou durante a importação e ela pode ter sido concluída. Confira em Meus Decks antes de tentar de novo.';
  if (/media_map_incomplete/.test(m)) return 'O Deck mudou durante a importação. Tente novamente.';
  if (/invalid_media_map/.test(m)) return 'Não foi possível validar os arquivos de mídia. Nada foi importado.';
  if (/cannot_copy_own_deck/.test(m)) return 'Este Deck já é seu.';
  if (/invalid_destination/.test(m)) return 'Escolha um Deck pessoal válido como destino.';
  if (/description_too_long/.test(m)) return 'A descrição pode ter no máximo 280 caracteres.';
  if (/public_deck_kind_forbidden/.test(m)) return 'Só Decks pessoais (dentro de Meus Decks) podem ser públicos.';
  if (/deck_not_found/.test(m)) return 'Deck não encontrado.';
  return 'Não foi possível concluir agora. Tente novamente.';
}

// ---------- Notes públicas → linhas no formato que o motor já entende ----------
function publicDeckRowFromNote(note, language){
  return {
    id: `pd-${note.idx}`, language_app_key: language, status: 'active',
    fields: note.fields, card_generation_mode: note.mode, tags: note.tags || [], revision: 0,
  };
}

function publicDeckNoteSummary(note){
  const f = (note.fields || []).find(x => x && x.content && x.content.value && x.lang !== 'zh-pinyin') || (note.fields || [])[0];
  const raw = (f && f.content && f.content.value) || '';
  return raw.replace(/\{\{c\d+::([^}|]*?)(?:\|[^}]*)?\}\}/g, '$1');
}

const PUBLIC_DECK_MODE_LABELS = {
  normal: 'Normal', normal_reversed: 'Normal com reverso', multiple_choice: 'Múltipla escolha',
  type_answer: 'Digite a resposta', cloze: 'Completar',
};

function publicDeckFormatDate(iso){
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return ''; }
}

function publicDeckUnavailableHTML(){
  return `<div class="review-empty"><div class="big-emoji">🔒</div><h3>Deck indisponível</h3>
    <p>Este Deck não existe ou não está público no momento.</p></div>`;
}

function publicDeckBadgeHTML(icon, color){
  const hex = PUBLIC_DECK_COLORS[color] || PUBLIC_DECK_COLORS.gray;
  return `<span class="public-deck-badge" style="border-color:${hex}; background:${hex}22;">${PUBLIC_DECK_ICONS[icon] || PUBLIC_DECK_ICONS.book}</span>`;
}

function publicDeckGateHTML(v){
  if (!v.authenticated){
    return `<p class="profile-empty-note" data-public-deck-gate="login">🔒 Entre na sua conta para ver os cartões. Abrir e importar Decks públicos é um recurso Premium.</p>
      <a class="btn btn-secondary btn-block" href="../">Entrar ou criar conta</a>`;
  }
  if (!v.can_open){
    return `<p class="profile-empty-note" data-public-deck-gate="premium">🔒 Abrir e importar Decks públicos é um recurso Premium. Você pode ver as informações do Deck acima.</p>`;
  }
  return '';
}

async function renderPublicDeckInto(bodyEl, publicId){
  if (!bodyEl) return;
  const token = (PUBLIC_DECK_RENDER_TOKENS.get(bodyEl) || 0) + 1;
  PUBLIC_DECK_RENDER_TOKENS.set(bodyEl, token);
  bodyEl.innerHTML = loadingHTML('Carregando Deck...');

  const res = await fetchPublicDeck(publicId);
  if (PUBLIC_DECK_RENDER_TOKENS.get(bodyEl) !== token) return;
  if (!res.ok){ bodyEl.innerHTML = publicDeckUnavailableHTML(); return; }

  const d = res.deck, v = d.viewer || {};
  PUBLIC_DECK_STATE.current = d;
  PUBLIC_DECK_STATE.notes = null;
  const authorName = d.owner.display_name || d.owner.username;
  const siteLang = (typeof APP_KEY !== 'undefined') ? APP_KEY : null;
  const wrongSite = siteLang && siteLang !== d.language;
  const otherLink = publicDeckLinkFor(d.public_id, d.language);

  const subs = (d.subdecks || []).length ? `
    <div class="public-deck-subs"><div class="section-label">Subdecks públicos</div>
      ${d.subdecks.map(s => `<a class="admin-badge-row public-deck-sub" href="${publicDeckLinkFor(s.public_id, d.language)}" data-public-deck-sub="${s.public_id}">
        ${publicDeckBadgeHTML(s.icon, s.color)}<span style="flex:1;">${escapeHTML(s.name)}</span>
        <span class="profile-edit-hint">${s.notes_count} Notes</span></a>`).join('')}
    </div>` : '';
  const parent = d.parent ? `<a class="profile-stats-link" href="${publicDeckLinkFor(d.parent.public_id, d.language)}">← ${escapeHTML(d.parent.name)}</a>` : '';

  let actions = '';
  if (wrongSite){
    actions = `<p class="profile-empty-note" data-public-deck-gate="site">Este Deck é de ${escapeHTML(PUBLIC_DECK_LANG_LABELS[d.language] || d.language)}.
      ${PUBLIC_DECK_LANG_FOLDERS[d.language] ? `<a href="${otherLink}">Abrir no site correspondente</a>` : ''}</p>`;
  } else {
    actions = publicDeckGateHTML(v);
    if (v.can_open){
      actions += `<button type="button" class="btn btn-secondary btn-block" id="public-deck-open-btn">📇 Ver cartões (${d.notes_count})</button>
        <div id="public-deck-notes-box" style="display:none; margin-top:10px;"></div>`;
    }
    if (v.can_import){
      actions += `<button type="button" class="btn btn-primary btn-block" id="public-deck-import-btn" style="margin-top:10px;">⬇️ Importar para Meus Decks</button>
        <p class="profile-edit-hint">Cria uma cópia independente dentro de Meus Decks, com atribuição ao autor original. Seu progresso de estudo começa do zero.</p>`;
    }
  }
  const canReport = typeof openReportModal === 'function' && document.getElementById('report-modal');

  bodyEl.innerHTML = `
    <div class="public-deck-header">
      ${parent}
      <div class="public-deck-title-row">${publicDeckBadgeHTML(d.icon, d.color)}
        <div><div class="public-profile-name">${escapeHTML(d.name)}</div>
        <div class="public-profile-username">por <a href="#/user/${encodeURIComponent(d.owner.username)}">${escapeHTML(authorName)}</a> (@${escapeHTML(d.owner.username)})</div></div></div>
      ${d.description ? `<p class="public-profile-bio">${escapeHTML(d.description)}</p>` : ''}
      <div class="public-deck-meta">
        <span class="pill">${d.notes_count} Notes</span>
        <span class="pill">${escapeHTML(PUBLIC_DECK_LANG_LABELS[d.language] || d.language)}</span>
        <span class="pill">Atualizado em ${publicDeckFormatDate(d.updated_at)}</span>
      </div>
    </div>
    ${subs}
    <div class="public-deck-actions">${actions}</div>
    ${canReport ? `<button type="button" class="profile-stats-link" id="public-deck-report-btn" style="margin-top:12px;">⚑ Reportar este Deck</button>` : ''}
  `;

  const openBtn = bodyEl.querySelector('#public-deck-open-btn');
  const box = bodyEl.querySelector('#public-deck-notes-box');
  openBtn?.addEventListener('click', async () => {
    const opening = box.style.display === 'none';
    box.style.display = opening ? 'block' : 'none';
    if (opening && !box.dataset.loaded){
      box.dataset.loaded = '1';
      await renderPublicDeckNotesBox(box, d.public_id);
    }
  });
  bodyEl.querySelector('#public-deck-import-btn')?.addEventListener('click', () => importPublicDeck(d));
  bodyEl.querySelector('#public-deck-report-btn')?.addEventListener('click', () => reportPublicDeck(d));
}

async function renderPublicDeckNotesBox(box, publicId){
  box.innerHTML = loadingHTML('Carregando cartões...');
  const r = await fetchPublicDeckNotes(publicId);
  if (!r.ok){
    box.innerHTML = `<p class="profile-empty-note">${r.error === 'premium_required' ? 'Abrir Decks públicos é um recurso Premium.' : (r.error === 'login_required' ? 'Entre na sua conta para ver os cartões.' : 'Não foi possível carregar os cartões.')}</p>`;
    return;
  }
  PUBLIC_DECK_STATE.notes = r;
  if (!r.notes.length){ box.innerHTML = `<p class="profile-empty-note">Este Deck ainda não tem cartões públicos.</p>`; return; }
  box.innerHTML = r.notes.map(n => `<div class="admin-badge-row" data-public-note="${n.idx}">
      <span style="flex:1;">${escapeHTML(publicDeckNoteSummary(n))}
        <span class="profile-edit-hint">${escapeHTML(PUBLIC_DECK_MODE_LABELS[n.mode] || n.mode)}${(n.tags || []).length ? ' · ' + n.tags.map(t => '#' + escapeHTML(t)).join(' ') : ''}</span></span>
      <button type="button" class="btn btn-secondary" data-public-note-view="${n.idx}">Ver</button>
      <button type="button" class="profile-stats-link" data-public-note-report="${n.idx}" title="Reportar este cartão">⚑</button>
    </div>`).join('');
  box.querySelectorAll('[data-public-note-view]').forEach(btn => btn.addEventListener('click', () => {
    const note = r.notes.find(x => String(x.idx) === btn.dataset.publicNoteView);
    if (note && typeof openFlashcardPreviewFromRow === 'function'){
      openFlashcardPreviewFromRow(publicDeckRowFromNote(note, r.language), { origin: 'self', appKey: r.language });
    }
  }));
  box.querySelectorAll('[data-public-note-report]').forEach(btn => btn.addEventListener('click', () => {
    const note = r.notes.find(x => String(x.idx) === btn.dataset.publicNoteReport);
    const d = PUBLIC_DECK_STATE.current;
    if (note && d && typeof openReportModal === 'function'){
      openReportModal({ source: 'public_deck_note', public_id: d.public_id, deck_name: d.name,
        owner_username: d.owner.username, note_idx: note.idx, note_mode: note.mode, note_summary: publicDeckNoteSummary(note).slice(0, 120) });
    }
  }));
}

function reportPublicDeck(d){
  if (typeof openReportModal !== 'function') return;
  openReportModal({ source: 'public_deck', public_id: d.public_id, deck_name: d.name, owner_username: d.owner.username });
}

async function importPublicDeck(d){
  const ok = window.confirm(`Importar "${d.name}" (${d.notes_count} Notes) para Meus Decks? Será uma cópia independente, com atribuição a @${d.owner.username}.`);
  if (!ok) return;
  const btn = document.getElementById('public-deck-import-btn');
  if (btn) btn.disabled = true;
  const label = btn ? btn.textContent : '';
  const res = await copyPublicDeckWithMedia(d.public_id, null, (done, total) => { if (btn) btn.textContent = `Copiando mídia ${done}/${total}...`; });
  if (btn){ btn.disabled = false; btn.textContent = label; }
  if (!res.ok){ showToast(res.error); return; }
  // Traz as cópias para a sessão atual (mesmo caminho do boot) e atualiza a árvore de Decks.
  try {
    if (typeof mergeSelfFlashcardsIntoState === 'function') await mergeSelfFlashcardsIntoState();
    if (typeof fetchDecksForLanguage === 'function' && typeof STATE !== 'undefined') STATE.decks = await fetchDecksForLanguage(APP_KEY);
  } catch (e) { console.error('Erro ao atualizar a sessão depois da importação:', e); }
  const r = res.result || {};
  showToast(`✅ ${r.notes_copied} Notes importadas para Meus Decks.${r.skipped_incompatible ? ` (${r.skipped_incompatible} não puderam ser importadas)` : ''}`);
}

// ---------- Superfícies: modal (dentro do app) e página standalone (anônimo) ----------
function closePublicDeckModal(){
  const modal = document.getElementById('public-deck-modal');
  if (modal) modal.style.display = 'none';
}

async function openPublicDeckModal(publicId){
  const modal = document.getElementById('public-deck-modal');
  const body = document.getElementById('public-deck-modal-body');
  if (!modal || !body) return;
  modal.style.display = 'flex';
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'publicDeck', publicId });
  await renderPublicDeckInto(body, publicId);
}

function openPublicDeckPage(publicId){ openPublicDeckModal(publicId); }

async function renderStandalonePublicDeck(publicId){
  const loginScreen = document.getElementById('login-screen');
  const wrap = document.getElementById('public-profile-standalone');
  const body = document.getElementById('public-profile-page-body');
  if (loginScreen) loginScreen.style.display = 'none';
  if (wrap) wrap.style.display = 'block';
  // navegar para outro Deck/perfil por link recarrega a página standalone (sem roteador)
  window.addEventListener('hashchange', () => window.location.reload());
  await renderPublicDeckInto(body, publicId);
}

(function wirePublicDeckModal(){
  const modal = document.getElementById('public-deck-modal');
  if (!modal) return;
  document.getElementById('public-deck-modal-close')?.addEventListener('click', closePublicDeckModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closePublicDeckModal(); });
  // links internos (autor, subdecks) trocam o conteúdo do modal dentro do app
  modal.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    const id = publicDeckIdFromHash(a.getAttribute('href'));
    if (id){ e.preventDefault(); openPublicDeckModal(id); return; }
    const m = /^#\/user\/(.+)$/.exec(a.getAttribute('href'));
    if (m && typeof openPublicProfileModalForUsername === 'function'){
      e.preventDefault(); closePublicDeckModal(); openPublicProfileModalForUsername(decodeURIComponent(m[1]));
    }
  });
})();

// ---------- Perfil público: seção "Decks públicos" ----------
function publicDeckProfileRowHTML(d){
  return `<a class="admin-badge-row public-deck-sub" href="${publicDeckLinkFor(d.public_id, d.language)}" data-public-deck-link="${d.public_id}">
    ${publicDeckBadgeHTML(d.icon, d.color)}
    <span style="flex:1;">${escapeHTML(d.name)}
      <span class="profile-edit-hint">${escapeHTML(PUBLIC_DECK_LANG_LABELS[d.language] || d.language)} · ${d.notes_count} Notes · ${publicDeckFormatDate(d.updated_at)}</span></span></a>`;
}

async function renderPublicDecksSection(boxEl, username){
  if (!boxEl) return;
  const decks = await fetchPublicDecksForUser(username, null);
  if (!decks.length){ boxEl.innerHTML = `<p class="profile-empty-note">Nenhum Deck público ainda.</p>`; return; }
  boxEl.innerHTML = decks.map(publicDeckProfileRowHTML).join('');
  boxEl.querySelectorAll('a[data-public-deck-link]').forEach(a => a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    const id = publicDeckIdFromHash(href);
    if (id && publicDeckInApp() && document.getElementById('public-deck-modal')){
      e.preventDefault(); openPublicDeckModal(id);
    }
  }));
}

// ---------- Controles do DONO (Meus Decks): publicar / atualizar / despublicar ----------
// Toda escrita passa por RPC (publish_deck/unpublish_deck): o UPDATE direto das colunas de
// publicação é barrado no servidor (trigger decks_public_guard). A UI só orienta.
function publishBoxHTML(deck, status){
  const isPublic = !!(status ? status.is_public : deck.is_public);
  const icon = (status && status.icon) || deck.public_icon || 'book';
  const color = (status && status.color) || deck.public_color || 'gray';
  const desc = (status ? status.description : deck.public_description) || '';
  const iconOpts = Object.keys(PUBLIC_DECK_ICONS).map(k => `<option value="${k}" ${k === icon ? 'selected' : ''}>${PUBLIC_DECK_ICONS[k]} ${k}</option>`).join('');
  const colorOpts = Object.keys(PUBLIC_DECK_COLORS).map(k => `<option value="${k}" ${k === color ? 'selected' : ''}>${k}</option>`).join('');
  const incompat = status && status.incompatible ? status.incompatible.length : 0;
  const publicId = (status && status.public_id) || deck.public_id;
  return `<div class="public-deck-publish-form" data-publish-form="${deck.id}">
    <p class="profile-edit-hint">${isPublic ? '🌐 Este Deck está público.' : 'Publicar torna este Deck visível no seu perfil e acessível por link.'}
      Publicar é por Deck: <strong>subdecks não são publicados automaticamente</strong> — publique cada um que quiser. O campo "nota privada" dos cartões nunca é público.</p>
    <label class="profile-edit-label">Descrição (opcional, até 280 caracteres)</label>
    <textarea class="profile-edit-input profile-edit-textarea" rows="2" maxlength="280" data-publish-desc>${escapeHTML(desc)}</textarea>
    <div style="display:flex; gap:8px;">
      <select class="profile-edit-input" data-publish-icon aria-label="Ícone">${iconOpts}</select>
      <select class="profile-edit-input" data-publish-color aria-label="Cor">${colorOpts}</select>
    </div>
    ${status ? `<p class="profile-edit-hint">${status.notes_count} Notes serão públicas.${incompat ? ` ${incompat} não podem ser representadas no formato novo e <strong>não serão publicadas</strong> (continuam intactas no seu Deck).` : ''}</p>` : ''}
    ${isPublic && publicId ? `<input type="text" class="profile-edit-input" readonly data-publish-link value="${escapeHTML(publicDeckShareUrl(publicId, deck.language_app_key))}">` : ''}
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" data-publish-save>${isPublic ? 'Salvar alterações' : 'Publicar'}</button>
      ${isPublic ? `<button type="button" class="btn btn-secondary" data-publish-copy>Copiar link</button>
      <button type="button" class="btn btn-secondary" data-publish-unpublish>Despublicar</button>` : ''}
    </div>
    <p class="profile-edit-field-error" data-publish-error></p>
  </div>`;
}

async function openPublishBox(deck, boxEl, onChange){
  boxEl.innerHTML = loadingHTML();
  const status = await fetchPublicDeckOwnerStatus(deck.id);
  boxEl.innerHTML = publishBoxHTML(deck, status);
  const errEl = boxEl.querySelector('[data-publish-error]');
  boxEl.querySelector('[data-publish-save]')?.addEventListener('click', async (ev) => {
    ev.currentTarget.disabled = true;
    errEl.textContent = '';
    const res = await publishDeckRpc(deck.id, {
      description: boxEl.querySelector('[data-publish-desc]').value,
      icon: boxEl.querySelector('[data-publish-icon]').value,
      color: boxEl.querySelector('[data-publish-color]').value,
    });
    if (!res.ok){ errEl.textContent = res.error; ev.currentTarget.disabled = false; return; }
    Object.assign(deck, { is_public: true, public_id: res.publicId, published_at: res.publishedAt });
    if (!res.visibleOnProfile) showToast('Deck publicado, mas seu perfil público está desligado — ele só aparece quando você reativar o perfil público.');
    else showToast('🌐 Deck publicado.');
    if (onChange) onChange(deck);
    openPublishBox(deck, boxEl, onChange);
  });
  boxEl.querySelector('[data-publish-unpublish]')?.addEventListener('click', async (ev) => {
    if (!window.confirm('Despublicar este Deck? Ele sai do seu perfil e o link deixa de funcionar. Cópias que outras pessoas já fizeram continuam com elas.')) return;
    ev.currentTarget.disabled = true;
    const res = await unpublishDeckRpc(deck.id);
    if (!res.ok){ errEl.textContent = res.error; ev.currentTarget.disabled = false; return; }
    deck.is_public = false;
    showToast('Deck despublicado.');
    if (onChange) onChange(deck);
    openPublishBox(deck, boxEl, onChange);
  });
  boxEl.querySelector('[data-publish-copy]')?.addEventListener('click', async () => {
    const link = boxEl.querySelector('[data-publish-link]');
    try { await navigator.clipboard.writeText(link.value); showToast('Link copiado.'); } catch (e) { link.select(); }
  });
}
