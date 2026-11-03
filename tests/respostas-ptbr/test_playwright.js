// Regra da dona (2026-10-26, ampliada em 2026-10-29): resposta em português de PORTUGAL não é "certa", é "Quase", e a
// devolutiva mostra a forma do Brasil, em QUALQUER exercício com resposta escrita em português. Código comum:
// shared/core/familias/portugues-variantes.js (PortuguesVariantes) + typedPtBrAdjust/typedPtBrNoteHTML
// (shared/core/licao-feedback.js), ligados pelo gancho LANG_HOOKS.typedAnswerLang = 'pt-BR'.
//
// Provas (página REAL do fr e do zh, só a rede stubada):
//  1. site de mentira 'pt' (a página do fr com LANG_HOOKS de português: typedAnswerLang 'pt-BR' e o veredito da família
//     latina com a configuração do português): "Digite o que ouviu", lacuna digitada, gramática, Revisão (Digite a
//     resposta, também usada pelos cartões do Banco) e Conjugação. "estou a comer" -> Quase (XP EXERCISE_XP_ALMOST, nota
//     Difícil, meio ponto) com "No Brasil se diz: estou comendo"; "estou comendo" -> certo, sem aviso.
//  2. fr e zh sem mudança: sem o gancho, typedVerdictPtBr = LANG_HOOKS.typedAnswer.verdict e reviewTypedCheckPtBr =
//     LANG_HOOKS.reviewTyped.check em todo o vocabulário/frases do content.js (com erros gerados), e "estou a comer" no fr
//     continua errado, sem aviso de Portugal.
//  3. todo site carrega shared/core/familias/portugues-variantes.js.
// Rodar: node tests/respostas-ptbr/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600) : ''); } };

// ---- 3. todo site carrega o módulo comum
const sites = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'index.html')) && fs.existsSync(path.join(ROOT, d, 'lang-hooks.js')));
check(`sites descobertos (${sites.join(', ')})`, sites.includes('fr') && sites.includes('zh'));
for (const s of sites){
  const html = read(s + '/index.html');
  const iPv = html.indexOf('../shared/core/familias/portugues-variantes.js'), iFb = html.indexOf('../shared/core/licao-feedback.js');
  const iDes = html.indexOf('../shared/desafios.js');
  check(`${s}: carrega portugues-variantes.js antes de licao-feedback.js${iDes > 0 ? ' e de desafios.js' : ''}`, iPv > 0 && iPv < iFb && (iDes < 0 || iPv < iDes));
}

async function abrir(browser, site){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e) + (process.env.DBG ? e.stack : '')));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${server.address().port}/${site}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  return { ctx, page, errs };
}

