// ---------- Alunos (painel da professora): peças puras de tela ----------
// Tudo aqui é dado -> string HTML (sem rede, sem DOM global), no Design System do painel (shared/painel/, classes p-*).
// A orquestração (buscar dados, eventos, diálogos) fica em shared/admin-students.js. Testado em
// tests/painel-alunos/test_students_ui_unit.js. Todo texto vindo do banco passa por escapeHTML (shared/profile.js);
// todo texto visível novo passa por t()/tsuTp() (chaves students.* em shared/i18n).
//
// Regra de situação (aprovada pela autora): estudou nos últimos 3 dias = Em dia; há 4 a 6 dias = Atenção;
// há 7 dias ou mais = Parado; sem nenhum estudo registrado = Sem estudo (neutro, não conta como parado).
//
// Depende de: shared/i18n (t, tp, fmtDate), shared/profile.js (escapeHTML), shared/srs.js (todayStr, effectiveStreakFor),
// shared/admin-students.js (STUDENT_LANGUAGE_LABELS e os helpers studentPanel*).

const TSU_ATTENTION_FROM_DAYS = 4;
const TSU_STOPPED_FROM_DAYS = 7;
const TSU_SITUATION_CLASS = { ok: 'p-selo--ok', warn: 'p-selo--aviso', stopped: 'p-selo--erro', none: '' };

function tsuNum(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
// Plural com zero no plural ('0 dias', não '0 dia' como o Intl faz em pt-BR): zero escolhe a forma 'other'.
function tsuTp(key, n, params){ return tp(key, n === 0 ? 2 : n, Object.assign({ n }, params || {})); }
function tsuEsc(v){ return escapeHTML(v == null ? '' : String(v)); }

// Dias desde 'AAAA-MM-DD' até hoje (0 = hoje). null se não houver data.
function tsuDaysSince(dateStr){
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return Math.max(0, Math.round((Date.parse(todayStr()) - Date.parse(dateStr)) / 86400000));
}

function tsuSituation(days){
  if (days === null || days === undefined) return 'none';
  if (days >= TSU_STOPPED_FROM_DAYS) return 'stopped';
  if (days >= TSU_ATTENTION_FROM_DAYS) return 'warn';
  return 'ok';
}

function tsuDaysLabel(days){
  if (days === null || days === undefined) return t('admin.students.metrics.noRecord');
  if (days === 0) return t('admin.students.metrics.today');
  if (days === 1) return t('admin.students.metrics.yesterday');
  return t('admin.students.metrics.daysAgo', { n: days });
}

function tsuInitials(name){
  const words = String(name || '').replace(/^@/, '').split(/[\s._-]+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] || '?').slice(0, 2);
  return s.toUpperCase();
}
function tsuName(link){ return (link && (link.display_name || link.username)) || t('admin.common.removedUser'); }

function tsuLangLabel(key){
  return (typeof studentPanelLangLabel === 'function') ? studentPanelLangLabel(key) : tsuEsc(key);
}

// Qual idioma do overview representa o vínculo: o do vínculo, senão o estudado mais recentemente.
function tsuLangEntry(overview, linkLang){
  const langs = overview && Array.isArray(overview.languages) ? overview.languages : [];
  const exact = langs.find(l => l.key === linkLang);
  if (exact) return exact;
  return langs.slice().sort((a, b) => String(b.lastStudyDay || '').localeCompare(String(a.lastStudyDay || '')))[0] || null;
}

function tsuStreak(lang){
  if (!lang) return null;
  return (typeof effectiveStreakFor === 'function') ? effectiveStreakFor(tsuNum(lang.streak), lang.lastStudyDay) : tsuNum(lang.streak);
}

// Uma linha do quadro geral. overview null = a consulta falhou (aparece sem situação, nunca como "parado").
function tsuRowData(link, overview){
  const lang = overview ? tsuLangEntry(overview, link.language_app_key) : null;
  const days = lang ? tsuDaysSince(lang.lastStudyDay) : null;
  const q = lang && lang.queue && typeof lang.queue === 'object' ? lang.queue : null;
  return {
    link, overview, lang, days,
    failed: !overview,
    situation: overview ? tsuSituation(days) : 'none',
    streak: tsuStreak(lang),
    due: q ? tsuNum(q.due) : null,
  };
}

