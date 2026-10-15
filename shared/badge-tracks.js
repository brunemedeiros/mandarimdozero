// Conquistas com níveis (trilhas). Decisões da autora: docs/conquistas-proposta-niveis.md (2026-10-13/14).
//
// Uma conquista = uma trilha (Revisão, Sequência...). Cada nível tem meta, nome e moldura (bronze, prata, ouro; o último
// nível é o máximo, todo dourado). O mesmo catálogo vale para fr e zh; o que muda por site são as métricas (ver
// collectBadgeMetrics em cada app.js) e as trilhas que só existem onde há conteúdo (Ditado e Desafios, só fr).
//
// Ids gravados em earned_badges: '<trilha>.<nível>' (ex.: 'review.2'), um por nível ganho. As conquistas antigas
// (ex.: 'reviews_100') continuam na tabela e valem como o nível equivalente (LEGACY): ninguém perde nada.
// Multitarefa foi aposentada: quem tem continua vendo, como "clássica".
//
// Critério 8 (aprovado em 2026-10-14): trilha presa ao conteúdo (unidades, palavras, desafios) tem as metas cortadas
// pelo tamanho do curso; quando entrar conteúdo novo, as metas crescem sozinhas.
//
// Funções puras, sem DOM nem rede (testes: tests/conquistas/).
(function(root){
  'use strict';

  // scope 'account': conquista da conta (vale em todos os idiomas, ver AccountProgress.isAccountBadge).
  // scope 'course': conquista do curso (cada idioma tem a sua).
  // goals(m): metas em ordem crescente. value(m): número atual. available(m): a trilha existe neste site.
  var TRACKS = [
    { id: 'days', icon: '🌱', fluent: '1f331', scope: 'account', value: function(m){ return m.studyDays; }, goals: function(){ return [1, 7, 20, 50, 100, 200]; } },
    { id: 'review', icon: '💪', fluent: '1f4aa', scope: 'account', value: function(m){ return m.reviews; }, goals: function(){ return [50, 100, 200, 500]; } },
    { id: 'streak', icon: '🔥', fluent: '1f525', scope: 'account', value: function(m){ return m.streak; }, goals: function(){ return [3, 7, 15, 30, 75, 150, 365]; } },
    { id: 'xp', icon: '⭐', fluent: '2b50', scope: 'account', value: function(m){ return m.xp; }, goals: function(){ return [100, 500, 2000, 5000, 10000, 25000]; } },
    // Nível do curso: 1ª unidade, metade, todas e (máximo) todas + 100% em todos os pontos de verificação.
    // Unidade pulada pelo ponto de verificação conta (decidido em 2026-10-13).
    { id: 'course1', icon: '📖', fluent: '1f4d6', scope: 'course',
      value: function(m){ return m.courseDone + (m.courseTotal > 0 && m.courseDone >= m.courseTotal && m.courseAced ? 1 : 0); },
      goals: function(m){ var n = m.courseTotal; return n > 0 ? [1, Math.ceil(n / 2), n, n + 1] : []; },
      available: function(m){ return m.courseTotal > 0; } },
    { id: 'ear', icon: '🎧', fluent: '1f3a7', scope: 'course', value: function(m){ return m.audioPlays; }, goals: function(){ return [100, 500, 2000, 5000]; } },
    { id: 'explore', icon: '🧭', fluent: '1f9ed', scope: 'course', value: function(m){ return m.modesUsed; },
      goals: function(m){ var n = m.modesTotal; return n >= 4 ? [3, Math.min(5, n - 1), n] : []; },
      available: function(m){ return m.modesTotal >= 4; } },
    { id: 'weekend', icon: '🗓️', fluent: '1f5d3', scope: 'account', value: function(m){ return m.weekends; }, goals: function(){ return [1, 4, 12, 26, 52]; } },
    { id: 'vocab', icon: '📚', fluent: '1f4da', scope: 'course', value: function(m){ return m.wordsLearned; },
      goals: function(m){ return capGoals([25, 50, 100, 150], m.wordsTotal); },
      available: function(m){ return m.wordsTotal > 0; } },
    { id: 'aced', icon: '🎯', fluent: '1f3af', scope: 'course', value: function(m){ return m.checkpointsAced; },
      goals: function(m){ return capGoals([1, 5, 10], m.checkpointsTotal - 1).concat(m.checkpointsTotal > 0 ? [m.checkpointsTotal] : []); },
      available: function(m){ return m.checkpointsTotal > 0; } },
    { id: 'dictation', icon: '📝', fluent: '1f4dd', scope: 'course', value: function(m){ return m.dictationsAced; }, goals: function(){ return [5, 25, 100]; },
      available: function(m){ return m.dictationsAced != null; } },
    // Desafios vêm do banco (231 publicados em 2026-10-14) e só carregam ao abrir a aba: sem a lista, metas cheias.
    { id: 'challenge', icon: '🏁', fluent: '1f3c1', scope: 'course', value: function(m){ return m.challengesDone; },
      goals: function(m){ return m.challengesTotal > 0 ? capGoals([10, 50, 200], m.challengesTotal) : [10, 50, 200]; },
      available: function(m){ return m.challengesDone != null; } },
    // Pódio: semanas fechadas em 1º lugar entre os amigos (RPC my_podium_weeks, migration 092).
    { id: 'podium', icon: '🏆', fluent: '1f3c6', scope: 'account', value: function(m){ return m.podiumWeeks; }, goals: function(){ return [1, 5, 10]; },
      available: function(m){ return m.podiumWeeks != null; } },
    // Missões em Dupla: missões da semana cumpridas com um amigo (RPC my_duo_missions_done, migration 102).
    { id: 'duo', icon: '🫶', fluent: '1faf6', scope: 'account', value: function(m){ return m.duoMissions; }, goals: function(){ return [1, 5, 15]; },
      available: function(m){ return m.duoMissions != null; } },
    { id: 'friends', icon: '🤝', fluent: '1f91d', scope: 'account', value: function(m){ return m.friends; }, goals: function(){ return [1, 3, 10]; },
      available: function(m){ return m.friends != null; }, noCongrats: true },
    { id: 'comeback', icon: '🔄', fluent: '1f504', scope: 'account', value: function(m){ return m.comeback ? 1 : 0; }, goals: function(){ return [1]; } }
  ];
  var BY_ID = {};
  TRACKS.forEach(function(t){ BY_ID[t.id] = t; });

  // Conquista antiga -> [trilha, nível]. Mapa das decisões de 2026-10-13 (seção 3 da proposta).
  var LEGACY = {
    first_step: ['days', 1], streak_3: ['streak', 1], streak_7: ['streak', 2], xp_100: ['xp', 1], xp_500: ['xp', 2],
    reviews_100: ['review', 2], unit_1: ['course1', 1], unit_half: ['course1', 2], unit_7: ['course1', 2],
    unit_all: ['course1', 3], unit_14: ['course1', 3], trained_ear: ['ear', 1], explorer: ['explore', 1],
    weekend: ['weekend', 1], comeback: ['comeback', 1]
  };
  var CLASSIC = { multitasker: { icon: '🧩', fluent: '1f9e9' } };

  function capGoals(goals, total){
    if (!(total > 0)) return [];
    return dedupe(goals.map(function(g){ return Math.min(g, total); }));
  }
  function dedupe(list){
    var out = [];
    list.forEach(function(g){ if (g > 0 && (!out.length || g > out[out.length - 1])) out.push(g); });
    return out;
  }
  function num(v){ v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  // Moldura do nível n (1..total): o último é o máximo; os anteriores se dividem em bronze, prata e ouro.
  function tierFor(n, total){
    if (n >= total) return 'max';
    var t = Math.floor((n - 1) * 3 / (total - 1));
    return ['bronze', 'silver', 'gold'][Math.min(2, t)];
  }
  // Parabéns dos amigos: só ouro e máximo (decidido em 2026-10-13). Amigos não recebe.
  function allowsCongrats(trackId, tier){
    var tr = BY_ID[trackId];
    return !!tr && !tr.noCongrats && (tier === 'gold' || tier === 'max');
  }

  function levelId(trackId, n){ return trackId + '.' + n; }
  // Qualquer id de earned_badges -> { track, level } | { classic } | null.
  function parseId(id){
    if (typeof id !== 'string') return null;
    var m = /^([a-z][a-z0-9]*)\.(\d+)$/.exec(id);
    if (m && BY_ID[m[1]]) return { track: m[1], level: Number(m[2]) };
    if (LEGACY[id]) return { track: LEGACY[id][0], level: LEGACY[id][1], legacy: true };
    if (CLASSIC[id]) return { classic: id };
    return null;
  }
  function isAccountId(id){
    var p = parseId(id);
    return !!(p && p.track && BY_ID[p.track].scope === 'account');
  }

  // Maior nível já gravado por trilha (ids novos e antigos).
  function storedLevels(ids){
    var out = {};
    (ids || []).forEach(function(id){
      var p = parseId(id);
      if (p && p.track && p.level > (out[p.track] || 0)) out[p.track] = p.level;
    });
    return out;
  }

  // Estado de cada trilha disponível. m = métricas do site; ids = ids já gravados que valem aqui.
  function evaluate(m, ids){
    var stored = storedLevels(ids);
    return TRACKS.filter(function(tr){ return !tr.available || tr.available(m); }).map(function(tr){
      var goals = tr.goals(m);
      var value = num(tr.value(m));
      var reached = 0;
      goals.forEach(function(g, i){ if (value >= g) reached = i + 1; });
      var level = Math.min(goals.length, Math.max(reached, stored[tr.id] || 0));
      var total = goals.length;
      return {
        id: tr.id, icon: tr.icon, fluent: tr.fluent, scope: tr.scope, goals: goals, value: value, level: level, total: total,
        tier: level ? tierFor(level, total) : null, maxed: total > 0 && level >= total,
        prevGoal: level ? goals[level - 1] : 0, nextGoal: level < total ? goals[level] : null
      };
    }).filter(function(s){ return s.total > 0; });
  }

  // Nome de um nível. t = função de tradução; gender = 'feminine' | 'masculine' | outro (forma neutra).
  // Chaves: badge.track.<id>.<n> (forma neutra) e, quando o nome tem gênero, .f e .m.
  function levelName(t, trackId, n, gender, vars){
    var base = 'badge.track.' + trackId + '.' + n;
    var suffix = gender === 'feminine' ? '.f' : gender === 'masculine' ? '.m' : null;
    if (suffix){
      var g = t(base + suffix, vars);
      if (g && g !== base + suffix) return g;
    }
    return t(base, vars);
  }
  // Frase da meta de um nível ("Faça 200 revisões"). Chave própria do nível (.goal.<n>) ou a geral (.goal, com {n}).
  function goalText(t, trackId, n, goal, vars){
    var own = 'badge.track.' + trackId + '.goal.' + n;
    var v = Object.assign({ n: goal }, vars || {});
    var s = t(own, v);
    return (s && s !== own) ? s : t('badge.track.' + trackId + '.goal', v);
  }

  var api = {
    TRACKS: TRACKS, LEGACY: LEGACY, CLASSIC: CLASSIC, trackById: function(id){ return BY_ID[id] || null; },
    tierFor: tierFor, allowsCongrats: allowsCongrats, levelId: levelId, parseId: parseId, isAccountId: isAccountId,
    storedLevels: storedLevels, evaluate: evaluate, levelName: levelName, goalText: goalText, capGoals: capGoals
  };
  root.BadgeTracks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
