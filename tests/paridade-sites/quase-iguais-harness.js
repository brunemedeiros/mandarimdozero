// Paridade, etapa 5d (docs/historico/30-paridade-quase-iguais.md): as funções que o fr/app.js e o zh/app.js ainda tinham
// em dobro foram para shared/core/. Este harness roda a MESMA sequência numa árvore (a de antes, num worktree, ou a de
// agora), no navegador de verdade, para um site (fr ou zh) e um idioma de site, e devolve uma lista de "cenas"
// (nome + HTML da tela + resumo do estado salvo). Relógio falso parado (o tempo só anda quando o harness manda), sorteio
// com semente fixa, rede cortada (Supabase de mentira). O "andador" responde cada passo da lição escolhendo com a semente
// entre os botões visíveis da tela (ou digitando a resposta certa, quase certa ou errada), então duas árvores que fazem o
// mesmo produzem exatamente as mesmas cenas; a primeira diferença aparece na cena em que o comportamento mudou.
// Cobertura: trilha (lista, Mapa, estados), abrir unidade, todas as lições de várias unidades até o fim (introdução do
// bloco, checagens, prática, diálogo, "Você entendeu?", consolidação, Ponto de verificação, telas de lição/unidade
// concluída), XP/missões/estado salvo depois de cada ação, Revisão (cartão normal, lacuna, digitar, com e sem reverso),
// Revisão rápida, Progresso, Configurações (cada seção), conquistas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

