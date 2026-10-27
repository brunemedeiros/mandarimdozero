// Paridade 5c: o que os testes dos Desafios (equivalência, motor, capturas) têm em comum: servidor estático, Supabase de
// mentira que serve os desafios dos lotes reais (fr/scripts/challenges_import/*.json) e registra as gravações, relógio
// fixo, Math.random com semente, e as variações de resposta da aluna.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}

// Desafios dos lotes reais, sem repetir id, ordenados; status por posição (7 em 10 publicados, o resto pendente,
// aprovado fora do ar ou rejeitado), para as telas do aluno e as 3 seções do admin.
function challengeRows(){
  const dir = path.join(ROOT, 'fr/scripts/challenges_import');
  const seen = new Map();
  fs.readdirSync(dir).filter(f => /^lote-.*\.json$/.test(f)).sort().forEach(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    (Array.isArray(j) ? j : []).forEach(c => { if (c && c.id && c.type && !seen.has(c.id)) seen.set(c.id, c); });
  });
  const list = [...seen.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const COLS = ['id', 'type', 'level', 'status', 'created_at', 'updated_at', 'published_at', 'published_by', 'rejected_at', 'rejected_by', 'unpublished_at', 'unpublished_by'];
  return list.map((c, i) => {
    const st = ['published', 'published', 'published', 'needs_review', 'published', 'published', 'approved', 'published', 'needs_review', 'rejected'][i % 10];
    const data = {}; Object.keys(c).forEach(k => { if (!COLS.includes(k)) data[k] = c[k]; });
    return { id: c.id, type: c.type, level: c.level, status: st, created_at: '2026-10-01T10:00:00Z', updated_at: null, published_at: null, published_by: null, rejected_at: null, rejected_by: null, unpublished_at: null, unpublished_by: null, data };
  });
}

function importInputs(rows){
  const one = (o) => JSON.stringify(o);
  const ex = rows.find(r => r.type === 'expression');
  const newExpr = Object.assign({}, ex.data, { id: 'expr-novo-1', type: 'expression', level: 'A2', register: 'familiar' });
  return [
    '', 'isto não é json', '{"x":1}', one([newExpr, Object.assign({}, newExpr, { id: 'lt-novo-1', type: 'listen_translate', status: 'published' })]),
    one({ accepted: [Object.assign({}, newExpr, { id: 'expr-novo-1' }), { id: 'sem-tipo', level: 'A1' }, { id: 'tipo-x', type: 'xpto', level: 'A1' },
      { id: 'nivel-x', type: 'accent', level: 'C9' }, Object.assign({}, newExpr, { id: 'sem-registro', register: 'chique' }), Object.assign({}, newExpr, { id: ex.id }),
      Object.assign({}, newExpr, { id: 'dup-lote' }), Object.assign({}, newExpr, { id: 'dup-lote' }), null, { id: 'ok-2', type: 'accent', level: 'B1', targetText: 'é', status: 'qualquer' }], rejected: [] }),
    one([{ type: 'accent' }]),
    one([Object.assign({}, newExpr, { id: 'falha-banco' })]),
  ];
}

