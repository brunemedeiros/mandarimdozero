// i18n Etapa 3 -- "Site em inglês não tem NADA em português" (regra da dona, 2026-10-15).
//
// Playwright (Chromium real), fr + zh, site em inglês (localStorage 'ui-language' = 'en', fluxo normal de
// curso por idioma do site). Percorre as telas principais do aluno, coleta o texto VISÍVEL
// (document.body.innerText + placeholder/aria-label/title/alt de elementos visíveis + toasts disparados)
// e procura português com palavras/padrões inequívocos (lista PT_PATTERNS abaixo; nada de " de ", que é
// francês também). Cada trecho em português é impresso com a tela onde apareceu pela PRIMEIRA vez.
// Hoje (Etapa 3, auditoria) o teste FALHA de propósito: a correção vem nas próximas etapas.
//
// Telas: trilha (primeira pintura e depois de re-render), cartão Continuar, mapa da trilha + painel de
// unidade/revisão/ponto, detalhe da unidade e passos de uma lição, Revisão (tabela de Decks, sessão),
// gerenciador de Tags, Desafios e Ditados (só fr), Conjugação (fr) / Hanzi (zh), Perfil (abas), Configurações,
// Ranking, janela de sequência, aviso "cartões esperando", janela de importação cortada, toasts.
// Login simulado (CURRENT_USER) depois do boot; Supabase stubado (listas vazias), SW bloqueado.
//
// Rodar: node tests/i18n/test_sem_portugues_en.js        (SHOTS=/pasta para salvar capturas)
// Saída: lista "[app] tela :: trecho" + resumo por tela; código 1 se achar português.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

