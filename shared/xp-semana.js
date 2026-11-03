// ---------- XP da semana no topo + janelinha com as últimas semanas ----------
// Decisão da dona (2026-10-29), vale para todos os sites (fr, zh, pt e futuros):
//  - o contador ⭐ do topo mostra o XP DA SEMANA (não o total), com "XP" ao lado do número;
//  - tocar/clicar (ou passar o mouse) abre uma janelinha com a semana atual em destaque e as 3 anteriores.
// Rework (2026-10-30, docs/janelas-topo-proposta.md): a janela usa o desenho e o controle comuns das janelas do topo
// (shared/janelas-topo.js, TopPop): cabeçalho na cor da marca, colunas das 4 semanas (antiga à esquerda), frase
// "+N XP a mais que na semana passada" só quando a atual é maior, total do curso e botão "Ver ranking".
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
// t()/fmtDate() (shared/i18n/i18n.js), animateStatPill (shared/topbar-stats.js), TopPop/TopPopCalc (shared/janelas-topo.js).

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
    rerender();
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
      rerender();
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
    rerender();
  }

  function renderTopbar(){
    paint();
    var srv = currentServer();
    var cur = weekStartOf(new Date());
    if (!srv || srv.weekAtFetch !== cur) refresh(false);
  }

  // ---------- Janela (desenho comum das janelas do topo, shared/janelas-topo.js) ----------
  function rerender(){ if (root.TopPop) root.TopPop.render('xp'); }

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // "26 out a 1 nov" / "5 a 11 out" (en: "Oct 26–Nov 1" / "Oct 5–11"). Mês curto do idioma do site, sem o ponto.
  function monthShort(d){ return (typeof fmtDate === 'function' ? fmtDate(d, { month: 'short' }) : String(d.getMonth() + 1)).replace(/\.$/, ''); }
  function rangeLabel(weekKey){
    var p = weekKey.split('-').map(Number);
    var a = new Date(p[0], p[1] - 1, p[2], 12), b = weekEnd(weekKey);
    if (a.getMonth() === b.getMonth()) return t('xpWeek.colRange', { d1: a.getDate(), d2: b.getDate(), m: monthShort(a) });
    return t('xpWeek.colRangeCross', { d1: a.getDate(), m1: monthShort(a), d2: b.getDate(), m2: monthShort(b) });
  }

  function popoverHTML(){
    var rows = currentSeries();
    var srv = currentServer();
    var cur = rows[0];
    var head = '<p class="tpop-big" id="xp-week-pop-title"><span class="tpop-num">' + cur.amount + '</span><span class="tpop-unit">' + esc(t('xpWeek.headUnit')) + '</span></p>' +
      '<p class="tpop-sub">' + esc(rangeLabel(cur.weekStart)) + '</p>';
    var art = '<span class="tpop-art' + (cur.amount ? '' : ' is-off') + '" aria-hidden="true">⭐</span>';
    var better = root.TopPopCalc ? root.TopPopCalc.xpBetterThanLast(rows) : 0;
    var betterHTML = better > 0 ? '<p class="tpop-better" data-better="' + better + '">' + esc(tp('xpWeek.better', better, { n: better })) + '</p>' : '';
    var known = rows.map(function(r){ return r.current || !!srv; });
    var max = Math.max.apply(null, rows.map(function(r, i){ return known[i] ? r.amount : 0; }).concat([1]));
    var cols = rows.slice().reverse().map(function(r){
      var i = rows.indexOf(r), show = known[i];
      var h = show ? Math.max(4, Math.round(84 * r.amount / max)) : 4;
      return '<li class="tpop-bar xp-week-row' + (r.current ? ' is-current' : '') + '"' + (r.current ? ' aria-current="date"' : '') + ' data-week="' + r.weekStart + '">' +
        '<span class="tpop-bar-val xp-week-amount">' + esc(show ? t('xpWeek.amount', { n: r.amount }) : '…') + '</span>' +
        '<span class="tpop-bar-track" aria-hidden="true"><span class="tpop-bar-fill" style="height:' + h + 'px"></span></span>' +
        '<span class="tpop-bar-label xp-week-label">' + esc(r.current ? t('xpWeek.thisWeek') : rangeLabel(r.weekStart)) + '</span></li>';
    }).join('');
    var body = betterHTML + '<div class="tpop-sec"><div class="tpop-sec-head"><p class="tpop-sec-title" id="xp-week-pop-last4">' + esc(t('xpWeek.last4')) + '</p></div>' +
      '<ol class="tpop-bars" aria-labelledby="xp-week-pop-last4">' + cols + '</ol></div>';
    if (!srv && status === 'loading') body += '<p class="tpop-note" role="status">' + esc(t('xpWeek.loading')) + '</p>';
    else if (!srv && status === 'error') body += '<p class="tpop-note" role="status">' + esc(t('xpWeek.error')) + '</p>';
    // XP total do curso aberto (o número que o topo mostrava antes; decisão da dona de 2026-10-29: não sumir com ele).
    var total = (typeof STATE !== 'undefined' && STATE && typeof STATE.xp === 'number') ? STATE.xp : null;
    if (total !== null) body += '<div class="tpop-card xp-week-total"><span class="tpop-card-icon" aria-hidden="true">📚</span><div class="tpop-card-text"><p class="tpop-card-title">' +
      esc(t('xpWeek.totalLabel')) + '</p></div><span class="tpop-line-value">' + esc(t('xpWeek.amount', { n: total })) + '</span></div>';
    body += '<p class="tpop-note">' + esc(t('xpWeek.note')) + '</p>';
    body += '<div class="tpop-actions"><button type="button" class="tpop-link" data-tpop-action="ranking">' + esc(t('xpWeek.seeRanking')) + '</button></div>';
    return '<div class="tpop-clip"><div class="tpop-head">' + head + art + '</div><div class="tpop-body">' + body + '</div></div>';
  }

  function isOpen(){ return !!(root.TopPop && root.TopPop.isOpen('xp')); }
  function open(mode){ if (root.TopPop) root.TopPop.open('xp', mode || 'click'); }
  function close(returnFocus){ if (root.TopPop) root.TopPop.close('xp', returnFocus); }

  function wire(){
    var btn = document.getElementById('xp-week-btn');
    if (!btn || !root.TopPop) return;
    root.TopPop.register({ id: 'xp', btnId: 'xp-week-btn', popId: 'xp-week-pop', className: 'xp-week-pop', render: popoverHTML, onOpen: function(){ refresh(false); } });
    if (!document.documentElement.dataset.xpWeekActions){
      document.documentElement.dataset.xpWeekActions = '1';
      document.addEventListener('click', function(e){
        var b = e.target.closest && e.target.closest('#xp-week-pop [data-tpop-action="ranking"]');
        if (!b) return;
        root.TopPop.closeAll();
        // "Ver ranking": a tela do Ranking (abre em "Geral", a mesma soma do número do topo).
        if (typeof switchTab === 'function') switchTab('leaderboard');
      });
    }
    window.addEventListener('i18n:change', function(){ paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  root.XpSemana = { renderTopbar: renderTopbar, refresh: refresh, currentAmount: currentAmount, currentSeries: currentSeries, open: open, close: close, isOpen: isOpen,
    _reset: function(){ server = null; status = 'idle'; inflight = null; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
