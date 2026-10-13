// ---------- Analytics (painel de Admin): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A busca de dados, os eventos e a troca de
// sub-aba ficam em shared/admin-analytics.js; os cálculos e rótulos em shared/admin-analytics-calc.js. Testado em
// tests/painel-admin/test_analytics_ui_unit.js. Todo texto vindo dos eventos (nome de evento, navegador, sistema) passa por escapeHTML;
// todo texto visível por t()/tp() (chaves admin.analytics.* e analytics.*).
//
// Depende de: shared/i18n (t, tp), shared/profile.js (escapeHTML), shared/admin-analytics-calc.js (rótulos, analyticsDelta,
// analyticsFormatMinutes, analyticsFormatDate, ANALYTICS_COHORT_OFFSETS), languages/index.js (AVAILABLE_LANGUAGES).

function tanEsc(v){ return escapeHTML(v == null ? '' : String(v)); }

// ---- peças pequenas ----
function tanDeltaHTML(delta){
  if (!delta) return '';
  if (delta.kind === 'new') return ` <span class="p-selo p-selo--info">${tanEsc(t('admin.analytics.delta.new'))}</span>`;
  if (delta.kind === 'flat') return ` <span class="p-selo" aria-label="${tanEsc(t('analytics.delta.flatAria'))}">=</span>`;
  const up = delta.kind === 'up';
  return ` <span class="p-selo ${up ? 'p-selo--ok' : 'p-selo--erro'}" aria-label="${tanEsc(t(up ? 'analytics.delta.upAria' : 'analytics.delta.downAria', { pct: delta.pct }))}">${up ? '▲' : '▼'} ${delta.pct}%</span>`;
}

function tanKpiHTML(num, label, note, delta){
  return `<article class="p-indicador"><span class="p-indicador-rotulo">${tanEsc(label)}</span><span class="p-indicador-valor">${tanEsc(num)}${tanDeltaHTML(delta)}</span>${note ? `<span class="p-indicador-detalhe">${tanEsc(note)}</span>` : ''}</article>`;
}
function tanKpisHTML(items){ return `<div class="p-indicadores">${items.join('')}</div>`; }

// Barras horizontais. O tamanho de cada barra é relativo ao MAIOR valor da lista (não ao primeiro: as distribuições de unidades e
// lições mantêm ordem fixa 0, 1-3, 4-9, 10+ e o primeiro balde pode ser o zero).
function tanBarsHTML(rows, labels, extraNote){
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return `<div class="p-barras">${rows.map(row => {
    const pct = max ? Math.round((row.count / max) * 100) : 0;
    const label = (labels && labels[row.name]) || row.name;
    const usersNote = typeof row.uniqueStudents === 'number' ? ` · ${tp('admin.analytics.students', row.uniqueStudents)}` : '';
    const detail = `${row.count}${usersNote}${extraNote ? extraNote(row) : ''}`;
    return `<div class="p-barra-linha"><div class="p-barra-topo"><span>${tanEsc(label)}</span><span>${tanEsc(detail)}</span></div><div class="p-barra" role="img" aria-label="${tanEsc(`${label}: ${row.count}`)}"><i style="--v:${pct}%"></i></div></div>`;
  }).join('')}</div>`;
}

function tanNoteHTML(msg){ return `<small class="p-subtitulo p-nota">${tanEsc(msg)}</small>`; }
function tanEmptyHTML(msg){ return `<p class="p-subtitulo p-nota">${tanEsc(msg || t('admin.analytics.noData'))}</p>`; }
function tanSectionHTML(title, bodyHTML){ return `<article><header><h3>${tanEsc(title)}</h3></header>${bodyHTML}</article>`; }
function tanTableHTML(headers, rowsHTML){
  return `<div class="p-tabela p-tabela--compacta p-tabela--fluida"><table class="striped"><thead><tr>${headers.map(h => `<th scope="col">${tanEsc(h)}</th>`).join('')}</tr></thead><tbody>${rowsHTML}</tbody></table></div>`;
}
function tanTruncatedHTML(msgKey, n){ return `<div class="p-alerta p-alerta--aviso" role="status" data-analytics-cortado><span>${tanEsc(t(msgKey, { n }))}</span></div>`; }

