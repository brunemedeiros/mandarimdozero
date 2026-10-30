// ---------- XP da semana no topo + janelinha com as últimas semanas ----------
// Decisão da dona (2026-10-29), vale para todos os sites (fr, zh, pt e futuros):
//  - o contador ⭐ do topo mostra o XP DA SEMANA (não o total), com "XP" ao lado do número;
//  - tocar/clicar (ou passar o mouse) abre uma janelinha com a semana atual em destaque e as 3 anteriores.
//
// Semana = a MESMA do Ranking semanal (shared/leaderboard.js): segunda-feira a domingo no fuso do aparelho, chave
// 'YYYY-MM-DD' da segunda (currentWeekStart() em shared/core/estado-trilha-desafios.js e
// leaderboardCurrentWeekStart() fazem a mesma conta). O Ranking abre em "Geral" = soma de todos os idiomas da conta
// na tabela weekly_xp; o número daqui é essa mesma soma, para bater com a linha da pessoa no Ranking.
//
// De onde vem cada pedaço:
//  - servidor: weekly_xp da própria conta (leitura pública, migration 006), últimas 4 semanas, por idioma;
//  - local: STATE.periodXp (semana atual do curso aberto), que sobe na hora em cada addXP() e só chega ao servidor
//    no próximo saveState(). Até a resposta do servidor chegar, o topo mostra o local; quando chega, o número sobe
//    contando (animateStatPill) a partir do que já estava na tela.
// Conta do idioma desta página na semana atual = servidor + o que o curso ganhou DEPOIS da leitura, nunca menos que o
// local (o servidor pode estar atrasado em relação ao último save).
//
// Depende (só dentro de funções): STATE, APP_KEY, CURRENT_USER/progressLoadedOk (shared/auth.js), supabaseClient,
// t()/fmtDate() (shared/i18n/i18n.js), animateStatPill (shared/topbar-stats.js).

