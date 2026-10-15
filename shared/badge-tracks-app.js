// Conquistas com níveis no app (fr/zh): liga o catálogo puro (shared/badge-tracks.js) ao STATE, ao i18n e às telas.
// Decisões: docs/conquistas-proposta-niveis.md.
//
// BADGES (declarado vazio em cada app.js) vira a lista de NÍVEIS: um objeto por nível de cada trilha disponível
// ({ id: 'review.2', name, desc, icon, check }), mais a clássica Multitarefa para quem tem. Assim o que já existia em
// shared/core/gamificacao.js (semear, celebrar, notificar, gravar em earned_badges) continua igual.
// Depende, na hora da chamada: STATE, APP_KEY, t(), collectBadgeMetrics(s) (de cada app.js), accountEarnedBadgeRows
// (shared/auth.js), PROFILE_PRIVATE_CACHE (shared/profile.js). Carregado antes do app.js.

// Data gravada nos níveis que a pessoa já tinha quando a página abriu (semeados sem comemoração). Fica no passado
// de propósito: a Atividade dos amigos mostra só os últimos 7 dias, então a troca para os níveis não vira uma enxurrada
// de "ganhou" no primeiro dia. Nível ganho estudando (checkAndCelebrateBadges) grava a hora real.
const BADGE_BACKFILL_EARNED_AT = '2026-10-01T00:00:00Z';
const BADGE_ICON_BASE = '../shared/icons/fluent/';

let FRIENDS_ACCEPTED_COUNT = null; // null = ainda não carregado (a trilha Amigos só aparece depois)
let PODIUM_WEEKS = null; // null = ainda não carregado (a trilha Pódio só aparece depois)
let DUO_MISSIONS = null; // missões em dupla cumpridas (102); null = ainda não carregado
let badgeTrackMemo = null;

function badgeOwnGender(){
  return (typeof PROFILE_PRIVATE_CACHE !== 'undefined' && PROFILE_PRIVATE_CACHE && PROFILE_PRIVATE_CACHE.gender) || null;
}

// ids de earned_badges que valem neste idioma: os da conta (qualquer idioma) e os do curso só deste idioma.
function badgeStoredIdsHere(){
  const rows = (typeof accountEarnedBadgeRows !== 'undefined' && Array.isArray(accountEarnedBadgeRows)) ? accountEarnedBadgeRows : [];
  return rows.filter(r => r && (r.language_app_key === APP_KEY || BadgeTracks.isAccountId(r.badge_id))).map(r => r.badge_id);
}

function badgeMetrics(s){
  const m = Object.assign({}, collectBadgeMetrics(s));
  m.friends = FRIENDS_ACCEPTED_COUNT;
  m.podiumWeeks = PODIUM_WEEKS;
  m.duoMissions = DUO_MISSIONS;
  return m;
}

// Estado de todas as trilhas. Memo curto: checkAndCelebrateBadges chama check() de cada nível em sequência, e as
// métricas (palavras aprendidas) percorrem todos os cartões.
function evaluateBadgeTracks(s){
  const now = Date.now();
  const stored = badgeStoredIdsHere();
  const key = stored.length + '|' + FRIENDS_ACCEPTED_COUNT + '|' + PODIUM_WEEKS + '|' + DUO_MISSIONS;
  if (badgeTrackMemo && badgeTrackMemo.s === s && badgeTrackMemo.key === key && now - badgeTrackMemo.at < 60) return badgeTrackMemo.res;
  const m = badgeMetrics(s);
  const res = { m, tracks: BadgeTracks.evaluate(m, stored) };
  badgeTrackMemo = { s, key, at: now, res };
  return res;
}
function invalidateBadgeTracks(){ badgeTrackMemo = null; }

function badgeNameVars(m){ return { level: (m && m.levelLabel) || '' }; }

