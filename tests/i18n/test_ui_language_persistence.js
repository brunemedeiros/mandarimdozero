// i18n Fase 5 -- persistência do idioma do site na conta
// (progress.data._meta.uiLanguage). Node/vm, sem rede: carrega os arquivos
// de PRODUÇÃO (shared/language-pref.js, shared/auth.js, shared/i18n/i18n.js)
// contra um supabaseClient falso em memória.
// Rodar: node tests/i18n/test_ui_language_persistence.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));

function fakeEl(){ return { addEventListener(){}, style: { removeProperty(){} }, classList: { add(){}, remove(){}, toggle(){} }, textContent: '' }; }

function makeAuthEnv({ row = null, search = '', uiLang = 'pt-BR', upsertDelayMs = 0, readDelayMs = 0 } = {}){
  const db = { row: row ? clone(row) : null, upserts: [] };
  const setUiCalls = [];
  const supabaseClient = {
    from(table){
      const q = {
        select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ if (readDelayMs) await sleep(readDelayMs); return { data: db.row ? { data: clone(db.row) } : null, error: null }; },
        async upsert(payload){
          if (upsertDelayMs) await sleep(upsertDelayMs);
          if (table === 'progress'){ db.row = clone(payload.data); db.upserts.push(clone(payload.data)); }
          return { error: null };
        },
      };
      return q;
    },
  };
  const sb = {
    console: { error(){}, log(){}, warn(){} },
    supabaseClient, URLSearchParams, Promise, Object, JSON, Number, String, setTimeout,
    location: { search },
    document: { getElementById: () => fakeEl(), addEventListener(){}, querySelectorAll: () => [] },
    APP_KEY: 'frances',
    STATE: { xp: 5, totalReviews: 1, totalAudioPlays: 0 },
    serializeState: () => ({ xp: 5, totalReviews: 1, totalAudioPlays: 0 }),
    applySerializedState(){},
    showToast(){},
    getUiLang: () => uiLang,
    setUiLang: async (l) => { setUiCalls.push(l); uiLang = l; return l; },
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/language-pref.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/auth.js'), 'utf8'), sb);
  const run = code => vm.runInContext(code, sb);
  return { sb, db, setUiCalls, run, getUi: () => uiLang };
}