// Supabase de mentira: from('challenges').select() devolve as linhas; insert/update/delete gravam em __dbLog.
const STUB = `(function(){
  window.__dbLog = [];
  function result(st){
    if (st.table === 'challenges' || (window.__CH_TABLE && st.table === window.__CH_TABLE)){
      if (st.op !== 'select'){
        window.__dbLog.push(JSON.parse(JSON.stringify(st)));
        if (window.__dbFail) return { data: null, error: { message: 'falha simulada do banco' } };
        return { data: null, error: null };
      }
      if (window.__selectFail) return { data: null, error: { message: 'sem rede' } };
      return { data: JSON.parse(JSON.stringify(window.__CH_ROWS || [])), error: null };
    }
    return { data: [], error: null };
  }
  function builder(table){
    const st = { table, op: 'select', calls: [] };
    const p = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, no) => Promise.resolve(result(st)).then(ok, no);
      return (...a) => {
        if (['insert', 'update', 'delete', 'upsert'].includes(prop)) st.op = prop;
        st.calls.push([prop, a]);
        return p;
      };
    } });
    return p;
  }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: (t) => builder(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name) => { window.__dbLog.push({ rpc: name }); return { data: null, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;

// Variações do que a aluna digita (determinísticas: semente).
const VARIANTS_SRC = `(function(){
  const mk = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const strip = x => x.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  const typo = (w, rnd) => { if (w.length < 3) return w + 'x'; const i = 1 + Math.floor(rnd() * (w.length - 2)); return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); };
  window.__ltVariants = function(text, seed){
    const rnd = mk(seed); const words = text.split(/\\s+/).filter(Boolean);
    return {
      certa: text, minusculas: text.toLowerCase(), sem_acento: strip(text), sem_pontuacao: text.replace(/[.,!?;:«»"…]/g, ''),
      negacao: 'Não ' + text.charAt(0).toLowerCase() + text.slice(1), sem_negacao: text.replace(/\\b(não|nunca|nada)\\b/gi, ''),
      numero: text.replace(/\\b(um|uma|dois|duas|três|tres|quatro|cinco|dez|\\d+)\\b/i, 'sete') + ' 7', digitos: text.replace(/\\bdois\\b/g, '2').replace(/\\btrês\\b/g, '3'),
      pessoa: 'Eu foi ' + text, pessoa2: text.replace(/\\b(Eu|eu)\\b/, 'Ele').replace(/\\bsou\\b/, 'somos'), a_gente: 'A gente vamos ' + text,
      falta: words.filter((_, i) => i % 3 !== 1).join(' '), metade: words.slice(0, Math.ceil(words.length / 2)).join(' '),
      a_mais: words.map((w, i) => i % 3 === 1 ? w + ' muito' : w).join(' '), digitacao: words.map((w, i) => i % 2 ? typo(w, rnd) : w).join(' '),
      ordem: words.slice().reverse().join(' '), ingles: 'I like it very much', lixo: 'xyz abc', vazio: '', espacos: '   ' + text + '   ',
      flexao: words.map(w => /ei$/.test(w) ? w.replace(/ei$/, 'ou') : /ou$/.test(w) ? w.replace(/ou$/, 'ei') : w).join(' '),
    };
  };
  window.__accentVariants = function(text, seed){
    const rnd = mk(seed);
    return {
      certa: text, sem_acento: strip(text), maiusculas: text.toUpperCase(), minusculas: text.toLowerCase(), espacos: '  ' + text.replace(/ /g, '   ') + ' ',
      grave_agudo: text.replace(/é/g, 'è').replace(/à/g, 'á').replace(/ê/g, 'é'), sem_cedilha: text.replace(/ç/g, 'c').replace(/Ç/g, 'C'),
      oe: text.replace(/œ/g, 'oe').replace(/Œ/g, 'OE'), trema: text.replace(/ë/g, 'e').replace(/ï/g, 'i'), apostrofo: text.replace(/'/g, '\\u2019'),
      sem_hifen: text.replace(/-/g, ' '), outra: typo(text, rnd), letra_a_mais: text + 'e', vazio: '', so_espaco: '   ', ponto: text + '.',
    };
  };
})();`;

async function boot(browser, root, opts){
  opts = opts || {};
  const server = serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: opts.viewport || { width: 1200, height: 900 }, colorScheme: opts.theme || 'light', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  if (opts.blockMp3) await page.route(/\.mp3(\?|$)/, () => {});
  const rows = opts.rows || challengeRows();
  await page.addInitScript(([lang, rows, imports, theme]) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); if (theme) localStorage.setItem('theme', theme); } catch (e) {}
    let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    window.__seed = (n) => { s = n; };
    // Expressões: o fr de REF ainda tem o desfoque + "Ver as respostas"; o de agora tem palpite + "Ver opções" + passos (2026-10-26).
    // Estes ajudantes valem para os dois, para a mesma sequência rodar nos dois lados.
    window.__exprAbrir = () => { const r = document.getElementById('challenge-reveal-btn'); if (r) r.click(); else { const v = document.getElementById('expr-see-options-btn'); if (v) v.click(); } };
    window.__exprOpcoes = () => [...document.querySelectorAll('.challenge-choice-btn, .exercise-option[data-orig-idx]')];
    window.__exprTexto = (b) => (b.querySelector('.opt-text') || b).textContent;
    window.__exprAteFinal = () => { for (let i = 0; i < 8 && !document.getElementById('challenge-complete-btn') && !document.getElementById('challenge-retry-btn'); i++){
      const d = document.getElementById('expr-turn-dontknow-btn'), c = document.getElementById('expr-continue-btn');
      if (d && d.offsetParent) d.click(); else if (c) c.click(); else break; } };
    window.__CH_ROWS = rows; window.__importInputs = imports;
  }, [opts.lang || 'pt-BR', rows, importInputs(rows), opts.theme || null]);
  await page.addInitScript(VARIANTS_SRC);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(() => {
    window.__spoken = [];
    window.speechSynthesis && (window.speechSynthesis.speak = (u) => { window.__spoken.push(u && u.text); });
    window.__plays = [];
    HTMLMediaElement.prototype.play = function(){ window.__plays.push(this.src.replace(/^https?:\/\/[^/]+/, '') + '@' + this.playbackRate); return Promise.resolve(); };
    window.__toasts = []; window.showToast = (m) => { window.__toasts.push(m); };
    window.__alerts = []; window.alert = (m) => { window.__alerts.push('alert:' + m); };
    window.__confirmAnswer = true; window.confirm = (m) => { window.__alerts.push('confirm:' + m); return window.__confirmAnswer; };
    showStreakCelebration = () => {};
  });
  return { page, ctx, server, errors, port };
}

module.exports = { boot, serve, challengeRows, importInputs, STUB, VARIANTS_SRC, chromium, ROOT };