function tsuSummary(rows){
  const byLang = {};
  rows.forEach(r => { byLang[r.link.language_app_key] = (byLang[r.link.language_app_key] || 0) + 1; });
  return {
    total: rows.length,
    studiedToday: rows.filter(r => r.days === 0).length,
    due: rows.reduce((s, r) => s + (r.due || 0), 0),
    stopped: rows.filter(r => r.situation === 'stopped').length,
    warn: rows.filter(r => r.situation === 'warn').length,
    failed: rows.filter(r => r.failed).length,
    byLang,
  };
}

// Normaliza para busca sem acento e sem maiúscula.
function tsuNorm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function tsuFilterRows(rows, f){
  const q = tsuNorm(f.busca).replace(/^@/, '').trim();
  return rows.filter(r => {
    if (f.curso && r.link.language_app_key !== f.curso) return false;
    if (f.soAtencao && !(r.situation === 'warn' || r.situation === 'stopped')) return false;
    if (q && !(tsuNorm(r.link.username).includes(q) || tsuNorm(r.link.display_name).includes(q))) return false;
    return true;
  });
}

function tsuIndicatorHTML(label, value, detail){
  return `<article class="p-indicador"><span class="p-indicador-rotulo">${tsuEsc(label)}</span><span class="p-indicador-valor">${tsuEsc(value)}</span><span class="p-indicador-detalhe">${tsuEsc(detail)}</span></article>`;
}

function tsuSelo(situation){
  const cls = TSU_SITUATION_CLASS[situation] || '';
  return `<span class="p-selo ${cls}">${tsuEsc(t('students.situation.' + situation))}</span>`;
}

function tsuTableRowsHTML(rows){
  return rows.map(r => {
    const name = tsuName(r.link);
    const streak = r.streak === null ? '—' : tsuTp('students.streak.days', r.streak);
    return `<tr>
      <td><div class="p-pessoa"><span class="p-avatar" aria-hidden="true">${tsuEsc(tsuInitials(name))}</span><div><strong>${tsuEsc(name)}</strong><small>@${tsuEsc(r.link.username || '')}</small></div></div></td>
      <td class="p-oculta-movel">${tsuLangLabel(r.link.language_app_key)}</td>
      <td>${r.failed ? '—' : tsuEsc(tsuDaysLabel(r.days))}</td>
      <td class="p-oculta-movel">${tsuEsc(streak)}</td>
      <td class="p-oculta-movel">${r.due === null ? '—' : tsuEsc(r.due)}</td>
      <td>${r.failed ? '—' : tsuSelo(r.situation)}</td>
      <td><button type="button" class="outline p-pequeno" data-abrir-aluno="${tsuEsc(r.link.id)}">${tsuEsc(t('students.open'))}</button></td>
    </tr>`;
  }).join('');
}

function tsuTableHTML(rows, f){
  const body = rows.length
    ? tsuTableRowsHTML(rows)
    : `<tr><td colspan="7"><div class="p-vazio"><strong>${tsuEsc(t(f && (f.busca || f.curso || f.soAtencao) ? 'students.empty.filtered' : 'students.empty.title'))}</strong>${f && (f.busca || f.curso || f.soAtencao) ? '' : `<span>${tsuEsc(t('students.empty.text'))}</span>`}</div></td></tr>`;
  return `<table class="striped"><thead><tr>
    <th scope="col">${tsuEsc(t('students.col.student'))}</th><th scope="col" class="p-oculta-movel">${tsuEsc(t('students.col.course'))}</th><th scope="col">${tsuEsc(t('students.col.last'))}</th>
    <th scope="col" class="p-oculta-movel">${tsuEsc(t('students.col.streak'))}</th><th scope="col" class="p-oculta-movel">${tsuEsc(t('students.col.due'))}</th><th scope="col">${tsuEsc(t('students.col.status'))}</th><th scope="col"><span class="p-so-leitor">${tsuEsc(t('students.open'))}</span></th>
  </tr></thead><tbody>${body}</tbody></table>`;
}