function makeLevelBadge(st, n, m){
  const tr = BadgeTracks.trackById(st.id);
  const goal = st.goals[n - 1];
  return {
    id: BadgeTracks.levelId(st.id, n), track: st.id, level: n, total: st.total, tier: BadgeTracks.tierFor(n, st.total),
    icon: tr.icon, fluent: tr.fluent,
    get name(){ return BadgeTracks.levelName(t, st.id, n, badgeOwnGender(), badgeNameVars(m)); },
    get desc(){ return BadgeTracks.goalText(t, st.id, n, goal, badgeNameVars(m)); },
    check: (s) => {
      const cur = evaluateBadgeTracks(s).tracks.find(x => x.id === st.id);
      return !!cur && cur.level >= n;
    }
  };
}

// Preenche BADGES (no lugar, o array é o mesmo). Chamado ao semear (depois de carregar o progresso) e quando a
// contagem de amigos chega. Mantém a ordem do catálogo.
function rebuildTrackBadges(){
  invalidateBadgeTracks();
  const { m, tracks } = evaluateBadgeTracks(STATE);
  const list = [];
  tracks.forEach(st => { for (let n = 1; n <= st.total; n++) list.push(makeLevelBadge(st, n, m)); });
  Object.keys(BadgeTracks.CLASSIC).forEach(id => {
    const c = BadgeTracks.CLASSIC[id];
    list.push({ id, classic: true, icon: c.icon, fluent: c.fluent,
      get name(){ return t('badge.' + id + '.name'); }, get desc(){ return t('badge.' + id + '.desc'); },
      check: () => badgeStoredIdsHere().includes(id) });
  });
  BADGES.splice(0, BADGES.length, ...list);
  return BADGES;
}

// Barra até o próximo nível. Nível do curso: do "todas as unidades" para o máximo, a barra conta os pontos de
// verificação com 100% (a meta interna "unidades + 1" não diz nada para quem lê).
function badgeBarRange(st, m){
  if (st.id === 'course1' && st.level === st.total - 1) return { barFrom: 0, barTo: m.checkpointsTotal, barValue: m.checkpointsAced };
  return { barFrom: st.prevGoal, barTo: st.nextGoal, barValue: st.value };
}

// Trilhas para as telas (Progresso, Perfil): estado + textos já traduzidos.
function badgeTrackViews(s){
  const { m, tracks } = evaluateBadgeTracks(s || STATE);
  const g = badgeOwnGender();
  const vars = badgeNameVars(m);
  return tracks.map(st => ({
    ...st,
    ...badgeBarRange(st, m),
    title: t('badge.track.' + st.id + '.title', vars),
    name: BadgeTracks.levelName(t, st.id, Math.max(1, st.level), g, vars),
    goalText: st.nextGoal != null ? BadgeTracks.goalText(t, st.id, st.level + 1, st.nextGoal, vars) : '',
    nameNext: st.level < st.total ? BadgeTracks.levelName(t, st.id, st.level + 1, g, vars) : ''
  }));
}

// Qualquer id de earned_badges (de outra pessoa) -> o que mostrar. Nome na forma neutra (o gênero de outra
// pessoa é privado). Total de níveis = o do curso deste site (o conteúdo é o mesmo para todos).
function describeBadgeId(id){
  const p = BadgeTracks.parseId(id);
  if (!p) return null;
  if (p.classic){
    const c = BadgeTracks.CLASSIC[p.classic];
    return { id, classic: true, icon: c.icon, fluent: c.fluent, tier: 'classic', name: t('badge.' + p.classic + '.name'), desc: t('badge.' + p.classic + '.desc') };
  }
  const tr = BadgeTracks.trackById(p.track);
  const { m, tracks } = evaluateBadgeTracks(STATE);
  const st = tracks.find(x => x.id === p.track);
  const goals = st ? st.goals : tr.goals(m);
  const total = Math.max(goals.length, p.level);
  const level = Math.min(p.level, total);
  const vars = badgeNameVars(m);
  return {
    id, track: p.track, level, total, tier: BadgeTracks.tierFor(level, total), icon: tr.icon, fluent: tr.fluent, legacy: !!p.legacy,
    title: t('badge.track.' + p.track + '.title', vars),
    name: BadgeTracks.levelName(t, p.track, level, null, vars),
    desc: goals[level - 1] != null ? BadgeTracks.goalText(t, p.track, level, goals[level - 1], vars) : ''
  };
}