// Monta um exercício de lição num <div> solto e responde; devolve { html, xp, score }.
async function responderLicao(page, tipo, alvo, typed){
  return page.evaluate(async ({ tipo, alvo, typed }) => {
    const xp = []; window.addXP = (n) => xp.push(n);
    window.registerExerciseCorrect = () => {}; window.addStudyMinutes = () => {}; window.playFeedbackSound = () => {};
    window.getClozeMode = () => 'type';
    if (typeof UNITS !== 'undefined' && UNITS.length && !STATE.currentUnitId) STATE.currentUnitId = UNITS[0].id; // painel de erro procura a frase na unidade
    STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseScore = 0; STEP_STATE.exerciseIndex = 0; STEP_STATE.comboCount = 0; STEP_STATE.lessonReview = null;
    const box = document.createElement('div'); box.className = 'ptbr-test'; document.body.appendChild(box);
    const next = document.createElement('button'); box.appendChild(next);
    const content = document.createElement('div'); box.appendChild(content);
    if (tipo === 'type'){
      renderVocabTypeExercise({ format: 'vocab-type', item: { f: alvo, t: 'I am eating' } }, content, next, 1);
      document.getElementById('vocab-type-input').value = typed;
      document.getElementById('vocab-type-verify-btn').click();
    } else {
      const blocks = [{ f: 'Eu', t: 'I' }, { f: alvo, t: 'am eating' }, { f: 'agora.', t: 'now.' }];
      renderClozeExercise({ format: 'cloze', phrase: { f: 'Eu ' + alvo + ' agora.', t: 'I am eating now.', blocks }, blankIdx: 1, correctBlock: blocks[1], options: [blocks[1]] }, content, next, 1);
      document.getElementById('cloze-input').value = typed;
      document.getElementById('cloze-verify-btn').click();
    }
    await new Promise(r => setTimeout(r, 700));
    const out = { html: content.innerHTML, xp, score: STEP_STATE.exerciseScore };
    box.remove();
    return out;
  }, { tipo, alvo, typed });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---- 1. site de mentira 'pt'
  {
    const { ctx, page, errs } = await abrir(browser, 'fr');
    await page.addScriptTag({ url: '/shared/core/familias/latina-idiomas.js' });
    const consts = await page.evaluate(() => {
      const pt = FamiliaLatina.criar(FamiliaLatinaIdiomas.pt);
      LANG_HOOKS.typedAnswerLang = 'pt-BR';
      LANG_HOOKS.typedAnswer.verdict = (given, x) => { const r = pt.avaliarRespostaDigitada(given, x.f); return { ok: r !== 'errou', almost: r === 'quase', toneOnly: false }; };
      LANG_HOOKS.grammarAnswerVerdict = (given, forms) => pt.avaliarComSeparadores(given, forms);
      return { ALMOST: EXERCISE_XP_ALMOST, PRODUCE: EXERCISE_XP_PRODUCE };
    });
    const P = (n, c, x) => check('pt de mentira: ' + n, c, x);
    for (const tipo of ['type', 'cloze']){
      const nome = tipo === 'type' ? '"Digite o que ouviu"' : 'lacuna digitada';
      const pt = await responderLicao(page, tipo, 'estou comendo', 'estou a comer');
      P(`${nome}: "estou a comer" -> Quase (meio ponto, XP EXERCISE_XP_ALMOST = ${consts.ALMOST})`, pt.score === 0.5 && JSON.stringify(pt.xp) === JSON.stringify([consts.ALMOST]), pt);
      P(`${nome}: devolutiva com a forma do Brasil`, pt.html.includes('Quase! Essa forma é de Portugal.') && pt.html.includes('No Brasil se diz: <strong>estou comendo</strong> (em vez de "estou a comer").'), pt.html);
      const br = await responderLicao(page, tipo, 'estou comendo', 'estou comendo');
      P(`${nome}: "estou comendo" -> certo (1 ponto, XP EXERCISE_XP_PRODUCE = ${consts.PRODUCE}), sem aviso`, br.score === 1 && JSON.stringify(br.xp) === JSON.stringify([consts.PRODUCE]) && !br.html.includes('Portugal'), br);
      const err = await responderLicao(page, tipo, 'estou comendo', 'estou a dormir');
      P(`${nome}: forma de Portugal de OUTRA frase ("estou a dormir") continua errada`, err.score === 0 && err.xp.length === 0 && !err.html.includes('No Brasil'), err);
      const ac = await responderLicao(page, tipo, 'estou comendo', 'estóu comendo');
      P(`${nome}: o Quase de acento do pt continua igual (sem aviso de Portugal)`, ac.score === 0.5 && !ac.html.includes('Portugal'), ac);
    }
    // gramática
    const gram = await page.evaluate(async () => {
      window.renderStepProgress = () => {}; window.playFeedbackSound = () => {};
      const res = [];
      for (const typed of ['estou a comer', 'estou comendo', 'eu durmo']){
        STEP_STATE.gramExerciseIndex = 0; STEP_STATE.gramExerciseScore = 0;
        const content = document.createElement('div'); document.body.appendChild(content);
        const next = document.createElement('button');
        renderGrammarExerciseStep({ grammar: { exercises: [{ prompt: 'Eu ___ (comer, agora)', answer: 'estou comendo' }] } }, content, next);
        document.getElementById('gram-exercise-input').value = typed;
        document.getElementById('gram-exercise-verify-btn').click();
        res.push({ typed, cls: content.querySelector('.gram-exercise').className, score: STEP_STATE.gramExerciseScore, html: content.innerHTML });
        content.remove();
      }
      return res;
    });
    P('gramática: "estou a comer" -> Quase (meio ponto) com a forma do Brasil', /almost/.test(gram[0].cls) && gram[0].score === 0.5 && gram[0].html.includes('No Brasil se diz: <strong>estou comendo</strong>'), gram[0]);
    P('gramática: "estou comendo" -> certo, sem aviso', /\bok\b/.test(gram[1].cls) && gram[1].score === 1 && !gram[1].html.includes('Portugal'), gram[1]);
    P('gramática: resposta errada continua errada', /wrong/.test(gram[2].cls) && gram[2].score === 0, gram[2]);
    // Revisão (Digite a resposta / Cloze; os cartões do Banco passam pela mesma correção)
    const rev = await page.evaluate(() => {
      LANG_HOOKS.reviewTyped.check = (given, expected, st) => { const v = typedAnswerVerdictForExpected(given, expected); st.wasCorrect = v !== 'errou'; st.almost = v === 'quase'; };
      const out = {};
      for (const typed of ['Estou a comer.', 'Estou comendo.', 'Estou a dormir.']){
        const st = {}; reviewTypedCheckPtBr(typed, 'Estou comendo', st);
        out[typed] = { wasCorrect: st.wasCorrect, almost: st.almost, ptBr: !!st.ptBr, grade: LANG_HOOKS.reviewTyped.wrongGrade(st),
          html: st.ptBr ? typedPtBrNoteHTML(st.ptBr) : '' };
      }
      return out;
    });
    const r1 = rev['Estou a comer.'];
    P('Revisão: "Estou a comer." -> Quase (nota Difícil = 1) com a forma do Brasil', r1.wasCorrect && r1.almost && r1.ptBr && r1.grade === 1 && r1.html.includes('<strong>estou comendo</strong>'), r1);
    P('Revisão: "Estou comendo." -> certo, sem aviso', rev['Estou comendo.'].wasCorrect && !rev['Estou comendo.'].almost && !rev['Estou comendo.'].ptBr, rev['Estou comendo.']);
    P('Revisão: "Estou a dormir." -> errado', !rev['Estou a dormir.'].wasCorrect && !rev['Estou a dormir.'].ptBr, rev['Estou a dormir.']);
    // Conjugação (tempo com estar + gerúndio)
    const conj = await page.evaluate(() => {
      registerConjugation({ lang: 'pt', verbs: { comer: { g: 'reg', f: { progressivo: ['estou comendo', 'está comendo', 'está comendo', 'estamos comendo', 'estão comendo', 'estão comendo'] } } },
        groups: { reg: { label: 'Regulares', desc: '' } }, tenses: [{ key: 'progressivo', label: 'Presente contínuo' }],
        persons: ['eu', 'você', 'ele / ela', 'nós', 'vocês', 'eles / elas'], speak: () => {}, games: null });
      return ['estou a comer', 'estou comendo', 'estou a beber'].map(g => { const ev = conjEvaluate('comer', 'progressivo', 0, g); return { g, status: ev.status, ptBr: !!ev.ptBr }; });
    });
    P('Conjugação: "estou a comer" -> Quase com a forma do Brasil', conj[0].status === 'almost' && conj[0].ptBr, conj[0]);
    P('Conjugação: "estou comendo" -> certo', conj[1].status === 'ok' && !conj[1].ptBr, conj[1]);
    P('Conjugação: "estou a beber" -> errado', conj[2].status === 'wrong' && !conj[2].ptBr, conj[2]);
    P('sem erro de página', errs.length === 0, errs);
    await ctx.close();
  }

  // ---- 2. fr e zh sem mudança
  for (const site of ['fr', 'zh']){
    const { ctx, page, errs } = await abrir(browser, site);
    const campo = site === 'fr' ? 'f' : 'c';
    const textos = [...new Set([...read(site + '/content.js').matchAll(new RegExp('"' + campo + '":\\s*"((?:[^"\\\\]|\\\\.)*)"', 'g'))].map(m => JSON.parse('"' + m[1] + '"')))];
    const r = await page.evaluate(({ textos, campo }) => {
      const erros = (s) => [s, s.toUpperCase(), s.slice(1), s.slice(0, -1), s + 'e', s.replace(/[aeiou]/, 'x'), s.replace(/é/g, 'e'), 'estou a comer', 'eu apanho o autocarro', ''];
      let n = 0; const diff = [];
      for (const alvo of textos){
        const item = { [campo]: alvo, f: alvo, c: alvo, p: alvo, t: '' };
        for (const typed of erros(alvo)){
          n++;
          const a = JSON.stringify(LANG_HOOKS.typedAnswer.verdict(typed, item)), b = JSON.stringify(typedVerdictPtBr(typed, item));
          const s1 = {}, s2 = {}; LANG_HOOKS.reviewTyped.check(typed, alvo, s1); reviewTypedCheckPtBr(typed, alvo, s2);
          if ((a !== b || JSON.stringify(s1) !== JSON.stringify(s2)) && diff.length < 5) diff.push({ typed, alvo, a, b, s1, s2 });
        }
      }
      return { n, diff, lang: LANG_HOOKS.typedAnswerLang };
    }, { textos, campo });
    check(`${site}: sem typedAnswerLang (veio ${JSON.stringify(r.lang)})`, r.lang === undefined);
    check(`${site}: lição e Revisão julgam igual a antes em ${r.n} respostas (${textos.length} textos do content.js)`, r.diff.length === 0 && r.n > 1000, r.diff);
    if (site === 'fr'){
      const fr = await responderLicao(page, 'type', 'bonjour', 'estou a comer');
      check('fr: "estou a comer" no "Digite o que ouviu" continua errado, sem aviso de Portugal', fr.score === 0 && fr.xp.length === 0 && !fr.html.includes('Portugal'), fr);
    }
    check(`${site}: sem erro de página`, errs.length === 0, errs);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`Português de Portugal nas respostas digitadas: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