// Stub do Supabase: tudo vazio, ensure_user_decks devolve raiz + Meus Decks (como tests/i18n/test_playwright.js).
const STUB = `
(function(){
  let seq = 500;
  window.__DB = { decks: [], challenges: (window.__SEED_CHALLENGES || []) };
  function builder(table){
    const st = { filters: [], single: false, head: false, op: null, payload: null };
    const run = () => {
      const T = window.__DB[table] || [];
      if (st.op === 'insert'){ const l = Array.isArray(st.payload) ? st.payload : [st.payload]; const c = l.map(r => Object.assign({ id: ++seq }, r)); return { data: st.single ? c[0] : c, error: null }; }
      if (st.head) return { data: null, count: 0, error: null };
      const out = T.filter(r => st.filters.every(([k, v]) => r[k] === v));
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert' || p === 'upsert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'select') return (_c, o) => { if (o && o.head) st.head = true; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      if (name !== 'ensure_user_decks') return { data: null, error: null };
      const D = window.__DB.decks, uid = args.p_owner_id, lang = args.p_language_app_key;
      let root = D.find(d => d.kind === 'root' && d.owner_id === uid && d.language_app_key === lang);
      if (!root){ root = { id: ++seq, kind: 'root', owner_id: uid, parent_deck_id: null, language_app_key: lang, name: 'root' }; D.push(root); }
      let pr = D.find(d => d.kind === 'personal_root' && d.owner_id === uid && d.language_app_key === lang);
      if (!pr){ pr = { id: ++seq, kind: 'personal_root', owner_id: uid, parent_deck_id: root.id, language_app_key: lang, name: 'Meus Decks' }; D.push(pr); }
      return { data: [{ root_deck_id: root.id, personal_root_deck_id: pr.id }], error: null };
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}), list: async () => ({ data: [], error: null }) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

// Português que não existe em inglês nem no francês/pinyin ensinados. Palavra inteira, sem " de "/" a "/" e ".
const PT_WORDS = ['você', 'vocês', 'não', 'está', 'estão', 'são', 'também', 'então', 'até', 'já', 'aqui', 'agora', 'ainda',
  'nenhum', 'nenhuma', 'seu', 'sua', 'seus', 'suas', 'para', 'pelo', 'pela', 'com', 'sem', 'uma', 'cartão', 'cartões', 'lição',
  'lições', 'revisão', 'revisões', 'nível', 'unidade', 'unidades', 'módulo', 'sequência', 'amigos', 'amiga', 'tente', 'carregando',
  'entrar', 'hoje', 'ontem', 'dias', 'semana', 'ouça', 'digite', 'escolha', 'resposta', 'começar', 'comece', 'continuar',
  'voltar', 'fechar', 'cancelar', 'excluir', 'salvar', 'editar', 'criar', 'enviar', 'aluno', 'aluna', 'professora', 'desafios',
  'desafio', 'conquistas', 'missões', 'missão', 'parabéns', 'ótimo', 'muito', 'isso', 'depois', 'antes', 'todos', 'todas', 'grátis',
  'selecione', 'configurações', 'notificações', 'aviso', 'trilha', 'mapa', 'metas', 'progresso', 'gramática', 'história',
  'disponível', 'bloqueada', 'bloqueado', 'concluída', 'concluídas', 'concluído', 'pulada', 'atual', 'revisar', 'revisada',
  'recomendado', 'recomendada', 'opcional', 'frase', 'frases', 'palavra', 'palavras', 'tradução', 'explicação', 'expressões',
  'acentuação', 'ponto', 'verificação', 'perfil', 'buscar', 'nada', 'quase', 'instante', 'esperando', 'memória', 'sessão',
  'abrir', 'ler', 'novo', 'novos', 'nova', 'aprendendo', 'dominados', 'meus', 'minha', 'minhas', 'meu', 'faltam', 'falta',
  'praticar', 'pratique', 'treine', 'ouvir', 'escreva', 'certo', 'certa', 'errado', 'errou', 'acertou', 'sair', 'sobre'];
const PT_RE = new RegExp('(?<![\\p{L}\\p{N}_.@/-])(' + PT_WORDS.join('|') + ')(?![\\p{L}\\p{N}_])', 'iu');
const PT_SUFFIX = /\p{L}(ção|ções|ão|ões|ã|õe)(?!\p{L})/iu;   // "-ção", "-ões", "-ão": não existem em en/fr/pinyin
const looksPt = (s) => PT_RE.test(s) || PT_SUFFIX.test(s);

// Exceções EXPLÍCITAS (pequenas, com motivo). Trecho que casar aqui não conta.
const EXCEPTIONS = [
  { re: /^Português( \(Brasil\))?$/i, why: 'nome do idioma na própria língua (autônimo) no seletor de idioma do site' },
  { re: /^(PT|pt-BR)$/i, why: 'código do idioma' },
];

// Desafios publicados de verdade no repo (lotes de importação do fr), servidos pelo stub como tabela 'challenges'.
function seedChallenges(){
  const dir = path.join(ROOT, 'fr', 'scripts', 'challenges_import');
  const rows = [];
  for (const f of fs.readdirSync(dir).filter(f => /^(lote|modulo).*\.json$/.test(f) && !/content/.test(f))){
    let d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); d = Array.isArray(d) ? d : (d.accepted || []);
    for (const it of d) if (!rows.some(r => r.id === it.id)) rows.push({ id: it.id, type: it.type, level: it.level, status: 'published', data: Object.assign({}, it, { status: 'published' }) });
  }
  return rows;
}
const SEED_CHALLENGES = seedChallenges();

let failed = 0, checks = 0;
const FOUND = [];   // { app, screen, text, src }

async function collect(page){
  return page.evaluate(() => {
    const vis = (el) => { if (!el || !el.getClientRects || !el.getClientRects().length) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; };
    const lines = String(document.body.innerText || '').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).map(text => ({ text, src: 'texto' }));
    document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el => {
      if (!vis(el)) return;
      for (const a of ['placeholder', 'aria-label', 'title', 'alt']){
        const v = el.getAttribute(a); if (v && v.trim()) lines.push({ text: v.replace(/\s+/g, ' ').trim(), src: a + (el.id ? '#' + el.id : '') });
      }
    });
    (window.__toasts || []).splice(0).forEach(m => lines.push({ text: String(m), src: 'toast' }));
    return lines;
  });
}

async function scanScreen(page, app, screen, seen){
  let lines = [];
  try { lines = await collect(page); } catch (e) { console.log(`  [${app}] ${screen}: não coletou (${e.message.split('\n')[0]})`); return; }
  for (const { text, src } of lines){
    if (!looksPt(text)) continue;
    if (EXCEPTIONS.some(x => x.re.test(text))) continue;
    const id = src.split('#')[0] === 'texto' ? text : src + '|' + text;
    if (seen.has(id)) continue;
    seen.add(id);
    FOUND.push({ app, screen, text: text.slice(0, 220), src });
  }
}

async function step(page, app, screen, seen, fn, opts){
  try {
    if (fn) await page.evaluate(fn, opts && opts.arg);
    await page.waitForTimeout((opts && opts.wait) || 400);
  } catch (e) { console.log(`  [${app}] ${screen}: ação falhou (${e.message.split('\n')[0].slice(0, 160)})`); }
  await scanScreen(page, app, screen, seen);
  if (process.env.SHOTS){ try { await page.screenshot({ path: path.join(process.env.SHOTS, `${app}-${screen.replace(/[^\w]+/g, '_')}.png`) }); } catch (e) {} }
}

// ---------- Conteúdo do curso (categoria "conteúdo", relatada à parte) ----------
// Compara o conteúdo da trilha em pt-BR e em en (depois do overlay content.en.js): todo texto que continua
// IGUAL ao português e tem cara de português é conteúdo sem versão em inglês. Campos do idioma estudado
// (f, c, p, blocks, audio...) e ids ficam de fora.
const CONTENT_SKIP_KEYS = new Set(['f', 'c', 'p', 'id', 'k', 'blocks', 'audio', 'audioFile', 'img', 'icon', 'emoji', 'scenarioEmoji', 'level', 'type', 'unitIds', 'afterUnit', 'lang', 'pinyin', 'hanzi', 'char', 'tone', 'fr', 'zh', 'answer', 'accept', 'options']);
async function contentSnapshot(page){
  return page.evaluate(() => JSON.stringify({
    units: typeof UNITS !== 'undefined' ? UNITS : [], modules: typeof MODULES !== 'undefined' ? MODULES : [],
    levels: typeof LEVELS !== 'undefined' ? LEVELS : [], levelTests: typeof LEVEL_TESTS !== 'undefined' ? LEVEL_TESTS : [],
    stories: typeof STORIES !== 'undefined' ? STORIES : [], hanzi: typeof HANZI_LESSONS !== 'undefined' ? HANZI_LESSONS : [],
  }));
}
function contentDiff(ptJson, enJson){
  const out = [];
  const walk = (a, b, pathArr) => {
    if (typeof a === 'string'){
      if (a === b && looksPt(a)) out.push({ path: pathArr.join('.'), text: a });
      return;
    }
    if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return;
    for (const k of Object.keys(a)){
      if (!Array.isArray(a) && CONTENT_SKIP_KEYS.has(k)) continue;
      walk(a[k], b[k], pathArr.concat(k));
    }
  };
  walk(JSON.parse(ptJson), JSON.parse(enJson), []);
  return out;
}
const CONTENT_FOUND = {};
const ptSnapCache = {};

async function run(browser, port, app){
  // retrato do conteúdo em português (mesma página, idioma do site pt-BR)
  let ptSnap = null;
  {
    const c0 = await browser.newContext({ serviceWorkers: 'block' });
    await c0.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
    const p0 = await c0.newPage();
    await p0.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await p0.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await p0.goto(`http://127.0.0.1:${port}/${app}/index.html`);
    await p0.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 30000 });
    ptSnap = await contentSnapshot(p0);
    ptSnapCache[app] = ptSnap;
    await c0.close();
  }

  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  await ctx.addInitScript((seed) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'en'); } catch (e) {}
    window.__toasts = [];
    window.__SEED_CHALLENGES = seed;
    // Math.random com semente fixa: embaralhamento das opções igual em toda execução (resultado reprodutível)
    let a = 20261019; Math.random = function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }, app === 'fr' ? SEED_CHALLENGES : []);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { FOUND.push({ app, screen: 'diálogo do navegador', text: d.message(), src: 'dialog' }); d.dismiss().catch(() => {}); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`http://127.0.0.1:${port}/${app}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 30000 });
  await page.evaluate(() => window.i18nReady);
  await page.waitForTimeout(1200);
  checks++;
  const lang = await page.evaluate(() => getUiLang());
  if (lang !== 'en'){ failed++; console.log(`  FALHOU: [${app}] site não ficou em inglês (${lang})`); }
  CONTENT_FOUND[app] = contentDiff(ptSnap, await contentSnapshot(page));
  // toasts: registra toda mensagem (a função de verdade continua rodando)
  await page.evaluate(() => { const orig = window.showToast; window.showToast = function(m){ (window.__toasts = window.__toasts || []).push(m); return orig.apply(this, arguments); }; });

  // A primeira pintura tem conjunto próprio: o que aparece nela e some depois do re-render fica separado.
  await step(page, app, 'trilha (primeira pintura, convidado)', new Set());
  const seen = new Set();
  const S = (screen, fn, opts) => step(page, app, screen, seen, fn, opts);
  // login simulado (progresso da conta "já carregado", senão a lição espera a confirmação do save)
  await page.evaluate(() => { CURRENT_USER = { id: 'u-test-en', email: 'student@example.com', user_metadata: {} }; try { progressLoadedOk = true; } catch (e) {} });
  await S('trilha (re-render)', () => { renderUnitsGrid(); }, { wait: 600 });
  await S('cartão Continuar', () => { const c = document.querySelector('.trail-continue'); if (c) c.scrollIntoView(); });
  await S('trilha: clique em unidade bloqueada', () => { const b = document.querySelector('.unit-block.locked .ub-header, .unit-block.locked'); if (b) b.click(); });
  await S('mapa da trilha', () => { const b = document.querySelector('.trail-view-toggle [data-view="map"]'); if (b) b.click(); }, { wait: 600 });
  await S('mapa: painel da unidade atual', () => { const n = document.querySelector('.tm-node.current, .tm-node'); if (n) n.click(); });
  await S('mapa: painel de unidade bloqueada', () => { const n = [...document.querySelectorAll('.tm-node')].find(x => /locked/.test(x.className) && /tm-unit/.test(x.className)); if (n) n.click(); });
  await S('mapa: painel da Revisão do módulo', () => { const n = document.querySelector('.tm-node.tm-review'); if (n) n.click(); });
  await S('mapa: painel do Ponto de verificação', () => { const n = document.querySelector('.tm-node.tm-checkpoint'); if (n) n.click(); });
  await S('mapa: painel da história (zh)', () => { const n = document.querySelector('.tm-node.tm-story'); if (n) n.click(); });
  await page.evaluate(() => { const c = document.querySelector('.tm-close'); if (c) c.click(); const b = document.querySelector('.trail-view-toggle [data-view="trail"]'); if (b) b.click(); });

  // lição: abre a 1ª unidade e avança alguns passos
  await S('lição: detalhe da unidade', () => { openUnitDetail(UNITS[0].id); }, { wait: 800 });
  for (let i = 1; i <= 40; i++){
    await S(`lição: passo ${i}`, () => {
      const root = document.getElementById('unit-detail-wrap') || document.body;
      const visBtns = [...root.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled);
      const choice = visBtns.find(b => /option|choice|answer-btn|mc-/.test(b.className) && !/selected|correct|wrong/.test(b.className));
      const dontKnow = visBtns.find(b => /I don.t know/i.test(b.textContent));
      const cont = visBtns.find(b => b.id !== 'step-next-btn' && /^\s*Continue/i.test(b.textContent));
      if (cont) { cont.click(); return; }
      // escolhe a opção certa quando o motor expõe a resposta (data-correct), senão a primeira
      const right = visBtns.find(b => b.dataset && (b.dataset.correct === 'true' || b.dataset.correct === '1'));
      if (right) right.click(); else if (choice) choice.click(); else if (dontKnow) dontKnow.click();
      const n = document.getElementById('step-next-btn'); if (n && n.offsetParent && !n.disabled) n.click();
    }, { wait: 500 });
  }
  await page.evaluate(() => {
    const st = document.getElementById('streak-modal-overlay'); if (st && st.style.display !== 'none'){ const b = document.getElementById('streak-modal-continue-btn'); if (b) b.click(); st.style.display = 'none'; }
    if (typeof exitToPath === 'function') exitToPath(); else switchTab('path');
  });
  await page.waitForTimeout(400);

  // Revisão, Decks, Tags
  await S('Revisão (aba)', () => switchTab('review'), { wait: 900 });
  await S('Revisão: sessão', () => { if (typeof openReviewSession === 'function') openReviewSession('all'); }, { wait: 800 });
  await page.evaluate(() => { try { switchTab('path'); switchTab('review'); } catch (e) {} });
  await S('Decks: painel (janela)', () => { const b = document.querySelector('[data-deck-panel-open], [data-open-panel], .deck-panel-open-btn, [data-deck-action="panel"]'); if (b) b.click(); else if (typeof openDeckPanel === 'function') openDeckPanel(); }, { wait: 900 });
  await S('Tags: gerenciador', async () => {
    let host = document.getElementById('__tag-host');
    if (!host){ host = document.createElement('div'); host.id = '__tag-host'; host.style.cssText = 'position:fixed;left:0;top:0;width:600px;background:#fff;z-index:99999'; document.body.appendChild(host); }
    await renderTagManagerInto(host, { scope: 'own' });
  }, { wait: 700 });
  await page.evaluate(() => { const h = document.getElementById('__tag-host'); if (h) h.remove(); const m = document.getElementById('deck-panel-modal'); if (m) m.remove(); });

  // Importação cortada pelo limite do plano grátis (mesma chamada do import real)
  await S('janela: importação cortada', () => {
    openFlashcardLimitModal({ cutMessage: ownCardInstanceCutMessage({ requested: 30, keptInstances: 5, limit: 20, used: 15, what: 'import' }) });
  });
  await page.evaluate(() => { const m = document.getElementById('flashcard-limit-modal'); if (m) m.style.display = 'none'; });

  // Desafios / Ditados (fr) ; Conjugação (fr) ; Hanzi (zh)
  if (app === 'fr'){
    await S('Desafios (aba)', () => switchTab('challenges'), { wait: 1500 });
    const firstOf = (type, prefer) => page.evaluate(([type, prefer]) => { const l = CHALLENGES.filter(c => c.type === type); return (l.find(c => c.id === prefer) || l[0] || {}).id || null; }, [type, prefer]);
    for (const [type, prefer] of [['expression', 'expr-a1m6-001'], ['listen_translate', 'lt-a1m6-005'], ['accent', 'accent-a1m6-006'], ['cloze_grammar', 'cloze-a1m6-001']]){
      await S(`Desafios: lista ${type}`, (type) => renderChallengesList(type), { wait: 600, arg: type });
      for (const id of [await firstOf(type, ''), await firstOf(type, prefer)]){
        if (!id) continue;
        await S(`Desafios: ${type} (${id})`, (id) => openChallengePlayer(id), { wait: 700, arg: id });
        await S(`Desafios: ${type} (${id}) respondido`, () => {
          const root = document.getElementById('challenge-player-wrap') || document.body;
          root.querySelectorAll('.cloze-grammar-group').forEach(g => { const b = g.querySelector('.cloze-option'); if (b && b.offsetParent) b.click(); });
          const rv = root.querySelector('.challenge-reveal-overlay-btn'); if (rv && rv.offsetParent) rv.click(); const opt = root.querySelector('.challenge-choice-btn'); if (opt) opt.click();
          root.querySelectorAll('textarea, input[type="text"]').forEach(el => { if (el.offsetParent){ el.value = 'test'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
          const btn = [...root.querySelectorAll('button')].find(b => b.offsetParent && /check|verify|submit|confirm|vérifier/i.test(b.textContent));
          if (btn) btn.click();
        }, { wait: 800 });
      }
    }
    await S('Ditados: lista', () => { switchTab('challenges'); renderDictationList(); }, { wait: 700 });
    await S('Ditados: player', () => { const id = (typeof DICTATIONS !== 'undefined' && DICTATIONS[0] && DICTATIONS[0].id); if (id) openDictationPlayer(id); }, { wait: 700 });
    await S('Ditados: resultado', () => { const i = document.getElementById('dictation-input'); if (i){ i.value = 'Bonjour je suis'; i.dispatchEvent(new Event('input', { bubbles: true })); } const b = document.getElementById('dictation-check-btn'); if (b) b.click(); }, { wait: 900 });
    await page.evaluate(() => switchTab('path'));
    await S('Conjugação (aba)', () => switchTab('conjugaison'), { wait: 900 });
  } else {
    await S('Hanzi (aba)', () => { const b = document.querySelector('[data-tab="hanzi"]'); if (b) b.click(); else switchTab('hanzi'); }, { wait: 900 });
  }

  // Perfil e abas, Configurações, Ranking
  await S('Perfil', () => switchTab('profile'), { wait: 900 });
  for (const sub of ['goals', 'progress', 'friends']){
    await S(`Perfil: aba ${sub}`, (sub) => { const b = [...document.querySelectorAll('.leaderboard-tab')].find(x => x.dataset.tab === sub && x.offsetParent); if (b) b.click(); }, { wait: 900, arg: sub });
  }
  await S('Configurações', () => switchTab('settings'), { wait: 900 });
  await S('Ranking', () => switchTab('leaderboard'), { wait: 900 });
  await page.evaluate(() => switchTab('path'));

  // Janela de sequência e aviso de cartões esperando
  await S('janela de sequência (3 dias)', () => { STATE.streak = 3; showStreakCelebration(); });
  await page.evaluate(() => { document.getElementById('streak-modal-overlay').style.display = 'none'; });
  await S('janela de sequência (1 dia)', () => { STATE.streak = 1; showStreakCelebration(); });
  await page.evaluate(() => { document.getElementById('streak-modal-overlay').style.display = 'none'; });
  await S('aviso: cartões esperando', () => { document.getElementById('review-reminder-count').textContent = '12'; document.getElementById('review-reminder-banner').style.display = 'flex'; });
  await page.evaluate(() => { document.getElementById('review-reminder-banner').style.display = 'none'; });

  // (A pergunta de idioma do 1º acesso, #ui-language-first-modal, é bilíngue de propósito e só abre quando ainda
  // não há idioma escolhido: fica fora deste teste.)

  // Toasts disparáveis sem rede
  await S('toasts soltos', () => {
    if (typeof showTrailSkipLocked === 'function') showTrailSkipLocked();
  }, { wait: 300 });

  checks++;
  if (errors.length){ console.log(`  [${app}] pageerrors (${errors.length}):`, errors.slice(0, 5)); }
  await ctx.close();
  return errors.length;
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pageErrors = {};
  for (const app of ['fr', 'zh']) pageErrors[app] = await run(browser, port, app);
  await browser.close(); server.close();

  console.log('\n=== Português visível com o site em inglês ===');
  const byScreen = {};
  for (const f of FOUND){
    console.log(`[${f.app}] ${f.screen} :: ${f.text}${f.src !== 'texto' ? `  (${f.src})` : ''}`);
    const k = `[${f.app}] ${f.screen}`; byScreen[k] = (byScreen[k] || 0) + 1;
  }
  console.log('\n=== Resumo (trechos novos por tela, na ordem do percurso) ===');
  for (const [k, n] of Object.entries(byScreen)) console.log(`${String(n).padStart(4)}  ${k}`);
  console.log('\n=== Conteúdo do curso sem versão em inglês (categoria "conteúdo", correção no content.en.js) ===');
  for (const a of Object.keys(CONTENT_FOUND)){
    const list = CONTENT_FOUND[a];
    const byTop = {};
    list.forEach(x => { const m = x.path.match(/^(\w+)\.(\d+)/); let key = x.path.split('.')[0];
      if (m){ const top = JSON.parse(ptSnapCache[a])[m[1]][+m[2]]; key = m[1] + ':' + ((top && (top.id || top.title)) || m[2]); }
      (byTop[key] = byTop[key] || []).push(x); });
    console.log(`[${a}] ${list.length} textos em português sem tradução, em ${Object.keys(byTop).length} itens`);
    for (const [k, l] of Object.entries(byTop)){
      console.log(`  ${k}: ${l.length}`);
      l.forEach(x => console.log(`    ${x.path.split('.').slice(2).join('.')} = "${x.text.slice(0, 120)}"`));
    }
  }
  const per = (a) => FOUND.filter(f => f.app === a).length;
  console.log(`\nTotal interface: fr ${per('fr')} trechos, zh ${per('zh')} trechos; conteúdo sem en: fr ${(CONTENT_FOUND.fr || []).length}, zh ${(CONTENT_FOUND.zh || []).length}; pageerrors fr ${pageErrors.fr}, zh ${pageErrors.zh}.`);
  checks++;
  if (FOUND.length) failed++;
  checks++;
  if ((CONTENT_FOUND.fr || []).length || (CONTENT_FOUND.zh || []).length) failed++;
  console.log(`${checks - failed}/${checks} checks ok${FOUND.length ? ' (FALHA esperada na Etapa 3: há português no site em inglês)' : ''}`);
  process.exit(failed ? 1 : 0);
})();
