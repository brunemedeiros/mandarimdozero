// ---------- Visão Geral (Painel de Admin, Central de Controle): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*; o que é só desta tela fica em
// shared/admin-overview.css, classes aov-*). Busca de dados e eventos: shared/admin-overview.js. Plano e decisões da autora:
// docs/central-de-controle-plano.md (seção 5). Testado em tests/central-de-controle/test_overview_ui_unit.js.
// Todo texto vindo do banco passa por escapeHTML; todo texto visível por t()/tp() (chaves admin.overview.*).
//
// Depende de: shared/i18n (t, tp, fmtDate, fmtNumber), shared/profile.js (escapeHTML).

const AOV_PERIODS = [7, 30, 90];
const AOV_SCOPES = ['mine', 'others', 'all'];
const AOV_LANGUAGES = ['all', 'frances', 'mandarim', 'portugues'];
const AOV_BANDS = ['nenhum', 'baixo', 'medio', 'alto', 'altissimo'];
const AOV_SITUATIONS = ['ok', 'warn', 'stopped', 'none'];
const AOV_SITUATION_CLASS = { ok: 'p-selo--ok', warn: 'p-selo--aviso', stopped: 'p-selo--erro', none: '' };

function aovEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function aovNum(n){ return typeof fmtNumber === 'function' ? fmtNumber(Number(n) || 0) : String(Number(n) || 0); }
// Plural com zero no plural ('0 dias', não '0 dia' como o Intl faz em pt-BR).
function aovTp(key, n, params){ return tp(key, n === 0 ? 2 : n, Object.assign({ n }, params || {})); }