// ---- filtros e comparação ----
// st = { period, languageFilter, deviceFilter, compare, customSince, customUntil, since, until, previous: {since, until} }
function tanControlsHTML(st){
  const periodOptions = Object.entries(ANALYTICS_PERIOD_LABELS).map(([key, label]) => `<option value="${tanEsc(key)}"${st.period === key ? ' selected' : ''}>${tanEsc(label)}</option>`).join('');
  const langOptions = AVAILABLE_LANGUAGES.map(l => `<option value="${tanEsc(l.appKey)}"${st.languageFilter === l.appKey ? ' selected' : ''}>${tanEsc(l.name)}</option>`).join('');
  const deviceOptions = Object.entries(ANALYTICS_DEVICE_LABELS).map(([key, label]) => `<option value="${tanEsc(key)}"${st.deviceFilter === key ? ' selected' : ''}>${tanEsc(label)}</option>`).join('');
  const range = `${analyticsFormatDate(st.since)} – ${analyticsFormatDate(st.until)}`;
  const compareLabel = st.compare ? ` · ${t('admin.analytics.compareWith', { since: analyticsFormatDate(st.previous.since), until: analyticsFormatDate(st.previous.until) })}` : '';
  return `<article data-analytics-filtros><div class="p-campos-linha">
      <label>${tanEsc(t('admin.analytics.filter.period'))}<select id="analytics-period-select">${periodOptions}</select></label>
      <label>${tanEsc(t('fieldEditor.field.language'))}<select id="analytics-language-select"><option value="all"${st.languageFilter === 'all' ? ' selected' : ''}>${tanEsc(t('admin.reports.filter.allLanguages'))}</option>${langOptions}</select></label>
      <label>${tanEsc(t('admin.analytics.filter.device'))}<select id="analytics-device-select"><option value="all"${st.deviceFilter === 'all' ? ' selected' : ''}>${tanEsc(t('admin.analytics.filter.allDevices'))}</option>${deviceOptions}</select></label>
      ${st.period === 'custom' ? `<label>${tanEsc(t('analytics.custom.from'))}<input type="date" id="analytics-custom-since" value="${tanEsc(st.customSince)}"></label><label>${tanEsc(t('analytics.custom.to'))}<input type="date" id="analytics-custom-until" value="${tanEsc(st.customUntil)}"></label>` : ''}
    </div>
    <label class="p-linha-opcao"><span class="p-op-texto"><b>${tanEsc(t('admin.analytics.filter.compare'))}</b></span><input type="checkbox" role="switch" id="analytics-compare-switch" aria-checked="${st.compare ? 'true' : 'false'}"${st.compare ? ' checked' : ''}></label>
    <small class="p-subtitulo" data-analytics-periodo>${tanEsc(t('admin.analytics.filter.periodLine', { range }) + compareLabel)}</small>
  </article>`;
}

function tanExcludeOwnHTML(excludeOwn){
  return `<article data-analytics-excluir><label class="p-linha-opcao" style="border-top:0;padding:0"><span class="p-op-texto"><b>${tanEsc(t('admin.analytics.exclude.title'))}</b><small>${tanEsc(t('admin.analytics.exclude.sub'))}</small></span><input type="checkbox" role="switch" id="analytics-exclude-own-switch" aria-checked="${excludeOwn ? 'true' : 'false'}"${excludeOwn ? ' checked' : ''}></label></article>`;
}