// Quadro geral. rows já com os dados; canLink = admin (criar vínculo direto é só da admin, policy da 076).
function tsuGeralHTML(rows, f, canLink, accounts){
  const s = tsuSummary(rows);
  const langs = Object.keys(s.byLang);
  const pct = s.total ? Math.round(s.studiedToday * 100 / s.total) : 0;
  const attention = s.stopped + s.warn;
  const filtered = tsuFilterRows(rows, f);
  const byLangText = langs.map(k => t('students.ind.byLang', { n: s.byLang[k], lang: tsuLangLabel(k) })).join(', ');
  const alert = s.stopped
    ? `<div class="p-alerta" role="status"><span>${tsuEsc(tsuTp('students.alert.stopped', s.stopped))}</span><button type="button" class="outline p-pequeno" data-ver-parados>${tsuEsc(t('students.alert.see'))}</button></div>` : '';
  const failedNote = s.failed
    ? `<div class="p-alerta p-alerta--info" role="status"><span>${tsuEsc(tsuTp('students.error.partial', s.failed))}</span></div>` : '';
  const linkBtn = canLink ? `<button type="button" data-abrir-dialogo="dlg-vincular-aluno">${tsuEsc(t('students.link.btn'))}</button>` : '';
  const inviteNote = canLink ? '' : `<div class="p-alerta p-alerta--info"><span>${tsuEsc(t('panel.students.inviteSoon'))}</span></div>`;
  const courseSelect = langs.length > 1
    ? `<select aria-label="${tsuEsc(t('students.filter.course.aria'))}" data-filtro-curso><option value="">${tsuEsc(t('students.filter.course.all'))}</option>${langs.map(k => `<option value="${tsuEsc(k)}"${f.curso === k ? ' selected' : ''}>${tsuLangLabel(k)}</option>`).join('')}</select>` : '';
  return `<div class="painel"><div class="p-pagina" data-tsu="geral">
    <header class="p-cabecalho"><div><h2>${tsuEsc(t('students.title'))}</h2><span class="p-subtitulo">${tsuEsc(tsuTp('students.count', s.total))}</span></div>
      <div class="p-acoes"><button type="button" class="outline" data-atualizar-alunos>${tsuEsc(t('students.refresh'))}</button>${linkBtn}</div></header>
    ${inviteNote}${failedNote}${alert}
    <div class="p-resumo">
      ${tsuIndicatorHTML(t('students.ind.active'), s.total, byLangText)}
      ${tsuIndicatorHTML(t('students.ind.today'), s.studiedToday, t('students.ind.todayPct', { pct }))}
      ${tsuIndicatorHTML(t('students.ind.due'), s.due, t('students.ind.dueSum'))}
      ${tsuIndicatorHTML(t('students.ind.attention'), attention, t('students.ind.attentionDetail', { stopped: s.stopped, warn: s.warn }))}
    </div>
    <div class="p-ferramentas">
      <input class="p-cresce" type="search" placeholder="${tsuEsc(t('students.search.placeholder'))}" aria-label="${tsuEsc(t('students.search.aria'))}" value="${tsuEsc(f.busca || '')}" data-busca-aluno>
      ${courseSelect}
      <label><input type="checkbox" role="switch" data-so-atencao${f.soAtencao ? ' checked' : ''}> ${tsuEsc(t('students.filter.attention'))}</label>
    </div>
    <article class="p-tabela" data-tabela-alunos>${tsuTableHTML(filtered, f)}</article>
    <p class="p-subtitulo" style="margin:0">${tsuEsc(t('students.situation.rule'))}</p>
    ${canLink ? tsuLinkDialogHTML(accounts || { options: '', languages: '' }) : ''}
  </div></div>`;
}

