// Paridade, etapa 5c (docs/historico/29-paridade-desafios.md): os Desafios saíram do fr/app.js para shared/desafios.js
// (lógica, catálogo, dados, textos, revisão espaçada), shared/desafios-telas.js (telas do aluno e a linha da trilha),
// shared/desafios-admin.js (admin e importação) + fr/desafios-config.js (o que é do francês) + shared/desafios.css.
// Este teste prova que o fr faz EXATAMENTE o mesmo que antes, rodando a mesma sequência no fr de REF (main antes da
// mudança, num worktree temporário) e no fr desta árvore, no navegador de verdade (Playwright), com um Supabase de
// mentira que serve os desafios dos lotes reais (fr/scripts/challenges_import/*.json) e registra as gravações:
//  1. lógica pura: correção de TODOS os desafios dos lotes com dezenas de respostas por tipo (Ouça e traduza: referências,
//     minúsculas, sem acento, sem pontuação, negação, número trocado, troca de pessoa, palavra faltando/a mais, digitação,
//     ordem trocada, inglês, vazio; Acentuação: certa, sem acento, acento trocado, sem cedilha, œ -> oe, maiúsculas,
//     espaços, apóstrofo curvo, outra palavra; Complete a frase: todas as combinações de opções), o comparador em inglês
//     (site em inglês), a revisão espaçada (sequências de acertos/erros em vários dias), a Expressão do dia (30 dias,
//     relógio fixo), catálogo (publicados, pendentes, por módulo, trava, nível), textos (todas as chaves, pt-BR e en);
//  2. telas do aluno pelo DOM: categorias, lista e álbum de Expressões (busca, filtros, recolher nível, expressão do dia),
//     fila por nível, cada player em pergunta e devolutiva certa/quase/errada, "Tentar de novo"/"Tentar mais tarde"/
//     "Concluir", revisão dos erros, Desafios do Módulo, linha da trilha, janela Premium, áudio, site em inglês, com
//     STATE.completedChallenges, STATE.challengeReviews, XP, missões, estado salvo e conquistas depois de cada uma;
//  3. admin: lista (filtros, paginação, seleção, lote), aprovar/rejeitar/despublicar/editar/salvar cada tipo, recursos,
//     prévia, importação (válida, inválida, repetida, tipo/nível/registro errado, falha do banco), com o que foi gravado.
// Rodar: node tests/paridade-sites/test_desafios.js   (REF padrão 3035549c; PARIDADE_5C_REF=<commit> para outro)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5C_REF || '3035549c';
const H = require('./desafios-harness.js');
// Botão de verificar traduzido DE PROPÓSITO (2026-10-26, etapa A): antes "Vérifier" nos dois idiomas, agora "Verificar" (pt-BR) e "Check" (en).
const VERIFICAR_RE = />(Vérifier|Verificar|Check)<\/button>/g;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 900) : ''); } };