// ---- sub-abas ----
const ANALYTICS_TABS = [
  { key: 'resumo', get label(){ return t('admin.analytics.subtab.resumo'); } },
  { key: 'atividade', get label(){ return t('admin.analytics.subtab.atividade'); } },
  { key: 'retencao', get label(){ return t('admin.analytics.subtab.retencao'); } },
  { key: 'navegacao', get label(){ return t('admin.analytics.subtab.navegacao'); } },
  { key: 'exercicios', get label(){ return t('admin.analytics.subtab.exercicios'); } },
  { key: 'progressao', get label(){ return t('admin.analytics.subtab.progressao'); } },
  { key: 'engajamento', get label(){ return t('admin.analytics.subtab.engajamento'); } },
  { key: 'idioma', get label(){ return t('admin.analytics.subtab.idioma'); } },
  { key: 'dispositivos', get label(){ return t('admin.analytics.subtab.dispositivos'); } },
  { key: 'tecnologia', get label(){ return t('admin.analytics.subtab.tecnologia'); } },
];

function tanSubnavHTML(current){
  return `<nav class="p-abas" role="tablist" aria-label="${tanEsc(t('admin.analytics.subnav.aria'))}" data-analytics-abas>${ANALYTICS_TABS.map(x => `<a href="#" role="tab" data-analytics-tab="${x.key}" aria-selected="${current === x.key}"${current === x.key ? ' aria-current="page"' : ''}>${tanEsc(x.label)}</a>`).join('')}</nav>`;
}

// ---- seções ----
function tanResumoHTML(stats, prev){
  const d = (key) => prev ? analyticsDelta(stats[key], prev[key]) : null;
  const rate = stats.overallCompletionRate;
  return tanSectionHTML(t('admin.analytics.subtab.resumo'),
    tanKpisHTML([
      tanKpiHTML(stats.activeStudents, t('admin.analytics.kpi.activeStudents'), t('admin.analytics.kpi.activeStudentsNote'), d('activeStudents')),
      tanKpiHTML(stats.newStudents, t('admin.analytics.kpi.newStudents'), t('admin.analytics.kpi.newStudentsNote'), d('newStudents')),
      tanKpiHTML(stats.sessions, t('admin.analytics.kpi.sessions'), t('admin.analytics.kpi.sessionsNote'), d('sessions')),
      tanKpiHTML(stats.exercisesStarted, t('admin.analytics.kpi.started'), t('admin.analytics.kpi.startedNote'), d('exercisesStarted')),
      tanKpiHTML(stats.exercisesCompleted, t('admin.analytics.kpi.completed'), t('admin.analytics.kpi.completedNote'), d('exercisesCompleted')),
      tanKpiHTML(rate === null ? '—' : `${rate}%`, t('admin.analytics.kpi.rate'), t('admin.analytics.kpi.rateNote'), rate === null ? null : d('overallCompletionRate')),
      tanKpiHTML(analyticsFormatMinutes(stats.estimatedStudyMinutes), t('admin.analytics.kpi.time'), t('admin.analytics.kpi.timeNote')),
    ]) + tanNoteHTML(t(rate === null ? 'admin.analytics.resumo.rateNA' : 'admin.analytics.resumo.rateNote')) + tanNoteHTML(t('admin.analytics.resumo.timeNote')) + tanNoteHTML(t('admin.analytics.resumo.xpNote')));
}

function tanAtividadeHTML(stats){
  const freqRows = stats.freqBuckets.map(b => ({ name: b.label, count: b.count }));
  const byDay = (rows) => rows.length ? tanBarsHTML(rows.map(r => ({ name: r.day, count: r.count })), {}) : tanEmptyHTML();
  return tanSectionHTML(t('admin.analytics.subtab.atividade'), tanKpisHTML([tanKpiHTML(stats.newActiveCount, t('admin.analytics.ativ.newActive')), tanKpiHTML(stats.returningActiveCount, t('admin.analytics.ativ.returning'))]) + tanNoteHTML(t('admin.analytics.ativ.note')))
    + tanSectionHTML(t('admin.analytics.ativ.activeByDay'), byDay(stats.activeByDayRows))
    + tanSectionHTML(t('admin.analytics.ativ.sessionsByDay'), byDay(stats.sessionsByDayRows))
    + tanSectionHTML(t('admin.analytics.ativ.frequency'), freqRows.some(r => r.count) ? tanBarsHTML(freqRows, {}) : tanEmptyHTML());
}