function tsuLinkDialogHTML(a){
  return `<dialog id="dlg-vincular-aluno" class="p-dialogo" aria-labelledby="dlg-vincular-aluno-t"><article>
    <header><button type="button" aria-label="${tsuEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-vincular-aluno-t">${tsuEsc(t('admin.students.linkTitle'))}</h3></header>
    <form id="admin-assign-student-form">
      <label>${tsuEsc(t('admin.students.accountLabel'))}<select id="admin-student-username"><option value="" disabled selected>${tsuEsc(t('admin.students.selectAccount'))}</option>${a.options}</select></label>
      <label>${tsuEsc(t('fieldEditor.field.language'))}<select id="admin-student-language">${a.languages}</select></label>
      <small>${tsuEsc(t('students.dialog.hint'))}</small>
      <p class="profile-edit-error" id="admin-assign-student-error" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tsuEsc(t('students.dialog.cancel'))}</button><button type="submit" id="admin-assign-student-btn">${tsuEsc(t('admin.students.link'))}</button></footer>
    </form></article></dialog>`;
}

// Faixa de carregamento do quadro geral.
function tsuLoadingHTML(done, total){
  return `<div class="painel"><div class="p-pagina" data-tsu="carregando"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tsuEsc(t('students.loading'))}</span><span data-tsu-progresso>${tsuEsc(t('students.loading.count', { done, total }))}</span></div></div></div>`;
}

/* ---------------- Ficha do aluno ---------------- */

function tsuActivityHTML(activityDays){
  const log = activityDays && typeof activityDays === 'object' ? activityDays : {};
  const days = studentPanelLastDays(30);
  const active = days.filter(d => tsuNum(log[d]) > 0).length;
  const cells = days.map((d, i) => {
    const n = tsuNum(log[d]);
    return `<i${n > 0 ? ' class="on"' : ''} title="${tsuEsc(tsuDaysLabel(days.length - 1 - i))}"></i>`;
  }).join('');
  return { active, html: `<div class="p-atividade" role="img" aria-label="${tsuEsc(t('students.block.activity'))}: ${active}">${cells}</div>` };
}

function tsuQueueHTML(q){
  q = q && typeof q === 'object' ? q : {};
  const parts = [
    ['new', tsuNum(q.new), 'var(--p-info)'], ['learning', tsuNum(q.learning), 'var(--p-aviso)'], ['review', tsuNum(q.review), 'var(--p-ok)'],
  ];
  const total = parts.reduce((s, p) => s + p[1], 0);
  if (!total) return `<p class="p-subtitulo">${tsuEsc(t('students.queue.empty'))}</p>`;
  const bar = parts.filter(p => p[1] > 0).map(p => `<i style="width:${(p[1] * 100 / total).toFixed(2)}%;background:${p[2]}"></i>`).join('');
  const label = parts.map(p => `${p[1]} ${t('students.queue.' + p[0])}`).join(', ');
  const legend = parts.map(p => `<span style="--k:${p[2]}"><b>${p[1]}</b> ${tsuEsc(t('students.queue.' + p[0]))}</span>`).join('')
    + `<span style="--k:var(--p-erro)"><b>${tsuNum(q.weak)}</b> ${tsuEsc(t('students.queue.weak'))}</span>`;
  return `<div class="p-pilha" role="img" aria-label="${tsuEsc(label)}">${bar}</div><div class="p-legenda">${legend}</div>`;
}

function tsuListRow(label, value){
  return `<li><span>${tsuEsc(label)}</span><strong>${tsuEsc(value)}</strong></li>`;
}