// Maior nível por trilha a partir de uma lista de ids (perfil de outra pessoa). Clássicas no fim.
function summarizeBadgeIds(ids){
  const best = {};
  const classics = [];
  (ids || []).forEach(id => {
    const d = describeBadgeId(id);
    if (!d) return;
    if (d.classic){ if (!classics.some(c => c.id === d.id)) classics.push(d); return; }
    if (!best[d.track] || d.level > best[d.track].level) best[d.track] = d;
  });
  const order = BadgeTracks.TRACKS.map(x => x.id);
  return Object.values(best).sort((a, b) => order.indexOf(a.track) - order.indexOf(b.track)).concat(classics);
}

function badgeIconHTML(b, cls){
  const c = cls ? ` ${cls}` : '';
  if (b && b.fluent) return `<img class="badge-ico${c}" src="${BADGE_ICON_BASE}${b.fluent}.svg" alt="" width="40" height="40" loading="lazy" decoding="async">`;
  return `<span class="badge-ico is-emoji${c}" aria-hidden="true">${(b && b.icon) || '🏅'}</span>`;
}

// Medalha: ícone dentro da moldura do nível (bronze, prata, ouro; máximo todo dourado).
function badgeMedalHTML(v, opts){
  const tier = v.level ? v.tier : 'locked';
  const size = (opts && opts.size) || '';
  return `<span class="track-medal tier-${tier}${size ? ' is-' + size : ''}">${badgeIconHTML(v)}${v.level ? '' : `<span class="track-medal-lock" aria-hidden="true"><img src="${BADGE_ICON_BASE}1f512.svg" alt="" width="14" height="14"></span>`}</span>`;
}

// Cartão de trilha (Progresso): moldura, "Nível 2 de 4", nome atual, barra até o próximo nível e a meta.
function badgeTrackCardHTML(v){
  const pct = v.maxed ? 100 : Math.max(0, Math.min(100, Math.round(((v.barValue - v.barFrom) / Math.max(1, v.barTo - v.barFrom)) * 100)));
  const levelLine = v.level
    ? t('badge.ui.levelOf', { n: v.level, total: v.total })
    : t('badge.ui.locked');
  const name = v.level ? v.name : v.nameNext;
  const footer = v.maxed
    ? `<div class="track-max">${t('badge.ui.maxLevel')}</div>`
    : `<div class="track-progress"><div class="track-bar"><span style="width:${pct}%"></span></div><span class="track-count">${Math.min(v.barValue, v.barTo)}/${v.barTo}</span></div>
       <div class="track-next">${escapeHTML(v.goalText)}</div>`;
  return `<div class="track-card${v.maxed ? ' is-max' : ''}${v.level ? '' : ' is-locked'}" data-track="${v.id}">
    ${badgeMedalHTML(v)}
    <div class="track-body">
      <div class="track-top"><span class="track-title">${escapeHTML(v.title)}</span><span class="track-level tier-${v.level ? v.tier : 'locked'}">${levelLine}</span></div>
      <div class="track-name">${escapeHTML(name)}</div>
      ${footer}
    </div>
  </div>`;
}

// Vitrine compacta (Perfil, perfil público): medalha + nome atual. items = views (badgeTrackViews) ou describeBadgeId.
function badgeShowcaseItemHTML(v){
  return `<button type="button" class="track-chip tier-${v.tier || 'classic'}" data-track-chip="${escapeAttr(v.id)}">
    ${badgeMedalHTML(v.classic ? Object.assign({}, v, { level: 1, tier: 'classic' }) : v, { size: 'sm' })}
    <span class="track-chip-name">${escapeHTML(v.name)}</span>
    ${v.classic ? `<span class="track-chip-sub">${t('badge.ui.classic')}</span>` : `<span class="track-chip-sub">${t('badge.ui.levelOf', { n: v.level, total: v.total })}</span>`}
  </button>`;
}