(function(root){
  var WEEKS_SHOWN = 4;            // atual + 3 anteriores
  var REFRESH_MS = 60 * 1000;     // ao abrir a janelinha, relê o servidor se a leitura tiver mais de 1 minuto

  function pad(n){ return String(n).padStart(2, '0'); }
  function dateKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  // Segunda-feira da semana de `date` (fuso do aparelho), 'YYYY-MM-DD'. Mesma conta de currentWeekStart().
  function weekStartOf(date){
    var d = date ? new Date(date.getTime()) : new Date();
    var diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
    var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
    return dateKey(monday);
  }

  // Semana `n` semanas antes (n=1 = semana passada). Conta no calendário (meio-dia), sem pular com horário de verão.
  function shiftWeek(weekKey, n){
    var p = weekKey.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] - 7 * n, 12);
    return dateKey(d);
  }

  function weekEnd(weekKey){
    var p = weekKey.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2] + 6, 12);
  }

  // rows: linhas de weekly_xp ({week_start, language_app_key, amount}) -> { semana: { total, byLang: {idioma: n} } }
  function groupRows(rows){
    var out = {};
    (rows || []).forEach(function(r){
      if (!r || !r.week_start) return;
      var w = String(r.week_start).slice(0, 10);
      var o = out[w] || (out[w] = { total: 0, byLang: {} });
      var n = Number(r.amount) || 0;
      o.total += n;
      o.byLang[r.language_app_key] = (o.byLang[r.language_app_key] || 0) + n;
    });
    return out;
  }

  // Série de 4 semanas (atual primeiro). `server` = { weeks, localAtFetch, weekAtFetch } ou null (ainda não leu / falhou).
  // `local` = STATE.periodXp; `appKey` = idioma desta página.
  function series(opts){
    var now = opts.now || new Date();
    var cur = weekStartOf(now);
    var local = opts.local || {};
    var localNow = local.weekStart === cur ? (Number(local.amount) || 0) : 0;
    var server = opts.server;
    var weeks = (server && server.weeks) || {};
    var out = [];
    for (var i = 0; i < WEEKS_SHOWN; i++){
      var w = i === 0 ? cur : shiftWeek(cur, i);
      var row = weeks[w];
      var amount;
      var known = !!server;
      if (i === 0){
        if (!server){ amount = localNow; known = true; }
        else {
          var thisLang = (row && row.byLang[opts.appKey]) || 0;
          var others = row ? row.total - thisLang : 0;
          var sinceFetch = server.weekAtFetch === cur ? Math.max(0, localNow - (server.localAtFetch || 0)) : localNow;
          amount = others + Math.max(thisLang + sinceFetch, localNow);
        }
      } else {
        amount = row ? row.total : 0;
      }
      out.push({ weekStart: w, weekEnd: dateKey(weekEnd(w)), ago: i, current: i === 0, amount: amount, known: known });
    }
    return out;
  }

  var api = { weekStartOf: weekStartOf, shiftWeek: shiftWeek, groupRows: groupRows, series: series, WEEKS_SHOWN: WEEKS_SHOWN };
  root.XpSemanaCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document === 'undefined') return;

  // ---------- Estado da página ----------
  var server = null;          // { userId, weeks, localAtFetch, weekAtFetch, at }
  var status = 'idle';        // idle | loading | ok | error
  var inflight = null;
  var openMode = null;        // null | 'hover' | 'click'
  var hoverTimer = null;

  function localPeriod(){ return (typeof STATE !== 'undefined' && STATE && STATE.periodXp) ? STATE.periodXp : null; }
  function appKey(){ return typeof APP_KEY !== 'undefined' ? APP_KEY : null; }
  function userId(){ try { return (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id) || null; } catch (e) { return null; } }
  function ready(){ try { return !!userId() && typeof progressLoadedOk !== 'undefined' && progressLoadedOk && typeof supabaseClient !== 'undefined' && supabaseClient; } catch (e) { return false; } }

  function currentServer(){
    var uid = userId();
    if (!server || server.userId !== uid) return null;
    return server;
  }

  function currentSeries(){
    return series({ local: localPeriod(), server: currentServer(), appKey: appKey() });
  }

  function currentAmount(){ return currentSeries()[0].amount; }

  // Lê weekly_xp da própria conta (4 semanas). Só depois do progresso carregar: o "local na hora da leitura" precisa ser o
  // valor real, senão o que já estava salvo seria contado duas vezes.
  function refresh(force){
    if (!ready()) return Promise.resolve(false);
    var srv = currentServer();
    var cur = weekStartOf(new Date());
    if (!force && srv && srv.weekAtFetch === cur && (Date.now() - srv.at) < REFRESH_MS) return Promise.resolve(true);
    if (inflight) return inflight;
    var uid = userId();
    var oldest = shiftWeek(cur, WEEKS_SHOWN - 1);
    var lp = localPeriod();
    var localAtFetch = lp && lp.weekStart === cur ? (Number(lp.amount) || 0) : 0;
    status = srv ? status : 'loading';
    renderPopover();
    inflight = Promise.resolve().then(function(){
      return supabaseClient.from('weekly_xp').select('week_start, language_app_key, amount').eq('user_id', uid).gte('week_start', oldest);
    }).then(function(res){
      inflight = null;
      if (!res || res.error) throw (res && res.error) || new Error('sem resposta');
      server = { userId: uid, weeks: groupRows(res.data), localAtFetch: localAtFetch, weekAtFetch: cur, at: Date.now() };
      status = 'ok';
      paint();
      return true;
    }).catch(function(err){
      inflight = null;
      if (!currentServer()) status = 'error';
      try { console.warn('XP da semana: não deu para ler weekly_xp', err); } catch (e) {}
      renderPopover();
      return false;
    });
    return inflight;
  }

  // Número do topo + rótulo para leitor de tela. Chamado por renderTopbarStats().
  function paint(){
    var n = currentAmount();
    var el = document.getElementById('xp-count');
    if (el && typeof animateStatPill === 'function') animateStatPill(el, n);
    else if (el) el.textContent = n;
    var btn = document.getElementById('xp-week-btn');
    if (btn && typeof t === 'function'){
      var label = t('xpWeek.buttonAria', { n: n });
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
    renderPopover();
  }

  function renderTopbar(){
    paint();
    var srv = currentServer();
    var cur = weekStartOf(new Date());
    if (!srv || srv.weekAtFetch !== cur) refresh(false);
  }

  // ---------- Janelinha ----------
  function popEl(){ return document.getElementById('xp-week-pop'); }

  function ensurePopover(){
    var pop = popEl();
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = 'xp-week-pop';
    pop.className = 'xp-week-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-labelledby', 'xp-week-pop-title');
    pop.setAttribute('tabindex', '-1');
    pop.hidden = true;
    document.body.appendChild(pop);
    pop.addEventListener('keydown', onKeydown);
    pop.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') clearTimeout(hoverTimer); });
    pop.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') scheduleHoverClose(); });
    return pop;
  }

  function weekLabel(ago){
    if (ago === 0) return t('xpWeek.thisWeek');
    if (ago === 1) return t('xpWeek.lastWeek');
    return tp('xpWeek.weeksAgo', ago);
  }

  function dayMonth(key){
    var p = key.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12);
    return typeof fmtDate === 'function' ? fmtDate(d, { day: 'numeric', month: 'short' }) : key;
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderPopover(){
    var pop = popEl();
    if (!pop || pop.hidden || typeof t !== 'function') return;
    var rows = currentSeries();
    var max = Math.max.apply(null, rows.map(function(r){ return r.amount; }).concat([1]));
    var srv = currentServer();
    var html = '<div class="xp-week-pop-title" id="xp-week-pop-title">' + esc(t('xpWeek.title')) + '</div><ol class="xp-week-list">';
    rows.forEach(function(r){
      var showNum = r.current || srv;
      var amountTxt = showNum ? t('xpWeek.amount', { n: r.amount }) : '…';
      var pct = showNum ? Math.round(100 * r.amount / max) : 0;
      html += '<li class="xp-week-row' + (r.current ? ' is-current' : '') + '"' + (r.current ? ' aria-current="date"' : '') + ' data-week="' + r.weekStart + '">' +
        '<div class="xp-week-row-head"><span class="xp-week-label">' + esc(weekLabel(r.ago)) + '</span>' +
        '<span class="xp-week-amount">' + esc(amountTxt) + '</span></div>' +
        '<div class="xp-week-dates">' + esc(t('xpWeek.range', { from: dayMonth(r.weekStart), to: dayMonth(r.weekEnd) })) + '</div>' +
        '<div class="xp-week-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div></li>';
    });
    html += '</ol>';
    if (!srv && status === 'loading') html += '<p class="xp-week-note" role="status">' + esc(t('xpWeek.loading')) + '</p>';
    else if (!srv && status === 'error') html += '<p class="xp-week-note" role="status">' + esc(t('xpWeek.error')) + '</p>';
    // XP total do curso aberto (o número que o topo mostrava antes; decisão da dona de 2026-10-29: não sumir com ele).
    var total = (typeof STATE !== 'undefined' && STATE && typeof STATE.xp === 'number') ? STATE.xp : null;
    if (total !== null) html += '<div class="xp-week-total"><span>' + esc(t('xpWeek.totalLabel')) + '</span><strong>' + esc(t('xpWeek.amount', { n: total })) + '</strong></div>';
    html += '<p class="xp-week-note">' + esc(t('xpWeek.note')) + '</p>';
    pop.innerHTML = html;
  }

  function position(){
    var pop = popEl(), btn = document.getElementById('xp-week-btn');
    if (!pop || !btn || pop.hidden) return;
    var r = btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var w = pop.offsetWidth;
    var left = Math.round(r.left + r.width / 2 - w / 2);
    left = Math.max(16, Math.min(left, vw - w - 16));
    pop.style.left = left + 'px';
    pop.style.top = Math.round(r.bottom + 8) + 'px';
  }

  function open(mode){
    var btn = document.getElementById('xp-week-btn');
    if (!btn) return;
    var pop = ensurePopover();
    clearTimeout(hoverTimer);
    var wasOpen = !pop.hidden;
    openMode = mode;
    if (!wasOpen){
      pop.hidden = false;
      renderPopover();
      refresh(false);
    }
    btn.setAttribute('aria-expanded', 'true');
    position();
    if (mode === 'click') pop.focus({ preventScroll: true });
  }

  function close(returnFocus){
    var pop = popEl(), btn = document.getElementById('xp-week-btn');
    clearTimeout(hoverTimer);
    openMode = null;
    if (pop) pop.hidden = true;
    if (btn){
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus({ preventScroll: true });
    }
  }

  function isOpen(){ var pop = popEl(); return !!(pop && !pop.hidden); }

  function scheduleHoverClose(){
    if (openMode !== 'hover') return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function(){ if (openMode === 'hover') close(false); }, 250);
  }

  function onKeydown(e){
    if (e.key === 'Escape' || e.key === 'Esc'){
      if (!isOpen()) return;
      e.preventDefault(); e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab' && popEl() && popEl().contains(e.target)){
      // A janelinha não tem nada para focar dentro: Tab volta ao contador (a ordem da página segue dali).
      e.preventDefault();
      close(true);
    }
  }

  function wire(){
    var btn = document.getElementById('xp-week-btn');
    if (!btn || btn.dataset.xpWeekWired) return;
    btn.dataset.xpWeekWired = '1';
    ensurePopover();
    btn.addEventListener('click', function(){
      // Aberta pelo mouse (hover): o clique "fixa" a janelinha; aberta por clique/teclado/toque: fecha.
      if (isOpen() && openMode === 'click') close(false);
      else open('click');
    });
    btn.addEventListener('keydown', onKeydown);
    btn.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse' && !isOpen()) open('hover'); else if (e.pointerType === 'mouse') clearTimeout(hoverTimer); });
    btn.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') scheduleHoverClose(); });
    document.addEventListener('pointerdown', function(e){
      if (!isOpen()) return;
      var pop = popEl();
      if (btn.contains(e.target) || (pop && pop.contains(e.target))) return;
      close(false);
    }, true);
    document.addEventListener('keydown', function(e){ if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()){ close(true); } });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, { passive: true });
    window.addEventListener('i18n:change', function(){ paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  root.XpSemana = { renderTopbar: renderTopbar, refresh: refresh, currentAmount: currentAmount, currentSeries: currentSeries, open: open, close: close, isOpen: isOpen,
    _reset: function(){ server = null; status = 'idle'; inflight = null; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