function tsuProgressHTML(lang, overview){
  const key = lang.key;
  const ps = lang.progressSummary && typeof lang.progressSummary === 'object' ? lang.progressSummary : null;
  const units = Array.isArray(lang.unitsCompleted) ? lang.unitsCompleted : [];
  const cps = lang.checkpoints && typeof lang.checkpoints === 'object' ? Object.entries(lang.checkpoints) : [];
  const ls = overview && overview.lessonScores && typeof overview.lessonScores === 'object' ? overview.lessonScores : {};
  const bar = ps && ps.levelLabel
    ? `<label>${tsuEsc(t('students.progress.level', { level: ps.levelLabel, pct: tsuNum(ps.pct) }))}<progress value="${tsuNum(ps.pct)}" max="100"></progress></label>` : '';
  const cpValue = cps.length ? String(cps.filter(([, c]) => c && c.completed).length) : t('students.progress.checkpointsNone');
  const cpDetail = cps.length
    ? `<small>${cps.map(([id, c]) => tsuEsc(tsuModuleTitle(key, id) + ': ' + t('students.progress.checkpointsValue', { pct: tsuNum(c && c.bestScore) }))).join('<br>')}</small>` : '';
  const lessons = tsuNum(ls.last30Count) > 0 ? tsuListRow(t('students.progress.lessons'), t('students.progress.lessonsAvg', { pct: tsuNum(ls.last30AvgPct) })) : '';
  return `${bar}<ul class="p-lista">
    ${tsuListRow(t('students.progress.units'), t('students.progress.unitsValue', { done: units.length, started: tsuNum(lang.unitsStarted) }))}
    <li><span>${tsuEsc(t('students.progress.checkpoints'))}</span><strong>${tsuEsc(cpValue)}</strong>${cpDetail}</li>
    ${tsuListRow(t('students.progress.challenges'), tsuNum(lang.challengesCompleted))}
    ${lessons}</ul>`;
}
function tsuModuleTitle(key, id){
  const s = (typeof studentPanelModuleTitle === 'function') ? studentPanelModuleTitle(key, id) : String(id);
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function tsuCreatedHTML(m, name){
  if (m === undefined) return `<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tsuEsc(t('students.loading'))}</span></div>`;
  if (!m || typeof m.contentsTotal !== 'number') return `<p class="p-subtitulo">${tsuEsc(t('students.created.failed'))}</p>`;
  if (!m.contentsTotal && !m.archivedNotes){
    return `<div class="p-vazio"><strong>${tsuEsc(t('students.created.empty.title', { name }))}</strong><span>${tsuEsc(t('students.created.empty.text'))}</span><button type="button" data-ir-secao="flashcards">${tsuEsc(t('students.created.empty.btn'))}</button></div>`;
  }
  const arch = m.archivedNotes ? tsuListRow(t('students.created.archived'), tsuTp('students.n.items', tsuNum(m.archivedNotes)) + ' · ' + tsuTp('students.n.cards', tsuNum(m.archivedCards))) : '';
  return `<ul class="p-lista">
    ${tsuListRow(t('students.created.total'), tsuNum(m.contentsTotal))}
    ${tsuListRow(t('students.created.studied'), t('students.created.studiedValue', { studied: tsuNum(m.contentsStudied), total: tsuNum(m.contentsTotal), notStarted: tsuNum(m.contentsNotStarted) }))}
    ${tsuListRow(t('students.created.strength'), t('students.created.strengthValue', { notStarted: tsuNum(m.contentsStrengthNotStarted), weak: tsuNum(m.contentsStrengthWeak), medium: tsuNum(m.contentsStrengthMedium), strong: tsuNum(m.contentsStrengthStrong) }))}
    ${tsuListRow(t('students.created.cards'), t('students.created.cardsValue', { total: tsuNum(m.cardsTotal), n: tsuNum(m.cardsNew), learning: tsuNum(m.cardsLearning), review: tsuNum(m.cardsReview), due: tsuNum(m.cardsDue) }))}
    ${arch}</ul>`;
}

function tsuRecentHTML(timeline){
  const items = Array.isArray(timeline) ? timeline.slice(0, 8) : [];
  if (!items.length) return `<p class="p-subtitulo">${tsuEsc(t('students.recent.empty'))}</p>`;
  return `<ul class="p-lista">${items.map(ev => `<li><span>${tsuEsc(studentPanelEventTime(ev.at))} · ${studentPanelEventLabel(ev)}</span></li>`).join('')}</ul>`;
}

function tsuAnswersHTML(overview){
  const a = overview && overview.answers && typeof overview.answers === 'object' ? overview.answers : {};
  if (!tsuNum(a.allTotal)) return `<p class="p-subtitulo">${tsuEsc(t('students.answers.none', { date: ANSWER_HISTORY_START_LABEL }))}</p>`;
  const row = (label, c, n) => { const p = studentPanelPct(c, n); return tsuListRow(label, p === null ? '—' : tsuTp('students.answers.value', tsuNum(n), { pct: p })); };
  return `<ul class="p-lista">${row(t('students.answers.7'), a.last7Correct, a.last7Total)}${row(t('students.answers.30'), a.last30Correct, a.last30Total)}</ul>`;
}

// Aulas recentes: carregadas depois (lista de objetos de teacher_class_logs); logs === undefined = ainda carregando.
function tsuClassesHTML(logs){
  if (logs === undefined) return `<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tsuEsc(t('students.loading'))}</span></div>`;
  const items = (logs || []).slice(0, 3);
  const list = items.length
    ? `<ul class="p-lista">${items.map(l => {
        const d = (typeof classLogLocalDate === 'function') ? classLogLocalDate(l.class_date) : new Date(l.class_date);
        return `<li><span><b>${tsuEsc(fmtDate(d, { day: '2-digit', month: '2-digit' }))}</b> · ${tsuEsc(l.topic || '')}</span></li>`;
      }).join('')}</ul>`
    : `<p class="p-subtitulo">${tsuEsc(t('students.classes.empty'))}</p>`;
  return `${list}<footer><a href="#" data-ir-secao="classlogs">${tsuEsc(t('students.classes.all'))}</a></footer>`;
}

// Ficha completa. st = { link, overview, metrics (undefined = carregando), logs (undefined = carregando), langKey }
function tsuFichaHTML(st, canRemove){
  const link = st.link, ov = st.overview, name = tsuName(link);
  const langs = ov && Array.isArray(ov.languages) ? ov.languages : [];
  const lang = langs.find(l => l.key === st.langKey) || tsuLangEntry(ov, link.language_app_key);
  const linkedLabel = tsuLangLabel(link.language_app_key);
  const head = `<nav aria-label="${tsuEsc(t('students.crumb.aria'))}"><ol class="p-trilha"><li><a href="#" data-voltar-alunos>${tsuEsc(t('students.title'))}</a></li><li><span aria-current="page">${tsuEsc(name)}</span></li></ol></nav>
    <header class="p-cabecalho"><div class="p-pessoa"><span class="p-avatar p-avatar--grande" aria-hidden="true">${tsuEsc(tsuInitials(name))}</span><div>
      <span class="p-sobretitulo">${tsuEsc(t('students.ficha.kicker', { lang: STUDENT_LANGUAGE_LABELS[link.language_app_key] || link.language_app_key, date: fmtDate(link.created_at) }))}</span>
      <h2>${tsuEsc(name)}</h2><span class="p-subtitulo">@${tsuEsc(link.username || '')}${lang && lang.progressSummary && lang.progressSummary.levelLabel ? ' · ' + tsuEsc(t('students.ficha.level', { level: lang.progressSummary.levelLabel, pct: tsuNum(lang.progressSummary.pct) })) : ''}</span></div></div>
      <div class="p-acoes"><button type="button" class="outline" data-ir-secao="classlogs">${tsuEsc(t('students.act.class'))}</button><button type="button" data-ir-secao="flashcards">${tsuEsc(t('students.act.card'))}</button>
        ${canRemove ? `<details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary">${tsuEsc(t('students.act.more'))}</summary><div class="p-menu-lista" role="menu"><button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-remover-vinculo="${tsuEsc(link.id)}">${tsuEsc(t('students.act.remove'))}</button></div></details>` : ''}</div></header>`;
  if (!ov || !Array.isArray(ov.languages)){
    return `<div class="painel"><div class="p-pagina" data-tsu="ficha">${head}<div class="p-alerta p-alerta--erro" role="alert"><span>${tsuEsc(t('students.overviewFailed'))}</span></div>
      <article data-bloco-criados><header><h3>${tsuEsc(t('students.block.created'))}</h3></header>${tsuCreatedHTML(st.metrics, name)}</article></div></div>`;
  }
  const switcher = langs.length > 1
    ? `<div class="p-seg" role="toolbar" aria-label="${tsuEsc(t('students.lang.switch.aria'))}">${langs.map(l => `<button type="button" data-ficha-idioma="${tsuEsc(l.key)}" aria-pressed="${lang && l.key === lang.key ? 'true' : 'false'}">${tsuLangLabel(l.key)}</button>`).join('')}</div>` : '';
  const note = !langs.some(l => l.key === link.language_app_key) && langs.length
    ? `<div class="p-alerta p-alerta--info"><span>${tsuEsc(t('students.otherSite', { lang: linkedLabel.replace(/<[^>]*>/g, ''), others: langs.map(l => tsuLangLabel(l.key)).join(', ') }))}</span></div>` : '';
  if (!lang){
    return `<div class="painel"><div class="p-pagina" data-tsu="ficha">${head}<div class="p-vazio"><strong>${tsuEsc(t('students.noProgress'))}</strong></div></div></div>`;
  }
  const days = tsuDaysSince(lang.lastStudyDay);
  const q = lang.queue && typeof lang.queue === 'object' ? lang.queue : {};
  const act = tsuActivityHTML(lang.activityDays);
  const lessons30 = studentPanelLastDays(30).reduce((s, d) => s + tsuNum((lang.dailyLessons || {})[d]), 0);
  const a = ov.answers && typeof ov.answers === 'object' ? ov.answers : {};
  const p7 = studentPanelPct(a.last7Correct, a.last7Total);
  const lastAccess = Array.isArray(ov.timeline) && ov.timeline[0] ? studentPanelEventTime(ov.timeline[0].at) : '';
  const total = tsuNum(q.new) + tsuNum(q.learning) + tsuNum(q.review);
  return `<div class="painel"><div class="p-pagina" data-tsu="ficha">${head}${switcher}${note}
    <div class="p-resumo">
      ${tsuIndicatorHTML(t('students.ind.last'), tsuDaysLabel(days), lastAccess ? t('students.ind.lastAccess', { when: lastAccess }) : t('students.ind.noRecord'))}
      ${tsuIndicatorHTML(t('students.ind.streak'), tsuStreak(lang) === null ? '—' : tsuTp('students.streak.days', tsuStreak(lang)), tsuTp('students.ind.activeDays', act.active))}
      ${tsuIndicatorHTML(t('students.ind.dueCount'), tsuNum(q.due), t('students.ind.dueOf', { total: tsuNum(q.total) || total }))}
      ${tsuIndicatorHTML(t('students.ind.accuracy'), p7 === null ? '—' : p7 + '%', p7 === null ? t('students.ind.accuracyNone') : tsuTp('students.ind.accuracyOf', tsuNum(a.last7Total)))}
    </div>
    <div class="p-grade-2">
      <article><header><h3>${tsuEsc(t('students.block.progress'))}</h3></header>${tsuProgressHTML(lang, ov)}</article>
      <article><header><h3>${tsuEsc(t('students.block.activity'))}</h3></header>${act.html}<p class="p-subtitulo" style="margin-top:.6rem">${tsuEsc(tsuTp('students.n.activeDays', act.active) + ' · ' + tsuTp('students.n.lessonsDone', lessons30))}</p></article>
    </div>
    <div class="p-grade-2">
      <article><header><h3>${tsuEsc(t('students.block.queue'))}</h3></header>${tsuQueueHTML(q)}</article>
      <article data-bloco-criados><header><h3>${tsuEsc(t('students.block.created'))}</h3></header>${tsuCreatedHTML(st.metrics, name)}</article>
    </div>
    <div class="p-grade-2">
      <article><header><h3>${tsuEsc(t('students.block.recent'))}</h3></header>${tsuRecentHTML(ov.timeline)}</article>
      <div style="display:grid;gap:1rem;min-width:0">
        <article><header><h3>${tsuEsc(t('students.block.answers'))}</h3></header>${tsuAnswersHTML(ov)}</article>
        <article data-bloco-aulas><header><h3>${tsuEsc(t('students.block.classes'))}</h3></header>${tsuClassesHTML(st.logs)}</article>
      </div>
    </div>
  </div></div>`;
}