async function fingerprint(browser, root, keys){
  const { page, ctx, server, errors } = await H.boot(browser, root, { lang: 'pt-BR' });
  const out = {};
  // a duração dos mp3 no checklist do admin chega quando o áudio carrega (momento variável): fica de fora
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const c = e.cloneNode(true); c.querySelectorAll('.challenges-admin-audio-duration').forEach(x => { x.textContent = ''; }); return c.innerHTML; }, sel).then(v => (typeof v === 'string' ? v.replace(VERIFICAR_RE, '>VERIFICAR</button>') : v));
  const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('sem ' + s); e.click(); }, sel);
  const state = () => page.evaluate(() => JSON.stringify({ done: STATE.completedChallenges, rev: STATE.challengeReviews, xp: STATE.xp,
    daily: STATE.daily, modes: STATE.modesUsed, saved: serializeState(), badges: collectBadgeMetrics(STATE), cur: typeof CURRENT_CHALLENGE_PLAYER !== 'undefined' ? CURRENT_CHALLENGE_PLAYER : 'x' }));
  const extra = () => page.evaluate(() => { const r = JSON.stringify({ plays: window.__plays.splice(0), toasts: window.__toasts.splice(0), alerts: window.__alerts.splice(0), db: window.__dbLog.splice(0), spoken: window.__spoken.splice(0) }); return r; });

  out.estado_inicial = await state();

  // ================= 1. lógica pura =================
  await page.evaluate(() => loadChallengesFromDB(true));
  out.catalogo = await page.evaluate(() => JSON.stringify({
    n: CHALLENGES.length, ids: CHALLENGES.map(c => c.id + ':' + c.status + ':' + c.type + ':' + c.level + ':' + challengeModuleId(c) + ':' + challengeTier(c)),
    pub: publishedChallenges().map(c => c.id), pend: pendingChallenges().map(c => c.id), unp: unpublishedButApprovedChallenges().map(c => c.id),
    cats: CHALLENGE_CATEGORIES, levels: CHALLENGE_LEVELS_ORDER, regs: EXPRESSION_REGISTERS, cols: CHALLENGE_DB_COLUMNS,
    types: CHALLENGE_VALID_TYPES, statuses: CHALLENGE_VALID_STATUSES, box: CHALLENGE_REVIEW_BOX_DAYS, paywall: CHALLENGE_PAYWALL_ENABLED,
    gating: CHALLENGES_SERVER_GATING, admin: isChallengesAdmin(), prem: challengesPremiumUnlocked(), blank: CLOZE_GRAMMAR_BLANK,
    slow: SLOW_AUDIO_RATE,
    payload: CHALLENGES.map(c => challengeDataPayload(c)),
  }));
  out.catalogo_filtros = await page.evaluate(() => {
    const r = [];
    for (const m of [null, 'A1-m1', 'A1-m2', 'A1-m3', 'A1-m6', 'nada']){
      challengesModuleFilter = m;
      r.push([m, listedChallenges().map(c => c.id), playableChallenges().map(c => c.id), listedChallenges().map(isChallengeLocked)]);
    }
    challengesModuleFilter = null;
    return JSON.stringify(r);
  });
  out.textos = await page.evaluate((keys) => {
    const r = {};
    const ui = window.getUiLang;
    for (const lang of ['pt-BR', 'en', 'fr', 'xx']){
      window.getUiLang = () => lang;
      r[lang] = keys.map(k => k + '=' + chT(k, { n: 3, done: 1, total: 4, level: 'A1', title: 'Tít', fr: '<b>x</b>', pt: 'y', chosen: 'c', correct: 'k', word: 'w', pronoun: 'eu', verb: 'foi', answer: 'a', progress: 'p' }));
      r[lang + '_sem_vars'] = keys.map(k => chT(k));
    }
    window.getUiLang = ui;
    r.tpZero = [0, 1, 2, 5].map(n => tpZero('fr.trail.dictationsAnd', n) + '|' + tpZero('fr.trail.premiumChallengesSuffix', n));
    return JSON.stringify(r);
  }, keys);
  out.textos_dom = await page.evaluate(() => { applyChallengeI18n(); return [...document.querySelectorAll('[data-ch-i18n]')].map(e => e.dataset.chI18n + '=' + e.innerHTML).join('\n'); });

  // Ouça e traduza: correção e análise
  out.lt = await page.evaluate(() => {
    const res = {};
    const lts = CHALLENGES.filter(c => c.type === 'listen_translate');
    lts.forEach((c, ci) => {
      const refs = c.referenceTranslations || [];
      const vs = window.__ltVariants(refs[0] || '', 500 + ci);
      const rows = [];
      Object.keys(vs).concat(refs.map((_, i) => 'ref' + i)).forEach(k => {
        const a = k.startsWith('ref') ? refs[Number(k.slice(3))] : vs[k];
        const pm = translationHasPersonMismatch(a);
        const an = analyzeTranslation(a, refs, c);
        rows.push(k + ' => ' + JSON.stringify([a, normalizeForTranslationCompare(a), translationTokenSet(a), translationSimilarity(a, refs[0] || ''),
          isTranslationAcceptable(a, refs), pm, an, listenTranslateOutcome(a, refs, pm, c), [...translationNumbers(a)], translationHasNegation(a),
          markTranslationWords(a, an.bestRef || refs[0]), markedWordsHTML(markTranslationWords(a, an.bestRef || refs[0]).student)]));
      });
      res[c.id] = rows.join('\n');
    });
    return res;
  });
  out.lt_pessoas = await page.evaluate(() => {
    const prons = ['eu', 'tu', 'você', 'ele', 'ela', 'nós', 'a gente', 'vocês', 'eles', 'elas'];
    const verbs = ['sou', 'é', 'somos', 'são', 'fui', 'foi', 'fomos', 'foram', 'tenho', 'tem', 'têm', 'temos', 'vou', 'vai', 'vamos', 'vão', 'comprei', 'comprou', 'compramos', 'compraram', 'falo', 'fala', 'comem', 'comeu', 'partiste', 'fizestes', 'dei', 'deu', 'estava', 'livro', 'noite'];
    const r = [];
    prons.forEach(p => verbs.forEach(v => { r.push(p + ' ' + v + '=' + JSON.stringify(translationHasPersonMismatch(p + ' ' + v + ' muito'))); r.push(p + ' já não ' + v + '=' + JSON.stringify(translationHasPersonMismatch('ontem ' + p + ' já não ' + v))); }));
    verbs.forEach(v => r.push(v + ':' + JSON.stringify(ptVerbPersonTags(normalizeForTranslationCompare(v)))));
    r.push(JSON.stringify([translationEditDistance('comprou', 'comprei'), translationEditDistance('', 'abc'), translationWordsAreNear('comprou', 'comprei'), translationWordsAreNear('casa', 'cama'), translationWordsAreNear('restaurante', 'restaurantes')]));
    return r.join('\n');
  });
  out.lt_en = await page.evaluate(() => {
    const ui = window.getUiLang; const res = [];
    for (const lang of ['en', 'pt-BR']){
      window.getUiLang = () => lang;
      CHALLENGES.filter(c => c.type === 'listen_translate').forEach(c => {
        const s = listenTranslateSetup(c);
        const ans = [s.refs[0] || '', (s.refs[0] || '').toLowerCase(), 'I did not ' + (s.refs[0] || ''), 'xyz', '', (s.refs[1] || '').split(' ').slice(0, 3).join(' ')];
        res.push(c.id + ' ' + lang + ' ' + JSON.stringify({ lang: s.lang, tr: s.translated, refs: s.refs, ex: s.explanation, ov: challengeOverlay(c), txt: challengeText(c, 'explanation') }) + ' ' + JSON.stringify(ans.map(a => [s.cmp.personMismatch(a), s.cmp.isAcceptable(a, s.refs)])));
      });
    }
    window.getUiLang = ui;
    return res.join('\n');
  });
  // Acentuação
  out.acento = await page.evaluate(() => {
    const r = [];
    CHALLENGES.filter(c => c.type === 'accent').forEach((c, i) => {
      const vs = window.__accentVariants(c.targetText, 900 + i);
      Object.keys(vs).forEach(k => r.push(c.id + ' ' + k + ' ' + JSON.stringify([vs[k], accentAnswerOutcome(vs[k], c.targetText), isAccentAnswerCorrect(vs[k], c.targetText), normalizeForAccentCompare(vs[k]), stripDiacriticsForAccentCompare(vs[k])])));
    });
    return r.join('\n');
  });
  // Complete a frase
  out.cloze = await page.evaluate(() => {
    const r = [];
    const prod = (lists) => lists.reduce((acc, l) => acc.flatMap(a => l.map(x => a.concat([x]))), [[]]);
    CHALLENGES.filter(c => c.type === 'cloze_grammar').forEach(c => {
      r.push(c.id + ' parts=' + JSON.stringify(clozeGrammarParts(c.sentenceFr)) + ' val=' + JSON.stringify(validateClozeGrammarItem(c)) + ' certa=' + clozeGrammarFilled(c) + ' txt=' + clozeGrammarBlanksText(c));
      prod((c.blanks || []).map(b => b.options.concat([null]))).forEach(ch => r.push('  ' + JSON.stringify(ch) + ' ' + JSON.stringify(clozeGrammarOutcome(c, ch)) + ' ' + clozeGrammarFilled(c, ch)));
      const bad = [Object.assign({}, c, { sentenceFr: '' }), Object.assign({}, c, { sentenceFr: 'sem lacuna' }), Object.assign({}, c, { blanks: [] }),
        Object.assign({}, c, { blanks: (c.blanks || []).map(b => ({ options: [b.answer], answer: b.answer })) }), Object.assign({}, c, { blanks: (c.blanks || []).map(b => ({ options: b.options.concat(b.options), answer: 'zz' })) }),
        Object.assign({}, c, { explanation: '  ' }), null];
      bad.forEach(b => r.push('  ruim ' + JSON.stringify(validateClozeGrammarItem(b))));
    });
    r.push(JSON.stringify([clozeGrammarOutcome({ blanks: [] }, []), clozeGrammarOutcome(null, null), clozeGrammarParts(null)]));
    return r.join('\n');
  });
  // Expressões: sentido no álbum (pt-BR / en), sobreposição, nível
  out.expr = await page.evaluate(() => {
    const ui = window.getUiLang; const r = [];
    for (const lang of ['pt-BR', 'en']){
      window.getUiLang = () => lang;
      CHALLENGES.filter(c => c.type === 'expression').forEach(c => r.push(lang + ' ' + c.id + ' ' + expressionCardMeaning(c) + ' | ' + JSON.stringify(challengeOverlay(c)) + ' | ' + challengeText(c, 'explanation')));
    }
    window.getUiLang = ui;
    r.push(JSON.stringify(expressionCardMeaning({ meaning: { pt: 'Oi. ⚠️ Registro: x' } })) + JSON.stringify(expressionCardMeaning({})));
    return r.join('\n');
  });
  // Expressão do dia: 30 dias, com mais e mais concluídas
  out.expr_dia = await page.evaluate(() => {
    const r = []; const orig = todayStr; const list = publishedChallenges().filter(c => c.type === 'expression');
    const saved = Object.assign({}, STATE.completedChallenges);
    for (let d = 0; d < 30; d++){
      const day = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
      todayStr = () => day;
      const c = expressionOfTheDay(list);
      r.push(day + ' ' + (c ? c.id : 'null'));
      if (c && d % 2) STATE.completedChallenges[c.id] = true;
      if (d === 20) list.filter(x => x.level === 'A1').forEach(x => { STATE.completedChallenges[x.id] = true; });
    }
    list.forEach(x => { STATE.completedChallenges[x.id] = true; });
    r.push('todas: ' + JSON.stringify(expressionOfTheDay(list)) + ' vazia: ' + JSON.stringify(expressionOfTheDay([])));
    todayStr = orig;
    STATE.completedChallenges = saved;
    Object.keys(STATE.completedChallenges).forEach(k => { if (!(k in saved)) delete STATE.completedChallenges[k]; });
    return r.join('\n');
  });
  // Revisão espaçada: sequências de resultados em vários dias
  out.revisao = await page.evaluate(() => {
    const r = []; let s = 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const base = Date.UTC(2026, 9, 1, 15, 0, 0);
    for (let seq = 0; seq < 60; seq++){
      let e = null; const id = 'x' + seq; let t = base; const steps = [];
      for (let k = 0; k < 14; k++){
        t += Math.floor(rnd() * 6) * 86400000 + Math.floor(rnd() * 20) * 3600000;
        const o = ['ok', 'fail', 'partial', 'ok', 'ok', 'outro'][Math.floor(rnd() * 6)];
        e = updateChallengeReviewEntry(e, id, o, t);
        steps.push(o + ':' + JSON.stringify(e) + ':' + (e ? [challengeReviewDueDay(e), isChallengeReviewDue(e, t), isChallengeReviewDue(e, t + 5 * 86400000)] : ''));
      }
      r.push(steps.join(' '));
    }
    const raws = [null, 5, 'x', {}, { box: 9, lastErrorAt: 1000 }, { box: -2, lastErrorAt: 1000, lastSeenAt: 'a' }, { box: '2.7', lastErrorAt: '5000', lastSeenAt: 7000, id: 'q' }, { lastErrorAt: -1 }, { box: 3, lastErrorAt: NaN }];
    r.push(JSON.stringify(raws.map((x, i) => sanitizeChallengeReviewEntry(x, 'id' + i))));
    const rev = {}; for (let i = 0; i < 20; i++) rev['c' + i] = { id: 'c' + i, lastErrorAt: base - i * 3 * 86400000, lastSeenAt: base - i * 86400000, box: 1 + (i % 4) };
    r.push(JSON.stringify([dueChallengeReviewIds(rev, base), dueChallengeReviewIds(rev, base + 9 * 86400000), dueChallengeReviewIds(null, base), challengeReviewDayNumber(base)]));
    return r.join('\n');
  });
  out.import_parse = await page.evaluate(() => {
    const inputs = ['[]', '[{"id":1}]', '{"accepted":[{"id":"a"}],"rejected":[]}', '{"x":1}', 'não é json', '', 'null', '5'];
    return JSON.stringify(inputs.map(s => { try { return parseChallengesImportInput(s); } catch (e) { return 'ERRO ' + e.message; } }));
  });
  out.extra_puras = await extra();

  // ================= 2. telas do aluno =================
  await page.evaluate(() => switchTab('challenges'));
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'), null, { timeout: 10000 });
  out.categorias = await html('#view-challenges');
  out.categorias_estilo = await page.evaluate(() => [...document.querySelectorAll('.challenge-category-card')].map(c => c.getAttribute('style') + '|' + c.dataset.complete).join(','));
  for (const type of ['expression', 'listen_translate', 'accent', 'cloze_grammar']){
    await page.evaluate((t) => { renderChallengeCategories(); }, type);
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await page.evaluate((t) => document.querySelector('.challenge-category-card[data-category="' + t + '"]').click(), type);
    out['lista_' + type] = await html('#view-challenges');
  }
  // álbum de Expressões: busca, filtros, recolher nível
  await page.evaluate(() => renderChallengesList('expression'));
  for (const q of ['bon', 'ÇA', 'a1', 'zzz', '']){
    await page.evaluate((q) => { const i = document.getElementById('challenges-search'); i.value = q; i.dispatchEvent(new Event('input')); }, q);
    out['album_busca_' + q] = await html('#challenges-level-sections-inner');
  }
  for (const f of ['pending', 'done', 'all']){
    await page.evaluate((f) => document.querySelector('.challenges-filter-chip[data-filter="' + f + '"]').click(), f);
    out['album_filtro_' + f] = await html('#challenges-cards');
  }
  await page.evaluate(() => document.querySelector('.challenges-level-heading').click());
  out.album_recolhido = await html('#challenges-level-sections-inner');
  await page.evaluate(() => document.querySelector('.challenges-level-heading').click());
  await page.evaluate(() => { const b = document.querySelector('.expr-today .expr-play'); if (b) b.click(); const c = document.querySelector('#challenges-level-sections-inner .expr-play'); if (c) c.click(); });
  out.album_audio = await extra();
  await page.evaluate(() => document.querySelector('[data-today-open]').click());
  out.album_hoje_abre = await html('#view-challenges');

  // Players: todos os publicados, pergunta e devolutiva com várias respostas, pelo DOM
  const pubs = await page.evaluate(() => publishedChallenges().map(c => ({ id: c.id, type: c.type })));
  out.expr_ids = pubs.filter(p => p.type === 'expression').map(p => p.id).join();
  for (const { id, type } of pubs){
    await page.evaluate((id) => { window.__seed(4242); openChallengePlayer(id); }, id);
    out['q_' + id] = await html('#challenge-player-content');
    if (type === 'expression'){
      const n = await page.evaluate((id) => CHALLENGES.find(x => x.id === id).options.length, id);
      for (let k = 0; k < n; k++){
        await page.evaluate(([id, k]) => { window.__seed(4242); openChallengePlayer(id); document.getElementById('challenge-expression-play-btn').click(); const sl = document.getElementById('challenge-expression-play-slow-btn'); if (sl) sl.click();
          window.__exprAbrir(); window.__exprOpcoes()[k].click(); }, [id, k]);
        out['fb_' + id + '_' + k] = await html('#challenge-player-content');
        await page.evaluate(() => window.__exprAteFinal());   // fluxo novo: passa pelos passos até a tela final (no antigo já está nela)
        await page.evaluate(() => { ['challenge-example-play-btn', 'challenge-example-play-slow-btn', 'challenge-second-example-play-btn', 'challenge-second-example-play-slow-btn', 'challenge-reveal-answer-btn'].forEach(i => { const b = document.getElementById(i); if (b) b.click(); }); });
        out['fb2_' + id + '_' + k] = await html('#challenge-player-content') + (await extra());
        const last = k === n - 1;
        await page.evaluate((last) => { const c = document.getElementById('challenge-complete-btn'); if (c && last) c.click(); else { const l = document.getElementById('challenge-later-btn'); if (l) l.click(); } }, last);
        out['dep_' + id + '_' + k] = (await html('#view-challenges')).length + (await state());
      }
    } else if (type === 'listen_translate'){
      const answers = await page.evaluate((id) => { const c = CHALLENGES.find(x => x.id === id); const r = c.referenceTranslations || []; const v = window.__ltVariants(r[0] || '', 7); return [v.sem_pontuacao, v.falta, v.negacao, v.pessoa, v.lixo, '', r[1] || r[0], v.flexao, v.digitacao]; }, id);
      for (let k = 0; k < answers.length; k++){
        await page.evaluate(([id, a]) => { openChallengePlayer(id); document.getElementById('lt-play-btn').click(); document.getElementById('lt-play-slow-btn').click(); document.getElementById('lt-hint-btn').click();
          document.getElementById('lt-answer-input').value = a; document.getElementById('lt-verify-btn').click(); }, [id, answers[k]]);
        out['fb_' + id + '_' + k] = await html('#challenge-player-content');
        await page.evaluate(() => { document.getElementById('lt-replay-btn').click(); document.getElementById('lt-replay-slow-btn').click(); });
        out['ex_' + id + '_' + k] = await extra();
        await page.evaluate((k) => { const c = document.getElementById('challenge-complete-btn'); if (c && k % 2) c.click(); else { const r = document.getElementById(k === 4 ? 'challenge-retry-btn' : 'challenge-later-btn'); if (r) r.click(); else if (c) c.click(); } }, k);
        out['dep_' + id + '_' + k] = (await html('#view-challenges')).length + (await state());
      }
    } else if (type === 'accent'){
      const answers = await page.evaluate((id) => { const c = CHALLENGES.find(x => x.id === id); const v = window.__accentVariants(c.targetText, 3); return [v.certa, v.sem_acento, v.outra, '', v.maiusculas]; }, id);
      for (let k = 0; k < answers.length; k++){
        await page.evaluate(([id, a, k]) => { openChallengePlayer(id); document.getElementById('accent-play-btn').click(); document.getElementById('accent-play-slow-btn').click();
          const inp = document.getElementById('accent-answer-input'); const pk = document.querySelector('#challenge-player-content .fr-accent-picker button'); if (pk && k === 1){ inp.focus(); pk.click(); }
          inp.value = a; if (k === 2) inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); else document.getElementById('accent-verify-btn').click(); }, [id, answers[k], k]);
        out['fb_' + id + '_' + k] = await html('#challenge-player-content');
        await page.evaluate(() => { document.getElementById('accent-replay-btn').click(); document.getElementById('accent-replay-slow-btn').click(); });
        out['ex_' + id + '_' + k] = await extra();
        await page.evaluate((k) => { const c = document.getElementById('challenge-complete-btn'); if (c) c.click(); else { const r = document.getElementById(k === 2 ? 'challenge-retry-btn' : 'challenge-later-btn'); if (r) r.click(); } }, k);
        out['dep_' + id + '_' + k] = (await html('#view-challenges')).length + (await state());
      }
    } else if (type === 'cloze_grammar'){
      for (let k = 0; k < 3; k++){
        await page.evaluate(([id, k]) => { window.__seed(99); openChallengePlayer(id); const c = CHALLENGES.find(x => x.id === id);
          if (k === 2){ document.getElementById('cloze-grammar-verify-btn').click(); return; }
          (c.blanks || []).forEach((b, i) => { const want = k === 0 ? b.answer : b.options.find(o => o !== b.answer); const btn = [...document.querySelectorAll('.challenge-choice-btn[data-blank="' + i + '"]')].find(x => x.dataset.value === want); btn.click(); });
          document.getElementById('cloze-grammar-verify-btn').click(); }, [id, k]);
        out['fb_' + id + '_' + k] = await html('#challenge-player-content');
        await page.evaluate((k) => { const c = document.getElementById('challenge-complete-btn'); if (c) c.click(); else { const r = document.getElementById('challenge-later-btn'); if (r) r.click(); } }, k);
        out['dep_' + id + '_' + k] = (await html('#view-challenges')).length + (await state());
      }
    }
  }
  out.extra_players = await extra();
  // Fila por nível (Ouça e traduza e Acentuação): começar, continuar, nível concluído
  for (const type of ['listen_translate', 'accent']){
    await page.evaluate((t) => { renderChallengesList(t); }, type);
    out['fila_' + type] = await html('#challenges-cards');
    await page.evaluate(() => { const b = document.querySelector('#challenges-cards [data-level]'); if (b) b.click(); });
    out['fila_abre_' + type] = await html('#challenge-player-content');
    for (let k = 0; k < 4; k++){
      await page.evaluate((type) => { const id = CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id; const c = CHALLENGES.find(x => x.id === id); if (!c) return;
        if (type === 'accent'){ document.getElementById('accent-answer-input').value = c.targetText; document.getElementById('accent-verify-btn').click(); }
        else { document.getElementById('lt-answer-input').value = c.referenceTranslations[0]; document.getElementById('lt-verify-btn').click(); }
        document.getElementById('challenge-complete-btn').click(); }, type);
      out['fila_' + type + '_' + k] = await html('#challenge-player-content');
      await page.evaluate(() => { const b = document.getElementById('queue-continue-btn') || document.getElementById('queue-back-btn'); if (b) b.click(); });
    }
    // fim do nível: marca todos menos um e conclui o último
    await page.evaluate((type) => { const lvl = CHALLENGES.filter(c => c.type === type && c.status === 'published' && c.level === 'A1'); lvl.slice(0, -1).forEach(c => { STATE.completedChallenges[c.id] = true; });
      challengeQueueContext = { type, level: 'A1' }; openChallengePlayer(lvl[lvl.length - 1].id); const c = lvl[lvl.length - 1];
      if (type === 'accent'){ document.getElementById('accent-answer-input').value = c.targetText; document.getElementById('accent-verify-btn').click(); }
      else { document.getElementById('lt-answer-input').value = c.referenceTranslations[0]; document.getElementById('lt-verify-btn').click(); }
      document.getElementById('challenge-complete-btn').click(); }, type);
    out['fila_fim_' + type] = await html('#challenge-player-content');
    await click('#queue-back-btn');
    out['fila_volta_' + type] = await html('#challenges-cards');
    await click('#challenge-back-to-list');
  }
  // Voltar da lista e do player
  await page.evaluate(() => { renderChallengesList('accent'); });
  await click('#challenges-list-back-btn');
  out.voltar_categorias = await page.evaluate(() => document.getElementById('challenges-categories-wrap').style.display + document.getElementById('challenges-list-wrap').style.display);
  // Revisão dos erros: devidos hoje
  await page.evaluate(() => { const base = Date.now(); const ids = publishedChallenges().filter(c => c.type !== 'expression').slice(0, 3).map(c => c.id).concat([publishedChallenges().find(c => c.type === 'expression').id, 'nao-existe']);
    ids.forEach((id, i) => { STATE.challengeReviews[id] = { id, lastErrorAt: base - (10 + i) * 86400000, lastSeenAt: base - (5 + i) * 86400000, box: 1 }; }); renderChallengeCategories(); });
  await page.waitForFunction(() => document.getElementById('challenges-review-card'));
  out.revisao_card = await html('#challenges-categories');
  await click('#challenges-review-card');
  for (let k = 0; k < 6; k++){
    out['revisao_' + k] = await html('#challenge-player-content');
    const done = await page.evaluate(() => { const id = CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id; const c = CHALLENGES.find(x => x.id === id); if (!c || document.getElementById('review-queue-back-btn')) return true;
      if (c.type === 'accent'){ document.getElementById('accent-answer-input').value = c.targetText; document.getElementById('accent-verify-btn').click(); }
      else if (c.type === 'listen_translate'){ document.getElementById('lt-answer-input').value = c.referenceTranslations[0]; document.getElementById('lt-verify-btn').click(); }
      else if (c.type === 'cloze_grammar'){ (c.blanks || []).forEach((b, i) => { [...document.querySelectorAll('.challenge-choice-btn[data-blank="' + i + '"]')].find(x => x.dataset.value === b.answer).click(); }); document.getElementById('cloze-grammar-verify-btn').click(); }
      else { window.__exprAbrir(); window.__exprOpcoes().find(x => window.__exprTexto(x) === c.correctAnswer).click(); window.__exprAteFinal(); }
      document.getElementById('challenge-complete-btn').click(); return false; });
    if (done) break;
  }
  out.revisao_fim = await html('#challenge-player-content') + (await state());
  await page.evaluate(() => { const b = document.getElementById('review-queue-back-btn'); if (b) b.click(); });
  out.revisao_volta = await html('#challenges-categories');
  // revisão: "Tentar mais tarde" volta às categorias
  await page.evaluate(() => { const c = publishedChallenges().find(x => x.type === 'accent'); STATE.challengeReviews[c.id] = { id: c.id, lastErrorAt: Date.now() - 9 * 86400000, lastSeenAt: Date.now() - 9 * 86400000, box: 2 }; openChallengeReviewQueue(); document.getElementById('accent-answer-input').value = 'zzz'; document.getElementById('accent-verify-btn').click(); document.getElementById('challenge-later-btn').click(); });
  out.revisao_depois = await page.evaluate(() => document.getElementById('challenges-categories-wrap').style.display + '|' + challengeReviewQueueActive + '|' + JSON.stringify(STATE.challengeReviews));
  await page.evaluate(() => { challengeReviewQueueActive = true; backToChallengesListOrCategories(); });
  out.revisao_voltar_lista = await page.evaluate(() => String(challengeReviewQueueActive) + document.getElementById('challenges-categories-wrap').style.display);
  await page.evaluate(() => { STATE.challengeReviews = {}; openChallengeReviewQueue(); });
  out.revisao_vazia = await page.evaluate(() => String(challengeReviewQueueActive));
  // Desafios do Módulo (vindo da trilha) e o cartão Ditados
  for (const m of ['A1-m1', 'A1-m3', 'A1-m6']){
    await page.evaluate((m) => { openModuleChallenges(m); }, m);
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    out['modulo_' + m] = await html('#view-challenges');
  }
  await page.evaluate(() => { document.querySelector('.challenge-category-card[data-category]').click(); });
  out.modulo_lista = await html('#challenges-list-wrap');
  await click('#challenges-list-back-btn');
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  await page.evaluate(() => { const d = document.getElementById('challenges-dictation-card'); if (d) d.click(); });
  out.modulo_ditados = await page.evaluate(() => [document.querySelector('.view.active').id, String(dictationModuleFilter), String(pendingChallengesModuleFilter), String(challengesModuleFilter)].join('|'));
  await page.evaluate(() => switchTab('challenges'));
  await page.evaluate(() => { openModuleChallenges('A1-m2'); });
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  await click('#challenges-module-back');
  out.modulo_volta = await page.evaluate(() => [document.querySelector('.view.active').id, String(challengesModuleFilter)].join('|'));
  // Linha "Desafios do Módulo N" na trilha
  await page.evaluate(() => { STATE.currentLevel = 'A1'; switchTab('path'); });
  await page.waitForFunction(() => document.querySelectorAll('.module-challenges-slot .unit-block').length > 0, null, { timeout: 10000 }).catch(() => {});
  out.trilha = await page.evaluate(() => [...document.querySelectorAll('.module-challenges-slot')].map(s => s.dataset.moduleId + ':' + s.innerHTML).join('\n'));
  out.trilha_linhas = await page.evaluate(() => (typeof MODULES !== 'undefined' ? MODULES : []).map(m => { const r = buildModuleChallengesRow(m); return m.id + ':' + (r ? r.outerHTML : 'null'); }).join('\n'));
  await page.evaluate(() => { const h = document.querySelector('.module-challenges-slot .ub-header'); if (h) h.click(); });
  out.trilha_clique = await page.evaluate(() => [document.querySelector('.view.active').id, String(challengesModuleFilter)].join('|'));
  // janela Premium
  await page.evaluate(() => openPremiumChallengesModal());
  out.premium = await page.evaluate(() => document.getElementById('premium-challenges-modal').outerHTML);
  await click('#premium-challenges-modal-close');
  await page.evaluate(() => { openPremiumChallengesModal(); document.getElementById('premium-challenges-modal').click(); });
  out.premium_fecha = await page.evaluate(() => document.getElementById('premium-challenges-modal').style.display);
  // HTML puros das telas
  out.html_puros = await page.evaluate(() => JSON.stringify([challengeProgressHTML(0, 0), challengeProgressHTML(3, 7), challengeProgressHTML(1, 1), tierBadgeHTML('premium'), tierBadgeHTML('free'),
    challengeFeedbackWrapperHTML('x', true, '✅ Oi', '<b/>'), challengeFeedbackWrapperHTML('x', false, '❌ Não', 'b', 'partial'), challengeFeedbackWrapperHTML('y', false, '⚠️ a', 'b'),
    challengeRetryButtonsHTML(), challengeCompleteButtonHTML(), slowAudioBtnHTML('a'), slowAudioIconBtnHTML('b'),
    expressionMeaningLineHTML('ch.expr.signifies', 'fr', 'Bom fim de semana!'), expressionMeaningLineHTML('ch.expr.inPt', 'pt', 'Tchau.'), expressionMeaningLineHTML('ch.expr.inPt', 'pt', 'Será...'), expressionMeaningLineHTML('ch.expr.inPt', 'pt', null),
    challengeResourceCardHTML({ url: 'https://x"y', type: 'article', title: 't' }), challengeExternalResourcesHTML({ externalResources: [{ approved: false }, { url: 'u', type: 'zz', sourceName: 's', buttonLabel: 'b' }] }), challengeExternalResourcesHTML({}),
    publishedChallenges().map(c => challengeCardHTML(c) + challengeCardLabelHTML(c) + expressionRegisterChipHTML(c) + expressionAudioBtnHTML(c, 'k')).join(''),
    expressionTodayHTML([]), escapeHtmlChallenge(`<a href="x">'&'</a>`), challengeSearchHaystack(publishedChallenges()[0])]));
  // carregamento com falha e "Tentar de novo"
  await page.evaluate(() => { window.__selectFail = true; challengesLoadedAt = 0; renderChallengeCategories(); });
  await page.waitForFunction(() => document.getElementById('challenges-retry-btn'));
  out.falha = await html('#challenges-categories');
  await page.evaluate(() => { window.__selectFail = false; document.getElementById('challenges-retry-btn').click(); });
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  out.falha_volta = await html('#challenges-categories');
  out.estado_alunos = await state();
  out.extra_telas = await extra();

  // ================= 3. admin =================
  await page.evaluate(() => { CURRENT_USER = { id: 'u-admin', email: 'brunemed1310@gmail.com' }; challengesLoadedAt = 0; switchTab('challenges'); });
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  out.adm_categorias = await html('#challenges-categories-wrap');
  await click('#challenges-admin-review-btn');
  await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
  out.adm_lista = await html('#challenges-admin-content');
  const typeVals = ['expression', 'listen_translate', 'accent', 'cloze_grammar', 'all'];
  for (const tv of typeVals){
    await page.evaluate((v) => { const s = document.getElementById('challenges-admin-filter-type'); s.value = v; s.dispatchEvent(new Event('change')); }, tv);
    out['adm_tipo_' + tv] = await html('#challenges-admin-content');
  }
  for (const lv of ['A2', 'A1', 'all']){
    await page.evaluate((v) => { const s = document.getElementById('challenges-admin-filter-level'); s.value = v; s.dispatchEvent(new Event('change')); }, lv);
    out['adm_nivel_' + lv] = (await html('#challenges-admin-content')).length;
  }
  for (const q of ['bon', 'zzzz', 'ÇA', '']){
    await page.evaluate((q) => { const s = document.getElementById('challenges-admin-search'); s.value = q; s.dispatchEvent(new Event('input')); }, q);
    out['adm_busca_' + q] = await html('#challenges-admin-content');
  }
  await page.evaluate(() => { document.querySelectorAll('.challenges-admin-load-more').forEach(b => b.click()); });
  out.adm_mais = (await html('#challenges-admin-content')).length;
  // seleção e lote
  await page.evaluate(() => { const cbs = document.querySelectorAll('.challenges-admin-select-checkbox'); cbs[0].checked = true; cbs[0].dispatchEvent(new Event('change')); });
  out.adm_sel1 = await page.evaluate(() => document.querySelector('.challenges-admin-bulk-toolbar').innerHTML);
  await page.evaluate(() => { const a = document.getElementById('challenges-admin-select-all'); a.checked = true; a.dispatchEvent(new Event('change')); });
  out.adm_sel_todos = await page.evaluate(() => document.querySelector('.challenges-admin-bulk-toolbar').innerHTML);
  await page.evaluate(() => { const a = document.getElementById('challenges-admin-select-all'); a.checked = false; a.dispatchEvent(new Event('change')); });
  await page.evaluate(() => { const cbs = document.querySelectorAll('.challenges-admin-select-checkbox'); [0, 1, 2, 3, 4].forEach(i => { if (cbs[i]){ cbs[i].checked = true; cbs[i].dispatchEvent(new Event('change')); } }); });
  await page.evaluate(() => { window.__confirmAnswer = false; document.getElementById('challenges-admin-bulk-approve-btn').click(); });
  await page.evaluate(() => { window.__confirmAnswer = true; document.getElementById('challenges-admin-bulk-approve-btn').click(); });
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
  out.adm_lote = await html('#challenges-admin-content') + (await extra());
  // ações por cartão: aprovar (com e sem aviso), rejeitar, editar e salvar cada tipo, recursos, despublicar
  for (let i = 0; i < 20; i++){ const more = await page.evaluate(() => { const b = document.querySelector('.challenges-admin-load-more'); if (b) b.click(); return !!b; }); if (!more) break; }
  const cardIds = await page.evaluate(() => [...document.querySelectorAll('.challenges-admin-card')].map(c => c.dataset.challengeId));
  const pend = await page.evaluate(() => pendingChallenges().map(c => c.id + ':' + c.type));
  const byType = {};
  pend.forEach(s => { const [id, t] = s.split(':'); if (cardIds.includes(id)) (byType[t] = byType[t] || []).push(id); });
  out.adm_ids = JSON.stringify([cardIds, pend]);
  const act = async (id, action, before) => {
    await page.evaluate(([id, action, before]) => { if (before) eval(before); const card = document.querySelector('.challenges-admin-card[data-challenge-id="' + id + '"]'); if (!card) return; const b = card.querySelector('[data-action="' + action + '"]'); if (b) b.click(); }, [id, action, before || '']);
    await page.waitForTimeout(80);
    await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters') || document.getElementById('challenge-preview-banner').style.display === 'flex', null, { timeout: 5000 }).catch(() => {});
  };
  for (const t of Object.keys(byType)){
    const ids = byType[t];
    // editar e salvar
    await act(ids[0], 'edit');
    out['adm_edit_' + t] = await page.evaluate((id) => document.querySelector('.challenges-admin-card[data-challenge-id="' + id + '"]').innerHTML, ids[0]);
    await page.evaluate((id) => { const card = document.querySelector('.challenges-admin-card[data-challenge-id="' + id + '"]'); card.querySelectorAll('[data-field]').forEach((inp, i) => {
      const f = inp.dataset.field; if (f === 'options') inp.value = 'um\n*dois\n três \n\nquatro'; else if (f === 'blanks') inp.value = 'a | *b\n *c|d | e'; else if (f === 'referenceTranslations') inp.value = 'Oi.\n\n Olá! '; else inp.value = inp.value + ' (editado ' + i + ')'; }); }, ids[0]);
    await act(ids[0], 'save');
    out['adm_salvo_' + t] = await page.evaluate((id) => JSON.stringify(CHALLENGES.find(c => c.id === id)), ids[0]) + (await extra());
    await act(ids[1] || ids[0], 'edit');
    await act(ids[1] || ids[0], 'cancel-edit');
    // aprovar: com aviso recusado, com aviso aceito
    await act(ids[1] || ids[0], 'approve', 'window.__confirmAnswer = false');
    await act(ids[1] || ids[0], 'approve', 'window.__confirmAnswer = true');
    out['adm_aprova_' + t] = (await html('#challenges-admin-content')) + (await extra());
    if (ids[2]){ await act(ids[2], 'reject'); out['adm_rejeita_' + t] = (await html('#challenges-admin-content')).length + (await extra()); }
  }
  // recurso externo: rejeitar e aprovar de novo
  await page.evaluate(() => { const r = document.querySelector('.challenges-admin-resource [data-resource-action="reject"]'); if (r) r.click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { const r = document.querySelector('.challenges-admin-resource [data-resource-action="approve"]'); if (r) r.click(); });
  await page.waitForTimeout(150);
  out.adm_recurso = await extra();
  // publicados: editar/salvar, despublicar (cancelado e confirmado), prévia
  const pubIds = await page.evaluate(() => publishedChallenges().slice(0, 3).map(c => c.id));
  await act(pubIds[0], 'edit');
  out.adm_pub_edit = await page.evaluate((id) => document.querySelector('.challenges-admin-card[data-challenge-id="' + id + '"]').innerHTML, pubIds[0]);
  await act(pubIds[0], 'save');
  out.adm_pub_salvo = await extra();
  await act(pubIds[1], 'unpublish', 'window.__confirmAnswer = false');
  await act(pubIds[1], 'unpublish', 'window.__confirmAnswer = true');
  out.adm_despub = (await html('#challenges-admin-content')).length + (await extra());
  // prévia de cada tipo: banner, "mostrar resposta", voltar para editar, aprovar, voltar pela seta
  for (const t of Object.keys(byType)){
    const id = await page.evaluate((t) => { const c = pendingChallenges().find(x => x.type === t); return c && c.id; }, t);
    if (!id) continue;
    await act(id, 'preview');
    out['adm_previa_' + t] = await html('#challenge-player-wrap');
    await page.evaluate(() => { const b = document.getElementById('preview-show-answer-btn'); if (b) b.click(); });
    await page.evaluate(() => document.getElementById('preview-back-to-edit-btn').click());
    await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
    out['adm_previa_volta_' + t] = (await html('#challenges-admin-content')).length + (await extra());
    await act(id, 'cancel-edit');
    await act(id, 'preview');
    await page.evaluate(() => { window.__confirmAnswer = true; document.getElementById('preview-approve-btn').click(); });
    await page.waitForTimeout(200);
    out['adm_previa_aprova_' + t] = (await html('#challenges-admin-wrap')).length + (await extra());
  }
  const pid = await page.evaluate(() => publishedChallenges()[0].id);
  await act(pid, 'preview');
  await click('#challenge-back-to-list');
  await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
  out.adm_previa_seta = await page.evaluate(() => [document.getElementById('challenge-preview-banner').style.display, String(challengePreviewMode), document.getElementById('challenges-admin-wrap').style.display].join('|'));
  // importação
  await click('#challenges-admin-back-btn');
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  await click('#challenges-admin-import-btn');
  out.imp_aberta = await page.evaluate(() => document.getElementById('challenges-import-modal').outerHTML);
  const imports = await page.evaluate(() => window.__importInputs);
  for (let i = 0; i < imports.length; i++){
    await page.evaluate(([txt, fail]) => { window.__dbFail = fail; document.getElementById('challenges-import-textarea').value = txt; document.getElementById('challenges-import-submit-btn').click(); }, [imports[i], i === imports.length - 1]);
    await page.waitForFunction(() => !document.getElementById('challenges-import-submit-btn').disabled);
    await page.waitForTimeout(150);
    out['imp_' + i] = await page.evaluate(() => document.getElementById('challenges-import-status').outerHTML + '|' + document.getElementById('challenges-import-textarea').value.length) + (await extra());
  }
  await page.evaluate(() => { window.__dbFail = false; });
  await page.evaluate(() => { const t = document.getElementById('challenges-import-textarea'); t.value = window.__importInputs[3]; document.getElementById('challenges-import-submit-btn').click(); });
  await page.waitForTimeout(400);
  out.imp_ok_depois = await page.evaluate(() => document.getElementById('challenges-import-status').outerHTML) + (await extra());
  await click('#challenges-import-modal-close');
  await click('#challenges-admin-import-btn');
  await page.evaluate(() => document.getElementById('challenges-import-modal').click());
  out.imp_fecha = await page.evaluate(() => document.getElementById('challenges-import-modal').style.display + '|' + document.getElementById('challenges-import-status').className);
  out.adm_puros = await page.evaluate(() => JSON.stringify(CHALLENGES.map(c => [c.id, challengeQualityChecklist(c), challengeAdminCardTitle(c), challengeAudioFields(c), challengeSearchableText(c)]).concat([
    md5Hex(''), md5Hex('Bonjour, ça va ?'), md5Hex('a'.repeat(200)), challengeAudioIsFresh('x', null), challengeAudioIsFresh('Enchanté !', 'b7da9c0935be.mp3')])));
  out.adm_views = await page.evaluate(() => CHALLENGES.map(c => challengeAdminReadView(c) + challengeAdminEditView(c) + challengeAdminPendingCardHTML(c) + challengeAdminPublishedCardHTML(c)).join('\n'));
  // admin sai: barra some
  await page.evaluate(() => { CURRENT_USER = false; renderChallengeCategories(); renderChallengesAdmin(); });
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  out.adm_sai = await page.evaluate(() => document.getElementById('challenges-admin-bar').style.display);
  out.estado_final = await state();
  out.extra_final = await extra();
  out.erros = errors;
  await ctx.close();
  server.close();
  return out;
}

