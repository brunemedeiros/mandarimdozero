// Etapa 3 (Banco > aluno): "O que foi digitado ao errar" em cada item (erro em vermelho pela peça da Revisão) e o bloco
// "Itens com erros seguidos" na aba Desempenho (3 erros seguidos ou mais; turma conta por pessoa). fr e zh, claro e escuro,
// 1200 e 390, pt-BR e en. Dados de exemplo no estado do Banco (sem rede).
// Rodar: node tests/banco-revisao-resposta-digitada/test_etapa3_playwright.js   (SHOTS=dir para salvar prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), SHOTS = process.env.SHOTS || '';
const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

// Estado do Banco: Ana (individual) com 3 itens; Turma "Bia e Caio" (por pessoa).
const SEED = () => {
  const d = n => { const t = new Date(Date.now() - n * 86400000); return t.toISOString().slice(0, 10); };
  const ts = n => new Date(Date.now() - n * 86400000).toISOString();
  const rv = (id, item, sid, who, outcome, n, typed, via) => ({ id, item_id: item, bank_student_id: sid, student_id: who, outcome, grade: outcome === 'errou' ? 0 : 2, typed: !!typed, typed_text: typed || null, via: via || 'casa', review_date: d(n), created_at: ts(n) });
  RB.ready = true; RB.view = 'students'; RB.settings = { auto_generate: true, manual_markdown: '' }; RB.classrooms = [{ id: 7, name: 'Bia e Caio', members: [] }];
  RB.links = [{ student_id: 'b', language_app_key: 'frances', display_name: 'Bia', status: 'active' }, { student_id: 'c', language_app_key: 'frances', display_name: 'Caio', status: 'active' }];
  RB.students = [{ id: 'S1', name: 'Ana (exemplo)', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', linked_student_id: 'a', lesson_dates: [] },
    { id: 'S2', name: 'Bia e Caio (exemplo)', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', classroom_id: 7, lesson_dates: [] }];
  const base = { language_app_key: 'frances', status: 'aprovado', class_date: d(20), teacher_flashcard_id: 1 };
  RB.itemsBy.S1 = [
    Object.assign({ id: 'i1', bank_student_id: 'S1', item_type: 'erro', wrong_form: "Je n'ai besoin de payer.", question: 'Eu não precisei pagar.', answer: "Je n'ai pas eu besoin de payer.", explanation: 'Passé composé na negação: ne + avoir + pas + particípio.' }, base),
    Object.assign({ id: 'i2', bank_student_id: 'S1', item_type: 'estrutura', question: 'Eu vou à feira no sábado.', answer: 'Je vais au marché le samedi.', gap_word: 'au' }, base),
    Object.assign({ id: 'i3', bank_student_id: 'S1', item_type: 'vocabulario', question: 'o queijo', answer: 'le fromage' }, base)];
  RB.reviewsBy.S1 = [
    rv('r1', 'i1', 'S1', 'a', 'errou', 1, "Je n'ai pas besoin de payer."), rv('r2', 'i1', 'S1', 'a', 'errou', 3, "Je n'ai pas eu besoin payer."), rv('r3', 'i1', 'S1', 'a', 'errou', 6, "Je n'ai besoin pas de payer."),
    rv('r4', 'i1', 'S1', 'a', 'acertou', 12, null, 'aula'),
    rv('r5', 'i2', 'S1', 'a', 'acertou', 1, null), rv('r6', 'i2', 'S1', 'a', 'errou', 4, 'à'),
    rv('r7', 'i3', 'S1', 'a', 'errou', 2, null, 'aula')];
  RB.itemsBy.S2 = [Object.assign({ id: 'j1', bank_student_id: 'S2', item_type: 'erro', wrong_form: 'Je suis allé au le cinéma.', question: 'Eu fui ao cinema.', answer: 'Je suis allé au cinéma.' }, base)];
  // Bia errou 3 seguidas; o Caio acertou no meio: o alerta vale pela Bia.
  RB.reviewsBy.S2 = [rv('q1', 'j1', 'S2', 'c', 'acertou', 1, null), rv('q2', 'j1', 'S2', 'b', 'errou', 2, 'Je suis allé à le cinéma.'), rv('q3', 'j1', 'S2', 'b', 'errou', 4, 'Je suis allée au cinema.'), rv('q4', 'j1', 'S2', 'b', 'errou', 7, null, 'aula')];
  RB.summary = { S1: { total: 3, pendente: 0, aprovado: 3, cortado: 0 }, S2: { total: 1, pendente: 0, aprovado: 1, cortado: 0 } };
  RB.recapBy = { S1: null, S2: null }; RB.reqBy = { S1: [], S2: [] };
  RB.cur = 'S1'; RB.tab = 'desempenho'; RB.filter = 'todos';
  const el = document.getElementById('admin-reviewbank-content');
  const main = document.createElement('main'); main.style.cssText = 'max-width:900px;margin:0 auto;padding:16px;';
  [...document.body.children].forEach(c => { c.style.display = 'none'; }); document.body.appendChild(main); main.appendChild(el); el.removeAttribute('hidden'); el.style.display = 'block';
  document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'auto';
  if (!el.dataset.rbWired){ el.dataset.rbWired = '1'; rbWire(el); }
  rbRender();
};
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const browser = await chromium.launch(); const errors = [];
  const runs = [['fr', 'light', 1200, 'pt-BR'], ['fr', 'dark', 390, 'pt-BR'], ['zh', 'light', 390, 'pt-BR'], ['zh', 'dark', 1200, 'pt-BR'], ['fr', 'light', 1200, 'en']];
  for (const [lang, theme, width, ui] of runs) {
    const tag = `${lang}-${theme}-${width}-${ui}`;
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 1000 }, colorScheme: theme, deviceScaleFactor: SHOTS ? 2 : 1 });
    const page = await ctx.newPage(); page.on("pageerror", e => errors.push(`${tag}: ${e.message} @ ${(e.stack || "").split("\n").slice(1, 3).join(" ")}`));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\/shared\/vendor\/supabase-js/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((ui) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', ui); } catch (e) {} }, ui);
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && typeof rbRender === 'function', null, { timeout: 15000 });
    const L = (n, c, x) => check(`${tag} ${n}`, c, x);
    const ev = (fn, a) => page.evaluate(fn, a);
    await ev((theme) => document.documentElement.setAttribute('data-theme', theme), theme);
    await ev(SEED);
    const shot = async (name, sel) => { if (!SHOTS) return; await page.waitForTimeout(200); const el = sel ? await page.$(sel) : null; await (el || page).screenshot(Object.assign({ path: `${SHOTS}/${tag}-${name}.png` }, el ? {} : { fullPage: true })); };
    // Desempenho: bloco de erros seguidos (só o "Je n'ai besoin de payer")
    const box = await ev(() => { const b = document.querySelector('.rb-struggle'); return b && { n: b.querySelectorAll('.rb-struggle-item').length, txt: b.textContent, red: b.querySelectorAll('.conj-x, .conj-gap').length }; });
    L('Desempenho: bloco "erros seguidos" com 1 item', box && box.n === 1 && box.txt.includes("Je n'ai pas eu besoin de payer."), box);
    L('Desempenho: mostra as últimas respostas digitadas com o erro marcado', box && box.red > 0 && box.txt.includes(ui === 'en' ? 'Missed the last 3' : 'Errou as últimas 3'), box);
    L('Desempenho: o bloco vem antes do "Desempenho (aula e casa)"', await ev(() => { const a = document.querySelector('.rb-struggle'), b = document.getElementById('rb-stats'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
    L('sem rolagem lateral', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await shot('desempenho', '#rb-student');
    // Ver item: vai para Itens, filtra e destaca
    await page.click('.rb-struggle [data-rb="goto-item"]');
    const go = await ev(() => ({ tab: RB.tab, items: [...document.querySelectorAll('#rb-list .rb-item')].map(x => x.dataset.item), focus: !!document.querySelector('.rb-item.is-focus[data-item="i1"]') }));
    L('Ver item: abre Itens com o item em destaque', go.tab === 'itens' && go.items.includes('i1') && go.focus, go);
    // Itens: todos
    await ev(() => { RB.q = ''; RB.filter = 'todos'; rbRender(); });
    const it = await ev(() => { const g = id => document.querySelector(`.rb-item[data-item="${id}"]`);
      const t = id => g(id).querySelector('.rb-typed'); return {
        tag1: !!g('i1').querySelector('.rb-tag.is-bad'), tag2: !!g('i2').querySelector('.rb-tag.is-bad'), tag3: !!g('i3').querySelector('.rb-tag.is-bad'),
        n1: t('i1') && t('i1').querySelectorAll('.rb-typed-list li').length, open1: t('i1') && t('i1').open, red1: t('i1') && t('i1').querySelectorAll('.conj-x, .conj-gap').length,
        t2: t('i2') && t('i2').textContent, open2: t('i2') && t('i2').open, t3: !!t('i3'), exp2: t('i2') && t('i2').querySelector('.rb-typed-exp').textContent }; });
    L('item com 3 erros seguidos: etiqueta vermelha; os outros não', it.tag1 && !it.tag2 && !it.tag3, it);
    L('item com erros seguidos: as 3 respostas digitadas, já aberto, com o erro marcado', it.n1 === 3 && it.open1 && it.red1 > 0, it);
    L('lacuna: compara com a palavra da lacuna ("au"), fechado', it.t2 && it.exp2.includes('au') && !it.open2 && !it.exp2.includes('samedi'), it);
    L('item sem texto digitado: sem o bloco', !it.t3, it);
    L('alvos de toque e rolagem lateral', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await shot('itens', '.rb-item[data-item="i1"]');
    await page.click('.rb-item[data-item="i2"] .rb-typed > summary');
    await shot('lacuna', '.rb-item[data-item="i2"]');
    // Turma: conta por pessoa e mostra quem digitou
    await ev(() => { RB.cur = 'S2'; RB.tab = 'desempenho'; rbRender(); });
    const tm = await ev(() => { const b = document.querySelector('.rb-struggle'); return b && { n: b.querySelectorAll('.rb-struggle-item').length, who: b.textContent.includes('Bia') }; });
    L('turma: a Bia errou 3 seguidas (o acerto do Caio não apaga)', tm && tm.n === 1 && tm.who, tm);
    await shot('turma', '#rb-student');
    // Sem erros seguidos: o bloco some
    await ev(() => { RB.reviewsBy.S2 = RB.reviewsBy.S2.map(r => Object.assign({}, r, { outcome: 'acertou' })); rbRender(); });
    L('sem erros seguidos: o bloco não aparece', await ev(() => !document.querySelector('.rb-struggle')));
    if (ui === 'en'){
      await ev(() => { RB.cur = 'S1'; RB.tab = 'itens'; rbRender(); });
      const txt = await ev(() => [...document.querySelectorAll('.rb-typed summary, .rb-typed-exp, .rb-typed-note, .rb-tag.is-bad')].map(x => x.textContent).join(' | '));
      L('en: textos novos em inglês', /What was typed/.test(txt) && /Card answer/.test(txt) && !/digitado|Resposta do cartão|Errou/.test(txt), txt);
    }
    await ctx.close();
  }
  check('zero pageerror', errors.length === 0, errors);
  await browser.close(); server.close();
  console.log(`Banco Etapa 3 (navegador): ${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
