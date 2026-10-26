// Etapa 6 ("Voz da Prof. Brune"): boas-vindas da 1ª lição do CURSO + ajustes da mesma área (decisões da dona, 2026-10-26).
// Playwright/Chromium real, fr e zh, arquivos de produção; só o Supabase é trocado por um stub com a linha de progresso
// escolhida por cenário. Cobre:
//  - A (cartão antes da 1ª palavra) e B (bloco "Recado da Prof. Brune" na conclusão) aparecem uma vez por CURSO;
//  - curso com progresso não vê; curso novo de uma conta antiga vê; não repete no mesmo curso (marca salva no bloco do curso);
//  - sem nome: frase sem nome (nunca "Convidado"); site em inglês sem português no cartão e no bloco;
//  - janela da sequência só depois do "Continuar" (nunca por cima da tela "Lição concluída!"), sem avisos de XP por cima;
//  - XP com ⭐ (nunca ⚡) na conclusão; Ponto de verificação aprovado sem caixa de recompensa e sem crédito de XP;
//  - unidade pulada com um "Pulada" só (trilha e Mapa); Ponto de verificação no Mapa com selo "⭐ Premium" para quem não pode pular.
// Rodar: node tests/boas-vindas/test_playwright.js   (SHOTS=dir salva capturas; BV_THEME=dark roda no tema escuro)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

