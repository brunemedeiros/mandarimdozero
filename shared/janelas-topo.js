// ---------- Janelas do topo: sequência (🔥) e XP da semana (⭐) ----------
// Decisões da dona (2026-10-30, docs/janelas-topo-proposta.md), valem para todos os sites (fr, zh, pt e futuros):
//  - as duas janelas têm o mesmo desenho (cabeçalho na cor da marca, corpo com seções, cartão com botão);
//  - abrem ao passar o mouse, no clique, no toque e pelo teclado (Enter/Espaço); Esc e clique/toque fora fecham;
//    só uma aberta por vez; nunca abrem durante a lição (lesson-focus);
//  - sequência zerada = "Hoje pode ser o dia 1" (sem número); semana de segunda a domingo, igual ao Ranking;
//  - "Maior sequência" = recorde guardado na conta (bestStreak, shared/account-progress.js), nunca menor que o histórico;
//  - cartão de amigos: com amigos "Ver amigos" (aba Amigos); sem amigos "Chamar amigos" (aba Amigos com o convite em foco).
//
// Este arquivo tem: as contas puras (TopPopCalc, testadas em Node), o controle comum das janelas (TopPop.register) e a
// janela da sequência. A janela do XP é desenhada em shared/xp-semana.js e usa o mesmo controle.
// Depende (só dentro de funções): STATE, effectiveStreak/todayStr/dateStrDaysAgo (shared/srs.js), t/tp/fmtDate
// (shared/i18n/i18n.js), supabaseClient, CURRENT_USER, fetchProfileCards (shared/profile.js), switchTab, FRIENDS_STATE e
// friendsOpenInvite (shared/friends.js), AccountProgress (shared/account-progress.js).