// Site em inglês (outra carga da página com ui-language = en)
// M3 da revisão do código compartilhado (2026-10-26, mudança deliberada): no site em inglês, desafio publicado sem a
// tradução em fr/challenges.en.js deixou de aparecer. Para continuar comparando o resto (telas, devolutivas, trilha) com o
// fr de antes, a carga em inglês só publica os desafios que têm tradução; o sumiço dos outros é provado em
// tests/desafios-idioma-site/test_playwright.js.
function rowsComTraducaoEn(){
  const sandbox = { window: {} };
  require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'fr/challenges.en.js'), 'utf8'), sandbox);
  const ov = sandbox.window.CHALLENGES_I18N.en;
  // mesma regra de CHALLENGE_SITE_LANG_FIELDS (shared/desafios.js), reescrita aqui de propósito (o teste não confia no código testado)
  const tem = (o, f) => Array.isArray(o[f]) ? o[f].length > 0 : !!String(o[f] || '').trim();
  const precisa = (r) => { const d = r.data, e = String(d.explanation || '').trim();
    return { expression: [d.meaning && d.meaning.pt && 'meaning'], listen_translate: ['referenceTranslations', e && 'explanation'],
      accent: [e && 'explanation'], cloze_grammar: [d.translationPt && 'translation', 'explanation'] }[r.type].filter(Boolean); };
  return H.challengeRows().filter(r => r.status !== 'published' || (ov[r.id] && precisa(r).every(f => tem(ov[r.id], f))));
}
async function fingerprintEn(browser, root){
  const { page, ctx, server, errors } = await H.boot(browser, root, { lang: 'en', rows: rowsComTraducaoEn() });
  const out = {};
  // a duração dos mp3 no checklist do admin chega quando o áudio carrega (momento variável): fica de fora
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const c = e.cloneNode(true); c.querySelectorAll('.challenges-admin-audio-duration').forEach(x => { x.textContent = ''; }); return c.innerHTML; }, sel).then(v => (typeof v === 'string' ? v.replace(VERIFICAR_RE, '>VERIFICAR</button>') : v));
  await page.evaluate(() => switchTab('challenges'));
  await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
  out.categorias = await html('#view-challenges');
  out.textos_dom = await page.evaluate(() => [...document.querySelectorAll('[data-ch-i18n]')].map(e => e.dataset.chI18n + '=' + e.innerHTML).join('\n'));
  for (const type of ['expression', 'listen_translate', 'accent', 'cloze_grammar']){
    await page.evaluate((t) => renderChallengesList(t), type);
    out['lista_' + type] = await html('#view-challenges');
  }
  const pubs = await page.evaluate(() => publishedChallenges().map(c => ({ id: c.id, type: c.type })));
  for (const { id, type } of pubs.filter((_, i) => i % 3 === 0)){
    await page.evaluate((id) => { window.__seed(4242); openChallengePlayer(id); }, id);
    out['q_' + id] = await html('#challenge-player-content');
    await page.evaluate((id) => { const c = CHALLENGES.find(x => x.id === id);
      if (c.type === 'expression'){ window.__exprAbrir(); window.__exprOpcoes()[0].click(); }
      else if (c.type === 'listen_translate'){ const ov = (window.CHALLENGES_I18N.en || {})[c.id]; document.getElementById('lt-answer-input').value = ov && ov.referenceTranslations ? ov.referenceTranslations[0] : 'I like it'; document.getElementById('lt-verify-btn').click(); }
      else if (c.type === 'accent'){ document.getElementById('accent-answer-input').value = c.targetText.normalize('NFD').replace(/[̀-ͯ]/g, ''); document.getElementById('accent-verify-btn').click(); }
      else { document.getElementById('cloze-grammar-verify-btn').click(); (c.blanks || []).forEach((b, i) => { [...document.querySelectorAll('.challenge-choice-btn[data-blank="' + i + '"]')].find(x => x.dataset.value !== b.answer).click(); }); document.getElementById('cloze-grammar-verify-btn').click(); } }, id);
    out['fb_' + id] = await html('#challenge-player-content');
  }
  await page.evaluate(() => openPremiumChallengesModal());
  out.premium = await page.evaluate(() => document.getElementById('premium-challenges-modal').innerHTML);
  await page.evaluate(() => { STATE.currentLevel = 'A1'; switchTab('path'); });
  await page.waitForFunction(() => document.querySelectorAll('.module-challenges-slot .unit-block').length > 0, null, { timeout: 10000 }).catch(() => {});
  out.trilha = await page.evaluate(() => [...document.querySelectorAll('.module-challenges-slot')].map(s => s.innerHTML).join('\n'));
  out.erros = errors;
  await ctx.close();
  server.close();
  return out;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5c-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    // todas as chaves de texto dos Desafios (do fr/app.js de REF)
    const refApp = fs.readFileSync(path.join(wt, 'fr/app.js'), 'utf8');
    const keys = [...new Set((refApp.match(/^ {4}'((?:ch|tier|prem|dict)\.[^']+)':/gm) || []).map(s => s.trim().slice(1, -2)))].concat(['nao.existe']);
    const run = async (r) => ({ pt: await fingerprint(browser, r, keys), en: await fingerprintEn(browser, r) });
    const antes = await run(wt);
    const depois = await run(ROOT);
    check('chaves de texto encontradas', keys.length > 100, keys.length);
    let iguais = 0, total = 0;
    // published_at/rejected_at... = new Date().toISOString() (relógio fixo, mas por garantia)
    const norm = (v) => JSON.stringify(v).replace(/127\.0\.0\.1:\d+/g, 'HOST').replace(/ch\.verify=(Vérifier|Verificar|Check)/g, 'ch.verify=VERIFICAR').replace(/\\"(Vérifier|Verificar|Check)\\"/g, '\\"VERIFICAR\\"').replace(VERIFICAR_RE, '>VERIFICAR</button>');
    for (const lado of ['pt', 'en']){
      const A = antes[lado], B = depois[lado];
      check(lado + ': a sequência rodou no fr de antes', Object.keys(A).length > (lado === 'pt' ? 900 : 30), Object.keys(A).length);
      check(lado + ': fr de antes sem erro de página', A.erros.length === 0, A.erros);
      check(lado + ': fr de agora sem erro de página', B.erros.length === 0, B.erros);
      check(lado + ': mesmas cenas', JSON.stringify(Object.keys(A)) === JSON.stringify(Object.keys(B)), [Object.keys(A).length, Object.keys(B).length, Object.keys(A).filter(k => !(k in B)).slice(0, 5), Object.keys(B).filter(k => !(k in A)).slice(0, 5)]);
      for (const k of Object.keys(A)){
        if (k === 'erros') continue;
        if (k === 'lt' && A.lt && typeof A.lt === 'object'){
          for (const id of Object.keys(A.lt)){ total++; if (A.lt[id] === (B.lt || {})[id]){ iguais++; passed++; } else check('Ouça e traduza igual: ' + id, false); }
          continue;
        }
        total++;
        let a = norm(A[k]), b = norm(B[k]);
        // Expressões em passos (2026-10-26, docs/historico/23-auditoria-telas-de-exercicio.md): a pergunta e a devolutiva das Expressões mudaram
        // DE PROPÓSITO (palpite + opções numeradas + passos). Cena do player de Expressão (antes: desfoque/devolutiva única; agora: expr-wrap)
        // não se compara; o resto, sim. "dep_" de Expressão compara só o estado (o tamanho do HTML leva o player junto).
        if (/challenge-hypothesis|challenge-feedback-meaning|challenge-microactivity/.test(a) && /expr-wrap|expr-panel|expr-final/.test(b)){ iguais++; passed++; continue; }
        const idDep = (k.match(/^dep_(.+)_\d+$/) || [])[1];
        if (idDep && String(A.expr_ids || '').split(',').includes(idDep)){ a = a.replace(/^"\d+/, '"'); b = b.replace(/^"\d+/, '"'); }
        if (a === b){ iguais++; passed++; continue; }
        let i = 0; while (i < a.length && a[i] === b[i]) i++;
        check('igual ao fr de antes (' + lado + '): ' + k, false, { antes: a.slice(Math.max(0, i - 200), i + 250), depois: (b || '').slice(Math.max(0, i - 200), i + 250) });
      }
    }
    // sanidade: as cenas mostram o que deviam
    const P = depois.pt;
    const nLt = Object.values(P.lt).reduce((n, s) => n + s.split('\n').length, 0);
    const fbs = Object.keys(P).filter(k => k.startsWith('fb_')).map(k => P[k]).join('\n');
    check('Ouça e traduza: 3 resultados (ok, quase, errado)', ['"ok"', '"partial"', '"fail"'].every(x => Object.values(P.lt).join('').includes(x)));
    check('devolutivas certa, quase e errada renderizadas', ['feedback correct', 'feedback partial', 'feedback incorrect', 'tw-bad', 'tw-near', 'tw-miss', 'challenge-retry-btn', 'challenge-complete-btn'].every(x => fbs.includes(x)), ['feedback correct', 'feedback partial', 'feedback incorrect', 'tw-bad', 'tw-near', 'tw-miss', 'challenge-retry-btn', 'challenge-complete-btn'].filter(x => !fbs.includes(x)));
    check('acentuação: ok, partial e fail', ['"ok"', '"partial"', '"fail"'].every(x => P.acento.includes(x)));
    check('estado: desafios concluídos e revisões gravados', Object.keys(JSON.parse(P.estado_final).done).length > 50, Object.keys(JSON.parse(P.estado_final).done).length);
    check('admin gravou no banco (update e insert)', /"op":"update"/.test(P.adm_lote + P.adm_aprova_expression) && /"op":"insert"/.test(Object.keys(P).filter(k => k.startsWith('imp_')).map(k => P[k]).join('')));
    check('trilha com a linha Desafios do Módulo', /module-challenges/.test(P.trilha));
    console.log(`  cenas iguais ao fr de antes: ${iguais}/${total} (Ouça e traduza: ${nLt} respostas em ${Object.keys(P.lt).length} desafios; ${Object.keys(P).filter(k => k.startsWith('fb_')).length} devolutivas pelo DOM)`);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`Desafios (fr antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
