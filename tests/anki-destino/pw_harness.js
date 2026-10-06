// Harness Playwright compartilhado por tests/anki-destino e tests/limite-corte.
// Mesmo stub do Supabase da Fase F (tests/fase-f/test_playwright.js), em
// memória, com as regras do trigger own_flashcards_validate_deck.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  let seq = 500;
  window.__DB = { decks: [], own_flashcards: [], teacher_students: [] };
  window.__inserts = [];
  function builder(table){
    const st = { table, filters: [], op: null, payload: null, single: false };
    const run = () => {
      const T = window.__DB[table] || [];
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        if (table === 'own_flashcards') for (const r of list){
          if (r.deck_id != null){
            const d = window.__DB.decks.find(x => x.id === r.deck_id);
            if (!d || !['personal_root','personal'].includes(d.kind) || d.owner_id !== r.owner_id || d.language_app_key !== r.language_app_key)
              return { data: null, error: { message: 'trigger: deck invalido' } };
          }
          window.__inserts.push(r);
        }
        const created = list.map(r => Object.assign({ id: ++seq, status: 'active', revision: 0, created_at: new Date().toISOString(), tags: [] }, r));
        created.forEach(c => T.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      const out = T.filter(r => st.filters.every(([k, v]) => r[k] === v));
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
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
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;


async function bootPage(browser, lang, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function openMeusCartoes(page, premium, link){
  await page.evaluate(([premium, link]) => {
    CURRENT_USER = { id: 'u-f' };
    ensureProfileLoaded = async () => ({ plan_tier: premium ? 'premium' : 'free' });
    window.__DB.teacher_students = link ? [{ id: 1, student_id: 'u-f', status: 'active' }] : [];
    switchTab('my-flashcards');
  }, [premium, link]);
  await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
}


const FAKE_BASIC_MODEL = { id: '1', type: 0, name: 'Basic', flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }],
  tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id=answer>{{Back}}' }] };

// Monta (no navegador) um parseResult como o de shared/anki-parser.js e
// substitui parseApkgFile/initSqlJs/JSZip (o .apkg real é coberto pelos
// testes da Fase 7j). `notes`: [{ id, front, back, deck, tags }].
async function stubAnkiParse(page, notes){
  await page.evaluate(([notes, model]) => {
    window.initSqlJs = async () => ({});
    window.JSZip = function(){};
    const decks = {}; let did = 1;
    const deckId = name => { for (const k in decks) if (decks[k].name === name) return k; const k = String(did++); decks[k] = { name }; return k; };
    const cardsByNoteId = new Map();
    const ns = notes.map(n => { cardsByNoteId.set(n.id, [{ id: n.id * 10, deckId: deckId(n.deck || 'Default'), ord: 0 }]);
      return { id: n.id, guid: 'g' + n.id, mid: '1', tags: n.tags || [], flds: [n.front, n.back], sfld: n.front }; });
    parseApkgFile = async () => ({ ok: true, schemaGeneration: 'anki2', models: { '1': model }, decks, notes: ns, cardsByNoteId, mediaManifest: {}, zip: null });
  }, [notes, FAKE_BASIC_MODEL]);
}

async function openAnkiImport(page){
  await page.evaluate(() => handleAnkiImportFileSelected(new File(['x'], 'teste.apkg')));
  await page.waitForSelector('#anki-import-confirm-btn', { timeout: 8000 });
}

module.exports = { server, bootPage, openMeusCartoes, stubAnkiParse, openAnkiImport, chromium };
