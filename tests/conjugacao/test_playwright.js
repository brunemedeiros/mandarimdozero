// Conjugação (só fr): disposição da tabela de prática como num livro de
// conjugação (singular à esquerda, plural à direita, pronome na linha do
// campo), tempo único em largura cheia, listas da escolha agrupadas e
// celular sem rolagem horizontal. Playwright (Chromium real), claro/escuro.
// Harness do navegador de Decks (convidado + Supabase stubado).
// Rodar: node tests/conjugacao/test_playwright.js
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
  window.__DB = { decks: [], own_flashcards: [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return row[k] === v; }
    const exec = () => {
      const rows = (window.__DB[table] || []);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.patch));
        window.__writes.push({ table, op: 'update', patch: st.patch, ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (st.op === 'delete'){
        const hit = rows.filter(match);
        window.__DB[table] = rows.filter(r => !hit.includes(r));
        window.__writes.push({ table, op: 'delete', ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (table === 'decks') return rows.filter(match);
      return rows.filter(match);
    };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => Promise.resolve({ data: exec(), error: null }).then(ok, ko);
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
      if (prop === 'update') return (p) => { st.op = 'update'; st.patch = p; return b; };
      if (prop === 'delete') return () => { st.op = 'delete'; return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function fill(page, wrongIdx){
  await page.evaluate((w) => {
    const verb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex];
    document.querySelectorAll('.conj-field').forEach((f) => {
      const inp = f.querySelector('input'); if (!inp || inp.disabled) return;
      const exp = (getConjForms(verb, f.dataset.tense) || [])[Number(f.dataset.idx)] || '';
      inp.value = Number(f.dataset.idx) === w ? 'xxx' : exp;
    });
  }, wrongIdx);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const theme of ['light', 'dark']){
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, theme);
    const L = (n, c, x) => check(theme + ' ' + n, c, x);
    await page.evaluate(() => switchTab('conjugaison'));
    await page.waitForSelector('#conj-tense-list .conj-check-item');
    const sel = await page.evaluate(() => {
      const list = document.getElementById('conj-tense-list');
      const items = Array.from(list.querySelectorAll('.conj-tense-card'));
      const h3 = document.querySelector('.conj-sel-block h3');
      const verbsTop = document.getElementById('conj-search-input').getBoundingClientRect().top < list.getBoundingClientRect().top;
      return { n: items.length, ex: items.filter(i => i.querySelector('.conj-ex .conj-ex-verb') && i.querySelector('.conj-ex-tr')).length, verbsTop,
        caps: getComputedStyle(h3).textTransform, itemH: Math.round(Math.min(...items.map(i => i.getBoundingClientRect().height))) };
    });
    L('escolha: 8 cartões de tempo, cada um com frase de exemplo (verbo em destaque) e tradução', sel.n === 8 && sel.ex === 8, sel);
    L('escolha: verbos em cima, tempos embaixo', sel.verbsTop, sel);
    L('escolha: títulos sem caixa alta', sel.caps === 'none', sel.caps);
    L('escolha: itens com 44px de toque', sel.itemH >= 44, sel.itemH);

    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box .conj-field input');
    const lay = await page.evaluate(() => {
      const box = document.querySelector('.conj-tense-box').getBoundingClientRect();
      const grid = document.querySelector('.conj-tense-grid').getBoundingClientRect();
      const r = i => document.querySelector('.conj-field[data-idx="' + i + '"] input').getBoundingClientRect();
      const lab = i => document.querySelector('.conj-field[data-idx="' + i + '"] label').getBoundingClientRect();
      const p = [0, 1, 2, 3, 4, 5].map(r);
      return { single: document.querySelectorAll('.conj-tense-box').length === 1, full: Math.abs(box.width - grid.width) < 2,
        oneCol: p.every(x => x.left === p[0].left), down: p.every((x, i) => i === 0 || x.top > p[i - 1].top),
        labelLeft: lab(0).right <= p[0].left && Math.abs((lab(0).top + lab(0).bottom) / 2 - (p[0].top + p[0].bottom) / 2) < 6 };
    });
    L('prática: um tempo só ocupa a largura toda', lay.single && lay.full, lay);
    L('prática: as 6 pessoas na vertical (je ... ils)', lay.oneCol && lay.down, lay);
    L('prática: pronome à esquerda do campo, na mesma linha', lay.labelLeft, lay);

    await fill(page, 3);
    await page.click('#conj-verify-btn');
    await page.waitForSelector('.conj-field.wrong');
    const chk = await page.evaluate(() => ({ wrong: document.querySelector('.conj-field.wrong').dataset.idx, exp: document.querySelector('.conj-field.wrong .expected').textContent,
      ok: document.querySelectorAll('.conj-field.ok').length,
      okIc: document.querySelector('.conj-field.ok .conj-ic').textContent, wrongIc: document.querySelector('.conj-field.wrong .conj-ic').textContent,
      okColor: getComputedStyle(document.querySelector('.conj-field.ok .conj-answer-view')).borderTopColor,
      okAudio: !!document.querySelector('.conj-field.ok .conj-side .audio-btn') }));
    L('corrigir: erro mostra a forma certa e acertos ficam verdes', chk.wrong === '3' && chk.exp.includes('→') && chk.ok === 5, chk);
    L('corrigir: caixa certa com ✓ e áudio ao lado; errada com ✕', chk.okIc === '✓' && chk.wrongIc === '✕' && chk.okAudio, chk);
    L('zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- Fase 1 (pedagógica) ----
  {
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light');
    await page.evaluate(() => switchTab('conjugaison'));
    await page.waitForSelector('#conj-tense-list .conj-check-item');
    const sel = await page.evaluate(() => ({
      tenses: Array.from(document.querySelectorAll('#conj-tense-list .conj-tense-name')).map(s => s.textContent.trim()),
      sizes: Array.from(document.querySelectorAll('#conj-size-select option')).map(o => o.value).join(),
      size: document.getElementById('conj-size-select').value, hint: document.getElementById('conj-size-hint').textContent }));
    check('ordem dos tempos da autora, sem futur proche', sel.tenses.join('|') === 'Présent|Passé composé|Imparfait|Plus-que-parfait|Futur simple|Conditionnel présent|Subjonctif présent|Impératif', sel.tenses);
    check('tamanho da sessão: 3, 5, 8, 12 (8 marcado) e conta de formas', sel.sizes === '3,5,8,12' && sel.size === '8' && /48/.test(sel.hint), sel);
    await page.selectOption('#conj-size-select', '3');
    check('conta de formas acompanha o tamanho', /18/.test(await page.textContent('#conj-size-hint')));
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    const s1 = await page.evaluate(() => ({ n: CONJ_STATE.verbQueue.length, next: !!document.querySelector('.conj-verb-header.next'),
      bar: document.querySelector('.conj-progress-bar > i').style.width, acc: document.querySelectorAll('.conj-accents .fr-accent-key').length }));
    check('sessão com 3 verbos, sem "Próximo verbo", barra em 0%, teclas de acento', s1.n === 3 && !s1.next && s1.bar === '0%' && s1.acc >= 10, s1);

    // Acento entra no campo com o cursor; Enter passa para o próximo campo.
    await page.click('.conj-field[data-idx="1"] input');
    await page.click('.conj-accents .fr-accent-key:has-text("é")');
    const acc = await page.evaluate(() => document.querySelector('.conj-field[data-idx="1"] input').value);
    check('tecla de acento escreve no campo com o cursor', acc === 'é', acc);
    await page.keyboard.press('Enter');
    check('Enter passa para o próximo campo', await page.evaluate(() => document.activeElement === document.querySelector('.conj-field[data-idx="2"] input')));

    // parler no présent: nous "parlez" marca só "ez"; acertos ganham áudio.
    await page.evaluate(() => startConjSession(['parler', 'aller'], ['presente']));
    await page.waitForSelector('.conj-field input[data-idx]');
    await page.evaluate(() => {
      const v = ['parle', 'parles', 'parle', 'parlez', 'parlez', 'parlent'];
      document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = v[k]; });
    });
    await page.click('#conj-verify-btn');
    await page.waitForSelector('.conj-field.wrong');
    const d = await page.evaluate(() => ({ x: Array.from(document.querySelectorAll('.conj-field.wrong .conj-x')).map(e => e.textContent).join(''),
      view: document.querySelector('.conj-field.wrong .conj-answer-text').textContent, exp: document.querySelector('.conj-field.wrong .expected').textContent.trim(),
      audio: document.querySelectorAll('.conj-field .audio-btn').length, speak: document.querySelector('.conj-field[data-idx="3"] .audio-btn').dataset.speak,
      bar: document.querySelector('.conj-progress-bar > i').style.width, focus: document.activeElement && document.activeElement.id }));
    check('letras erradas em vermelho só onde erra (parlez -> "ez")', d.x === 'ez' && d.view === 'parlez' && d.exp.includes('parlons'), d);
    check('áudio em cada forma depois de corrigir, com o pronome', d.audio === 6 && d.speak === 'nous parlons', d);
    check('barra avança e o foco vai para "Próximo verbo"', d.bar === '50%' && d.focus === 'conj-next-verb-btn', d);

    // aller no passé composé, feminino: tudo certo; correção mostra allé(e).
    await page.evaluate(() => startConjSession(['aller'], ['passeCompose']));
    await page.waitForSelector('.conj-field input[data-idx]');
    await page.evaluate(() => {
      const v = ['suis allée', 'es allée', 'est allée', 'sommes allées', 'êtes allée', 'sont allées'];
      document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = v[k]; });
    });
    await page.click('#conj-verify-btn');
    const fem = await page.evaluate(() => ({ ok: document.querySelectorAll('.conj-field.ok').length, info: conjExpectedInfo('aller', 'passeCompose', 0).display,
      pl: conjExpectedInfo('aller', 'passeCompose', 3).display, assis: conjExpectedInfo("s'asseoir", 'passeCompose', 5).accepted }));
    check('passé composé com être aceita o feminino (6/6)', fem.ok === 6, fem);
    check('correção mostra allé(e) e allé(e)s; s\'asseoir sem "assiss"', fem.info === 'suis allé(e)' && fem.pl === 'sommes allé(e)s' && fem.assis.every(f => !/assiss/.test(f)), fem);

    // "Quase" amarelo (só acento) x acento que muda de tempo (erro).
    await page.evaluate(() => startConjSession(['parler'], ['passeCompose']));
    await page.waitForSelector('.conj-field input[data-idx]');
    await page.evaluate(() => {
      const v = ['ai parlé', 'as parlé', 'a parle', 'avons parlé', 'avez parle', 'ont parlé'];
      document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = v[k]; });
    });
    await page.click('#conj-verify-btn');
    const q = await page.evaluate(() => {
      const f2 = document.querySelector('.conj-field[data-idx="2"]'), f4 = document.querySelector('.conj-field[data-idx="4"]');
      return { s2: f2.className, note: (f2.querySelector('.conj-other-form') || {}).textContent, s4: f4.className,
        tag: (f4.querySelector('.conj-tag') || {}).textContent, ic: f4.querySelector('.conj-ic').textContent,
        border: getComputedStyle(f4.querySelector('.conj-answer-view')).borderTopColor, quase: getComputedStyle(document.getElementById('view-conjugaison')).getPropertyValue('--conj-quase').trim(),
        pink: getComputedStyle(document.documentElement).getPropertyValue('--imperial-gold').trim() };
    });
    check('"a parle" no lugar de "a parlé" é erro (parle é do présent), com aviso', /wrong/.test(q.s2) && q.note === '"parle" é do Présent.', q);
    check('"avez parle": também conta como erro (parle é forma do présent)', /wrong/.test(q.s4), q);
    await page.evaluate(() => startConjSession(['prendre'], ['presente']));
    await page.waitForSelector('.conj-field input[data-idx]');
    await page.evaluate(() => { const v = ['prends', 'prends', 'prend', 'prenons', 'prenéz', 'prennent']; document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = v[k]; }); });
    await page.click('#conj-verify-btn');
    const q2 = await page.evaluate(() => { const f4 = document.querySelector('.conj-field[data-idx="4"]'); return { s4: f4.className, tag: (f4.querySelector('.conj-tag') || {}).textContent, ic: f4.querySelector('.conj-ic').textContent,
      border: getComputedStyle(f4.querySelector('.conj-answer-view')).borderTopColor }; });
    check('"prenéz": Quase, amarelo-escuro (#B7791F), com ~ e a etiqueta', /almost/.test(q2.s4) && q2.tag === 'Quase' && q2.ic === '~' && q2.border === 'rgb(183, 121, 31)', q2);

    // Subjonctif com "que".
    await page.evaluate(() => startConjSession(['parler', 'avoir'], ['subjPresente']));
    await page.waitForSelector('.conj-field label');
    const subj = await page.evaluate(() => Array.from(document.querySelectorAll('.conj-field label')).map(l => l.textContent));
    check('subjonctif com "que": que je ... qu\'ils / qu\'elles', subj.join('|') === "que je|que tu|qu'il / qu'elle / qu'on|que nous|que vous|qu'ils / qu'elles", subj);

    // Revisão no fim e "Praticar só os que errei".
    await page.evaluate(() => {
      document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = k === 1 ? 'parle' : getConjForms('parler', 'subjPresente')[k]; });
    });
    await page.click('#conj-verify-btn');
    await page.click('#conj-next-verb-btn');
    await page.waitForSelector('.conj-field input[data-idx]');
    await page.click('#conj-verify-btn');
    await page.click('#conj-next-verb-btn');
    await page.waitForSelector('.conj-session-result');
    const res = await page.evaluate(() => ({ items: document.querySelectorAll('.conj-review-list li').length, btn: !!document.getElementById('conj-practice-mistakes-btn'),
      first: document.querySelector('.conj-review-list li').textContent.replace(/\s+/g, ' ').trim() }));
    check('fim da sessão lista as formas para revisar (1 de parler + 6 vazias de avoir)', res.items === 7 && res.btn && res.first.includes('parler') && res.first.includes('parles'), res);
    await page.click('#conj-practice-mistakes-btn');
    await page.waitForSelector('.conj-tense-box');
    const again = await page.evaluate(() => ({ q: CONJ_STATE.verbQueue.join(), t: CONJ_STATE.sessionTenses.join() }));
    check('"Praticar só os que errei": só esses verbos e tempos', again.q === 'parler,avoir' && again.t === 'subjPresente', again);
    check('fase 1: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- Fase 2: busca de verbos com bandeira, chips, filtros de lado ----
  {
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light');
    await page.evaluate(() => switchTab('conjugaison'));
    await page.waitForSelector('#conj-search-input');
    const ex = await page.evaluate(() => ({ pc: document.querySelector('.conj-tense-card input[data-tense="passeCompose"]').closest('label').querySelector('.conj-ex-verb').textContent,
      tr: document.querySelector('.conj-tense-card input[data-tense="condPresente"]').closest('label').querySelector('.conj-ex-tr').textContent }));
    check('exemplo do passé composé destaca "ai mangé"; tradução da camada pt-BR', ex.pc === 'ai mangé' && ex.tr === 'Eu gostaria de um café, por favor.', ex);
    const enTr = await page.evaluate(() => { const orig = window.getUiLang; window.getUiLang = () => 'en'; renderConjSelectScreen();
      const n = document.querySelectorAll('.conj-ex-tr').length; window.getUiLang = orig; renderConjSelectScreen(); return n; });
    check('site em inglês: frase sem a tradução em português', enTr === 0, enTr);
    await page.click('#conj-search-input');
    await page.keyboard.type('comer');
    const s1 = await page.evaluate(() => { const o = document.querySelector('#conj-search-list .conj-search-opt');
      return { open: !document.getElementById('conj-search-list').hidden, exp: document.getElementById('conj-search-input').getAttribute('aria-expanded'),
        verb: o && o.dataset.verb, word: o && o.querySelector('.conj-opt-word').textContent, flag: o && o.querySelector('.conj-flag').getAttribute('aria-label'),
        green: !!(o && o.querySelector('.conj-flag rect[fill="#009739"]')) }; });
    check('"comer" acha manger, com a bandeira do Brasil', s1.open && s1.exp === 'true' && s1.verb === 'manger' && s1.word === 'comer' && s1.flag === 'português' && s1.green, s1);
    await page.keyboard.press('Enter');
    await page.keyboard.type('etre');
    const s2 = await page.evaluate(() => { const o = document.querySelector('#conj-search-list .conj-search-opt');
      return { verb: o && o.dataset.verb, flag: o && o.querySelector('.conj-flag').getAttribute('aria-label'), blue: !!(o && o.querySelector('.conj-flag rect[fill="#0055A4"]')) }; });
    check('"etre" (sem acento) acha être, com a bandeira da França', s2.verb === 'être' && s2.flag === 'francês' && s2.blue, s2);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
    await page.keyboard.type('xyzw');
    const s3 = await page.evaluate(() => ({ chips: Array.from(document.querySelectorAll('.conj-chip > span')).map(x => x.textContent),
      empty: (document.querySelector('.conj-search-empty') || {}).textContent, off: document.getElementById('conj-filters').classList.contains('is-off'),
      dis: document.getElementById('conj-topn-select').disabled && document.querySelector('#conj-verb-list input').disabled,
      hint: document.getElementById('conj-size-hint').textContent }));
    check('Enter vira chip; sem resultado avisa', s3.chips.join() === 'manger,être' && s3.empty === 'Esse verbo ainda não está na lista.', s3);
    check('com chips, filtros ficam de lado e a conta usa os 2 verbos', s3.off && s3.dis && /12/.test(s3.hint), s3);
    await page.keyboard.press('Escape');
    check('Esc limpa e fecha a lista', await page.evaluate(() => document.getElementById('conj-search-list').hidden && !document.getElementById('conj-search-input').value));
    await page.click('#conj-search-input'); await page.keyboard.type('fin');
    await page.click('#conj-search-list .conj-search-opt[data-verb="finir"]');
    await page.click('.conj-chip-x[data-verb="manger"]');
    check('clique escolhe; × tira o chip', (await page.evaluate(() => CONJ_STATE.pickedVerbs.join())) === 'être,finir');
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    check('sessão usa só os verbos escolhidos, na ordem', (await page.evaluate(() => CONJ_STATE.verbQueue.join())) === 'être,finir');
    check('fase 2: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- Jogos: Passé composé ou Imparfait? ----
  {
    const data = await (async () => { const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light');
      await page.evaluate(() => switchTab('conjugaison'));
      const d = await page.evaluate(() => { const g = CONJ_GAMES.find(x => x.id === 'pc-imparfait'); return {
        n: g.items.length, per: g.perRound, a: g.items.filter(i => i.ans === 'a').length,
        bad: g.items.filter(i => !['a', 'b'].includes(i.ans) || !i.text['pt-BR'] || !i.text.en || !i.text.en.tr || !i.text.en.why || !i.text['pt-BR'].why
          || !(i.before + i[i.ans] + i.after).includes(i.clue)).map(i => i.id) }; });
      check('jogo: 22 frases aprovadas (11 de cada), 10 por partida, pt e en completos, pista dentro da frase', d.n === 22 && d.a === 11 && d.per === 10 && d.bad.length === 0, d);
      await page.click('#conj-mode-games');
      const l = await page.evaluate(() => ({ practiceHidden: document.getElementById('conj-practice-pane').hidden, cards: document.querySelectorAll('#conj-games-list .cg-card').length,
        sel: document.getElementById('conj-mode-games').getAttribute('aria-selected'), sub: document.querySelector('#conj-select-wrap .path-header p').hidden }));
      check('aba Jogos: lista de jogos no lugar da escolha', l.practiceHidden && l.cards === 1 && l.sel === 'true' && l.sub, l);
      await page.click('.cg-play');
      await page.waitForSelector('.cg-choice');
      const q = await page.evaluate(() => ({ n: CONJ_GAMES_UI.state.order.length, focus: document.body.dataset.activityFocus, blank: !!document.querySelector('.cg-blank'),
        choices: document.querySelectorAll('.cg-choice').length }));
      check('partida com 10 frases, em modo foco, lacuna e 2 opções', q.n === 10 && q.focus === 'conjugaison' && q.blank && q.choices === 2, q);
      const right = await page.evaluate(() => CONJ_GAMES_UI.state.order[0].ans);
      await page.keyboard.press(right === 'a' ? '2' : '1'); // tecla escolhe (errada, de propósito)
      await page.waitForTimeout(60);
      const f = await page.evaluate(() => ({ verdict: document.querySelector('.cg-verdict').className, fill: document.querySelector('.cg-sentence .cg-fill').textContent,
        clue: !!document.querySelector('.cg-sentence .cg-clue'), why: document.querySelector('.cg-why p').textContent.length, tr: document.querySelector('.cg-tr span').textContent,
        right: document.querySelector('.cg-choice.is-right').dataset.k, wrong: !!document.querySelector('.cg-choice.is-wrong'), svg: !!document.querySelector('.cg-timeline svg'),
        nextFocus: document.activeElement && document.activeElement.id }));
      const it0 = await page.evaluate(() => CONJ_GAMES_UI.state.order[0]);
      check('resposta: forma certa na lacuna, pista marcada, desenho, explicação e tradução pt', /no/.test(f.verdict) && f.fill === it0[it0.ans] && f.clue && f.svg && f.why > 20
        && f.tr === it0.text['pt-BR'].tr && f.right === it0.ans && f.wrong, f);
      check('foco vai para "Próxima frase"', f.nextFocus === 'cg-next', f.nextFocus);
      for (let i = 1; i <= 9; i++){
        await page.waitForTimeout(370);
        await page.click('#cg-next');
        await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
      }
      await page.waitForTimeout(370);
      await page.click('#cg-next');
      const r = await page.evaluate(() => ({ score: document.querySelector('.cg-score').textContent.replace(/\s/g, ''), review: document.querySelectorAll('.cg-review li').length }));
      check('resultado 9/10 com 1 frase para revisar', r.score === '9/10' && r.review === 1, r);
      await page.click('#cg-mistakes');
      const m = await page.evaluate(() => CONJ_GAMES_UI.state.order.map(x => x.id));
      check('"Praticar só os que errei" repete só a frase errada', m.length === 1 && m[0] === it0.id, m);
      await page.click('#conj-game-back');
      check('voltar aos jogos sai do foco', await page.evaluate(() => !document.body.dataset.activityFocus && document.getElementById('conj-select-wrap').style.display === 'block'));
      // Site em inglês: nada em português no jogo.
      await page.evaluate(() => { window.getUiLang = () => 'en'; });
      await page.click('.cg-play');
      await page.keyboard.press('1');
      const en = await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[0];
        return { tr: document.querySelector('.cg-tr span').textContent === it.text.en.tr, why: document.querySelector('.cg-why p').textContent === it.text.en.why,
          tl: document.querySelector('.cg-timeline figcaption').textContent }; });
      check('site em inglês: tradução, explicação e legenda em inglês', en.tr && en.why && /^a (point|line)/.test(en.tl), en);
      check('jogos: zero pageerror', errors.length === 0, errors);
      await ctx.close(); })();
  }

  // Celular (390px): sem rolagem horizontal; tabela numa coluna só.
  const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light', { width: 390, height: 844 });
  await page.evaluate(() => switchTab('conjugaison'));
  await page.waitForSelector('#conj-tense-list .conj-check-item');
  const ov1 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('celular: escolha sem rolagem horizontal', ov1);
  await page.click('#conj-start-btn');
  await page.waitForSelector('.conj-tense-box .conj-field input');
  const m = await page.evaluate(() => {
    const p = [0, 3].map(i => document.querySelector('.conj-field[data-idx="' + i + '"] input').getBoundingClientRect());
    return { oneCol: p[0].left === p[1].left && p[1].top > p[0].top, noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1 };
  });
  check('celular: tabela numa coluna (je ... ils, de cima para baixo)', m.oneCol, m);
  check('celular: prática sem rolagem horizontal', m.noOverflow, m);
  check('celular: zero pageerror', errors.length === 0, errors);
  await ctx.close();

  await browser.close(); server.close();
  console.log('Conjugação playwright: ' + passed + '/' + (passed + failed) + ' verificações' + (failed ? '' : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