(async () => {
  // ---------- language-pref.js ----------
  {
    const base = { frances: { xp: 10 }, mandarim: { xp: 3 }, _meta: { currentLearningLanguage: 'zh' } };
    const env = makeAuthEnv({ row: base });
    await env.sb.setAccountUiLanguage('u1', 'en');
    check('setAccountUiLanguage grava _meta.uiLanguage', env.db.row._meta.uiLanguage === 'en');
    check('preserva progresso de todos os idiomas', env.db.row.frances.xp === 10 && env.db.row.mandarim.xp === 3);
    check('preserva currentLearningLanguage', env.db.row._meta.currentLearningLanguage === 'zh');
    await env.sb.setCurrentLearningLanguage('u1', 'fr');
    check('setCurrentLearningLanguage preserva uiLanguage', env.db.row._meta.uiLanguage === 'en' && env.db.row._meta.currentLearningLanguage === 'fr');
    let threw = false; try { await env.sb.setAccountUiLanguage('u1', 'es'); } catch (e) { threw = true; }
    check('es (congelado) é rejeitado', threw && env.db.row._meta.uiLanguage === 'en');
    threw = false; try { await env.sb.setAccountUiLanguage('u1', '<x>'); } catch (e) { threw = true; }
    check('valor inválido é rejeitado', threw);
    check('normaliza "EN"', env.sb.normalizeAccountUiLanguage('EN') === 'en');
    check('normaliza "pt-br"', env.sb.normalizeAccountUiLanguage('pt-br') === 'pt-BR');
    check('uiLanguageFromProgressData sem _meta -> null', env.sb.uiLanguageFromProgressData({ frances: {} }) === null);
    check('uiLanguageFromProgressData null -> null', env.sb.uiLanguageFromProgressData(null) === null);
    check('getAccountUiLanguage lê a conta', (await env.sb.getAccountUiLanguage('u1')) === 'en');
    const empty = makeAuthEnv({ row: null });
    await empty.sb.setAccountUiLanguage('u2', 'pt-BR');
    check('cria _meta em linha inexistente', empty.db.row._meta.uiLanguage === 'pt-BR');
  }

  // ---------- auth.js: conta > navegador > pt-BR ----------
  {
    const env = makeAuthEnv({ row: { frances: { xp: 1 }, _meta: { uiLanguage: 'en' } } });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.applyAccountUiLanguage();
    check('antes de loadState, não aplica nada', env.setUiCalls.length === 0);
    await env.sb.loadState();
    check('loadState lê _meta.uiLanguage (sem ida extra)', env.run('progressAccountUiLanguage') === 'en');
    await env.sb.applyAccountUiLanguage();
    check('conta vence o navegador: setUiLang(en)', env.setUiCalls.join() === 'en' && env.getUi() === 'en');
    await env.sb.applyAccountUiLanguage();
    check('idempotente (já é en)', env.setUiCalls.length === 1);
  }
  {
    const env = makeAuthEnv({ row: { frances: { xp: 1 } }, uiLang: 'en' });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState(); await env.sb.applyAccountUiLanguage();
    check('conta sem uiLanguage: mantém o navegador', env.setUiCalls.length === 0 && env.getUi() === 'en');
    check('conta sem uiLanguage: não grava sozinho', env.db.upserts.length === 0);
  }
  {
    const env = makeAuthEnv({ row: { _meta: { uiLanguage: 'en' } }, search: '?ui=pt-BR' });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState(); await env.sb.applyAccountUiLanguage();
    check('?ui= na URL vence a conta nesta aba', env.setUiCalls.length === 0);
  }
  {
    const env = makeAuthEnv({ row: { _meta: { uiLanguage: 'es' } } });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState(); await env.sb.applyAccountUiLanguage();
    check('valor da conta fora da lista (es) é ignorado', env.setUiCalls.length === 0);
  }

  // ---------- persistência (escolha explícita no seletor) ----------
  {
    const env = makeAuthEnv({ row: { frances: { xp: 1 } } });
    check('convidado: persist não grava', (await env.sb.persistUiLanguageToAccount('en')) === false && env.db.upserts.length === 0);
    env.run("CURRENT_USER = { id: 'u1' };");
    const r = await env.sb.persistUiLanguageToAccount('en');
    check('antes do progresso carregar: não grava (pendente)', r === false && env.db.upserts.length === 0 && env.run('pendingAccountUiLanguage') === 'en');
    await env.sb.loadState();
    await env.sb.applyAccountUiLanguage();
    check('depois de loadState: grava o pendente', env.db.row._meta.uiLanguage === 'en' && env.run('pendingAccountUiLanguage') === null);
    check('pendente não é sobrescrito pelo valor antigo da conta', env.setUiCalls.length === 0);
    check('progresso preservado', env.db.row.frances.xp === 1);
    check('persist inválido não grava', (await env.sb.persistUiLanguageToAccount('es')) === false);
  }

  // ---------- saveState e _meta ----------
  {
    const env = makeAuthEnv({ row: { frances: { xp: 1, totalReviews: 0, totalAudioPlays: 0 }, _meta: { uiLanguage: 'en', currentLearningLanguage: 'fr' } } });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState();
    await env.sb.saveState();
    check('saveState preserva _meta.uiLanguage', env.db.row._meta.uiLanguage === 'en' && env.db.row._meta.currentLearningLanguage === 'fr');
    check('serializeState não carrega uiLanguage', !('uiLanguage' in env.db.row.frances));
  }
  {
    // Corrida: saveState lê a linha ANTES da troca e grava DEPOIS dela.
    const env = makeAuthEnv({ row: { frances: { xp: 1, totalReviews: 0, totalAudioPlays: 0 } }, upsertDelayMs: 40 });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState();
    const saving = env.sb.saveState();
    await sleep(5);
    const persisting = env.sb.persistUiLanguageToAccount('en');
    await Promise.all([saving, persisting]);
    check('corrida: uiLanguage sobrevive ao saveState concorrente', env.db.row._meta && env.db.row._meta.uiLanguage === 'en', env.db.row);
    check('corrida: progresso salvo', env.db.row.frances.xp === 5);
  }
  {
    // saveState com pendente inclui o uiLanguage no mesmo merge.
    const env = makeAuthEnv({ row: { frances: { xp: 1, totalReviews: 0, totalAudioPlays: 0 } } });
    env.run("CURRENT_USER = { id: 'u1' }; progressLoadedOk = true; pendingAccountUiLanguage = 'en';");
    await env.sb.saveState();
    check('saveState grava pendente junto', env.db.row._meta.uiLanguage === 'en');
  }
  {
    const env = makeAuthEnv({ row: { _meta: { uiLanguage: 'en' } } });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.sb.loadState();
    env.run("pendingAccountUiLanguage = 'pt-BR'; CURRENT_USER = null; pendingAccountUiLanguage = null; progressAccountUiLanguage = null;");
    check('logout limpa estado (sem vazar para a próxima conta)', env.run('pendingAccountUiLanguage') === null);
    const src = fs.readFileSync(path.join(ROOT, 'shared/auth.js'), 'utf8');
    check('SIGNED_OUT zera pendente/lido', /SIGNED_OUT[\s\S]{0,200}pendingAccountUiLanguage = null;[\s\S]{0,80}progressAccountUiLanguage = null;/.test(src));
    check('serializeState nunca menciona uiLanguage', !/serializeState[^\n]*uiLanguage/.test(src));
  }

  // ---------- i18n.js: seletor chama a persistência; <html lang> ----------
  {
    const store = {}; const html = {}; const listeners = {}; const persisted = [];
    const sel = { value: 'pt-BR', attrs: {}, getAttribute(k){ return this.attrs[k] || null; }, setAttribute(k, v){ this.attrs[k] = v; }, addEventListener(t, f){ listeners[t] = f; } };
    const sb = {
      console: { warn(){}, log(){} }, URLSearchParams, Intl, Promise, Object, String, Number,
      CustomEvent: function(n, o){ this.type = n; this.detail = o && o.detail; },
      location: { search: '' },
      localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
      dispatchEvent(){}, addEventListener(){},
      persistUiLanguageToAccount: l => { persisted.push(l); return Promise.resolve(true); },
      document: {
        currentScript: { src: 'http://x/shared/i18n/i18n.js' }, readyState: 'complete',
        documentElement: { setAttribute: (k, v) => { html[k] = v; } },
        head: { appendChild: (s) => {
          const lang = s.src.match(/([\w-]+)\.js$/)[1];
          vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/i18n', lang + '.js'), 'utf8'), sb);
          setTimeout(() => s.onload && s.onload(), 0);
        } },
        createElement: () => ({}), querySelectorAll: () => [], addEventListener(){},
        getElementById: id => id === 'ui-language-select' ? sel : null,
      },
    };
    sb.window = sb;
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/i18n/pt-BR.js'), 'utf8'), sb);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/i18n/i18n.js'), 'utf8'), sb);
    check('<html lang> inicial pt-BR', html.lang === 'pt-BR');
    sel.value = 'en'; listeners.change();
    await sleep(20);
    check('seletor chama persistUiLanguageToAccount(en)', persisted.join() === 'en');
    check('<html lang> vira en', html.lang === 'en' && store['ui-language'] === 'en');
    await sb.setUiLang('pt-BR');
    check('setUiLang programático (conta) não regrava a conta', persisted.length === 1 && html.lang === 'pt-BR');
    check('fmtNumber/fmtDate/tp existem', typeof sb.fmtNumber === 'function' && typeof sb.fmtDate === 'function' && typeof sb.tp === 'function');
  }

  console.log(`\n${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