(function(root){
  'use strict';
  var JOINT_MIN = 2;              // igual a FRIENDS_JOINT_MIN (shared/friends.js): "1 dia juntos" não conta
  var FRIENDS_REFRESH_MS = 60 * 1000;

  function pad(n){ return String(n).padStart(2, '0'); }
  function dateKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(key, n){ var p = key.split('-').map(Number); return dateKey(new Date(p[0], p[1] - 1, p[2] + n, 12)); }

  // Semana de SEGUNDA a DOMINGO de `now` (fuso do aparelho), mesma conta do Ranking. idx 0 = segunda.
  function weekDays(now, log){
    var d = now ? new Date(now.getTime()) : new Date();
    var todayKey = dateKey(d);
    var diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    var out = [];
    log = log || {};
    for (var i = 0; i < 7; i++){
      var day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff + i, 12);
      var k = dateKey(day);
      out.push({ key: k, idx: i, jsDay: day.getDay(), done: Number(log[k]) > 0, today: k === todayKey, future: k > todayKey });
    }
    return out;
  }

  // Estado da sequência para o cabeçalho. n = sequência efetiva (effectiveStreak), last = STATE.lastStudyDay.
  function streakState(n, last, todayKey){
    n = Number(n) || 0;
    if (n <= 0) return { n: 0, state: 'zero' };
    return { n: n, state: last === todayKey ? 'done' : 'pending' };
  }

  // Recorde mostrado: guardado, sequência atual e histórico (AccountProgress.bestStreakOf faz a mesma conta).
  function bestStreak(stored, streak, log, current){
    var AP = root.AccountProgress;
    var fromState = AP ? AP.bestStreakOf({ bestStreak: stored, streak: streak, activityLog: log }) : Math.max(Number(stored) || 0, Number(streak) || 0);
    return Math.max(fromState, Number(current) || 0);
  }

  // rows de friends_duo_state (um por amigo aceito) -> { count, active: [{ userId, days }] do maior para o menor }
  function friendsSummary(rows, min){
    var m = min || JOINT_MIN;
    var list = (rows || []).filter(function(r){ return r && r.user_id; });
    var active = list.filter(function(r){ return Number(r.joint_streak) >= m; })
      .map(function(r){ return { userId: r.user_id, days: Number(r.joint_streak) }; })
      .sort(function(a, b){ return b.days - a.days; });
    return { count: list.length, active: active };
  }

  // Frase "a mais que na semana passada": só quando a atual for MAIOR (e a semana passada for conhecida).
  function xpBetterThanLast(series){
    if (!series || series.length < 2 || !series[1].known) return 0;
    var d = (Number(series[0].amount) || 0) - (Number(series[1].amount) || 0);
    return d > 0 ? d : 0;
  }

  var calc = { weekDays: weekDays, streakState: streakState, bestStreak: bestStreak, friendsSummary: friendsSummary,
    xpBetterThanLast: xpBetterThanLast, dateKey: dateKey, addDays: addDays, JOINT_MIN: JOINT_MIN };
  root.TopPopCalc = calc;
  if (typeof module !== 'undefined' && module.exports) module.exports = calc;
  if (typeof document === 'undefined') return;

  // ================= Controle comum das janelas =================
  var POPS = {};          // id -> { cfg, mode, timer }
  var wiredGlobal = false;

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inLesson(){
    var app = document.getElementById('app');
    return document.body.classList.contains('lesson-focus') || !!(app && app.classList.contains('lesson-focus'));
  }
  function btnOf(id){ return document.getElementById(POPS[id].cfg.btnId); }
  function popOf(id){
    var p = POPS[id], el = document.getElementById(p.cfg.popId);
    if (el) return el;
    el = document.createElement('div');
    el.id = p.cfg.popId;
    el.className = 'tpop ' + (p.cfg.className || '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', p.cfg.popId + '-title');
    el.setAttribute('tabindex', '-1');
    el.hidden = true;
    document.body.appendChild(el);
    el.addEventListener('keydown', function(e){ onPopKeydown(id, e); });
    el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') clearTimeout(p.timer); });
    el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') scheduleHoverClose(id); });
    return el;
  }
  function isOpen(id){ var el = POPS[id] && document.getElementById(POPS[id].cfg.popId); return !!(el && !el.hidden); }

  function position(id){
    var pop = document.getElementById(POPS[id].cfg.popId), btn = btnOf(id);
    if (!pop || !btn || pop.hidden) return;
    var r = btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var w = pop.offsetWidth;
    var left = Math.round(r.left + r.width / 2 - w / 2);
    left = Math.max(16, Math.min(left, vw - w - 16));
    pop.style.left = left + 'px';
    pop.style.top = Math.round(r.bottom + 10) + 'px';
    pop.style.setProperty('--caret-x', Math.round(r.left + r.width / 2 - left) + 'px');
  }

  function render(id){
    if (!isOpen(id) || typeof t !== 'function') return;
    var pop = document.getElementById(POPS[id].cfg.popId);
    var hadFocus = pop.contains(document.activeElement) && document.activeElement !== pop ? document.activeElement.getAttribute('data-tpop-action') : null;
    pop.innerHTML = POPS[id].cfg.render();
    if (hadFocus){ var again = pop.querySelector('[data-tpop-action="' + hadFocus + '"]'); if (again) again.focus({ preventScroll: true }); }
    position(id);
  }

  function open(id, mode){
    if (!POPS[id] || inLesson()) return;
    var btn = btnOf(id);
    if (!btn) return;
    Object.keys(POPS).forEach(function(o){ if (o !== id && isOpen(o)) close(o, false); });
    var p = POPS[id], pop = popOf(id);
    clearTimeout(p.timer);
    var was = !pop.hidden;
    p.mode = mode;
    if (!was){
      pop.hidden = false;
      render(id);
      if (p.cfg.onOpen) p.cfg.onOpen();
    }
    btn.setAttribute('aria-expanded', 'true');
    position(id);
    if (mode === 'click') pop.focus({ preventScroll: true });
  }

  function close(id, returnFocus){
    var p = POPS[id];
    if (!p) return;
    clearTimeout(p.timer);
    p.mode = null;
    var pop = document.getElementById(p.cfg.popId), btn = btnOf(id);
    if (pop) pop.hidden = true;
    if (btn){
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus({ preventScroll: true });
    }
  }
  function closeAll(){ Object.keys(POPS).forEach(function(id){ if (isOpen(id)) close(id, false); }); }

  function scheduleHoverClose(id){
    var p = POPS[id];
    if (p.mode !== 'hover') return;
    clearTimeout(p.timer);
    p.timer = setTimeout(function(){ if (p.mode === 'hover') close(id, false); }, 250);
  }

  function focusables(pop){ return [].slice.call(pop.querySelectorAll('button:not([disabled]), a[href]')).filter(function(el){ return el.getClientRects().length; }); }

  function onPopKeydown(id, e){
    if (e.key === 'Escape' || e.key === 'Esc'){ e.preventDefault(); e.stopPropagation(); close(id, true); return; }
    if (e.key !== 'Tab') return;
    var pop = document.getElementById(POPS[id].cfg.popId);
    var f = focusables(pop);
    var first = f[0], last = f[f.length - 1];
    // Dentro da janela o Tab anda pelos botões dela; ao sair (antes do primeiro ou depois do último) fecha e volta ao pill.
    if (e.shiftKey && (document.activeElement === pop || document.activeElement === first)){ e.preventDefault(); close(id, true); }
    else if (!e.shiftKey && (!f.length || document.activeElement === last)){ e.preventDefault(); close(id, true); }
  }

  function wireButton(id){
    var btn = btnOf(id);
    if (!btn || btn.dataset.tpopWired) return;
    btn.dataset.tpopWired = '1';
    var p = POPS[id];
    btn.addEventListener('click', function(){
      // Aberta pelo mouse (hover): o clique "fixa"; aberta por clique/teclado/toque: fecha.
      if (isOpen(id) && p.mode === 'click') close(id, false);
      else open(id, 'click');
    });
    btn.addEventListener('keydown', function(e){ if ((e.key === 'Escape' || e.key === 'Esc') && isOpen(id)){ e.preventDefault(); close(id, true); } });
    btn.addEventListener('pointerenter', function(e){
      if (e.pointerType !== 'mouse') return;
      if (!isOpen(id)) open(id, 'hover'); else clearTimeout(p.timer);
    });
    btn.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') scheduleHoverClose(id); });
  }

  function wireGlobal(){
    if (wiredGlobal) return;
    wiredGlobal = true;
    document.addEventListener('pointerdown', function(e){
      Object.keys(POPS).forEach(function(id){
        if (!isOpen(id)) return;
        var btn = btnOf(id), pop = document.getElementById(POPS[id].cfg.popId);
        if ((btn && btn.contains(e.target)) || (pop && pop.contains(e.target))) return;
        close(id, false);
      });
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      Object.keys(POPS).forEach(function(id){ if (isOpen(id)) close(id, true); });
    });
    var reposition = function(){ Object.keys(POPS).forEach(position); };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('i18n:change', function(){ Object.keys(POPS).forEach(render); paintStreak(); });
    window.addEventListener('hashchange', closeAll);
    // Entrou na lição: fecha (o topo some em lesson-focus).
    try {
      var mo = new MutationObserver(function(){ if (inLesson()) closeAll(); });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      var app = document.getElementById('app');
      if (app) mo.observe(app, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }

  // cfg: { id, btnId, popId, className, render() -> html, onOpen() }
  function register(cfg){
    POPS[cfg.id] = POPS[cfg.id] || { cfg: cfg, mode: null, timer: null };
    POPS[cfg.id].cfg = cfg;
    var go = function(){ wireGlobal(); wireButton(cfg.id); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  // ================= Janela da sequência =================
  var friends = { status: 'idle', at: 0, userId: null, rows: null, names: {}, inflight: null };

  function userId(){ try { return (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id) || null; } catch (e) { return null; } }
  function todayKey(){ return typeof todayStr === 'function' ? todayStr() : dateKey(new Date()); }
  function currentStreak(){ return typeof effectiveStreak === 'function' ? effectiveStreak() : 0; }
  function st(){ return (typeof STATE !== 'undefined' && STATE) ? STATE : {}; }
  function dayLabel(jsDay){
    var keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t('wizard.day.' + keys[jsDay]);
  }

  function friendName(uid){
    var n = friends.names[uid];
    if (n) return n;
    var list = (typeof FRIENDS_STATE !== 'undefined' && FRIENDS_STATE && FRIENDS_STATE.friends) || [];
    for (var i = 0; i < list.length; i++){
      if (list[i].userId === uid && list[i].profile) return list[i].profile.display_name || list[i].profile.username || '';
    }
    return '';
  }

  function loadFriends(force){
    var uid = userId();
    if (!uid || typeof supabaseClient === 'undefined' || !supabaseClient){ friends.status = 'none'; return Promise.resolve(); }
    if (!force && friends.userId === uid && friends.status === 'ok' && Date.now() - friends.at < FRIENDS_REFRESH_MS) return Promise.resolve();
    if (friends.inflight) return friends.inflight;
    if (friends.userId !== uid){ friends.rows = null; friends.names = {}; friends.status = 'loading'; }
    friends.userId = uid;
    friends.inflight = Promise.resolve().then(function(){ return supabaseClient.rpc('friends_duo_state'); })
      .then(function(res){ return (res && res.error) ? supabaseClient.rpc('friends_duo') : res; }) // sem a 109 no banco
      .then(function(res){
        if (!res || res.error) throw (res && res.error) || new Error('sem resposta');
        friends.rows = res.data || [];
        friends.status = 'ok';
        friends.at = Date.now();
        var top = friendsSummary(friends.rows).active[0];
        if (top && !friendName(top.userId) && typeof fetchProfileCards === 'function'){
          return Promise.resolve(fetchProfileCards([top.userId])).then(function(cards){
            (cards || []).forEach(function(c){ friends.names[c.user_id] = c.display_name || c.username || ''; });
          }, function(){});
        }
      })
      .catch(function(err){
        if (friends.status !== 'ok') friends.status = 'error';
        try { console.warn('Janela da sequência: não deu para ler os amigos', err); } catch (e) {}
      })
      .then(function(){ friends.inflight = null; render('streak'); });
    return friends.inflight;
  }

  function friendsCardHTML(){
    var sub, hasFriends = true;
    if (!userId()){ hasFriends = false; sub = esc(t('streakPop.friends.noFriends')); }
    else if (friends.status === 'ok'){
      var s = friendsSummary(friends.rows);
      if (!s.count){ hasFriends = false; sub = esc(t('streakPop.friends.noFriends')); }
      else if (!s.active.length) sub = esc(t('streakPop.friends.none'));
      else {
        var top = s.active[0], name = friendName(top.userId);
        var days = '<strong>' + esc(tp('streakPop.days', top.days, { n: top.days })) + '</strong>';
        var key = s.active.length === 1 ? (name ? 'streakPop.friends.oneActive' : 'streakPop.friends.oneActiveNoName') : (name ? 'streakPop.friends.manyActive' : 'streakPop.friends.manyActiveNoName');
        sub = t(key, { k: s.active.length, days: days, name: esc(name) });
      }
    } else if (friends.status === 'error') sub = esc(t('streakPop.friends.error'));
    else sub = esc(t('streakPop.friends.loading'));
    var action = hasFriends ? 'friends' : 'invite';
    return '<div class="tpop-card has-btn" data-friends-state="' + (hasFriends ? 'friends' : 'none') + '"><span class="tpop-card-icon" aria-hidden="true">🤝</span>' +
      '<div class="tpop-card-text"><p class="tpop-card-title">' + esc(t('streakPop.friends.title')) + '</p><p class="tpop-card-sub">' + sub + '</p></div>' +
      '<button type="button" class="tpop-link" data-tpop-action="' + action + '">' + esc(t(hasFriends ? 'streakPop.friends.see' : 'streakPop.friends.invite')) + '</button></div>';
  }

  function streakHTML(){
    var S = st(), today = todayKey();
    var view = streakState(currentStreak(), S.lastStudyDay, today);
    var head;
    if (view.state === 'zero'){
      head = '<p class="tpop-headline" id="streak-pop-title">' + esc(t('streakPop.zero.headline')) + '</p><p class="tpop-sub">' + esc(t('streakPop.zero.sub')) + '</p>';
    } else {
      head = '<p class="tpop-big" id="streak-pop-title"><span class="tpop-num">' + view.n + '</span><span class="tpop-unit">' + esc(tp('streakPop.unit', view.n, { n: view.n })) + '</span></p>' +
        '<p class="tpop-sub">' + esc(t(view.state === 'done' ? 'streakPop.sub.done' : 'streakPop.sub.pending', { next: view.n + 1 })) + '</p>';
    }
    var art = '<span class="tpop-art' + (view.state === 'zero' ? ' is-off' : view.state === 'pending' ? ' is-wait' : '') + '" aria-hidden="true">🔥</span>';
    var days = weekDays(new Date(), S.activityLog);
    var k = days.filter(function(d){ return d.done; }).length;
    var week = '<div class="tpop-sec"><div class="tpop-sec-head"><p class="tpop-sec-title" id="streak-pop-week">' + esc(t('streakPop.week')) + '</p>' +
      '<span class="tpop-sec-aside">' + esc(t('streakPop.weekCount', { n: k })) + '</span></div><ol class="tpop-week" aria-labelledby="streak-pop-week">' +
      days.map(function(d){
        var label = dayLabel(d.jsDay);
        var aria = d.done ? t('streakPop.dayStudied', { day: label }) : label;
        return '<li class="tpop-day' + (d.done ? ' is-done' : '') + (d.today ? ' is-today' : '') + (d.future ? ' is-future' : '') + '"' +
          (d.today ? ' aria-current="date"' : '') + ' data-day="' + d.key + '"><span class="tpop-dot" aria-hidden="true">' + (d.done ? '✓' : '') + '</span>' +
          '<span class="tpop-dlabel" aria-hidden="true">' + esc(label) + '</span><span class="sr-only">' + esc(aria) + '</span></li>';
      }).join('') + '</ol></div>';
    var best = bestStreak(S.bestStreak, S.streak, S.activityLog, view.n);
    var rec = '';
    if (best >= 2){
      rec = '<div class="tpop-line" data-best="' + best + '"><span aria-hidden="true">🏆</span><span class="tpop-line-label">' + esc(t('streakPop.best')) +
        (best === view.n ? '<span class="tpop-chip">' + esc(t('streakPop.bestNow')) + '</span>' : '') + '</span>' +
        '<span class="tpop-line-value">' + esc(tp('streakPop.days', best, { n: best })) + '</span></div>';
    }
    return '<div class="tpop-clip"><div class="tpop-head">' + head + art + '</div><div class="tpop-body">' + week + rec + friendsCardHTML() + '</div></div>';
  }

  // Rótulo do botão 🔥 (leitor de tela). Chamado por renderTopbarStats() (shared/topbar-stats.js).
  function paintStreak(){
    var btn = document.getElementById('streak-btn');
    if (btn && typeof t === 'function'){
      var n = currentStreak();
      var label = n > 0 ? tp('streakPop.buttonAria', n, { n: n }) : t('streakPop.buttonAriaZero');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
    render('streak');
  }

  function onStreakAction(e){
    var b = e.target.closest('[data-tpop-action]');
    if (!b) return;
    var action = b.getAttribute('data-tpop-action');
    if (action !== 'friends' && action !== 'invite') return;
    closeAll();
    // "Chamar amigos": aba Amigos com o convite (link, QR code, busca, sugestões) em foco. "Ver amigos": aba Amigos.
    if (action === 'invite' && typeof friendsOpenInvite === 'function') friendsOpenInvite();
    else if (typeof switchTab === 'function') switchTab('friends');
  }

  register({ id: 'streak', btnId: 'streak-btn', popId: 'streak-pop', className: 'streak-pop', render: streakHTML, onOpen: function(){ loadFriends(false); } });
  var hookStreakClicks = function(){
    var pop = popOf('streak');
    if (!pop.dataset.tpopActions){ pop.dataset.tpopActions = '1'; pop.addEventListener('click', onStreakAction); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookStreakClicks); else hookStreakClicks();

  root.TopPop = { register: register, open: open, close: close, closeAll: closeAll, isOpen: isOpen, render: render, position: position,
    paintStreak: paintStreak, loadFriends: loadFriends, esc: esc,
    _resetFriends: function(){ friends = { status: 'idle', at: 0, userId: null, rows: null, names: {}, inflight: null }; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