function tanNavegacaoHTML(stats){
  return tanSectionHTML(t('admin.analytics.nav.areas'), stats.areaRows.length ? tanBarsHTML(stats.areaRows, ANALYTICS_TAB_LABELS) : tanEmptyHTML())
    + tanSectionHTML(t('admin.analytics.nav.features'), (stats.featureRows.length ? tanBarsHTML(stats.featureRows, ANALYTICS_LESSON_EVENT_LABELS) : tanEmptyHTML()) + tanNoteHTML(t('admin.analytics.nav.featuresNote')));
}

function tanExerciciosHTML(stats){
  const nm = (name) => ANALYTICS_LESSON_EVENT_LABELS[name] || name;
  const rows = stats.exerciseRows.map(r => `<tr><td>${tanEsc(nm(r.name))}</td><td>${r.started === null ? '—' : r.started}</td><td>${r.completed}</td><td>${r.completionRate === null ? '—' : r.completionRate + '%'}</td><td>${r.avgScore === null ? '—' : r.avgScore + '%'}</td></tr>`).join('');
  // Funil: só os tipos com evento de início; "acertou bem" = nota média >= 80%, o mesmo corte do desafio "Pontue mais de 80%".
  const funnel = stats.exerciseRows.filter(r => r.started !== null && r.started > 0);
  const funnelHTML = funnel.map(r => {
    const good = r.avgScore !== null && r.avgScore >= 80;
    return `<div class="p-funil-linha"><b>${tanEsc(nm(r.name))}</b><div class="p-funil">
      <div><span>${r.started}</span><small>${tanEsc(t('admin.analytics.funnel.started'))}</small></div><i aria-hidden="true">→</i>
      <div><span>${r.completed}</span><small>${tanEsc(t('admin.analytics.funnel.completed') + (r.completionRate !== null ? ` (${r.completionRate}%)` : ''))}</small></div><i aria-hidden="true">→</i>
      <div><span>${r.avgScore === null ? '—' : r.avgScore + '%'}</span><small>${tanEsc(good ? t('admin.analytics.funnel.goodScore') : t('admin.analytics.funnel.avgScore'))}</small></div></div></div>`;
  }).join('');
  return tanSectionHTML(t('admin.analytics.ex.byType'), stats.exerciseRows.length ? tanTableHTML([t('admin.analytics.ex.col.exercise'), t('admin.analytics.ex.col.started'), t('admin.analytics.ex.col.done'), t('admin.analytics.ex.col.rate'), t('admin.analytics.ex.col.score')], rows) + tanNoteHTML(t('admin.analytics.ex.note')) : tanEmptyHTML())
    + tanSectionHTML(t('admin.analytics.funnel.title'), funnel.length ? funnelHTML + tanNoteHTML(t('admin.analytics.funnel.note')) : tanEmptyHTML(t('admin.analytics.funnel.empty')));
}

function tanIdiomaHTML(stats, languageFilter){
  const names = Object.fromEntries(AVAILABLE_LANGUAGES.map(l => [l.appKey, l.name]));
  const rows = Object.entries(stats.byLanguageCounts).map(([appKey, count]) => ({ name: appKey, count })).sort((a, b) => b.count - a.count);
  return tanSectionHTML(t('admin.analytics.lang.events'), (rows.length ? tanBarsHTML(rows, names) : tanEmptyHTML())
    + (languageFilter !== 'all' ? tanNoteHTML(t('admin.analytics.lang.filterActive', { lang: names[languageFilter] || languageFilter })) : '') + tanNoteHTML(t('admin.analytics.lang.note')));
}

function tanProgressaoHTML(stats){
  const buckets = (b) => b.some(x => x.count) ? tanBarsHTML(b.map(x => ({ name: x.label, count: x.count })), {}) : tanEmptyHTML();
  return tanSectionHTML(t('admin.analytics.prog.byLevel'), (stats.levelRows.length ? tanBarsHTML(stats.levelRows, {}) : tanEmptyHTML()) + tanNoteHTML(t('admin.analytics.prog.levelNote')))
    + tanSectionHTML(t('admin.analytics.prog.units'), buckets(stats.unitsCompletedBuckets) + tanNoteHTML(t('admin.analytics.prog.unitsNote')))
    + tanSectionHTML(t('admin.analytics.prog.lessons'), buckets(stats.lessonsCompletedBuckets) + tanNoteHTML(t('admin.analytics.prog.lessonsNote')));
}

