// Recomeçar o curso do zero (migration 123) e retomada guiada para quem volta depois de 60 dias.
// Decisões da dona e desenho: docs/recomecar-curso-opcoes.md (seções "Decisões da dona" e "Implementação").
//
// - O recomeço e o desfazer são feitos NO SERVIDOR (RPCs restart_course / undo_restart_course): o navegador não pode
//   zerar XP (guarda-corpo de shared/auth.js) e uma aba aberta antes regravaria o progresso velho.
// - Época: o bloco recomeçado tem `restartEpoch`. Esta página lembra a época que carregou (onLoaded); saveState recusa gravar
//   quando o servidor tem uma época maior (isStaleSave) e recarrega; e grava a época junto com o bloco (stampForSave).
// - Retomada guiada: ao abrir um curso parado há 60 dias ou mais (último dia estudado NESTE curso), uma janela leve com
//   Continuar, Revisão rápida, Ponto de verificação (onde existir) e Recomeçar. Uma vez por retorno: o dia que a janela
//   já mostrou fica em progress.data._meta.comebackSeen[courseId].
// Tudo grátis.
//
// Depende de (resolvidos na hora do uso): supabaseClient, CURRENT_USER, APP_KEY, t, showToast, saveState, STATE,
// courseDisplayName (shared/my-courses.js), switchTab, openReviewSession, trailHasModules/trailModules/moduleUnlocked/
// moduleCompleted/openCheckpoint (shared/core/modulos-niveis.js), getUiLang.
(function(root){
  'use strict';

  var COMEBACK_DAYS = 60;
  var SIGNAL_KEY = 'course-restart-signal';
  var DONE_KEY = 'course-restart-done';

  // ---------- regras puras (testadas em Node, tests/recomecar-curso/test_unit.js) ----------
  function isDay(s){ return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function epochOf(block){
    var e = block && typeof block === 'object' ? Number(block.restartEpoch) : 0;
    return isFinite(e) && e > 0 ? Math.floor(e) : 0;
  }
  // A aba carregou a época `loaded`; o servidor tem `serverBlock` agora. Gravar por cima só se o servidor não andou.
  function isStaleSave(serverBlock, loaded){ return epochOf(serverBlock) > (Number(loaded) || 0); }
  // Leva a época (e a data do recomeço) junto com o bloco que a página grava. Sem recomeço, o MESMO objeto (nada muda).
  function stampBlock(payload, loaded, restartedAt){
    if (!(Number(loaded) > 0) || !payload || typeof payload !== 'object') return payload;
    var out = Object.assign({}, payload, { restartEpoch: Number(loaded) });
    if (restartedAt) out.restartedAt = restartedAt;
    return out;
  }
  function dayMs(d){ var p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b){ return (isDay(a) && isDay(b)) ? Math.round((dayMs(b) - dayMs(a)) / 86400000) : 0; }
  // ownLastDay = último dia estudado neste curso (espelho do bloco); seenFor = dia para o qual a janela já apareceu.
  function shouldShowComeback(ownLastDay, today, seenFor){
    if (!isDay(ownLastDay) || !isDay(today)) return false;
    if (daysBetween(ownLastDay, today) < COMEBACK_DAYS) return false;
    return seenFor !== ownLastDay;
  }
  // Cópia que ainda desfaz: a mais recente, não desfeita, não substituída, não vencida.
  function activeBackup(rows, nowMs){
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var list = (rows || []).slice().sort(function(a, b){ return String(b.created_at).localeCompare(String(a.created_at)); });
    var b = list[0];
    if (!b || b.restored_at || b.superseded_at || b.purged_at) return null;
    return new Date(b.expires_at).getTime() > now ? b : null;
  }
  // Data curta no idioma do site: pt-BR DD/MM, en "Oct 30".
  function shortDate(iso, lang){
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    if (lang === 'en') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // ---------- estado da página ----------
  var S = { loaded: false, epoch: 0, restartedAt: null, blockKey: null, courseId: null, hasBlock: false, ownLastDay: null,
            seenFor: null, pendingSeen: null, needsSave: false, backup: null, backupLoaded: false, teacherLinked: false, busy: false };

  function reloadPage(){ try { root.location.reload(); } catch (e) {} }

  // Chamado por loadState (shared/auth.js) depois de ler a linha. Devolve false quando a época mudou desde o último
  // carregamento desta página (recomeço ou desfazer em outra aba): a página recarrega para o STATE nascer do zero.
  function onLoaded(rowData, blockKey, courseId){
    var block = rowData && rowData[blockKey];
    var ep = epochOf(block);
    if (S.loaded && ep !== S.epoch){ reloadPage(); return false; }
    S.loaded = true; S.epoch = ep; S.blockKey = blockKey; S.courseId = courseId;
    S.hasBlock = !!(block && typeof block === 'object');
    S.restartedAt = block && typeof block.restartedAt === 'string' ? block.restartedAt : null;
    S.ownLastDay = block && isDay(block.lastStudyDay) ? block.lastStudyDay : null;
    var seen = rowData && rowData._meta && rowData._meta.comebackSeen;
    S.seenFor = seen && typeof seen === 'object' ? (seen[courseId] || null) : null;
    // Bloco recém-recomeçado ainda sem resumo (o servidor não sabe montar): o 1º salvar recalcula.
    S.needsSave = ep > 0 && !!block && !block.progressSummary;
    return true;
  }

  // saveState: true = NÃO gravar (o servidor tem um recomeço/desfazer mais novo). Avisa e recarrega.
  var staleWarned = false;
  function blocksSave(serverBlock){
    if (!S.loaded || !isStaleSave(serverBlock, S.epoch)) return false;
    if (!staleWarned){
      staleWarned = true;
      if (typeof trackTechnicalError === 'function') trackTechnicalError('save_blocked_restart_epoch', null);
      if (typeof showToast === 'function') showToast(t('restart.staleTab'));
      setTimeout(reloadPage, 1500);
    }
    return true;
  }
  function stampForSave(payload){ return stampBlock(payload, S.epoch, S.restartedAt); }
  function metaForSave(meta){
    if (!S.pendingSeen || !S.courseId) return meta;
    var out = Object.assign({}, meta);
    out.comebackSeen = Object.assign({}, out.comebackSeen, { [S.courseId]: S.pendingSeen });
    return out;
  }

  // ---------- dados ----------
  async function loadBackup(){
    S.backupLoaded = false; S.backup = null;
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || !S.blockKey) return null;
    try {
      var res = await supabaseClient.from('course_restart_backups')
        .select('id, course_key, created_at, expires_at, restored_at, superseded_at, purged_at')
        .eq('user_id', CURRENT_USER.id).eq('course_key', S.blockKey)
        .order('created_at', { ascending: false }).limit(1);
      if (!res.error) S.backup = activeBackup(res.data || []);
    } catch (e) {}
    S.backupLoaded = true;
    return S.backup;
  }
  async function loadTeacherLinked(){
    S.teacherLinked = false;
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
    try {
      var res = await supabaseClient.from('teacher_students').select('id')
        .eq('student_id', CURRENT_USER.id).eq('language_app_key', APP_KEY).eq('status', 'active').limit(1);
      S.teacherLinked = !res.error && Array.isArray(res.data) && res.data.length > 0;
    } catch (e) {}
  }

  // ---------- textos ----------
  function lang(){ return typeof getUiLang === 'function' ? getUiLang() : 'pt-BR'; }
  function courseName(){
    try { if (typeof courseDisplayName === 'function') return courseDisplayName(APP_KEY, lang()); } catch (e) {}
    return String(typeof APP_KEY !== 'undefined' ? APP_KEY : '');
  }
  function esc(s){ return typeof escapeHTML === 'function' ? escapeHTML(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function has(field){ return typeof STATE !== 'undefined' && STATE && (field in STATE); }
  // O que volta para o zero, no idioma do site e só com o que o site tem (Desafios/Ditados no fr; hanzi/histórias no zh).
  function zeroItems(){
    var items = ['restart.zero.trail', 'restart.zero.memory', 'restart.zero.xp', 'restart.zero.badges', 'restart.zero.missions'];
    if (has('hanziCards')) items.push('restart.zero.hanzi');
    if (has('storyProgress')) items.push('restart.zero.stories');
    if (has('completedChallenges')) items.push('restart.zero.challenges');
    if (has('dictations')) items.push('restart.zero.dictations');
    return items.map(function(k){ return t(k); });
  }
  function keepItems(){
    return ['restart.keep.streak', 'restart.keep.cards', 'restart.keep.decks', 'restart.keep.teacher', 'restart.keep.other'].map(function(k){ return t(k); });
  }

  // ---------- Configurações > Geral ----------
  async function refreshBox(){
    var box = document.getElementById('settings-restart-box');
    if (!box) return;
    var logged = typeof CURRENT_USER !== 'undefined' && !!CURRENT_USER;
    if (!logged || !S.loaded || !S.hasBlock){ box.hidden = true; return; }
    box.hidden = false;
    paintBox();
    await loadBackup();
    paintBox();
  }
  function paintBox(){
    var box = document.getElementById('settings-restart-box');
    if (!box) return;
    var course = courseName();
    var b = S.backup;
    var undo = b ? `<div class="p-alerta p-alerta--info rc-desfazer" role="status"><span>${esc(t('restart.undoNotice', { date: shortDate(b.created_at, lang()), until: shortDate(b.expires_at, lang()) }))}</span>
        <button type="button" class="outline p-pequeno" id="restart-course-undo-open">${esc(t('restart.undoBtn'))}</button></div>` : '';
    box.innerHTML = `<header><h3>${esc(t('restart.title'))}</h3></header>
      <p class="pref-row-sub">${esc(t('restart.hint', { course: course }))}</p>
      ${undo}
      <footer><button type="button" class="p-perigo" id="restart-course-open">${esc(t('restart.btn'))}</button></footer>`;
    box.querySelector('#restart-course-open').addEventListener('click', openConfirm);
    var u = box.querySelector('#restart-course-undo-open');
    if (u) u.addEventListener('click', openUndo);
  }

  // ---------- janela de confirmação ----------
  function listHTML(items){ return '<ul class="rc-lista">' + items.map(function(s){ return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'; }
  async function openConfirm(){
    var modal = document.getElementById('restart-course-modal');
    if (!modal) return;
    var course = courseName();
    document.getElementById('restart-course-title').textContent = t('restart.modal.title', { course: course });
    var body = document.getElementById('restart-course-body');
    body.innerHTML = `<div class="jp-blocos">
        <div class="jp-bloco jp-tom-rosa"><span class="jp-icone" aria-hidden="true">🔄</span><div><b>${esc(t('restart.modal.zeroTitle'))}</b>${listHTML(zeroItems())}</div></div>
        <div class="jp-bloco jp-tom-verde"><span class="jp-icone" aria-hidden="true">✅</span><div><b>${esc(t('restart.modal.keepTitle'))}</b>${listHTML(keepItems())}</div></div>
      </div>
      <p class="rc-nota">${esc(t('restart.modal.undoNote'))}</p>
      <p class="rc-nota" id="restart-course-teacher-note" hidden>${esc(t('restart.modal.teacherNote'))}</p>`;
    if (typeof root.EmojiIcons !== 'undefined') root.EmojiIcons.scan(body);
    var check = document.getElementById('restart-course-check');
    check.checked = false;
    document.getElementById('restart-course-check-label').textContent = t('restart.modal.check', { course: course });
    var yes = document.getElementById('restart-course-yes');
    yes.disabled = true; yes.textContent = t('restart.modal.yes');
    document.getElementById('restart-course-error').textContent = '';
    modal.style.display = 'flex';
    loadTeacherLinked().then(function(){
      var n = document.getElementById('restart-course-teacher-note');
      if (n) n.hidden = !S.teacherLinked;
    });
  }
  function closeConfirm(){
    var modal = document.getElementById('restart-course-modal');
    if (modal && !S.busy) modal.style.display = 'none';
  }
  function signalOtherTabs(){
    try { localStorage.setItem(SIGNAL_KEY, JSON.stringify({ user: CURRENT_USER && CURRENT_USER.id, course: S.blockKey, at: Date.now() })); } catch (e) {}
  }
  function afterServerChange(kind){
    try { sessionStorage.setItem(DONE_KEY, kind); } catch (e) {}
    signalOtherTabs();
    reloadPage();
  }
  async function confirmRestart(){
    var yes = document.getElementById('restart-course-yes'), err = document.getElementById('restart-course-error');
    if (!document.getElementById('restart-course-check').checked || S.busy) return;
    S.busy = true; yes.disabled = true; yes.textContent = t('restart.modal.working'); err.textContent = '';
    var data = null, error = null;
    try { var res = await supabaseClient.rpc('restart_course', { p_course_key: S.blockKey }); data = res.data; error = res.error; }
    catch (e) { error = e; }
    if (!error && data && data.ok){
      if (typeof trackEvent === 'function') trackEvent('course_restart', S.blockKey, { epoch: data.epoch });
      afterServerChange('restart');
      return;
    }
    S.busy = false; yes.disabled = false; yes.textContent = t('restart.modal.yes');
    err.textContent = t('restart.err.generic');
  }

  // ---------- desfazer ----------
  function openUndo(){
    var modal = document.getElementById('restart-undo-modal');
    if (!modal || !S.backup) return;
    document.getElementById('restart-undo-text').textContent = t('restart.undo.text', { course: courseName(), date: shortDate(S.backup.created_at, lang()) });
    document.getElementById('restart-undo-error').textContent = '';
    var yes = document.getElementById('restart-undo-yes');
    yes.disabled = false; yes.textContent = t('restart.undo.yes');
    modal.style.display = 'flex';
  }
  function closeUndo(){
    var modal = document.getElementById('restart-undo-modal');
    if (modal && !S.busy) modal.style.display = 'none';
  }
  async function confirmUndo(){
    var yes = document.getElementById('restart-undo-yes'), err = document.getElementById('restart-undo-error');
    if (!S.backup || S.busy) return;
    S.busy = true; yes.disabled = true; yes.textContent = t('restart.modal.working'); err.textContent = '';
    var data = null, error = null;
    try { var res = await supabaseClient.rpc('undo_restart_course', { p_backup_id: S.backup.id }); data = res.data; error = res.error; }
    catch (e) { error = e; }
    if (!error && data && data.ok){
      if (typeof trackEvent === 'function') trackEvent('course_restart_undo', S.blockKey, null);
      afterServerChange('undo');
      return;
    }
    S.busy = false; yes.disabled = false; yes.textContent = t('restart.undo.yes');
    err.textContent = t(data && (data.error === 'expired' || data.error === 'superseded' || data.error === 'already_restored') ? 'restart.undo.err.expired' : 'restart.undo.err.generic');
  }

  // ---------- retomada guiada (60 dias) ----------
  function currentModule(){
    try {
      if (typeof trailHasModules !== 'function' || !trailHasModules()) return null;
      if (typeof trailSkipAllowed === 'function' && !trailSkipAllowed()) return null;
      return trailModules().find(function(m){ return moduleUnlocked(m) && !moduleCompleted(m); }) || null;
    } catch (e) { return null; }
  }
  function anotherModalOpen(){
    return Array.prototype.some.call(document.querySelectorAll('.app-modal-overlay, dialog[open]'), function(el){
      return el.id !== 'comeback-modal' && (el.tagName === 'DIALOG' || (el.style.display !== 'none' && getComputedStyle(el).display !== 'none'));
    });
  }
  function showComeback(){
    var modal = document.getElementById('comeback-modal');
    if (!modal) return false;
    var mod = currentModule();
    var course = courseName();
    document.getElementById('comeback-sub').textContent = t('comeback.sub', { course: course });
    var opts = [
      { id: 'continue', icon: '▶️', title: 'comeback.continue', sub: 'comeback.continueSub' },
      { id: 'review', icon: '⚡', title: 'comeback.review', sub: 'comeback.reviewSub' }
    ];
    if (mod) opts.push({ id: 'checkpoint', icon: '🏆', title: 'comeback.checkpoint', sub: 'comeback.checkpointSub' });
    opts.push({ id: 'restart', icon: '🔄', title: 'comeback.restart', sub: 'comeback.restartSub' });
    var list = document.getElementById('comeback-options');
    list.innerHTML = opts.map(function(o, i){
      return `<button type="button" class="comeback-opcao${i === 0 ? ' is-principal' : ''}" data-comeback="${o.id}"${i === 0 ? ' data-foco-inicial' : ''}>
        <span class="comeback-icone" aria-hidden="true">${o.icon}</span>
        <span class="comeback-texto"><b>${esc(t(o.title))}</b><span>${esc(t(o.sub))}</span></span></button>`;
    }).join('');
    if (typeof root.EmojiIcons !== 'undefined') root.EmojiIcons.scan(list);
    list.querySelectorAll('[data-comeback]').forEach(function(b){
      b.addEventListener('click', function(){ chooseComeback(b.dataset.comeback, mod); });
    });
    modal.style.display = 'flex';
    // Uma vez por retorno: grava o dia já mostrado.
    S.pendingSeen = S.ownLastDay;
    S.seenFor = S.ownLastDay;
    if (typeof saveState === 'function') saveState();
    if (typeof trackEvent === 'function') trackEvent('comeback_shown', S.blockKey, { days: daysBetween(S.ownLastDay, today()) });
    return true;
  }
  function closeComeback(){ var m = document.getElementById('comeback-modal'); if (m) m.style.display = 'none'; }
  function chooseComeback(id, mod){
    closeComeback();
    if (typeof trackEvent === 'function') trackEvent('comeback_choice', id, null);
    if (id === 'review'){
      if (typeof switchTab === 'function') switchTab('review');
      if (typeof openReviewSession === 'function') openReviewSession('flashcard', { short: true });
    } else if (id === 'checkpoint' && mod){
      if (typeof switchTab === 'function') switchTab('path');
      if (typeof openCheckpoint === 'function') openCheckpoint(mod.id);
    } else if (id === 'restart'){
      openConfirm();
    }
  }
  function today(){ return typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10); }
  function maybeShowComeback(tries){
    if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || !S.loaded) return;
    if (!shouldShowComeback(S.ownLastDay, today(), S.seenFor)) return;
    var n = tries || 0;
    // Espera as janelas do primeiro acesso (idioma do site, escolher o @) fecharem.
    if (anotherModalOpen()){ if (n < 20) setTimeout(function(){ maybeShowComeback(n + 1); }, 1500); return; }
    showComeback();
  }

  // Fim do login (shared/auth.js, onUserLoggedIn): aviso do recomeço/desfazer, 1º salvar do bloco recomeçado, retomada.
  function afterLogin(){
    var done = null;
    try { done = sessionStorage.getItem(DONE_KEY); sessionStorage.removeItem(DONE_KEY); } catch (e) {}
    if (S.needsSave && typeof saveState === 'function'){ S.needsSave = false; saveState(); }
    // Textos só depois do catálogo do idioma do site (no site em inglês o catálogo carrega depois da página).
    var ready = (root.i18nReady && typeof root.i18nReady.then === 'function') ? root.i18nReady : Promise.resolve();
    ready.then(function(){
      if (done && typeof showToast === 'function') showToast(t(done === 'undo' ? 'restart.undo.done' : 'restart.done'));
      setTimeout(function(){ maybeShowComeback(0); }, done ? 2500 : 600);
    }, function(){});
  }

  // Outra aba desta conta recomeçou/desfez: recarrega já (sem esperar a próxima gravação).
  function onStorage(e){
    if (!e || e.key !== SIGNAL_KEY || !e.newValue) return;
    try {
      var v = JSON.parse(e.newValue);
      if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && v && v.user === CURRENT_USER.id && v.course === S.blockKey){
        if (typeof showToast === 'function') showToast(t('restart.staleTab'));
        setTimeout(reloadPage, 1200);
      }
    } catch (err) {}
  }

  function wire(){
    if (typeof document === 'undefined') return;
    var on = function(id, fn){ var el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('restart-course-close', closeConfirm); on('restart-course-cancel', closeConfirm); on('restart-course-yes', confirmRestart);
    on('restart-undo-close', closeUndo); on('restart-undo-cancel', closeUndo); on('restart-undo-yes', confirmUndo);
    on('comeback-close', closeComeback);
    var check = document.getElementById('restart-course-check');
    if (check) check.addEventListener('change', function(){ var y = document.getElementById('restart-course-yes'); if (y && !S.busy) y.disabled = !check.checked; });
    ['restart-course-modal', 'restart-undo-modal', 'comeback-modal'].forEach(function(id){
      var m = document.getElementById(id);
      if (m) m.addEventListener('click', function(e){ if (e.target === m){ if (id === 'comeback-modal') closeComeback(); else if (id === 'restart-undo-modal') closeUndo(); else closeConfirm(); } });
    });
    if (typeof root.addEventListener === 'function') root.addEventListener('storage', onStorage);
  }
  if (typeof document !== 'undefined'){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }

  var api = {
    COMEBACK_DAYS: COMEBACK_DAYS, epochOf: epochOf, isStaleSave: isStaleSave, stampBlock: stampBlock, daysBetween: daysBetween,
    shouldShowComeback: shouldShowComeback, activeBackup: activeBackup, shortDate: shortDate,
    onLoaded: onLoaded, blocksSave: blocksSave, stampForSave: stampForSave, metaForSave: metaForSave,
    refreshBox: refreshBox, openConfirm: openConfirm, openUndo: openUndo, afterLogin: afterLogin, maybeShowComeback: maybeShowComeback,
    _state: S
  };
  root.RecomecarCurso = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