// 'AAAA-MM-DD' -> Date local (meia-noite do dia certo; new Date('AAAA-MM-DD') seria meia-noite UTC e mudaria de dia no Brasil).
function aovParseDay(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function aovDayLabel(s){
  const d = aovParseDay(s);
  return d ? fmtDate(d, { day: '2-digit', month: '2-digit' }) : aovEsc(s);
}

function aovLangLabel(key){
  if (key === 'all') return t('admin.overview.lang.all');
  if (key === 'frances') return t('fieldEditor.lang.fr');
  if (key === 'mandarim') return t('admin.students.lang.mandarim');
  if (key === 'portugues') return t('admin.students.lang.portugues');
  return String(key || '');
}

function aovBand(days){
  const d = Number(days) || 0;
  return d <= 0 ? 'nenhum' : d === 1 ? 'baixo' : d <= 3 ? 'medio' : d <= 5 ? 'alto' : 'altissimo';
}

// ---- filtros ----
// st = { days, scope, language }
function aovSegHTML(name, label, values, current, labelOf){
  return `<div class="aov-filtro"><span class="aov-filtro-rotulo" id="aov-rot-${name}">${aovEsc(label)}</span>
    <div class="p-seg" role="group" aria-labelledby="aov-rot-${name}">${values.map(v => `<button type="button" data-aov-${name}="${aovEsc(v)}" aria-pressed="${String(v) === String(current)}">${aovEsc(labelOf(v))}</button>`).join('')}</div></div>`;
}
function aovFiltersHTML(st){
  return `<article class="aov-filtros" data-aov="filtros">
    ${aovSegHTML('periodo', t('admin.overview.filter.period'), AOV_PERIODS, st.days, v => t(`admin.overview.period.${v}`))}
    ${aovSegHTML('quem', t('admin.overview.filter.scope'), AOV_SCOPES, st.scope, v => t(`admin.overview.scope.${v}`))}
    ${aovSegHTML('idioma', t('admin.overview.filter.language'), AOV_LANGUAGES, st.language, aovLangLabel)}
  </article>`;
}

// ---- números ----
function aovKpi(value, label, detail){
  return `<article class="p-indicador"><span class="p-indicador-rotulo">${aovEsc(label)}</span><span class="p-indicador-valor">${aovEsc(value)}</span>${detail ? `<span class="p-indicador-detalhe">${aovEsc(detail)}</span>` : ''}</article>`;
}
function aovKpisHTML(stats, scope){
  const tot = (stats && stats.totals) || {};
  const avg = tot.engagement_avg == null ? 0 : Number(tot.engagement_avg);
  const avgTxt = typeof fmtNumber === 'function' ? fmtNumber(avg, { maximumFractionDigits: 1 }) : String(avg);
  return `<div class="p-indicadores" data-aov="numeros">
    ${aovKpi(aovNum(tot.accounts), t(scope === 'mine' ? 'admin.overview.kpi.students' : 'admin.overview.kpi.accounts'))}
    ${aovKpi(aovNum(tot.active), t('admin.overview.kpi.active'), t('admin.overview.kpi.activeDetail'))}
    ${aovKpi(avgTxt, t('admin.overview.kpi.engagement'), t('admin.overview.kpi.engagementDetail'))}
    ${aovKpi(aovNum(tot.new_accounts), t('admin.overview.kpi.new'))}
    ${aovKpi(aovNum(tot.premium), t('admin.overview.kpi.premium'))}
  </div>`;
}

// ---- gráfico de linhas (SVG à mão) ----
// series = [{ key, label, values: [n...] }], days = ['AAAA-MM-DD'...]. Cores por token (classes aov-serie--<key>).
// Acessível: figure com resumo no aria-label do svg e uma tabela só para leitor de tela com todos os valores.
function aovNiceMax(n){
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps){ if (n <= s * pow) return s * pow; }
  return 10 * pow;
}
function aovLineChartHTML(id, title, days, series){
  const W = 640, H = 190, padL = 34, padR = 10, padT = 10, padB = 26;
  const all = series.flatMap(s => s.values.map(v => Number(v) || 0));
  const max = all.length ? Math.max(...all) : 0;
  const top = aovNiceMax(max);
  const n = days.length;
  const x = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (Number(v) || 0) / top);
  const grid = [0, top / 2, top].map(g => `<line class="aov-grade" x1="${padL}" x2="${W - padR}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/><text class="aov-eixo" x="${padL - 6}" y="${(y(g) + 4).toFixed(1)}" text-anchor="end">${aovEsc(aovNum(g))}</text>`).join('');
  // Poucos rótulos no eixo x (primeiro, meio e último dia) para caber no celular.
  const ticks = n ? Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1])) : [];
  const xlab = ticks.map(i => `<text class="aov-eixo" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${aovEsc(aovDayLabel(days[i]))}</text>`).join('');
  const lines = series.map(s => {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const dots = n <= 31 ? s.values.map((v, i) => `<circle class="aov-ponto aov-serie--${aovEsc(s.key)}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6"/>`).join('') : '';
    return `<polyline class="aov-linha aov-serie--${aovEsc(s.key)}" points="${pts}"/>${dots}`;
  }).join('');
  const from = n ? aovDayLabel(days[0]) : '', to = n ? aovDayLabel(days[n - 1]) : '';
  const aria = t('admin.overview.chart.aria', { title, from, to, max: aovNum(max) });
  const legend = `<p class="p-legenda">${series.map(s => `<span class="aov-legenda--${aovEsc(s.key)}">${aovEsc(s.label)}: <b>${aovEsc(aovNum(s.values.reduce((a, b) => a + (Number(b) || 0), 0)))}</b></span>`).join('')}</p>`;
  const table = `<table class="p-so-leitor"><caption>${aovEsc(t('admin.overview.chart.tableCaption', { title }))}</caption><thead><tr><th scope="col">${aovEsc(t('admin.overview.chart.col.day'))}</th>${series.map(s => `<th scope="col">${aovEsc(s.label)}</th>`).join('')}</tr></thead><tbody>${days.map((d, i) => `<tr><th scope="row">${aovEsc(aovDayLabel(d))}</th>${series.map(s => `<td>${aovEsc(aovNum(s.values[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const empty = max === 0 ? `<p class="p-subtitulo p-nota">${aovEsc(t('admin.overview.chart.empty'))}</p>` : '';
  return `<article data-aov-grafico="${aovEsc(id)}"><header><h3>${aovEsc(title)}</h3></header>
    <figure class="aov-grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aovEsc(aria)}" preserveAspectRatio="none">${grid}${lines}${xlab}</svg></figure>
    ${legend}${empty}${table}</article>`;
}
function aovChartsHTML(stats){
  const series = (stats && Array.isArray(stats.series)) ? stats.series : [];
  const days = series.map(s => s.day);
  return `<div class="p-grade-2 aov-graficos">
    ${aovLineChartHTML('atividade', t('admin.overview.chart.activity.title'), days, [
      { key: 'acessos', label: t('admin.overview.chart.sessions'), values: series.map(s => s.sessions) },
      { key: 'estudo', label: t('admin.overview.chart.active'), values: series.map(s => s.active) }])}
    ${aovLineChartHTML('cadastros', t('admin.overview.chart.signups.title'), days, [
      { key: 'cadastros', label: t('admin.overview.chart.signups'), values: series.map(s => s.new_accounts) }])}
  </div>`;
}

// ---- engajamento (faixas clicáveis) ----
// people = [{ user_id, display_name, username, days, new_account }]; openable(id) diz se dá para abrir a ficha (só Meus alunos).
function aovPersonHTML(p, opts){
  const o = opts || {};
  const name = p.display_name || (p.username ? '@' + p.username : t('admin.common.removedUser'));
  const extra = [];
  if (typeof p.days === 'number') extra.push(aovTp('admin.overview.list.days', p.days));
  if (p.new_account) extra.push(t('admin.overview.list.newAccount'));
  if (o.extra) extra.push(o.extra);
  const ficha = o.openable ? `<button type="button" class="secondary outline aov-ficha" data-aov-ficha="${aovEsc(p.user_id)}" data-aov-ficha-lang="${aovEsc(o.lang || '')}">${aovEsc(t('admin.overview.list.openFicha'))}</button>` : '';
  return `<li class="aov-pessoa"><span><b>${aovEsc(name)}</b>${p.username && p.display_name ? ` <small>@${aovEsc(p.username)}</small>` : ''}${extra.length ? `<small class="aov-pessoa-extra">${aovEsc(extra.join(' · '))}</small>` : ''}</span>${ficha}</li>`;
}
function aovPeopleListHTML(people, openable){
  if (!people || !people.length) return `<p class="p-subtitulo p-nota">${aovEsc(t('admin.overview.list.empty'))}</p>`;
  return `<ul class="aov-pessoas">${people.map(p => aovPersonHTML(p, { openable: openable && openable(p) })).join('')}</ul>`;
}
// open = faixa aberta (ou null). A barra de cada faixa é relativa à MAIOR faixa.
function aovEngagementHTML(stats, open, openable){
  const eng = (stats && stats.engagement) || {};
  const counts = AOV_BANDS.map(b => (eng[b] || []).length);
  const max = Math.max(0, ...counts);
  const rows = AOV_BANDS.map((b, i) => {
    const n = counts[i], pct = max ? Math.round(n / max * 100) : 0, isOpen = open === b;
    const label = t(`admin.overview.band.${b}`), range = t(`admin.overview.bandRange.${b}`);
    const btn = `<button type="button" class="aov-faixa aov-faixa--${b}" data-aov-faixa="${b}" aria-expanded="${isOpen}" aria-controls="aov-faixa-lista-${b}"${n ? '' : ' disabled'}>
        <span class="p-barra-topo"><span>${aovEsc(label)} <small>(${aovEsc(range)})</small></span><span>${aovEsc(aovTp('admin.overview.list.people', n))}</span></span>
        <span class="p-barra" aria-hidden="true"><i style="--v:${pct}%"></i></span></button>`;
    const list = `<div class="aov-faixa-lista" id="aov-faixa-lista-${b}" data-aov-faixa-lista="${b}"${isOpen ? '' : ' hidden'}>${isOpen ? aovPeopleListHTML(eng[b] || [], openable) : ''}</div>`;
    return `<div class="p-barra-linha">${btn}${list}</div>`;
  }).join('');
  return `<article data-aov="engajamento"><header><h3>${aovEsc(t('admin.overview.eng.title'))}</h3></header>
    <div class="p-barras">${rows}</div><small class="p-subtitulo p-nota">${aovEsc(t('admin.overview.eng.note'))}</small></article>`;
}

// ---- Situação (só Meus alunos; mesmas linhas da aba Alunos: tsuRowData) ----
// sit = { loading, done, total, rows: [{ link, situation, days, failed }] } ; open = situação aberta (ou null)
function aovSituationHTML(sit, open){
  const head = `<header><h3>${aovEsc(t('admin.overview.sit.title'))}</h3></header>`;
  if (!sit || sit.loading){
    const prog = sit && sit.total ? ` ${aovEsc(t('students.loading.count', { done: sit.done || 0, total: sit.total }))}` : '';
    return `<article data-aov="situacao">${head}<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${aovEsc(t('analytics.loading'))}${prog}</span></div></article>`;
  }
  const rows = sit.rows || [];
  if (!rows.length) return `<article data-aov="situacao">${head}<p class="p-subtitulo p-nota">${aovEsc(t('admin.overview.empty.scope'))}</p></article>`;
  const by = {}; AOV_SITUATIONS.forEach(s => { by[s] = rows.filter(r => !r.failed && r.situation === s); });
  const failed = rows.filter(r => r.failed).length;
  const btns = AOV_SITUATIONS.map(s => {
    const n = by[s].length;
    return `<button type="button" class="aov-sit" data-aov-sit="${s}" aria-expanded="${open === s}" aria-controls="aov-sit-lista"${n ? '' : ' disabled'}>
      <span class="p-selo ${AOV_SITUATION_CLASS[s]}">${aovEsc(t(`students.situation.${s}`))}</span><b>${aovEsc(aovNum(n))}</b></button>`;
  }).join('');
  const people = open && by[open] ? by[open].map(r => ({
    user_id: r.link.student_id, display_name: r.link.display_name, username: r.link.username, _lang: r.link.language_app_key,
    _extra: typeof tsuDaysLabel === 'function' ? tsuDaysLabel(r.days) : '' })) : [];
  const list = `<div id="aov-sit-lista" data-aov-sit-lista${open ? '' : ' hidden'}>${open ? (people.length
    ? `<ul class="aov-pessoas">${people.map(p => aovPersonHTML(p, { openable: true, lang: p._lang, extra: p._extra })).join('')}</ul>`
    : `<p class="p-subtitulo p-nota">${aovEsc(t('admin.overview.list.empty'))}</p>`) : ''}</div>`;
  const warnFailed = failed ? `<div class="p-alerta p-alerta--aviso" role="status"><span>${aovEsc(aovTp('admin.overview.sit.failed', failed))}</span></div>` : '';
  return `<article data-aov="situacao">${head}<div class="aov-sits">${btns}</div>${list}${warnFailed}
    <small class="p-subtitulo p-nota">${aovEsc(t('students.situation.rule'))} ${aovEsc(t('admin.overview.sit.note'))}</small></article>`;
}

// ---- Revisões (só Meus alunos) ----
function aovReviewsHTML(rev, error){
  const head = `<header><h3>${aovEsc(t('admin.overview.rev.title'))}</h3></header>`;
  if (error) return `<article data-aov="revisoes">${head}<div class="p-alerta p-alerta--erro" role="alert"><span>${aovEsc(t('admin.overview.rev.error'))}</span></div></article>`;
  if (!rev) return `<article data-aov="revisoes">${head}<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${aovEsc(t('analytics.loading'))}</span></div></article>`;
  const tot = rev.totals || {};
  const students = Array.isArray(rev.students) ? rev.students : [];
  const kpis = `<div class="p-indicadores">${aovKpi(aovNum(tot.home), t('admin.overview.rev.home'))}${aovKpi(aovNum(tot.class), t('admin.overview.rev.class'))}</div>`;
  const table = students.length ? `<div class="p-tabela p-tabela--compacta p-tabela--fluida"><table class="striped"><thead><tr>
      <th scope="col">${aovEsc(t('admin.overview.rev.col.student'))}</th><th scope="col">${aovEsc(t('admin.overview.rev.home'))}</th><th scope="col">${aovEsc(t('admin.overview.rev.class'))}</th></tr></thead>
      <tbody>${students.map(s => `<tr><td>${aovEsc(s.display_name || (s.username ? '@' + s.username : ''))}</td><td>${aovEsc(aovNum(s.home))}</td><td>${aovEsc(aovNum(s.class))}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="p-subtitulo p-nota">${aovEsc(t('admin.overview.empty.scope'))}</p>`;
  return `<article data-aov="revisoes">${head}${kpis}${table}<small class="p-subtitulo p-nota">${aovEsc(t('admin.overview.rev.note'))}</small></article>`;
}

// ---- Plano ----
function aovPlansHTML(stats){
  const p = (stats && stats.plans) || {};
  return `<article data-aov="plano"><header><h3>${aovEsc(t('admin.overview.plans.title'))}</h3></header>
    <div class="p-indicadores">${aovKpi(aovNum(p.free), t('admin.overview.plans.free'))}${aovKpi(aovNum(p.premium), t('admin.overview.plans.premium'))}</div>
    <small class="p-subtitulo p-nota">${aovEsc(t('admin.overview.plans.note'))}</small></article>`;
}

// ---- página ----
function aovLoadingHTML(){
  return `<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${aovEsc(t('analytics.loading'))}</span></div>`;
}
function aovErrorHTML(){
  return `<div class="p-alerta p-alerta--erro" role="alert" data-aov="erro"><span>${aovEsc(t('admin.overview.error'))}</span>
    <button type="button" class="secondary" data-aov-tentar>${aovEsc(t('admin.overview.retry'))}</button></div>`;
}
// Corpo (tudo menos cabeçalho e filtros). st = { days, scope, language, stats, statsError, reviews, reviewsError, situation, openBand, openSit }
function aovBodyHTML(st, openable){
  if (st.statsError) return aovErrorHTML();
  if (!st.stats) return aovLoadingHTML();
  const mine = st.scope === 'mine';
  return `${aovKpisHTML(st.stats, st.scope)}
    ${aovChartsHTML(st.stats)}
    <div class="p-grade-2 aov-blocos">
      ${aovEngagementHTML(st.stats, st.openBand, openable)}
      ${mine ? aovSituationHTML(st.situation, st.openSit) : aovPlansHTML(st.stats)}
    </div>
    ${mine ? `<div class="p-grade-2 aov-blocos">${aovReviewsHTML(st.reviews, st.reviewsError)}${aovPlansHTML(st.stats)}</div>` : ''}
    <small class="p-subtitulo p-nota" data-aov="fuso">${aovEsc(t('admin.overview.foot.tz'))}</small>`;
}
function aovPageHTML(st, openable){
  return `<div class="painel"><div class="p-pagina" data-aov="pagina">
    <header class="p-cabecalho"><div><h2>${aovEsc(t('admin.overview.title'))}</h2><span class="p-subtitulo">${aovEsc(t('admin.overview.sub'))}</span></div></header>
    ${aovFiltersHTML(st)}
    <div class="p-secoes" data-aov="corpo" aria-live="polite">${aovBodyHTML(st, openable)}</div>
  </div></div>`;
}