function tanDispositivosHTML(stats){
  const hasData = stats.deviceRows.some(r => r.name !== t('admin.analytics.unknown'));
  return tanSectionHTML(t('admin.analytics.dev.type'), (stats.deviceRows.length ? tanBarsHTML(stats.deviceRows, ANALYTICS_DEVICE_LABELS) : tanEmptyHTML()) + (!hasData ? tanNoteHTML(t('admin.analytics.dev.noData')) : ''))
    + tanSectionHTML(t('admin.analytics.dev.browser'), stats.browserRows.length ? tanBarsHTML(stats.browserRows, {}) : tanEmptyHTML())
    + tanSectionHTML(t('admin.analytics.dev.os'), (stats.osRows.length ? tanBarsHTML(stats.osRows, {}) : tanEmptyHTML()) + tanNoteHTML(t('admin.analytics.dev.osNote')));
}

// Engajamento + Gamificação numa aba só (XP e streak aparecem nos dois grupos do pedido original; em duas abas seria duplicação).
function tanEngajamentoHTML(stats, weeklyXp, badgeGrants){
  const totalXp = weeklyXp.reduce((sum, r) => sum + (r.amount || 0), 0);
  // Divide por TODOS os ativos do período, não só por quem tem linha em weekly_xp nesta semana (senão a média infla).
  const avgXp = stats.activeStudents ? Math.round(totalXp / stats.activeStudents) : 0;
  const badgedStudents = new Set(badgeGrants.map(g => g.user_id)).size;
  const leaderboardViews = (stats.areaRows.find(r => r.name === 'leaderboard') || {}).count || 0;
  const reviewsDone = stats.exerciseRows.filter(r => ['flashcard_review', 'speed_review', 'hanzi_review'].includes(r.name)).reduce((sum, r) => sum + r.completed, 0);
  const challengesDone = (stats.exerciseRows.find(r => r.name === 'challenge') || {}).completed || 0;
  return tanSectionHTML(t('admin.analytics.subtab.engajamento'), tanKpisHTML([
      tanKpiHTML(stats.sessions, t('admin.analytics.kpi.sessions')), tanKpiHTML(stats.exercisesPerSession === null ? '—' : stats.exercisesPerSession, t('admin.analytics.eng.perSession')),
      tanKpiHTML(reviewsDone, t('admin.analytics.eng.reviewsDone')), tanKpiHTML(challengesDone, t('admin.analytics.eng.challengesDone'))]) + tanNoteHTML(t('admin.analytics.eng.freqNote')))
    + tanSectionHTML(t('admin.analytics.eng.gamification'), tanKpisHTML([
      tanKpiHTML(totalXp, t('admin.analytics.eng.xpTotal')), tanKpiHTML(avgXp, t('admin.analytics.eng.xpAvg')),
      tanKpiHTML(stats.avgLongestStreak, t('admin.analytics.eng.streakAvg'), t('admin.analytics.eng.streakNote')), tanKpiHTML(stats.maxLongestStreak, t('admin.analytics.eng.streakMax')),
      tanKpiHTML(badgeGrants.length, t('admin.analytics.eng.badges')), tanKpiHTML(leaderboardViews, t('admin.analytics.eng.leaderboardViews'))])
      + tanNoteHTML(`${t('admin.analytics.eng.xpNote1')} ${t('admin.analytics.eng.xpNote2')} ${badgedStudents ? `${tp('admin.analytics.eng.badgedStudents', badgedStudents)} ${t('admin.analytics.eng.badgedSuffix')}` : ''}`.trim()));
}