// spec: { name, blocks: { <blockKey>: { lessonIdx, completed, welcome, streak } } }. A linha é montada na hora da leitura
// (UNITS já existe), com a 1ª unidade do curso no estado pedido.
const STUB = (spec) => `(function(){
  window.__upserts = [];
  const SPEC = ${JSON.stringify(spec)};
  function yday(){ const d = new Date(Date.now() - 86400000); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function row(){
    const out = { _meta: {} };
    Object.keys(SPEC.blocks || {}).forEach(k => {
      const b = SPEC.blocks[k];
      const up = {};
      if (b.lessonIdx || b.completed || b.lastLesson){
        // A 1ª unidade é a mesma ideia nos dois sites; o id vem do conteúdo da página (só vale para o bloco desta página).
        const first = (typeof UNITS !== 'undefined' && UNITS[0]) ? UNITS[0].id : 1;
        const li = b.lastLesson && UNITS[0].lessons ? UNITS[0].lessons.length - 1 : (b.lessonIdx || 0);
        up[first] = { unlocked: true, started: true, completed: !!b.completed, lessonIdx: li, lessonMisses: {} };
      }
      const y = yday();
      out[k] = { unitProgress: up, xp: b.xp || 0, streak: b.streak || 0, lastStudyDay: b.streak ? y : null, activityLog: b.streak ? { [y]: 3 } : {} };
      if (b.welcome) out[k].welcome = b.welcome;
    });
    return Object.keys(out).length > 1 ? out : null;
  }
  const mk = (table) => { let single = false; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => {
        let data = single ? null : [];
        if (table === 'progress' && single){ const r = row(); data = r ? { data: r } : null; }
        return Promise.resolve({ data, error: null }).then(ok, ko);
      };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      if (p === 'upsert') return (payload) => { if (table === 'progress') window.__upserts.push(JSON.parse(JSON.stringify(payload))); return b; };
      return () => b; } }); return b; };
  const meta = SPEC.noName ? {} : { full_name: 'Ana Souza' };
  const user = { id: 'u-bv', email: 'ana@exemplo.com', user_metadata: meta, created_at: new Date().toISOString() };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'x' } } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let pass = 0, fail = 0;
const results = [];
function check(label, cond, extra){
  if (cond){ pass++; } else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra) : ''); }
  results.push((cond ? 'ok   ' : 'FALHA') + ' ' + label);
}

const BLOCK = { fr: 'frances', zh: 'mandarim' };
const PT_WORDS = /\b(você|lição|palavras?|Revisão|Sequência|Missões|Começar|Leva|Mandou|Oi\b|já|hoje|amanhã|vezes)\b/i;

async function openApp(browser, base, app, lang, spec, opts){
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block',
    colorScheme: opts.theme || process.env.BV_THEME || 'light', locale: lang, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ lang }) => { try { localStorage.setItem('ui-language', lang); localStorage.setItem('ui-language-gate', lang); } catch (e) {} }, { lang });
  // O zh de hoje não tem módulos (sem Ponto de verificação nem "Pulada"): para conferir as mesmas telas comuns, injeta
  // módulos FALSOS só nesta página (mesma técnica de tests/paridade-sites/test_modulos_niveis_zh_playwright.js).
  if (opts.fakeModules) await ctx.addInitScript(() => {
    window.MODULES = [
      { id: 'HSK1-m1', level: 'HSK1', unitIds: [1, 2, 3], title: 'Primeiros contatos' },
      { id: 'HSK1-m2', level: 'HSK1', unitIds: [4, 5, 6], title: 'Família e números' },
      { id: 'HSK1-m3', level: 'HSK1', unitIds: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], title: 'Dia a dia' },
    ];
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB(spec) }));
  await page.goto(`${base}/${app}/index.html`);
  await page.waitForFunction(() => CURRENT_USER && CURRENT_USER.id && progressLoadedOk, null, { timeout: 25000 });
  await page.waitForTimeout(1500);
  if ((opts.theme || process.env.BV_THEME) === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  return { ctx, page, errs };
}

async function shot(page, name, full){ if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }); }

const streakModalVisible = (page) => page.evaluate(() => { const o = document.getElementById('streak-modal-overlay'); return !!o && getComputedStyle(o).display !== 'none'; });

// Abre a lição atual da 1ª unidade (mesmo que clicar no cabeçalho da unidade na trilha).
async function openFirstUnit(page){
  await page.evaluate(() => { const u = UNITS[0]; const h = [...document.querySelectorAll('.unit-block .ub-header')].find(x => x.getClientRects().length && x.textContent.includes(u.title)); if (h) h.click(); else openUnitDetail(u.id); });
  await page.waitForTimeout(900);
}

// Anda pela lição respondendo certo até a tela de conclusão. Devolve true se chegou.
async function walkLesson(page){
  let miss = 0;
  for (let i = 0; i < 700; i++){
    const done = await page.evaluate(() => !!document.querySelector('#step-content .lesson-complete'));
    if (done) return true;
    const acted = await page.evaluate(() => {
      const vis = el => el && el.getClientRects().length && getComputedStyle(el).display !== 'none';
      const c = document.getElementById('step-content');
      const next = document.getElementById('step-next-btn');
      if (vis(next) && !next.disabled){ next.click(); return 'next'; }
      // O botão de seguir mais recente (o último da tela) é o que vale.
      const cont = [...document.querySelectorAll('#step-content button.btn-primary, #step-content button.wrong-feedback-continue, #step-content .correct-feedback button, #step-content button.btn-secondary')].filter(b => vis(b) && !b.disabled).pop();
      const ex = (typeof STEP_STATE !== 'undefined' && STEP_STATE.exerciseList) ? STEP_STATE.exerciseList[STEP_STATE.exerciseIndex] : null;
      const opts = [...c.querySelectorAll('.exercise-option:not(.disabled)')].filter(vis);
      if (opts.length && ex && ex.options){ const k = ex.options.findIndex(o => o === ex.item); const b = c.querySelector(`.exercise-option[data-idx="${k}"]`); if (b && !b.classList.contains('disabled')){ b.click(); return 'certa'; } }
      if (cont){ cont.click(); return 'cont'; }
      const idk = [...c.querySelectorAll('button')].find(b => vis(b) && !b.classList.contains('disabled') && /Não sei|I don.t know/i.test(b.innerText));
      if (idk){ idk.click(); return 'naosei'; }
      if (opts.length){ opts[0].click(); return 'opt'; }
      const any = [...c.querySelectorAll('button')].find(b => vis(b) && !b.disabled && !b.classList.contains('disabled') && !b.classList.contains('audio-btn') && (b.innerText || '').trim());
      if (any){ any.click(); return 'qualquer'; }
      return null;
    });
    if (!acted){ if (++miss > 6){ if (process.env.DBG) console.log('travou:', await page.evaluate(() => document.getElementById('step-content').innerHTML.slice(0, 1500))); return false; } await page.waitForTimeout(600); continue; }
    miss = 0;
    if (process.env.DBG2) console.log(i, acted, await page.evaluate(() => STEP_STATE.exerciseIndex + ' ' + (STEP_STATE.exerciseList[STEP_STATE.exerciseIndex]||{}).format));
    await page.waitForTimeout(260);
  }
  return false;
}

async function clickNext(page){
  await page.evaluate(() => document.getElementById('step-next-btn').click());
}

async function scenarioNewCourse(browser, base, app, lang){
  const tag = `${app}/${lang}`;
  const { ctx, page, errs } = await openApp(browser, base, app, lang, { blocks: {} });
  await openFirstUnit(page);
  const a = await page.evaluate(() => {
    const s = document.querySelector('#step-content .bv-a');
    const btn = document.getElementById('step-next-btn');
    return { has: !!s, text: s ? s.innerText : '', focusId: document.activeElement && document.activeElement.id, btn: btn.innerText.trim(),
      btnH: Math.round(btn.getBoundingClientRect().height), photo: !!(s && s.querySelector('img.bv-foto[src$="icons/brune-email.jpg"][alt=""]')),
      marked: !!(STATE.welcome && STATE.welcome.a), over: document.documentElement.scrollWidth > window.innerWidth };
  });
  check(`${tag}: A aparece antes da 1ª palavra`, a.has, a);
  check(`${tag}: A com o nome (Ana) e sem "Convidado"/"Guest"`, /\bAna\b/.test(a.text) && !/Convidado|Guest/.test(a.text));
  check(`${tag}: A diz "poucos minutos" (sem "3 minutos")`, lang === 'en' ? /few minutes/.test(a.text) : /Leva poucos minutos\./.test(a.text) && !/3 minutos/.test(a.text), a.text);
  check(`${tag}: foco no título do cartão A`, a.focusId === 'bv-a-title', a.focusId);
  check(`${tag}: botão do cartão A com 44px ou mais`, a.btnH >= 44, a.btnH);
  check(`${tag}: foto da Prof. Brune (alt vazio)`, a.photo);
  check(`${tag}: A marcado no progresso do curso ao aparecer`, a.marked);
  check(`${tag}: sem rolagem horizontal (390px)`, !a.over);
  if (lang === 'en') check(`${tag}: cartão A sem português`, !PT_WORDS.test(a.text), a.text.match(PT_WORDS));
  await shot(page, `A-${app}-${lang}`);
  await clickNext(page);
  await page.waitForTimeout(500);
  const afterA = await page.evaluate(() => ({ bv: !!document.querySelector('#step-content .bv-a'), card: !!document.querySelector('#step-content .vocab-card'),
    back: getComputedStyle(document.getElementById('step-back-btn')).display }));
  check(`${tag}: "Começar a lição" leva à 1ª palavra`, !afterA.bv && afterA.card, afterA);
  check(`${tag}: Voltar não aparece na 1ª palavra (não volta ao cartão A)`, afterA.back === 'none', afterA.back);
  const lastBtn = await (async () => {
    // Última palavra do bloco: o botão diz "Continuar →" (não "Ver o que você aprendeu").
    for (let i = 0; i < 8; i++){
      const s = await page.evaluate(() => ({ intro: STEP_STATE.acq.phase === 'intro', last: STEP_STATE.acq.introIdx === STEP_STATE.acq.blocks[STEP_STATE.acq.blockIdx].length - 1, txt: document.getElementById('step-next-btn').innerText.trim() }));
      if (!s.intro) return null;
      if (s.last) return s.txt;
      await clickNext(page); await page.waitForTimeout(300);
    }
    return null;
  })();
  check(`${tag}: último cartão de palavra com "Continuar →"`, lastBtn === (lang === 'en' ? 'Continue →' : 'Continuar →'), lastBtn);
  const reached = await walkLesson(page);
  check(`${tag}: chegou à tela "Lição concluída!"`, reached);
  await page.waitForTimeout(1300);
  const b = await page.evaluate(() => {
    const c = document.getElementById('step-content');
    const blk = c.querySelector('.bv-b');
    const lcs = [...c.querySelectorAll('.lc-stat-value')].map(x => x.innerText);
    return { has: !!blk, text: blk ? blk.innerText : '', all: c.innerText, lcs, marked: !!(STATE.welcome && STATE.welcome.b), xp: STATE.xp,
      chip: !!c.querySelector('.challenge-chip, .lesson-challenge-chip'), toasts: [...document.querySelectorAll('#toast-layer .toast')].map(t => t.innerText) };
  });
  check(`${tag}: B aparece na conclusão da 1ª lição`, b.has, b.all.slice(0, 200));
  check(`${tag}: B com os números reais (XP, 3 palavras, sequência 1)`, b.has && new RegExp('\\b' + (b.lcs[0] || '').replace(/[^0-9]/g, '') + ' XP').test(b.text) && /\b3\b/.test(b.text) && /\b1\b/.test(b.text), { t: b.text, lcs: b.lcs });
  check(`${tag}: XP ganho com ⭐ (sem ⚡)`, /⭐/.test(b.lcs[0] || '') && !/⚡/.test(b.all), b.lcs);
  check(`${tag}: B marcado no progresso do curso`, b.marked);
  check(`${tag}: sem avisos "+N XP" por cima da tela com o bloco B`, !b.toasts.some(x => /XP/.test(x)), b.toasts);
  {
    const sent = (x) => new Set(String(x).split(/[.!?:\n·]+/).map(y => y.trim().replace(/\d+/g, '#')).filter(y => y.length > 14));
    const sa = sent(a.text), common = [...sent(b.text)].filter(y => sa.has(y));
    check(`${tag}: A e B não repetem a mesma frase`, common.length === 0, common);
  }
  if (lang === 'en') check(`${tag}: bloco B sem português`, !PT_WORDS.test(b.text), b.text.match(PT_WORDS));
  check(`${tag}: janela da sequência NÃO aparece por cima da conclusão`, !(await streakModalVisible(page)));
  await shot(page, `B-${app}-${lang}`, true);
  await clickNext(page);
  await page.waitForTimeout(1200);
  const onTrail = await page.evaluate(() => getComputedStyle(document.getElementById('path-list-wrap')).display !== 'none');
  check(`${tag}: Continuar volta à trilha`, onTrail);
  check(`${tag}: 1ª lição com bloco B: janela da sequência pulada (mesmo conteúdo do bloco)`, !(await streakModalVisible(page)));
  // Bloco do curso: 'frances'/'mandarim' (pt-BR) ou 'frances@en'/'mandarim@en' (site em inglês).
  const saved = await page.evaluate((k) => { const last = window.__upserts[window.__upserts.length - 1]; if (!last || !last.data) return null;
    const key = Object.keys(last.data).find(x => x === k || x.startsWith(k + '@')); return key ? last.data[key].welcome : null; }, BLOCK[app]);
  check(`${tag}: marcas A e B gravadas no bloco do curso (não no _meta da conta)`, !!(saved && saved.a && saved.b), saved);
  const metaHas = await page.evaluate(() => window.__upserts.some(x => x.data && x.data._meta && x.data._meta.welcome));
  check(`${tag}: nada de welcome no _meta da conta`, !metaHas);
  // Lição 2 no mesmo curso: nem A nem B.
  await openFirstUnit(page);
  const a2 = await page.evaluate(() => !!document.querySelector('#step-content .bv-a'));
  check(`${tag}: não repete A no mesmo curso (lição 2)`, !a2);
  const reached2 = await walkLesson(page);
  await page.waitForTimeout(800);
  const b2 = await page.evaluate(() => !!document.querySelector('#step-content .bv-b'));
  check(`${tag}: não repete B no mesmo curso (lição 2)`, reached2 && !b2, { reached2, b2 });
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioOldCourseStreak(browser, base, app){
  const tag = `${app}/curso com progresso`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [BLOCK[app]]: { lessonIdx: 1, xp: 30, streak: 3 } } });
  await openFirstUnit(page);
  const a = await page.evaluate(() => !!document.querySelector('#step-content .bv-a'));
  check(`${tag}: não vê A`, !a);
  const reached = await walkLesson(page);
  check(`${tag}: chegou à conclusão`, reached);
  await page.waitForTimeout(1300);
  const b = await page.evaluate(() => ({ bv: !!document.querySelector('#step-content .bv-b'), pending: STATE.pendingStreakCelebration, xp: [...document.querySelectorAll('#step-content .lc-stat-value')].map(x => x.innerText) }));
  check(`${tag}: não vê B`, !b.bv);
  check(`${tag}: XP ganho com ⭐`, /⭐/.test(b.xp[0] || ''), b.xp);
  check(`${tag}: janela da sequência pendente, mas não por cima de "Lição concluída!"`, b.pending && !(await streakModalVisible(page)), b);
  await shot(page, `conclusao-sem-janela-${app}`);
  await clickNext(page);
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => ({ modal: getComputedStyle(document.getElementById('streak-modal-overlay')).display !== 'none',
    trail: getComputedStyle(document.getElementById('path-list-wrap')).display !== 'none',
    toasts: [...document.querySelectorAll('#toast-layer .toast')].length, n: (document.getElementById('streak-days-num') || {}).textContent }));
  check(`${tag}: janela da sequência aparece depois do Continuar, já na trilha`, m.modal && m.trail, m);
  check(`${tag}: nenhum aviso de XP empilhado por cima da janela`, m.toasts === 0, m.toasts);
  check(`${tag}: janela com a sequência certa (4)`, m.n === '4', m.n);
  await shot(page, `janela-depois-continuar-${app}`);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioUnitEnd(browser, base, app){
  // Última lição da unidade (Ponto de verificação da unidade): "Ponto de verificação concluído!" -> "Unidade concluída!"
  // -> Missões do dia -> trilha. A janela da sequência só aparece no fim, já na trilha.
  const tag = `${app}/fim da unidade`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [BLOCK[app]]: { lastLesson: true, xp: 60, streak: 2 } } });
  await openFirstUnit(page);
  const reached = await walkLesson(page);
  if (process.env.DBG) console.log('fim', await page.evaluate(() => ({ btns: [...document.querySelectorAll('#step-content button')].map(b => b.className + '|' + b.innerText.slice(0,20) + '|' + b.disabled + '|' + b.getClientRects().length), ex: STEP_STATE.exerciseList[STEP_STATE.exerciseIndex] && STEP_STATE.exerciseList[STEP_STATE.exerciseIndex].format, next: document.getElementById('step-next-btn').style.display })));
  check(`${tag}: chegou ao "Ponto de verificação concluído!"`, reached);
  await page.waitForTimeout(900);
  check(`${tag}: sem janela por cima do resultado`, !(await streakModalVisible(page)));
  await clickNext(page); await page.waitForTimeout(1300);
  const unitDone = await page.evaluate(() => STEP_STATE.onUnitCompleteScreen && !!document.querySelector('#step-content .lesson-complete'));
  check(`${tag}: tela "Unidade concluída!"`, unitDone);
  check(`${tag}: sem janela por cima de "Unidade concluída!"`, !(await streakModalVisible(page)));
  const xpIcon = await page.evaluate(() => (document.getElementById('uc-stat-xp') || {}).innerText || '');
  check(`${tag}: XP da unidade com ⭐`, /⭐/.test(xpIcon) && !/⚡/.test(xpIcon), xpIcon);
  await clickNext(page); await page.waitForTimeout(900);
  check(`${tag}: sem janela por cima das Missões do dia`, !(await streakModalVisible(page)));
  await clickNext(page); await page.waitForTimeout(900);
  const m = await page.evaluate(() => ({ modal: getComputedStyle(document.getElementById('streak-modal-overlay')).display !== 'none', trail: getComputedStyle(document.getElementById('path-list-wrap')).display !== 'none', toasts: document.querySelectorAll('#toast-layer .toast').length }));
  check(`${tag}: janela da sequência aparece de volta na trilha, sem avisos por cima`, m.modal && m.trail && m.toasts === 0, m);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioSecondCourse(browser, base, app){
  // Conta antiga (o OUTRO curso tem progresso e já viu as boas-vindas); este curso ainda não tem nada: vê A.
  const other = app === 'fr' ? 'mandarim' : 'frances';
  const tag = `${app}/segundo curso de conta antiga`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [other]: { lessonIdx: 2, completed: true, xp: 400, streak: 5, welcome: { a: '2026-10-01', b: '2026-10-01' } } } });
  await openFirstUnit(page);
  const a = await page.evaluate(() => !!document.querySelector('#step-content .bv-a'));
  check(`${tag}: vê A`, a);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioAOnlySeen(browser, base, app){
  // Curso sem lição concluída que já viu A (saiu pelo ✕): A não volta; B ainda aparece na 1ª conclusão.
  const tag = `${app}/A visto, sem lição`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [BLOCK[app]]: { welcome: { a: '2026-10-25' } } } });
  await openFirstUnit(page);
  const a = await page.evaluate(() => !!document.querySelector('#step-content .bv-a'));
  check(`${tag}: A não aparece de novo`, !a);
  await walkLesson(page);
  await page.waitForTimeout(800);
  const b = await page.evaluate(() => !!document.querySelector('#step-content .bv-b'));
  check(`${tag}: B aparece (marcado separado de A)`, b);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioNoName(browser, base, app){
  const tag = `${app}/sem nome`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: {}, noName: true });
  await openFirstUnit(page);
  const title = await page.evaluate(() => { const h = document.getElementById('bv-a-title'); return h ? h.innerText : ''; });
  check(`${tag}: título sem nome e sem "Convidado"`, title === 'Oi! Que bom ter você aqui.', title);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioCheckpoint(browser, base, app){
  const tag = `${app}/Ponto de verificação`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [BLOCK[app]]: { lessonIdx: 1, xp: 30, streak: 3 } } }, { fakeModules: app === 'zh' });
  const hasModules = await page.evaluate(() => typeof trailModules === 'function' && trailModules().length > 0);
  if (!hasModules){ check(`${tag}: site com módulos`, false); await ctx.close(); return; }
  const xp0 = await page.evaluate(() => STATE.xp);
  await page.evaluate(() => { openCheckpoint(trailModules()[0].id); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { CHECKPOINT_STATE.index = CHECKPOINT_STATE.queue.length; CHECKPOINT_STATE.score = CHECKPOINT_STATE.queue.length; renderCheckpointQuizStep(); });
  await page.waitForTimeout(1300);
  const scr = await page.evaluate(() => { const c = document.getElementById('step-content'); return { txt: c.innerText, labels: [...c.querySelectorAll('.lc-stat-label')].map(x => x.innerText), skills: c.querySelectorAll('.module-skill-item').length }; });
  check(`${tag}: tela de aprovado sem caixa de recompensa (sem Estrelas/XP)`, !/Estrelas|Stars|XP|⭐|⚡/.test(scr.txt), scr.labels);
  check(`${tag}: mostra a nota e o que a pessoa já sabe`, scr.labels.length === 1 && /Pontuação/i.test(scr.labels[0]) && scr.skills > 0, scr);
  check(`${tag}: sem janela da sequência por cima da tela de aprovado`, !(await streakModalVisible(page)));
  await shot(page, `checkpoint-aprovado-${app}`, true);
  await clickNext(page);
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ xp: STATE.xp, skipped: trailModules()[0].unitIds.filter(id => STATE.unitProgress[id].completedVia === 'skip_test').length }));
  check(`${tag}: pular NÃO credita XP`, after.xp === xp0, { xp0, after });
  check(`${tag}: unidades puladas`, after.skipped > 0, after);
  // fecha a janela da sequência, se abriu (a do dia)
  await page.evaluate(() => { const b = document.getElementById('streak-modal-continue-btn'); if (b && b.getClientRects().length) b.click(); });
  await page.evaluate(() => { const d = document.querySelector('.tvt-btn[data-view="trail"]'); if (d) d.click(); });
  await page.waitForTimeout(500);
  const trail = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.unit-block.skipped')];
    return blocks.map(b => ({ frac: (b.querySelector('.ub-frac') || {}).innerText || '', n: (b.querySelector('.ub-header').innerText.match(/Pulada/g) || []).length, grammar: b.classList.contains('grammar') }));
  });
  check(`${tag}: trilha: unidade pulada só com "Pulada" (uma vez, sem "lições")`, trail.length > 0 && trail.every(x => x.n === 1 && !/lições|\d/.test(x.frac)), trail);
  if (trail.some(x => x.grammar)) check(`${tag}: gramática pulada com "Pulada" uma vez só`, trail.filter(x => x.grammar).every(x => x.n === 1), trail);
  await shot(page, `trilha-pulada-${app}`);
  // Mapa: painel da unidade pulada.
  await page.evaluate(() => { const d = document.querySelector('.tvt-btn[data-view="map"]'); if (d) d.click(); });
  await page.waitForTimeout(500);
  const map = await page.evaluate(() => {
    const n = document.querySelector('.tm-node.tm-unit.skipped'); if (!n) return null;
    n.click();
    const p = document.querySelector('.tm-panel'); return { note: n.querySelector('.tm-note').innerText, panel: p.innerText };
  });
  check(`${tag}: Mapa: unidade pulada com "Pulada" e sem "N de N lições"`, map && /Pulada/.test(map.note) && !/lições/.test(map.panel) && (map.panel.match(/Pulada/g) || []).length === 1, map);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

async function scenarioMapPremium(browser, base, app, theme){
  const tag = `${app}/Mapa sem o recurso de pular (${theme})`;
  const { ctx, page, errs } = await openApp(browser, base, app, 'pt-BR', { blocks: { [BLOCK[app]]: { lessonIdx: 1, xp: 30, streak: 3 } } }, { theme, fakeModules: app === 'zh' });
  await page.evaluate(() => { TRAIL_SKIP_PAYWALL_ENABLED = true; window.planCan = () => false; planCan = () => false; renderUnitsGrid(); });
  await page.evaluate(() => { const d = document.querySelector('.tvt-btn[data-view="map"]'); if (d) d.click(); });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const n = document.querySelector('.tm-node.tm-checkpoint'); if (!n) return null;
    const note = n.querySelector('.tm-note'); const aria = n.getAttribute('aria-label');
    n.scrollIntoView({ block: 'center' });
    n.click();
    const p = document.querySelector('.tm-panel');
    return { note: note ? note.innerText : '', cls: note ? note.className : '', aria, status: (p.querySelector('.tm-status') || {}).innerText || '', actions: p.querySelectorAll('.tm-actions button').length, panel: p.innerText };
  });
  check(`${tag}: nó do Ponto com selo "⭐ Premium"`, r && /⭐\s*Premium/.test(r.note) && /tm-note-premium/.test(r.cls), r);
  check(`${tag}: painel com "⭐ Premium" no lugar de "Disponível" e sem botão`, r && /⭐\s*Premium/.test(r.status) && !/Disponível/.test(r.panel) && r.actions === 0, r);
  check(`${tag}: leitor de tela ouve "Premium"`, r && /Premium/.test(r.aria), r && r.aria);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const n = document.querySelector('.tm-node.tm-checkpoint'); if (n) n.scrollIntoView({ block: 'center' }); });
  await shot(page, `mapa-premium-${app}-${theme}`);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

function staticChecks(){
  // XP tem um ícone só (⭐); ⚡ só no Combo. As Estrelas foram aposentadas.
  const qit = fs.readFileSync(path.join(ROOT, 'shared/core/quase-iguais-textos.js'), 'utf8');
  check('estático: telas de conclusão sem ⚡ no XP', !/lc-stat-value[^\n]*⚡/.test(qit) && !/suffix: ' ⚡'/.test(qit));
  for (const app of ['fr', 'zh']){
    const s = fs.readFileSync(path.join(ROOT, app, 'app.js'), 'utf8');
    check(`estático: ${app} missão "Ganhe 50 XP" com ⭐`, /id:'xp50', icon:'⭐'/.test(s));
  }
  const mn = fs.readFileSync(path.join(ROOT, 'shared/core/modulos-niveis.js'), 'utf8');
  check('estático: tela de módulo concluído sem Estrelas', !/moduleDone\.stars|lc-stat-stars/.test(mn));
  for (const f of ['shared/i18n/pt-BR.js', 'shared/i18n/en.js']){
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(`estático: ${f} sem a chave das Estrelas`, !/'fr\.moduleDone\.stars'/.test(s));
    const block = s.split('\n').filter(l => /^\s*'welcome\./.test(l)).join('\n');
    check(`estático: ${f} textos novos sem "--" e sem "pra"`, !/--|\bpra\b/.test(block.replace(/\/\/.*$/gm, '')));
  }
  const gate = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('estático: entrada pula "Você já sabe algo de..." sem Teste de Nível', /if \(!target\.hasLevelTest\)\{ finalCallback\(langId, false\); return; \}/.test(gate));
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  if (!process.env.BV_ONLY) staticChecks();
  // BV_ONLY=nome roda só um cenário (depuração); BV_APPS=fr roda só um site.
  const only = process.env.BV_ONLY || '';
  const run = (name, fn) => (!only || only === name) ? fn() : null;
  for (const app of (process.env.BV_APPS || 'fr,zh').split(',')){
    await run('newPt', () => scenarioNewCourse(browser, base, app, 'pt-BR'));
    await run('newEn', () => scenarioNewCourse(browser, base, app, 'en'));
    await run('old', () => scenarioOldCourseStreak(browser, base, app));
    await run('second', () => scenarioSecondCourse(browser, base, app));
    await run('unitEnd', () => scenarioUnitEnd(browser, base, app));
    await run('aOnly', () => scenarioAOnlySeen(browser, base, app));
    await run('noName', () => scenarioNoName(browser, base, app));
    await run('checkpoint', () => scenarioCheckpoint(browser, base, app));
    await run('mapPremium', () => scenarioMapPremium(browser, base, app, process.env.BV_THEME || 'light'));
  }
  await browser.close(); server.close();
  if (process.env.VERBOSE) console.log(results.join('\n'));
  console.log(`\nboas-vindas: ${pass}/${pass + fail} ok`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