// Conquistas ganhas pela pessoa logada, uma por trilha (maior nível), mais as clássicas.
function ownBadgeShowcase(){
  const views = badgeTrackViews(STATE).filter(v => v.level > 0);
  const classics = BADGES.filter(b => b.classic && b.check(STATE)).map(b => ({ id: b.id, classic: true, icon: b.icon, fluent: b.fluent, name: b.name, desc: b.desc, tier: 'classic' }));
  return views.concat(classics);
}

// Popover de detalhe ao tocar numa medalha (mesmo popover de antes, shared/utils.js).
function wireTrackChips(root, items){
  root.querySelectorAll('[data-track-chip], .track-card[data-track]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.trackChip || el.dataset.track;
      const v = items.find(x => x.id === id);
      if (!v) return;
      const desc = v.classic ? v.desc : (v.maxed ? t('badge.ui.maxLevel') : (v.goalText || v.desc || ''));
      showBadgeInfo(el, escapeHTML(v.name || v.nameNext || ''), escapeHTML(desc));
    });
  });
}

// Amigos aceitos (trilha Amigos). Best-effort: sem login ou com erro, a trilha não aparece.
async function loadFriendsAcceptedCount(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || typeof supabaseClient === 'undefined') return;
  try {
    const { count, error } = await supabaseClient
      .from('friendships').select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${CURRENT_USER.id},addressee_id.eq.${CURRENT_USER.id}`);
    if (error) return;
    const before = FRIENDS_ACCEPTED_COUNT;
    FRIENDS_ACCEPTED_COUNT = Number(count) || 0;
    if (before === null){
      // Primeira contagem: a trilha Amigos nasce agora. Níveis que já valiam entram sem comemoração.
      rebuildTrackBadges();
      BADGES.filter(b => b.track === 'friends' && b.check(STATE)).forEach(b => earnedBadgeIds.add(b.id));
      upsertEarnedBadges([...earnedBadgeIds].filter(id => /^friends\./.test(id)), { backfill: true });
    } else if (FRIENDS_ACCEPTED_COUNT !== before){
      invalidateBadgeTracks();
      checkAndCelebrateBadges();
    }
  } catch (e) { console.error('Contagem de amigos (conquistas):', e); }
}

// Semanas em 1º lugar entre os amigos (trilha Pódio, RPC my_podium_weeks da 092). Só muda quando uma semana fecha,
// então nível novo aqui é conquista de verdade: comemora (o que já estava gravado em earned_badges não repete).
async function loadPodiumWeeks(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || typeof supabaseClient === 'undefined') return;
  try {
    const { data, error } = await supabaseClient.rpc('my_podium_weeks');
    if (error || typeof data !== 'number') return;
    const first = PODIUM_WEEKS === null;
    PODIUM_WEEKS = data;
    if (first) rebuildTrackBadges(); else invalidateBadgeTracks();
    const storedLevel = BadgeTracks.storedLevels(badgeStoredIdsHere()).podium || 0;
    BADGES.filter(b => b.track === 'podium' && b.level <= storedLevel).forEach(b => earnedBadgeIds.add(b.id));
    checkAndCelebrateBadges();
  } catch (e) { console.error('Pódio (conquistas):', e); }
}

// Missões em dupla cumpridas (trilha Missões em Dupla, RPC my_duo_missions_done da 102). Mesma lógica do Pódio:
// recarrega ao abrir o site e quando uma missão é cumprida na aba Amigos.
async function loadDuoMissionsDone(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || typeof supabaseClient === 'undefined') return;
  try {
    const { data, error } = await supabaseClient.rpc('my_duo_missions_done');
    if (error || typeof data !== 'number') return;
    const first = DUO_MISSIONS === null;
    if (!first && DUO_MISSIONS === data) return;
    DUO_MISSIONS = data;
    if (first) rebuildTrackBadges(); else invalidateBadgeTracks();
    const storedLevel = BadgeTracks.storedLevels(badgeStoredIdsHere()).duo || 0;
    BADGES.filter(b => b.track === 'duo' && b.level <= storedLevel).forEach(b => earnedBadgeIds.add(b.id));
    checkAndCelebrateBadges();
  } catch (e) { console.error('Missões em dupla (conquistas):', e); }
}