function tanTecnologiaHTML(tech){
  return tanSectionHTML(t('admin.analytics.tech.errors'), tanKpisHTML([tanKpiHTML(tech.totalErrors, t('admin.analytics.tech.total')), tanKpiHTML(tech.affectedStudents, t('admin.analytics.tech.affected'))])
      + (tech.errorRows.length ? tanBarsHTML(tech.errorRows, ANALYTICS_TECHNICAL_ERROR_LABELS) : tanEmptyHTML(t('admin.analytics.tech.noErrors'))) + tanNoteHTML(t('admin.analytics.tech.note')))
    + tanSectionHTML(t('admin.analytics.tech.perf'), tech.perfSampleCount
      ? tanKpisHTML([tanKpiHTML(`${tech.avgLoadMs}ms`, t('admin.analytics.tech.loadAvg')), tanKpiHTML(`${tech.medianLoadMs}ms`, t('admin.analytics.tech.loadMedian'))]) + tanNoteHTML(tp('admin.analytics.tech.samples', tech.perfSampleCount))
      : tanEmptyHTML(t('admin.analytics.tech.noPerf')))
    + tanNoteHTML(t('admin.analytics.tech.separateNote'));
}

function tanRetencaoHTML(cohorts){
  if (!cohorts.length) return tanSectionHTML(t('admin.analytics.ret.title'), tanEmptyHTML(t('admin.analytics.ret.empty')));
  const rows = cohorts.map(c => `<tr><td>${tanEsc(analyticsFormatDate(new Date(c.week + 'T00:00:00')))}</td><td>${c.size}</td>${ANALYTICS_COHORT_OFFSETS.map(o => { const r = c.retention[o]; return `<td>${r === null ? '—' : `${r.pct}% <small>(${r.returned}/${r.eligible})</small>`}</td>`; }).join('')}</tr>`).join('');
  return tanSectionHTML(t('admin.analytics.ret.title'), tanTableHTML([t('admin.analytics.ret.col.cohort'), t('admin.common.students'), t('admin.analytics.ret.col.d1'), t('admin.analytics.ret.col.d7'), t('admin.analytics.ret.col.d14'), t('admin.analytics.ret.col.d30')], rows) + tanNoteHTML(t('admin.analytics.ret.note')));
}

function tanLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tanEsc(t('analytics.loading'))}</span></div></div></div>`;
}

// Painel de uma sub-aba que carrega sob demanda: o contêiner fica dentro do .painel da página.
function tanPanelLoadingHTML(){ return `<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tanEsc(t('analytics.loading'))}</span></div>`; }

// Tela completa. st = { controls (ver tanControlsHTML), excludeOwn, tab, stats, prevStats, truncated (bool), emptyEvents (bool), limit }
function tanPageHTML(st){
  const panel = (key, html) => `<div class="p-secoes" data-analytics-panel="${key}">${html}</div>`;
  return `<div class="painel"><div class="p-pagina" data-tan="pagina">
    <header class="p-cabecalho"><div><h2>${tanEsc(t('analytics.title'))}</h2><span class="p-subtitulo">${tanEsc(t('analytics.sub'))}</span></div></header>
    ${tanControlsHTML(st.controls)}${tanExcludeOwnHTML(st.excludeOwn)}
    ${st.truncated ? tanTruncatedHTML('analytics.truncated.main', st.limit) : ''}
    ${st.emptyEvents ? `<div class="p-alerta p-alerta--info"><span>${tanEsc(t('admin.analytics.noEvents'))}</span></div>` : ''}
    ${tanSubnavHTML(st.tab)}
    ${panel('resumo', tanResumoHTML(st.stats, st.prevStats))}${panel('atividade', tanAtividadeHTML(st.stats))}${panel('retencao', '')}${panel('navegacao', tanNavegacaoHTML(st.stats))}
    ${panel('exercicios', tanExerciciosHTML(st.stats))}${panel('progressao', tanProgressaoHTML(st.stats))}${panel('engajamento', '')}${panel('idioma', tanIdiomaHTML(st.stats, st.controls.languageFilter))}
    ${panel('dispositivos', tanDispositivosHTML(st.stats))}${panel('tecnologia', '')}
  </div></div>`;
}
