// P1 (decisão da dona, 2026-10-12, reafirmada em 2026-10-29; desenho em docs/p1-memoria-por-idioma.md): a memória FSRS dos
// cartões da professora (origin 'teacher') e dos próprios (origin 'self') é do IDIOMA ESTUDADO, não do curso. Quem estuda
// francês com o site em pt-BR e em inglês vê os mesmos cartões com a MESMA memória.
//
// Onde mora: progress.data._lang[<appKey>].cards (uma entrada enxuta por CardInstance: id, origem, linha e os campos de
// progresso). Os blocos dos cursos (data.frances, data["frances@en"]) continuam com a cópia dentro de `cards` (ESPELHO):
// o servidor (notification-cron, painel da professora) e as abas abertas com o código antigo leem de lá.
//
// Regra de ouro: nunca perder memória. Tudo aqui é "junta e fica com o registro de MAIS histórico" (compareHistory),
// então aplicar de novo dá o mesmo resultado e uma cópia velha (aba antiga, outro curso) nunca vence uma mais nova.
// Cartões da trilha (origin 'study', id `u...`) nunca são tocados: continuam por curso.
//
// Funções puras, sem DOM nem rede. Não mutam a entrada.
(function(root){
  'use strict';

  var KEY = '_lang';
  // Campos de progresso guardados em _lang (os mesmos de STUDY_PROGRESS_FIELDS, menos `released`, que é só da trilha, mais
  // os dois de direção dos cartões antigos). O resto do cartão (conteúdo, deck, tags) vem do banco a cada carregamento.
  var PROGRESS_FIELDS = [
    'ef', 'interval', 'reps', 'due', 'lapses',
    'stability', 'difficulty', 'state', 'lastReview',
    'fsrsReps', 'fsrsLapses', 'fsrsMigrated', 'firstLearnedDate',
    'lastDirection', 'reviewDirection',
  ];
  // Identidade da entrada (o servidor usa origin/rowId/flashcardStatus para contar; ver o desenho, seção 6).
  var IDENTITY_FIELDS = ['id', 'origin', 'rowId', 'flashcardStatus', 'teacherId'];

  function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }

  // Mesma regra de savedCardOrigin (shared/study-trail-model.js): origin explícito, ou prefixo do id (t1, s2-r1).
  function entryOrigin(s){
    if (!isObj(s) || s.id == null) return null;
    if (s.origin === 'teacher' || s.origin === 'self') return s.origin;
    if (s.origin) return null;
    var id = String(s.id);
    if (/^t\d/.test(id)) return 'teacher';
    if (/^s\d/.test(id)) return 'self';
    return null;
  }
  function isMemoryEntry(s){ return entryOrigin(s) !== null; }

  function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }
  function reviewTime(e){
    var v = e && e.lastReview;
    if (v == null || v === '') return -Infinity;
    var n = typeof v === 'number' ? v : Date.parse(v);
    return isFinite(n) ? n : -Infinity;
  }
  function hasHistory(e){ return num(e && e.reps) > 0 || reviewTime(e) > -Infinity; }

  // > 0: `a` tem MAIS histórico que `b`. Ordem: 1) mais revisões (reps); 2) última revisão mais recente;
  // 3) maior stability. Empate em tudo = 0 (vence quem veio primeiro na lista de preferência).
  function compareHistory(a, b){
    var d = num(a && a.reps) - num(b && b.reps);
    if (d) return d;
    var ta = reviewTime(a), tb = reviewTime(b);
    if (ta !== tb) return ta > tb ? 1 : -1;
    d = num(a && a.stability) - num(b && b.stability);
    return d;
  }

  function slim(e){
    var out = {};
    IDENTITY_FIELDS.concat(PROGRESS_FIELDS).forEach(function(k){
      if (Object.prototype.hasOwnProperty.call(e, k) && e[k] !== undefined) out[k] = e[k];
    });
    if (out.origin === undefined){ var o = entryOrigin(e); if (o) out.origin = o; }
    return out;
  }
  function progressOf(e){
    var out = {};
    PROGRESS_FIELDS.forEach(function(k){ if (Object.prototype.hasOwnProperty.call(e, k) && e[k] !== undefined) out[k] = e[k]; });
    return out;
  }
  function sameProgress(a, b){
    for (var i = 0; i < PROGRESS_FIELDS.length; i++){
      var k = PROGRESS_FIELDS[i];
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
    }
    return true;
  }

  // Chaves dos blocos de curso do idioma `appKey` (frances, frances@en...). Nunca _meta, _account, _lang.
  function languageBlockKeys(data, appKey){
    if (!isObj(data) || !appKey) return [];
    return Object.keys(data).filter(function(k){
      if (k.charAt(0) === '_' || !isObj(data[k])) return false;
      return k === appKey || k.indexOf(appKey + '@') === 0;
    });
  }
  function memoryEntriesOf(cards){
    return Array.isArray(cards) ? cards.filter(isMemoryEntry) : [];
  }
  function storedLanguageCards(data, appKey){
    var l = isObj(data) && isObj(data[KEY]) && isObj(data[KEY][appKey]) ? data[KEY][appKey] : null;
    return l && Array.isArray(l.cards) ? l.cards : [];
  }

  // Junta listas de entradas (em ordem de preferência para o empate) e fica, por id, com a de mais histórico.
  // firstLearnedDate = a mais antiga entre as cópias (igual à fusão da trilha). Devolve { ids (ordem da 1ª aparição),
  // byId (vencedor, cópia), source (índice da lista de onde veio o vencedor) }.
  function mergeLists(lists){
    var ids = [], byId = {}, source = {}, firstDate = {};
    lists.forEach(function(list, li){
      (list || []).forEach(function(e){
        if (!isMemoryEntry(e)) return;
        var id = String(e.id);
        if (e.firstLearnedDate && (!firstDate[id] || String(e.firstLearnedDate) < String(firstDate[id]))) firstDate[id] = e.firstLearnedDate;
        if (!Object.prototype.hasOwnProperty.call(byId, id)){ ids.push(id); byId[id] = e; source[id] = li; return; }
        if (compareHistory(e, byId[id]) > 0){ byId[id] = e; source[id] = li; }
      });
    });
    ids.forEach(function(id){
      var w = byId[id];
      if (firstDate[id] && w.firstLearnedDate !== firstDate[id]) byId[id] = Object.assign({}, w, { firstLearnedDate: firstDate[id] });
    });
    return { ids: ids, byId: byId, source: source };
  }

  // Lista de cartões de um bloco com a memória do idioma: cada entrada de professora/própria recebe o PROGRESSO do
  // vencedor (o resto da entrada fica como estava); `appendMissing` acrescenta no fim os vencedores que o bloco não tem
  // (só os que têm histórico, se `onlyHistory`). Devolve null quando nada mudou.
  function applyWinners(cards, merged, opts){
    var o = opts || {};
    var changed = false, present = {};
    var out = (cards || []).map(function(e){
      if (!isMemoryEntry(e)) return e;
      var id = String(e.id);
      present[id] = true;
      var w = merged.byId[id];
      if (!w || w === e) return e;
      if (o.onlyIfMore && compareHistory(w, e) <= 0 && w.firstLearnedDate === e.firstLearnedDate) return e;
      if (sameProgress(e, w)) return e;
      changed = true;
      var next = Object.assign({}, e);
      PROGRESS_FIELDS.forEach(function(k){ if (Object.prototype.hasOwnProperty.call(next, k) && !Object.prototype.hasOwnProperty.call(w, k)) delete next[k]; });
      return Object.assign(next, progressOf(w));
    });
    if (o.appendMissing){
      merged.ids.forEach(function(id){
        if (present[id]) return;
        var w = merged.byId[id];
        if (o.onlyHistory && !hasHistory(w)) return;
        out.push(slim(w));
        changed = true;
      });
    }
    return changed ? out : null;
  }

  // CARREGAR: o bloco do curso desta página com a memória do idioma por cima (preferência no empate: _lang, depois o
  // próprio bloco, depois os outros cursos do idioma). Sem nada a juntar, devolve o MESMO objeto do bloco.
  function blockForLoad(data, appKey, blockKey){
    var block = isObj(data) ? data[blockKey] : undefined;
    if (!isObj(block)) return block;
    var stored = storedLanguageCards(data, appKey);
    var others = languageBlockKeys(data, appKey).filter(function(k){ return k !== blockKey; });
    if (!stored.length && !others.length) return block;
    var lists = [stored, memoryEntriesOf(block.cards)].concat(others.map(function(k){ return memoryEntriesOf(data[k].cards); }));
    var merged = mergeLists(lists);
    var cards = applyWinners(block.cards, merged, { appendMissing: true });
    return cards ? Object.assign({}, block, { cards: cards }) : block;
  }

  // CARREGAR um curso que ainda não tem bloco (curso novo): só as entradas de memória do idioma (enxutas).
  function memoryEntriesForLoad(data, appKey){
    var lists = [storedLanguageCards(data, appKey)].concat(languageBlockKeys(data, appKey).map(function(k){ return memoryEntriesOf(data[k].cards); }));
    var merged = mergeLists(lists);
    return merged.ids.map(function(id){ return slim(merged.byId[id]); });
  }

  // SALVAR. `existingData` = a linha LIDA AGORA do servidor; `payload` = o bloco que esta página vai gravar.
  // Devolve:
  //   payload      o bloco a gravar; as entradas de memória recebem o progresso da cópia de mais histórico (aba de outro
  //                curso que revisou depois desta abrir). Sem nada a mudar é o MESMO objeto (conta de um curso só: igual a antes).
  //   lang         o novo data._lang (os outros idiomas ficam como estavam)
  //   otherBlocks  { chave: bloco } dos OUTROS cursos do mesmo idioma cujo espelho precisou subir (só entradas com menos
  //                histórico que o vencedor são atualizadas, e entram as que faltam com histórico). Nunca tira entrada.
  //   stats        contagens para diagnóstico
  // Entradas que só existiam no servidor e não têm histórico não entram em _lang (nada a perder); com histórico entram
  // sempre (cartão apagado no banco ou de outra aba: a memória fica guardada).
  function prepareSave(existingData, appKey, blockKey, payload, nowIso){
    var data = isObj(existingData) ? existingData : {};
    if (!isObj(payload) || !Array.isArray(payload.cards)){
      return { payload: payload, lang: data[KEY], otherBlocks: {}, stats: null };
    }
    var local = memoryEntriesOf(payload.cards);
    var others = languageBlockKeys(data, appKey).filter(function(k){ return k !== blockKey; });
    var currentSaved = isObj(data[blockKey]) ? memoryEntriesOf(data[blockKey].cards) : [];
    var lists = [local, storedLanguageCards(data, appKey), currentSaved].concat(others.map(function(k){ return memoryEntriesOf(data[k].cards); }));
    var merged = mergeLists(lists);
    var localIds = {};
    local.forEach(function(e){ localIds[String(e.id)] = true; });

    // Ordem estável: a de _lang como estava, depois os novos (salvar de outro curso não reordena nada).
    var order = [], seen = {};
    storedLanguageCards(data, appKey).concat(local).forEach(function(e){
      var id = isMemoryEntry(e) ? String(e.id) : null;
      if (id !== null && !seen[id] && Object.prototype.hasOwnProperty.call(merged.byId, id)){ seen[id] = true; order.push(id); }
    });
    merged.ids.forEach(function(id){ if (!seen[id]){ seen[id] = true; order.push(id); } });
    var langCards = [];
    order.forEach(function(id){
      var w = merged.byId[id];
      if (localIds[id] || hasHistory(w)) langCards.push(slim(w));
    });

    var cards = applyWinners(payload.cards, merged, {});
    var outPayload = cards ? Object.assign({}, payload, { cards: cards }) : payload;

    var otherBlocks = {};
    others.forEach(function(k){
      var c = applyWinners(data[k].cards, merged, { onlyIfMore: true, appendMissing: true, onlyHistory: true });
      if (c) otherBlocks[k] = Object.assign({}, data[k], { cards: c });
    });

    var lang = Object.assign({}, isObj(data[KEY]) ? data[KEY] : {});
    lang[appKey] = { v: 1, cards: langCards, updatedAt: nowIso || null };
    return {
      payload: outPayload, lang: lang, otherBlocks: otherBlocks,
      stats: { local: local.length, lang: langCards.length, withHistory: langCards.filter(hasHistory).length,
        payloadChanged: outPayload !== payload, otherBlocksChanged: Object.keys(otherBlocks) },
    };
  }

  // MIGRAÇÃO (só leitura, para diagnóstico e para a simulação): o que _lang[appKey] teria juntando tudo o que a linha tem.
  function migrateLanguage(data, appKey){
    return memoryEntriesForLoad(data, appKey);
  }

  var api = {
    KEY: KEY, PROGRESS_FIELDS: PROGRESS_FIELDS, entryOrigin: entryOrigin, isMemoryEntry: isMemoryEntry, hasHistory: hasHistory,
    compareHistory: compareHistory, mergeLists: mergeLists, languageBlockKeys: languageBlockKeys,
    storedLanguageCards: storedLanguageCards, blockForLoad: blockForLoad, memoryEntriesForLoad: memoryEntriesForLoad,
    prepareSave: prepareSave, migrateLanguage: migrateLanguage,
  };
  root.LangCardMemory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