// Funções que rodam DENTRO da página (iguais nas duas árvores).
const PAGE_LIB = () => {
  window.__h = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  window.__vis = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; };
  // estado salvo, sem o que depende do relógio de parede de verdade (nada: o relógio é falso), resumido por hash + campos-chave
  window.__estado = () => {
    let ser = ''; try { ser = JSON.stringify(serializeState()); } catch (e) { ser = 'ERRO ' + e.message; }
    const d = STATE.daily || {};
    return { h: __h(ser), xp: STATE.xp, daily: JSON.stringify(d), missions: JSON.stringify(STATE.dailyMissions || STATE.missions || null), cur: STATE.currentUnitId, step: STEP_STATE.currentStep, exi: STEP_STATE.exerciseIndex, exn: (STEP_STATE.exerciseList || []).length, score: STEP_STATE.exerciseScore };
  };
  // resposta digitada para o exercício atual: certa, quase (sem a última letra) ou errada
  window.__resposta = (kind) => {
    let ex = null;
    const rev = document.getElementById('review-content');
    if (rev && rev.contains(document.activeElement) || (rev && __vis(rev) && rev.querySelector('input'))){
      const c = STATE.reviewQueue && STATE.reviewQueue[STATE.reviewIndex];
      let a = '';
      try { a = c ? String(cardAnswerText(c) || '') : ''; } catch (e) {}
      if (c && c.clozeAnswer) a = c.clozeAnswer;
      const m = (c && c.text || '').match(/\{\{c\d+::([^}:]+)/); if (m) a = m[1];
      if (kind === 'certa') return a; if (kind === 'quase') return a.slice(0, -1); return 'zzq';
    }
    ex = (STEP_STATE.exerciseList || [])[STEP_STATE.exerciseIndex] || null;
    const zh = location.pathname.includes('/zh/');
    const x = ex ? (ex.correctBlock || ex.item || ex.phrase || ex) : null;
    let a = x ? String((zh ? (x.p || x.c) : (x.f || '')) || '') : '';
    if (ex && ex.answer) a = String(ex.answer);
    if (kind === 'certa') return a; if (kind === 'quase') return a.slice(0, -1); return 'zzq';
  };
  // candidatos a clique dentro de um contêiner: botões e blocos visíveis, sem áudio/voltar/sair
  window.__candidatos = (root) => {
    const sel = 'button, [role="button"], .reorder-block, .match-tile, .mc-option, .tf-btn, .dlg-option, .cloze-option, #flashcard, .flashcard.clickable, .speed-option, .match-card';
    const out = [];
    root.querySelectorAll(sel).forEach(el => {
      if (!__vis(el) || el.disabled || el.classList.contains('used')) return;
      const id = el.id || '', cls = typeof el.className === 'string' ? el.className : '';
      if (/audio|speak|play|slow|stroke|pinyin-toggle|kbd|report|exit|back|close|accent-key|tone-key|picker|manual/i.test(id + ' ' + cls)) return;
      if (el.closest('.accent-picker, .pinyin-tone-picker, .fr-accent-picker')) return;
      if (/^(step-back-btn|back-to-path)$/.test(id)) return;
      out.push(el);
    });
    return out;
  };
  window.__desc = (el) => (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(/\s+/).slice(0, 2).join('.') + '[' + (el.textContent || '').trim().slice(0, 30) + ']';
  // uma ação: devolve a descrição (ou null se não há o que fazer)
  window.__acao = (rootSel, r) => {
    const root = document.querySelector(rootSel);
    if (!root) return null;
    // 1) campo de texto vazio visível: digitar
    const inp = [...root.querySelectorAll('input[type="text"], input:not([type]), textarea')].find(i => __vis(i) && !i.disabled && !i.readOnly && !i.value);
    if (inp){
      const kind = r < 0.5 ? 'certa' : (r < 0.75 ? 'quase' : 'errada');
      inp.value = __resposta(kind) || 'zzq';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const vb = [...root.querySelectorAll('button')].find(b => __vis(b) && !b.disabled && /verify|check|submit/i.test(b.id + ' ' + b.className));
      if (vb){ vb.click(); return 'digita ' + kind + ' + ' + __desc(vb); }
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return 'digita ' + kind + ' + Enter';
    }
    // 2) o botão do Enter (Continuar/Próximo), quando há
    let adv = null; try { adv = typeof findEnterAdvanceTarget === 'function' ? findEnterAdvanceTarget() : null; } catch (e) {}
    const cands = __candidatos(root);
    if (adv && __vis(adv) && !adv.disabled && (root.contains(adv) || rootSel === '#unit-detail-wrap') && r < 0.92){ adv.click(); return 'avança ' + __desc(adv); }
    if (!cands.length){ if (adv && __vis(adv) && !adv.disabled){ adv.click(); return 'avança ' + __desc(adv); } return null; }
    const el = cands[Math.floor(r * 997) % cands.length];
    el.click();
    return 'clica ' + __desc(el);
  };
};

async function abrir(browser, port, site, { lang = 'pt-BR', width = 1200, theme = null } = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: 'reduce', colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e) + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').replace(/http:\/\/127\.0\.0\.1:\d+/g, '')));
  await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(([lang, theme]) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); if (theme) localStorage.setItem('theme', theme); } catch (e) {}
    let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    window.__seed = (n) => { s = n; };
    let u = 0; if (window.crypto) { try { crypto.randomUUID = () => '00000000-0000-4000-8000-' + String(++u).padStart(12, '0'); } catch (e) {} }
    // rolagem suave anda no relógio de verdade (não no falso): vira instantânea, para a foto não depender do momento
    const inst = (o) => (o && typeof o === 'object') ? Object.assign({}, o, { behavior: 'instant' }) : o;
    const siv = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function(o){ return siv.call(this, inst(o)); };
    for (const k of ['scrollTo', 'scrollBy']){ const w = window[k]; window[k] = function(a, b){ return typeof a === 'object' ? w.call(window, inst(a)) : w.call(window, a, b); };
      const e = Element.prototype[k]; Element.prototype[k] = function(a, b){ return typeof a === 'object' ? e.call(this, inst(a)) : e.call(this, a, b); }; }
    window.speechSynthesis && (window.speechSynthesis.speak = () => {});
    HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); };
    window.__audio = [];
    const Real = window.Audio;
    window.Audio = function(src){ const a = new Real(); a.play = function(){ window.__audio.push(String(src || a.src || '').replace(/^.*\/(fr|zh)\//, '$1/') + '@' + a.playbackRate); return Promise.resolve(); }; return a; };
  }, [lang, theme]);
  await page.goto(`http://127.0.0.1:${port}/${site}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && STATE.cards && STATE.cards.length > 0, null, { timeout: 30000 });
  await page.clock.runFor(3000);
  await page.clock.pauseAt(new Date('2026-10-14T12:10:00Z'));
  await page.evaluate(PAGE_LIB);
  if (theme){
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important;scroll-behavior:auto !important}' });
  }
  return { ctx, page, errors };
}

// Sequência completa num site. Devolve [{ n: nome, v: valor }].
async function sequencia(browser, root, site, lang, opts = {}){
  const server = serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const { ctx, page, errors } = await abrir(browser, port, site, { lang, width: opts.width, theme: opts.theme });
  const cenas = [];
  const norm = (s) => String(s).replace(/127\.0\.0\.1:\d+/g, 'HOST').replace(/ tc-sticky/g, '');
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerHTML : null; }, sel);
  const cena = async (n, extra) => {
    const v = await page.evaluate(() => ({ e: __estado(), audio: window.__audio.splice(0).join(',') }));
    cenas.push({ n, v: norm(JSON.stringify(Object.assign(v, extra || {}))) });
    if (opts.onCena) await opts.onCena(n, page, cenas.length - 1);
  };
  const tick = async (ms = 1200) => { await page.clock.runFor(ms); };
  let rngS = 777;
  const rnd = () => (rngS = (rngS * 48271) % 2147483647) / 2147483647;

  // ---- 1. trilha zerada (lista e Mapa) e Progresso
  await page.evaluate(() => switchTab('path')); await tick();
  await page.evaluate(() => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); });
  await cena('trilha_zerada', { g: await html('#view-path') });
  const unidades = await page.evaluate(() => UNITS.filter(u => !u.hidden).map(u => ({ id: u.id, type: u.type || '', lessons: (u.lessons || []).length, level: u.level })));
  // ---- 2. lições: várias unidades até o fim (inclui gramática no fr)
  const escolhidas = [];
  const vocab = unidades.filter(u => u.type !== 'grammar');
  [0, 1, 2].forEach(i => vocab[i] && escolhidas.push(vocab[i].id));
  if (vocab.length > 6) escolhidas.push(vocab[Math.floor(vocab.length / 2)].id);
  const gram = unidades.find(u => u.type === 'grammar'); if (gram) escolhidas.push(gram.id);
  const maxAcoes = opts.maxAcoes || 900;
  let ordem = 0;
  for (const uid of (opts.unidades || escolhidas)){
   // variações de preferência: lacuna digitada a partir da 2ª unidade; no zh, pinyin escondido na 3ª
   const o = ordem++;
   await page.evaluate((o) => { try { localStorage.setItem(CLOZE_MODE_KEY, o >= 1 ? 'type' : 'choice'); } catch (e) {} if (typeof applyPinyinVisibility === 'function') applyPinyinVisibility(o === 2); }, o);
   for (let licao = 0; licao < (opts.maxLicoes || 12); licao++){
    const feita = await page.evaluate((id) => !!(STATE.unitProgress[id] && STATE.unitProgress[id].completed), uid);
    if (feita && licao > 0) break;
    await page.evaluate((id) => { switchTab('path'); openUnitDetail(id); }, uid); await tick();
    await cena('abre_' + uid + '_' + licao, { h: await html('#unit-detail-wrap') });
    let parado = 0, repetido = 0, ultimo = null;
    for (let k = 0; k < maxAcoes; k++){
      const fora = await page.evaluate(() => { const w = document.getElementById('unit-detail-wrap'); return !__vis(w) || !document.getElementById('view-path').classList.contains('active'); });
      if (fora) break;
      const a = await page.evaluate(([r]) => __acao('#unit-detail-wrap', r), [rnd()]);
      await tick();
      if (!a){ parado++; if (parado > 3) break; continue; }
      const h = await html('#unit-detail-wrap');
      if (h === ultimo){ repetido++; if (repetido > 6) { await cena(uid + '/' + licao + ' PRESO em ' + a, {}); break; } } else repetido = 0;
      ultimo = h;
      await cena(uid + '/' + licao + '#' + k + ' ' + a, { h });
    }
   }
    await page.evaluate(() => { if (document.getElementById('unit-detail-wrap').style.display !== 'none') exitToPath(); switchTab('path'); }); await tick();
    await cena('trilha_depois_' + uid, { g: await html('#units-grid') });
  }
  // Mapa da trilha
  await page.evaluate(() => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'map'); } catch (e) {} renderUnitsGrid(); }); await tick();
  await cena('trilha_mapa', { g: await html('#view-path') });
  await page.evaluate(() => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); }); await tick();
  // ---- 3. Revisão: tudo vencido (cartões das unidades estudadas), cada modo
  await page.evaluate(() => { const past = Date.now() - 3 * 86400000; STATE.cards.forEach(c => { if (c.reps > 0 || c.state > 0 || c.lastReview) c.due = past; }); });
  await page.evaluate(() => switchTab('review')); await tick();
  await cena('revisao_modos', { h: await html('#view-review') });
  for (const modo of ['flashcard', 'speed', 'hard', 'match']){
    const ok = await page.evaluate((m) => { try { switchTab('review'); openReviewSession(m); return true; } catch (e) { return 'ERRO ' + e.message; } }, modo); await tick();
    await cena('revisao_inicio_' + modo, { ok, h: await html('#view-review') });
    const rootSel = modo === 'speed' ? '#speed-review-content' : modo === 'match' ? '#match-review-content' : '#review-content';
    for (let k = 0; k < (opts.maxRevisao || 160); k++){
      const a = await page.evaluate(([s, r]) => __acao(s, r), [rootSel, rnd()]);
      await tick(modo === 'speed' ? 700 : 1200);
      if (!a) break;
      await cena('rev_' + modo + '#' + k + ' ' + a, { h: await html(rootSel) });
      const fim = await page.evaluate((s) => !__vis(document.querySelector(s)), rootSel);
      if (fim) break;
    }
    await page.evaluate(() => switchTab('review')); await tick();
  }
  // tipos de cartão na Revisão: trilha (palavra e frase) e cartões próprios de cada tipo (normal, com reverso, digitar,
  // lacuna nativa e antiga, múltipla escolha)
  const tipos = await page.evaluate(() => {
    const A = APP_KEY, zh = A !== 'frances';
    const F = (id, v) => ({ id, lang: null, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
    const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, owner_id: 'U', front: zh ? 'ni3 hao' : 'bonjour', back_hanzi: zh ? '你好' : undefined, front_pinyin: zh ? 'nǐ hǎo' : undefined, back_trans: 'olá', front_is_target_language: true }, extra);
    const rows = [mk(9001, {}), mk(9002, { card_generation_mode: 'normal_reversed', fields: [F('a', zh ? '你好' : 'merci'), F('b', 'obrigado')] }),
      mk(9003, { card_generation_mode: 'type_answer', fields: [F('a', zh ? '谢谢' : 'merci beaucoup'), F('b', 'muito obrigado')] }),
      mk(9004, { card_generation_mode: 'cloze', fields: [F('a', zh ? '我{{c1::是}}老师' : 'Je {{c1::suis}} ici'), F('b', 'Eu estou aqui')] }),
      mk(9005, { cloze_sentence: zh ? '我___学生' : 'Tu ___ ici', cloze_answer: zh ? '是' : 'es' }), mk(9006, { choices: ['olá', 'tchau', 'obrigado', 'sim'] })];
    rows.forEach(r => { STATE.cards.push(...buildCardFromSelfFlashcard(r)); });
    const seen = {};
    STATE.cards.forEach((c, i) => { const k = (c.origin || '') + '|' + (c.cardInstance && c.cardInstance.cardTypeId || '') + '|' + (c.type || '') + '|' + (c.studyKey ? String(c.studyKey).replace(/[0-9]+/g, '') : ''); if (!(k in seen)) seen[k] = i; });
    STATE.cards.filter(c => c.origin === 'self').forEach(c => { seen['self:' + c.id] = STATE.cards.indexOf(c); });
    return Object.entries(seen).slice(0, 20);
  });
  for (const [k, i] of tipos){
    await page.evaluate((i) => { switchTab('review'); openReviewSession('flashcard'); STATE.reviewSessionStartedAt = null; STATE.reviewQueue = [STATE.cards[i]]; STATE.reviewIndex = 0; STATE.reviewCardState = null; STATE.reviewSessionStartedAt = Date.now(); try { renderReviewView(); } catch (e) {} }, i); await tick();
    await cena('cartao_' + k, { h: await html('#review-content') });
    for (let j = 0; j < 4; j++){
      const a = await page.evaluate(([r]) => __acao('#review-content', r), [rnd()]); await tick();
      if (!a) break;
      await cena('cartao_' + k + '#' + j + ' ' + a, { h: await html('#review-content') });
    }
  }
  // ---- 4. Progresso, Configurações, conquistas
  await page.evaluate(() => switchTab('profile')); await tick();
  await cena('perfil', { h: await html('#view-profile') });
  await page.evaluate(() => switchTab('progress')); await tick();
  await cena('progresso', { h: await html('#view-progress') });
  const secoes = await page.evaluate(() => [...document.querySelectorAll('[data-settings-section]')].map(b => b.getAttribute('data-settings-section')).filter((v, i, a) => a.indexOf(v) === i));
  await page.evaluate(() => { try { switchTab('settings'); } catch (e) {} }); await tick();
  await cena('config', { h: await html('#view-settings') });
  for (const s of secoes){
    await page.evaluate((s) => { try { switchSettingsSection(s); } catch (e) {} }, s); await tick();
    await cena('config_' + s, { h: await html('#view-settings') });
  }
  await cena('conquistas', { m: await page.evaluate(() => { try { return JSON.stringify(collectBadgeMetrics()); } catch (e) { return 'ERRO ' + e.message; } }) });
  await cena('resumo', { s: await page.evaluate(() => JSON.stringify(computeProgressSummary())), sv: await page.evaluate(() => JSON.stringify(serializeState())) });
  await ctx.close(); server.close();
  return { cenas, errors };
}

module.exports = { sequencia, abrir, serve };
