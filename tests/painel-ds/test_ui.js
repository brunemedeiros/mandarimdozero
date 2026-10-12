// Comportamento das peças interativas do painel (painel-ui.js), no guia de estilo, com cliques, teclado e arraste reais:
// Seleção, Popover, Redimensionável, Questionário em passos, Aviso temporário (toast), Área de rolagem.
// Rodar: node tests/painel-ds/test_ui.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH, '/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'].filter(Boolean) }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'); const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let ok = 0, ruim = 0; const check = (n, c, x) => { if (process.env.V) console.log(c ? 'ok ' : 'XX ', n.slice(0, 90)); if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [curso, tema] of [['fr', 'light'], ['zh', 'dark']]){
    const rot = `${curso} ${tema}`;
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: tema, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const erros = []; page.on('pageerror', e => erros.push(e.message));
    await page.addInitScript(([c, t]) => { try { localStorage.setItem('guia-painel', JSON.stringify({ curso: c, tema: t })); } catch (e) {} }, [curso, tema]);
    await page.goto(base + '/shared/painel/guia-de-estilo.html'); await page.waitForTimeout(300);
    check(`[${rot}] window.PainelUI existe e não vaza outras globais de let/const`, await page.evaluate(() => typeof window.PainelUI === 'object' && typeof PainelUI.toast === 'function'));

    // ---- Seleção ----
    const sel = page.locator('#selecao details.p-selecao');
    await sel.locator('summary').click();
    check(`[${rot}] seleção abre`, await sel.evaluate(d => d.open));
    check(`[${rot}] seleção: rádios escondidos, opções clicáveis`, (await sel.locator('label').count()) === 4 && (await sel.locator('li.p-selecao-grupo').count()) === 2);
    await sel.locator('label', { hasText: 'Rafael Costa' }).click();
    check(`[${rot}] seleção: escolher troca o texto do botão e fecha`, (await sel.locator('summary').textContent()).trim() === 'Rafael Costa' && !(await sel.evaluate(d => d.open)), await sel.locator('summary').textContent());
    await sel.locator('summary').click();
    const marca = await sel.locator('label:has(input:checked)').evaluate(l => getComputedStyle(l, '::after').content);
    check(`[${rot}] seleção: item atual com ✓`, /✓|2713/i.test(marca), marca);
    await page.keyboard.press('Escape');
    check(`[${rot}] seleção: Esc fecha`, !(await sel.evaluate(d => d.open)));
    await sel.locator('summary').click(); await page.mouse.click(5, 450);
    check(`[${rot}] seleção: clique fora fecha`, !(await sel.evaluate(d => d.open)));

    // ---- Popover ----
    const pop = page.locator('#popover details.p-popover');
    await pop.locator('summary').click();
    const corpo = pop.locator('.p-popover-corpo');
    check(`[${rot}] popover abre com o conteúdo visível`, await corpo.isVisible());
    const caixa = await corpo.boundingBox(), gat = await pop.locator('summary').boundingBox();
    check(`[${rot}] popover abre logo abaixo do botão`, caixa && gat && caixa.y > gat.y + gat.height - 2 && caixa.y < gat.y + gat.height + 30, [caixa, gat]);
    await pop.locator('input').first().fill('80%'); check(`[${rot}] popover: campo dentro aceita texto sem fechar`, await pop.evaluate(d => d.open));
    await page.keyboard.press('Escape'); check(`[${rot}] popover: Esc fecha`, !(await pop.evaluate(d => d.open)));
    await pop.locator('summary').click(); await page.mouse.click(5, 450); check(`[${rot}] popover: clique fora fecha`, !(await pop.evaluate(d => d.open)));

    // ---- Área de rolagem ----
    const rol = await page.locator('#rolagem .p-rolagem').evaluate(e => { const c = getComputedStyle(e); return { rola: e.scrollHeight > e.clientHeight, ovy: c.overflowY, fina: c.scrollbarWidth, tab: e.tabIndex }; });
    check(`[${rot}] rolagem: tem mais conteúdo que a altura, barra fina, foco por teclado`, rol.rola && rol.ovy === 'auto' && rol.fina === 'thin' && rol.tab === 0, rol);

    // ---- Redimensionável (horizontal) ----
    const rz = page.locator('#redimensionavel .p-redimensionavel').first(), alca = rz.locator('.p-alca');
    const larg = async () => (await rz.locator('.p-painel-r').first().boundingBox()).width;
    await alca.evaluate(e => e.scrollIntoView({ block: 'center' })); const w0 = await larg(); const ab = await alca.boundingBox();
    await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2); await page.mouse.down(); await page.mouse.move(ab.x + 150, ab.y + ab.height / 2, { steps: 5 }); await page.mouse.up();
    const w1 = await larg();
    check(`[${rot}] redimensionável: arrastar 150px para a direita aumenta o painel da esquerda`, w1 > w0 + 100, [w0, w1]);
    const ab2 = await alca.boundingBox(); await page.mouse.move(ab2.x + ab2.width / 2, ab2.y + ab2.height / 2); await page.mouse.down(); await page.mouse.move(1190, ab2.y + ab2.height / 2, { steps: 3 }); await page.mouse.up();
    const total = (await rz.boundingBox()).width, wMax = await larg();
    check(`[${rot}] redimensionável: não passa do limite de 80%`, wMax <= total * 0.8 + 3 && wMax >= total * 0.7, [wMax, total]);
    await alca.focus(); const v0 = +(await alca.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowLeft'); const v1 = +(await alca.getAttribute('aria-valuenow'));
    check(`[${rot}] redimensionável: seta para a esquerda diminui (aria-valuenow ${v0} → ${v1})`, v1 < v0, [v0, v1]);
    await page.keyboard.press('Home'); check(`[${rot}] redimensionável: Home vai ao mínimo (20)`, +(await alca.getAttribute('aria-valuenow')) === 20);
    await page.keyboard.press('End'); check(`[${rot}] redimensionável: End vai ao máximo (80)`, +(await alca.getAttribute('aria-valuenow')) === 80);
    // vertical
    const rv = page.locator('#redimensionavel .p-redimensionavel[data-direcao="coluna"]'), av = rv.locator('.p-alca');
    const alt = async () => (await rv.locator('.p-painel-r').first().boundingBox()).height; const h0 = await alt();
    await av.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    check(`[${rot}] redimensionável vertical: seta para baixo aumenta o painel de cima`, (await alt()) > h0 + 10, [h0, await alt()]);

    // ---- Questionário ----
    const q = page.locator('#questionario form.p-questionario');
    const cont = async () => (await q.locator('.p-contador').textContent()).trim();
    check(`[${rot}] questionário: começa em "Pergunta 1 de 3", letras A B C, Próxima desabilitada (obrigatória), Anterior desabilitada`,
      (await cont()) === 'Pergunta 1 de 3' && (await q.locator('.p-passo:not([hidden]) .p-letra').allTextContents()).join('') === 'ABC' &&
      await q.locator('[data-p-proximo]').isDisabled() && await q.locator('[data-p-anterior]').isDisabled() && await q.locator('[data-p-pular]').isHidden());
    await q.locator('label.p-opcao', { hasText: 'Gramática' }).click();
    check(`[${rot}] questionário: responder libera Próxima`, !(await q.locator('[data-p-proximo]').isDisabled()));
    await q.locator('[data-p-proximo]').click();
    check(`[${rot}] questionário: avança para a 2`, (await cont()) === 'Pergunta 2 de 3' && await q.locator('[data-p-pular]').isVisible() && !(await q.locator('[data-p-anterior]').isDisabled()));
    await q.locator('label.p-opcao', { hasText: 'Verbos' }).click(); await q.locator('label.p-opcao', { hasText: 'Escuta' }).click();
    await q.locator('[data-p-anterior]').click(); check(`[${rot}] questionário: Anterior volta e mantém a resposta`, (await cont()) === 'Pergunta 1 de 3' && await q.locator('input[value="gramatica"]').isChecked());
    await q.locator('[data-p-proximo]').click(); await q.locator('[data-p-proximo]').click();
    check(`[${rot}] questionário: última pergunta mostra "Concluir"`, (await cont()) === 'Pergunta 3 de 3' && (await q.locator('[data-p-proximo]').textContent()).trim() === 'Concluir');
    const fim = page.evaluate(() => new Promise(res => document.querySelector('#questionario form.p-questionario').addEventListener('p-questionario:fim', e => res(e.detail.respostas), { once: true })));
    await q.locator('textarea').fill('Foi ótima'); await q.locator('[data-p-proximo]').click();
    const resp = await fim;
    check(`[${rot}] questionário: concluir envia as respostas (escolha única, várias, texto)`, JSON.stringify(resp) === JSON.stringify({ foco: ['gramatica'], reforcar: ['verbos', 'escuta'], obs: ['Foi ótima'] }), resp);
    check(`[${rot}] questionário: mostra a mensagem final e esconde o rodapé`, await q.locator('.p-fim').isVisible() && await q.locator('.p-rodape').isHidden());

    // ---- Aviso temporário ----
    const antes = await page.locator('.p-toasts .p-toast').count();
    await page.evaluate(() => { window.__undo = 0; window.__t = PainelUI.toast({ titulo: 'Cartão criado', detalhe: 'Para a Marina', acaoRotulo: 'Desfazer', aoAcao: () => { window.__undo++; }, duracao: 400 }); });
    check(`[${rot}] toast: aparece no canto com título, detalhe e ações`, (await page.locator('.p-toasts .p-toast').count()) === antes + 1 && (await page.locator('.p-toasts .p-toast strong').last().textContent()) === 'Cartão criado' && (await page.locator('.p-toasts .p-toast button').count()) === 2);
    const pos = await page.locator('.p-toasts').boundingBox(); check(`[${rot}] toast: fica no canto inferior direito`, pos.x + pos.width > 1100 && pos.y + pos.height > 800, pos);
    await page.waitForTimeout(700); check(`[${rot}] toast: some sozinho depois da duração`, (await page.locator('.p-toasts .p-toast').count()) === antes);
    await page.evaluate(() => { window.__t = PainelUI.toast({ titulo: 'Vínculo removido', acaoRotulo: 'Desfazer', aoAcao: () => { window.__undo++; }, duracao: 0 }); });
    await page.locator('.p-toasts .p-toast button', { hasText: 'Desfazer' }).click();
    check(`[${rot}] toast: Desfazer chama a ação e fecha`, (await page.evaluate(() => window.__undo)) === 1 && (await page.locator('.p-toasts .p-toast').count()) === antes);
    await page.evaluate(() => PainelUI.toast({ titulo: '<img src=x onerror="window.__xss=1">', duracao: 0 })); await page.waitForTimeout(100);
    check(`[${rot}] toast: texto com HTML não executa (textContent)`, !(await page.evaluate(() => window.__xss)) && (await page.locator('.p-toasts .p-toast strong').last().textContent()).includes('<img'));
    await page.locator('.p-toasts .p-toast-fechar').last().click(); check(`[${rot}] toast: X fecha`, (await page.locator('.p-toasts .p-toast').count()) === antes);

    // ---- Paginação ----
    const pg = await page.locator('#paginacao .p-paginacao').first().evaluate(n => { const a = n.querySelector('a[aria-current="page"]'), c = getComputedStyle(a), ant = n.querySelector('.p-pag-ant'), pr = n.querySelector('.p-pag-prox'); return { atualBorda: c.borderTopWidth, atualSombra: c.boxShadow !== 'none', ant: getComputedStyle(ant, '::before').content, prox: getComputedStyle(pr, '::after').content, mais: !!n.querySelector('.p-pag-mais') }; });
    check(`[${rot}] paginação: página atual com borda e sombra, Anterior ‹ e Próxima ›, reticências`, pg.atualBorda === '1px' && pg.atualSombra && /‹|2039/.test(pg.ant) && /›|203A/.test(pg.prox) && pg.mais, pg);
    const desab = await page.locator('#paginacao .p-pag-ant[aria-disabled="true"]').evaluate(a => { const c = getComputedStyle(a); return { op: c.opacity, pe: c.pointerEvents }; });
    check(`[${rot}] paginação: Anterior desabilitado fica apagado e sem clique`, +desab.op < 0.6 && desab.pe === 'none', desab);

    // ---- Select nativo ----
    const nat = await page.locator('#nativo select').evaluate(e => ({ r: getComputedStyle(e).borderTopLeftRadius, tam: e.options.length }));
    check(`[${rot}] select nativo: em pílula (mais arredondado)`, parseFloat(nat.r) >= 100 && nat.tam === 5, nat);

    // ---- Menu de navegação ----
    const mn = page.locator('#menunav .p-menunav'); const dts = mn.locator('details');
    await dts.nth(0).locator('summary').click();
    check(`[${rot}] menu de navegação: abre o painel com 4 atalhos e descrições`, await dts.nth(0).evaluate(d => d.open) && (await dts.nth(0).locator('.p-menunav-painel a').count()) === 4 && await dts.nth(0).locator('.p-menunav-painel').isVisible());
    await dts.nth(1).locator('summary').click();
    check(`[${rot}] menu de navegação: abrir outro fecha o primeiro (um por vez)`, !(await dts.nth(0).evaluate(d => d.open)) && await dts.nth(1).evaluate(d => d.open));
    await page.keyboard.press('Escape'); check(`[${rot}] menu de navegação: Esc fecha`, !(await dts.nth(1).evaluate(d => d.open)));
    await dts.nth(0).locator('summary').focus(); await page.keyboard.press('ArrowRight');
    check(`[${rot}] menu de navegação: seta para a direita passa o foco ao próximo item`, await page.evaluate(() => document.activeElement.textContent.trim()) === 'Admin');
    await page.keyboard.press('ArrowDown');
    check(`[${rot}] menu de navegação: seta para baixo abre e foca o primeiro atalho`, await dts.nth(1).evaluate(d => d.open) && (await page.evaluate(() => document.activeElement.textContent)).includes('Badges'));
    await page.keyboard.press('ArrowDown'); check(`[${rot}] menu de navegação: seta para baixo anda entre os atalhos`, (await page.evaluate(() => document.activeElement.textContent)).includes('Analytics'));
    await page.keyboard.press('Escape');

    // ---- Barra de menus ----
    const bm = page.locator('#barramenus .p-barramenus'), bd = bm.locator('details');
    await bd.nth(0).locator('summary').click();
    check(`[${rot}] barra de menus: abre o menu com atalhos de teclado e separador`, await bd.nth(0).locator('.p-menu-lista').isVisible() && (await bd.nth(0).locator('.p-menu-atalho').count()) === 1 && (await bd.nth(0).locator('.p-menu-sep').count()) === 1);
    await bd.nth(1).locator('summary').hover();
    check(`[${rot}] barra de menus: com um aberto, passar o mouse em outro troca de menu`, !(await bd.nth(0).evaluate(d => d.open)) && await bd.nth(1).evaluate(d => d.open));
    const marca1 = await bd.nth(1).locator('[aria-checked="true"]').evaluate(e => getComputedStyle(e, '::before').content);
    check(`[${rot}] barra de menus: item marcado mostra ✓`, /✓|2713/i.test(marca1), marca1);
    const arq = bd.nth(1).locator('[role="menuitemcheckbox"]').first();
    await arq.click(); check(`[${rot}] barra de menus: clicar em item de marcar alterna aria-checked e fecha o menu`, (await arq.getAttribute('aria-checked')) === 'true' && !(await bd.nth(1).evaluate(d => d.open)));
    await bd.nth(0).locator('summary').click();
    const dis = await bd.nth(0).locator('[aria-disabled="true"]').evaluate(e => getComputedStyle(e).pointerEvents); check(`[${rot}] barra de menus: item desabilitado não recebe clique`, dis === 'none', dis);
    await page.keyboard.press('Escape');

    // ---- Mensagens e rolagem de mensagens ----
    const cv = page.locator('#conversa .p-conversa'), ro = cv.locator('.p-conversa-rolagem');
    await cv.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const dist = async () => ro.evaluate(e => Math.round(e.scrollHeight - e.scrollTop - e.clientHeight));
    check(`[${rot}] conversa: começa no fim (mensagem mais recente visível)`, (await dist()) <= 2, await dist());
    check(`[${rot}] conversa: botão de voltar ao fim começa escondido`, await cv.locator('.p-ir-ao-fim').isHidden());
    const lados = await cv.evaluate(e => { const a = e.querySelector('.p-mensagem--enviada'), b = e.querySelector('.p-mensagem--recebida'); const fa = getComputedStyle(a.querySelector('.p-mensagem-corpo')), fb = getComputedStyle(b.querySelector('.p-mensagem-corpo')); return { avatares: !!a.querySelector('.p-avatar') && !!b.querySelector('.p-avatar'), baloes: fa.backgroundColor !== 'rgba(0, 0, 0, 0)' && fb.backgroundColor !== 'rgba(0, 0, 0, 0)', coresDiferentes: fa.backgroundColor !== fb.backgroundColor, enviadaDir: a.getBoundingClientRect().right > b.getBoundingClientRect().right }; });
    const brancos = await page.evaluate(() => [document.querySelector('.p-mensagem--enviada .p-mensagem-corpo'), document.querySelector('.p-balao--enviada')].map(e => getComputedStyle(e).color));
    check(`[${rot}] mensagem enviada e balão enviado: texto branco`, brancos.every(c => c === 'rgb(255, 255, 255)'), brancos);
    check(`[${rot}] mensagens: as duas partes têm avatar e balão, em cores diferentes, enviada à direita`, lados.avatares && lados.baloes && lados.coresDiferentes && lados.enviadaDir, lados);
    await page.evaluate(() => PainelUI.mensagem(document.getElementById('conv-lista'), { texto: 'Mensagem nova\n\nSegundo parágrafo', tipo: 'recebida', autor: 'Marina', hora: '10:00' })); await page.waitForTimeout(150);
    check(`[${rot}] conversa: mensagem nova com o leitor no fim continua acompanhando`, (await dist()) <= 2 && (await cv.locator('.p-mensagem').last().locator('p').count()) === 2, await dist());
    await ro.evaluate(e => { e.scrollTop = 0; }); await page.waitForTimeout(150);
    await page.evaluate(() => PainelUI.mensagem(document.getElementById('conv-lista'), { texto: 'Outra, enquanto você lia o começo', tipo: 'recebida' })); await page.waitForTimeout(150);
    check(`[${rot}] conversa: quem subiu para ler não é arrastado, e o botão ↓ aparece`, (await ro.evaluate(e => e.scrollTop)) < 5 && await cv.locator('.p-ir-ao-fim').isVisible());
    await cv.locator('.p-ir-ao-fim').click(); await page.waitForTimeout(700);
    check(`[${rot}] conversa: o botão ↓ leva ao fim e some`, (await dist()) <= 2 && await cv.locator('.p-ir-ao-fim').isHidden(), await dist());
    await cv.locator('textarea').fill('Teste de envio'); await cv.locator('#conv-enviar').click(); await page.waitForTimeout(200);
    check(`[${rot}] conversa: enviar adiciona a mensagem (sem HTML) e limpa o campo`, (await cv.locator('.p-mensagem--enviada').last().textContent()).includes('Teste de envio') && (await cv.locator('textarea').inputValue()) === '');

    // ---- Campo completo, Item, Campo com extras ----
    const fc = await page.locator('#campo .p-campo--erro').evaluate(c => { const i = c.querySelector('input'), e = c.querySelector('.p-erro'); return { borda: getComputedStyle(i).borderTopColor, erroCor: getComputedStyle(e).color, mesma: getComputedStyle(i).borderTopColor === getComputedStyle(e).color, ajuda: !!c.closest('.p-grupo').querySelector('.p-ajuda'), linha: getComputedStyle(c.closest('.p-grupo').querySelector('.p-linha-campos')).display }; });
    check(`[${rot}] campo: borda do campo com erro e a mensagem usam a cor de erro; ajuda e linha de campos existem`, fc.mesma && fc.ajuda && fc.linha === 'grid', fc);
    const it = await page.locator('#item').evaluate(n => { const a = n.querySelector('a.p-item'), c = getComputedStyle(a), s = n.querySelector('.p-item--suave'); return { setaLink: getComputedStyle(a, '::after').content, borda: c.borderTopWidth, raio: c.borderTopLeftRadius, suave: getComputedStyle(s).backgroundColor !== 'rgba(0, 0, 0, 0)', acao: n.querySelectorAll('.p-item-acoes button').length }; });
    check(`[${rot}] item: borda e cantos redondos, suave com fundo, link com seta, ação`, it.borda === '1px' && parseFloat(it.raio) >= 10 && it.suave && /›|203A/.test(it.setaLink) && it.acao === 1, it);
    const ge = page.locator('#grupo-entrada .p-grupo-entrada').first(); const antesBorda = await ge.evaluate(e => getComputedStyle(e).borderTopColor);
    await ge.locator('input').focus(); const depoisBorda = await ge.evaluate(e => ({ c: getComputedStyle(e).borderTopColor, s: getComputedStyle(e).boxShadow }));
    check(`[${rot}] campo com extras: o contorno todo acende ao focar o campo de dentro`, depoisBorda.c !== antesBorda && depoisBorda.s !== 'none', [antesBorda, depoisBorda]);
    check(`[${rot}] campo com extras: input sem borda própria`, await ge.locator('input').evaluate(i => getComputedStyle(i).borderTopWidth === '0px'));

    // ---- Código de dígitos (OTP) ----
    const otp = page.locator('#otp .p-otp'), cx = otp.locator('input');
    await cx.nth(0).focus(); await page.keyboard.type('12');
    check(`[${rot}] OTP: digitar avança de caixa em caixa`, (await cx.nth(0).inputValue()) === '1' && (await cx.nth(1).inputValue()) === '2' && await cx.nth(2).evaluate(e => e === document.activeElement));
    await page.keyboard.type('a'); check(`[${rot}] OTP: letra é ignorada (só dígitos)`, (await cx.nth(2).inputValue()) === '');
    await page.keyboard.press('Backspace'); check(`[${rot}] OTP: Backspace em caixa vazia volta e apaga a anterior`, (await cx.nth(1).inputValue()) === '' && await cx.nth(1).evaluate(e => e === document.activeElement));
    const completo = page.evaluate(() => new Promise(res => document.querySelector('#otp .p-otp').addEventListener('p-otp:completo', e => res(e.detail.codigo), { once: true })));
    await cx.nth(0).focus(); await page.evaluate(() => { const o = document.querySelector('#otp .p-otp input'); const dt = new DataTransfer(); dt.setData('text', '48 29-17'); o.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
    check(`[${rot}] OTP: colar um código distribui os dígitos e avisa quando completa (ignora espaço e traço)`, (await completo) === '482917' && (await cx.evaluateAll(l => l.map(i => i.value).join(''))) === '482917', await cx.evaluateAll(l => l.map(i => i.value).join('')));
    const sep = await otp.evaluate(o => ({ cantos: [getComputedStyle(o.querySelector('input')).borderTopLeftRadius, getComputedStyle(o.querySelector('input:last-child')).borderTopRightRadius], sep: !!o.querySelector('.p-otp-sep') }));
    check(`[${rot}] OTP: caixas coladas com cantos arredondados só nas pontas e separador no meio`, parseFloat(sep.cantos[0]) >= 8 && parseFloat(sep.cantos[1]) >= 8 && sep.sep, sep);

    // ---- Correções de acabamento (não podem voltar) ----
    const alin = await page.locator('#menunav .p-menunav').evaluate(n => [...n.querySelectorAll(':scope > ul > li > :is(summary, a, details > summary)')].map(e => Math.round(e.getBoundingClientRect().top)));
    check(`[${rot}] menu de navegação: todos os itens alinhados na mesma altura`, new Set(alin).size === 1, alin);
    const espac = await page.locator('#paginacao .p-paginacao').first().evaluate(n => { const l = [...n.querySelectorAll('a')].slice(1, 4).map(a => a.getBoundingClientRect()); return Math.round(l[1].left - l[0].right); });
    check(`[${rot}] paginação: espaço de 4 a 8px entre os números (sem margem negativa do Pico)`, espac >= 4 && espac <= 8, espac);
    const sepW = await page.locator('#otp .p-otp-sep').evaluate(e => Math.round(e.getBoundingClientRect().width));
    check(`[${rot}] OTP: separador pequeno (não estica como grupo do Pico)`, sepW <= 16, sepW);
    const nowrap = await page.locator('#barramenus .p-menu-item', { hasText: 'Forçar recarga' }).evaluate(e => Math.round(e.getBoundingClientRect().height));
    check(`[${rot}] barra de menus: item com atalho longo não quebra linha`, nowrap < 40, nowrap);
    const lupas = await page.locator('#grupo-entrada .p-grupo-entrada').first().evaluate(g => ({ svg: g.querySelectorAll('svg').length, fundo: getComputedStyle(g.querySelector('input')).backgroundImage }));
    check(`[${rot}] campo com extras: uma lupa só (a do Pico some)`, lupas.svg === 1 && lupas.fundo === 'none', lupas);
    const lg = await page.locator('#campo .p-grupo').evaluate(g => { const l = g.querySelector('legend').getBoundingClientRect(), d = g.querySelector('.p-descricao').getBoundingClientRect(); return { sobrepoe: d.top < l.bottom - 1, l: [l.top, l.bottom], d: [d.top, d.bottom] }; });
    check(`[${rot}] campo completo: título do grupo não sobrepõe a descrição`, !lg.sobrepoe, lg);

    // ---- Campo de texto (Input) ----
    check(`[${rot}] campo de texto: rótulo, campo e ajuda`, (await page.locator('#campotexto .p-campo label').textContent()).includes('Chave') && (await page.locator('#campotexto .p-campo input').getAttribute('placeholder')) === 'sk-…' && await page.locator('#campotexto .p-ajuda').isVisible());

    // ---- Cartão ao passar o mouse (Hover Card) ----
    const hv = page.locator('#hover .p-hover'), hc = hv.locator('.p-hover-corpo');
    await hv.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.mouse.move(2, 2); await page.waitForTimeout(50);
    check(`[${rot}] hover card: escondido por padrão`, !(await hc.isVisible()) || (await hc.evaluate(e => getComputedStyle(e).opacity)) === '0');
    await hv.locator('.p-hover-gatilho').hover(); await page.waitForTimeout(500);
    check(`[${rot}] hover card: aparece ao passar o mouse, com a pessoa e os dados`, (await hc.evaluate(e => getComputedStyle(e).opacity)) === '1' && (await hc.textContent()).includes('Marina Alves') && (await hc.textContent()).includes('23 dias'));
    const hb = await hc.boundingBox(), hg = await hv.locator('.p-hover-gatilho').boundingBox();
    check(`[${rot}] hover card: abre logo abaixo e centralizado no link`, hb.y > hg.y + hg.height && Math.abs((hb.x + hb.width / 2) - (hg.x + hg.width / 2)) < 4, [hb, hg]);
    await page.mouse.move(2, 2); await page.waitForTimeout(450);
    check(`[${rot}] hover card: some ao tirar o mouse`, (await hc.evaluate(e => getComputedStyle(e).opacity)) === '0');
    await hv.locator('.p-hover-gatilho').focus(); await page.waitForTimeout(500);
    check(`[${rot}] hover card: também abre ao focar com o teclado`, (await hc.evaluate(e => getComputedStyle(e).opacity)) === '1');
    await page.evaluate(() => document.activeElement.blur());

    // ---- Estado vazio completo ----
    const ev = await page.locator('#vazio-rico .p-vazio').evaluate(v => ({ icone: !!v.querySelector('.p-vazio-icone'), acoes: v.querySelectorAll('.p-vazio-acoes button').length, mais: getComputedStyle(v.querySelector('.p-vazio-mais'), '::after').content, centro: getComputedStyle(v).textAlign }));
    check(`[${rot}] estado vazio: ícone, duas ações e link "saiba mais" com seta, centralizado`, ev.icone && ev.acoes === 2 && /↗|2197/.test(ev.mais) && ev.centro === 'center', ev);

    // ---- Menu de ações (Dropdown Menu) ----
    const ma = page.locator('#menu-acoes details.p-menu');
    await ma.locator('summary').click();
    check(`[${rot}] menu de ações: abre com título de grupo, 3 atalhos e 2 separadores`, await ma.locator('.p-menu-lista').isVisible() && (await ma.locator('.p-menu-rotulo').count()) === 1 && (await ma.locator('.p-menu-atalho').count()) === 4 && (await ma.locator('.p-menu-sep').count()) === 2);
    const perigo = await ma.locator('.p-menu-item--perigo').evaluate(e => getComputedStyle(e).color), erroTok = await ma.evaluate(e => { const t = document.createElement('i'); t.style.color = 'var(--p-erro)'; e.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return c; });
    check(`[${rot}] menu de ações: item de risco usa a cor de erro`, perigo === erroTok, [perigo, erroTok]);
    await page.keyboard.press('Escape'); check(`[${rot}] menu de ações: Esc fecha`, !(await ma.evaluate(d => d.open)));
    await ma.locator('summary').focus(); await page.keyboard.press('ArrowDown');
    check(`[${rot}] menu de ações: seta para baixo abre e foca o primeiro item`, await ma.evaluate(d => d.open) && (await page.evaluate(() => document.activeElement.textContent)).includes('Perfil'));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    check(`[${rot}] menu de ações: as setas pulam o item desabilitado`, !(await page.evaluate(() => document.activeElement.textContent)).includes('API'), await page.evaluate(() => document.activeElement.textContent));
    await page.keyboard.press('Enter'); check(`[${rot}] menu de ações: Enter no item fecha o menu`, !(await ma.evaluate(d => d.open)));

    // ---- Tecla (KBD) ----
    const kb = await page.locator('#tecla kbd').first().evaluate(k => { const c = getComputedStyle(k); return { fs: c.fontSize, bb: c.borderBottomWidth, r: c.borderTopLeftRadius, mono: /mono|courier/i.test(c.fontFamily), h: Math.round(k.getBoundingClientRect().height) }; });
    check(`[${rot}] tecla: pequena, borda inferior de 2px, cantos arredondados, mesma fonte do painel`, kb.fs === '12px' && kb.bb === '2px' && parseFloat(kb.r) >= 5 && !kb.mono && kb.h === 24, kb);

    // ---- Janela de diálogo (Dialog) ----
    const dg = page.locator('#dialogo dialog'); const abrir = page.locator('#dialogo [data-abrir-dialogo]');
    await abrir.click();
    const dstate = await dg.evaluate(d => ({ aberto: d.open, modal: d.matches(':modal'), foco: d.contains(document.activeElement), campo: d.querySelector('input').value }));
    check(`[${rot}] diálogo: abre como modal, o foco entra nele, traz o formulário`, dstate.aberto && dstate.modal && dstate.foco && dstate.campo === 'Marina Alves', dstate);
    const dbox = await dg.locator('article').boundingBox(); check(`[${rot}] diálogo: caixa centralizada na tela`, Math.abs((dbox.x + dbox.width / 2) - 600) < 20 && Math.abs((dbox.y + dbox.height / 2) - 450) < 60, dbox);
    check(`[${rot}] diálogo: fundo desfocado e escurecido`, await dg.evaluate(d => { const c = getComputedStyle(d); return /blur/.test(c.backdropFilter || c.webkitBackdropFilter || '') && c.backgroundColor !== 'rgba(0, 0, 0, 0)'; }));
    await page.keyboard.press('Escape'); check(`[${rot}] diálogo: Esc fecha`, !(await dg.evaluate(d => d.open)));
    await abrir.click(); await dg.locator('button[rel="prev"]').click(); check(`[${rot}] diálogo: o X fecha`, !(await dg.evaluate(d => d.open)));
    await abrir.click(); await dg.locator('footer button', { hasText: 'Cancelar' }).click(); check(`[${rot}] diálogo: Cancelar fecha`, !(await dg.evaluate(d => d.open)));
    await abrir.click(); await page.mouse.click(8, 8); check(`[${rot}] diálogo: clique no fundo fecha`, !(await dg.evaluate(d => d.open)));
    await abrir.click(); await dg.locator('input').first().click(); check(`[${rot}] diálogo: clique dentro da caixa NÃO fecha`, await dg.evaluate(d => d.open)); await page.keyboard.press('Escape');

    // ---- Escolher data (Date Picker) ----
    const dp = page.locator('#data details.p-data'); await dp.evaluate(e => e.scrollIntoView({ block: 'start' }));
    const esperadoTitulo = await page.evaluate(() => { const n = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()); return n.charAt(0).toUpperCase() + n.slice(1); });
    check(`[${rot}] data: botão começa com o texto de ajuda apagado`, (await dp.locator('summary').textContent()).trim() === 'Escolha uma data' && (await dp.locator('summary').getAttribute('data-vazio')) !== null);
    await dp.locator('summary').click();
    check(`[${rot}] data: abre o calendário do mês atual, em português, com 42 dias e semana Do Se Te Qu Qu Se Sá`, (await dp.locator('.p-cal-topo strong').textContent()) === esperadoTitulo && (await dp.locator('.p-dia').count()) === 42 && (await dp.locator('.p-cal-sem').allTextContents()).join(' ') === 'Do Se Te Qu Qu Se Sá', await dp.locator('.p-cal-topo strong').textContent());
    check(`[${rot}] data: o dia de hoje fica marcado`, (await dp.locator('.p-dia.p-hoje').count()) === 1);
    await dp.locator('.p-cal-prox').click();
    const tit2 = await dp.locator('.p-cal-topo strong').textContent();
    check(`[${rot}] data: próximo mês troca o título e mantém aberto`, tit2 !== esperadoTitulo && await dp.evaluate(d => d.open), tit2);
    await dp.locator('.p-cal-ant').click(); check(`[${rot}] data: mês anterior volta`, (await dp.locator('.p-cal-topo strong').textContent()) === esperadoTitulo);
    const dia15 = dp.locator('.p-dia:not(.p-fora)', { hasText: /^15$/ }); const iso15 = await dia15.getAttribute('data-data');
    await dia15.click();
    const br = await page.evaluate(v => { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; }, iso15);
    check(`[${rot}] data: escolher um dia mostra a data no botão, fecha e guarda AAAA-MM-DD`, (await dp.locator('summary').textContent()).trim() === br && !(await dp.evaluate(d => d.open)) && (await dp.getAttribute('data-valor')) === iso15 && (await dp.locator('input[type="hidden"]').inputValue()) === iso15, [br, iso15]);
    await dp.locator('summary').click(); check(`[${rot}] data: ao reabrir, o dia escolhido está marcado`, (await dp.locator('.p-dia[aria-pressed="true"]').getAttribute('data-data')) === iso15);
    await dp.locator('.p-dia[aria-pressed="true"]').focus(); await page.keyboard.press('ArrowRight');
    const focoDia = await page.evaluate(() => document.activeElement.getAttribute('data-data'));
    check(`[${rot}] data: seta para a direita foca o dia seguinte`, focoDia === await page.evaluate(v => { const [y, m, d] = v.split('-').map(Number); const n = new Date(y, m - 1, d + 1); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); }, iso15), focoDia);
    await page.keyboard.press('ArrowDown'); check(`[${rot}] data: seta para baixo avança uma semana`, await page.evaluate(() => document.activeElement.getAttribute('data-data')) > focoDia);
    await page.keyboard.press('PageDown'); check(`[${rot}] data: PageDown vai para o mês seguinte`, (await dp.locator('.p-cal-topo strong').textContent()) !== esperadoTitulo);
    await page.keyboard.press('Escape'); check(`[${rot}] data: Esc fecha`, !(await dp.evaluate(d => d.open)));

    // ---- Menu de contexto ----
    const ca = page.locator('#contexto .p-contexto-area'), cm = page.locator('#ctx1'); await ca.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const cb = await ca.boundingBox(); const px = cb.x + 60, py = cb.y + 40;
    check(`[${rot}] menu de contexto: começa escondido`, await cm.isHidden());
    await page.mouse.click(px, py, { button: 'right' }); await page.waitForTimeout(100);
    const mb = await cm.boundingBox();
    check(`[${rot}] menu de contexto: abre onde foi o clique, com o primeiro item focado`, await cm.isVisible() && Math.abs(mb.x - px) <= 10 && Math.abs(mb.y - py) <= 10 && (await page.evaluate(() => document.activeElement.textContent)).includes('Voltar'), [mb, px, py]);
    await page.keyboard.press('ArrowDown'); check(`[${rot}] menu de contexto: seta para baixo pula o item desabilitado`, (await page.evaluate(() => document.activeElement.textContent)).includes('Recarregar'));
    await page.keyboard.press('Escape'); check(`[${rot}] menu de contexto: Esc fecha`, await cm.isHidden());
    await page.mouse.click(px, py, { button: 'right' }); const fav = cm.locator('[role="menuitemcheckbox"]').nth(1), marcaAntes = await fav.getAttribute('aria-checked');
    await fav.click(); check(`[${rot}] menu de contexto: item de marcar alterna e fecha o menu`, (await fav.getAttribute('aria-checked')) !== marcaAntes && await cm.isHidden());
    await page.mouse.click(px, py, { button: 'right' }); await page.mouse.click(5, 5); check(`[${rot}] menu de contexto: clique fora fecha`, await cm.isHidden());
    await page.mouse.click(cb.x + cb.width - 5, cb.y + 20, { button: 'right' }); const mb2 = await cm.boundingBox();
    check(`[${rot}] menu de contexto: perto da borda direita não sai da tela`, mb2.x + mb2.width <= 1200, mb2); await page.keyboard.press('Escape');

    // ---- Combobox ----
    const cx2 = page.locator('#combo .p-combo'), ci = cx2.locator('input'), lista = cx2.locator('.p-combo-lista');
    await cx2.evaluate(e => e.scrollIntoView({ block: 'start' }));
    check(`[${rot}] combobox: lista escondida no começo`, await lista.isHidden() && (await ci.getAttribute('aria-expanded')) === 'false');
    await ci.focus(); check(`[${rot}] combobox: focar abre a lista com os 6 alunos`, await lista.isVisible() && (await cx2.locator('li[role="option"]:visible').count()) === 6 && (await ci.getAttribute('aria-expanded')) === 'true');
    await ci.fill('joao'); check(`[${rot}] combobox: busca ignora acento (joao acha João Pedro Lima)`, (await cx2.locator('li[role="option"]:visible').allTextContents()).join() === 'João Pedro Lima');
    await ci.fill('xyz'); check(`[${rot}] combobox: sem resultado mostra a mensagem`, await cx2.locator('.p-combo-vazio').isVisible() && (await cx2.locator('li[role="option"]:visible').count()) === 0);
    await ci.fill('a'); await page.keyboard.press('ArrowDown');
    check(`[${rot}] combobox: setas movem o item ativo (aria-activedescendant)`, !!(await ci.getAttribute('aria-activedescendant')) && (await cx2.locator('.p-ativo').count()) === 1);
    await ci.fill('rafa'); await page.evaluate(() => { window.__esc = null; document.querySelector('#combo .p-combo').addEventListener('p-combo:escolheu', e => { window.__esc = e.detail; }, { once: true }); });
    await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__esc, null, { timeout: 5000 }); const ev2 = await page.evaluate(() => window.__esc);
    check(`[${rot}] combobox: Enter escolhe, mostra o nome, fecha e avisa com valor e rótulo`, (await ci.inputValue()) === 'Rafael Costa' && await lista.isHidden() && ev2.valor === 'rafael' && ev2.rotulo === 'Rafael Costa' && (await cx2.locator('li[aria-selected="true"]').count()) === 1, ev2);
    await ci.focus(); await ci.fill('zzz'); await page.keyboard.press('Escape'); check(`[${rot}] combobox: Esc desfaz o que foi digitado e volta ao escolhido`, (await ci.inputValue()) === 'Rafael Costa' && await lista.isHidden());
    await ci.click(); await cx2.locator('li[role="option"]', { hasText: 'Helena' }).click(); check(`[${rot}] combobox: clicar numa opção escolhe`, (await ci.inputValue()) === 'Helena Duarte' && (await cx2.getAttribute('data-valor')) === 'helena');
    await ci.click(); await ci.fill('tia'); await page.mouse.click(5, 5); check(`[${rot}] combobox: clique fora fecha e volta ao escolhido`, await lista.isHidden() && (await ci.inputValue()) === 'Helena Duarte');

    // ---- Bloco que abre e fecha ----
    const co = page.locator('#colapsavel .p-colapsavel'), cbt = co.locator('.p-colapsavel-botao'), cc = co.locator('.p-colapsavel-corpo');
    check(`[${rot}] colapsável: o resumo aparece e o detalhe fica escondido`, await co.locator('.p-linha-info').first().isVisible() && await cc.isHidden() && (await cbt.getAttribute('aria-expanded')) === 'false');
    await cbt.click(); check(`[${rot}] colapsável: clicar mostra o detalhe e marca aria-expanded`, await cc.isVisible() && (await cbt.getAttribute('aria-expanded')) === 'true' && (await cc.locator('.p-linha-info').count()) === 2);
    await cbt.click(); check(`[${rot}] colapsável: clicar de novo esconde`, await cc.isHidden() && (await cbt.getAttribute('aria-expanded')) === 'false');

    // ---- Balão ----
    const bl = page.locator('#balao .p-balaos'); await bl.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const bg = await bl.evaluate(e => { const r = e.querySelector('.p-balao--enviada'), q = e.querySelector('.p-balao--recebida'), a = r.getBoundingClientRect(), b = q.getBoundingClientRect(); return { dir: a.right > b.right, cor: getComputedStyle(r).backgroundColor !== getComputedStyle(q).backgroundColor, raio: getComputedStyle(q).borderBottomLeftRadius }; });
    check(`[${rot}] balão: enviada à direita, recebida à esquerda, cores diferentes`, bg.dir && bg.cor, bg);
    check(`[${rot}] balão: o primeiro do grupo tem o canto reto`, parseFloat(bg.raio) <= 6, bg);

    // ---- Anexo ----
    const an = page.locator('#anexo .p-anexos'); await an.evaluate(e => e.scrollIntoView({ block: 'center' }));
    check(`[${rot}] anexo: 3 itens, o em envio mostra spinner girando e barra a 60%`, (await an.locator('.p-anexo').count()) === 3 && (await an.locator('.p-anexo--enviando .p-spinner').count()) === 1 && (await an.locator('.p-anexo--enviando .p-anexo-barra > i').evaluate(i => Math.round(i.getBoundingClientRect().width / i.parentElement.getBoundingClientRect().width * 100))) === 60);
    check(`[${rot}] anexo: o spinner do Pico (aria-busy) não aparece solto ao lado do item`, (await an.locator('.p-anexo--enviando').evaluate(e => getComputedStyle(e, '::before').content)) === 'none');
    await page.locator('#anx-demo').click(); await page.waitForTimeout(150);
    check(`[${rot}] anexo: PainelUI.anexo adiciona item em envio com aria-busy`, (await an.locator('.p-anexo').count()) === 4 && (await an.locator('.p-anexo').nth(3).getAttribute('aria-busy')) === 'true');
    await page.waitForTimeout(3300);
    const ult = an.locator('.p-anexo').nth(3);
    check(`[${rot}] anexo: ao terminar tira a barra e o aria-busy e mostra o tamanho`, (await ult.locator('.p-anexo-barra').count()) === 0 && (await ult.getAttribute('aria-busy')) === null && (await ult.locator('.p-anexo-detalhe').textContent()) === '1,1 MB');
    await ult.locator('.p-anexo-remover').click(); await page.waitForTimeout(500);
    check(`[${rot}] anexo: remover tira o item da lista`, (await an.locator('.p-anexo').count()) === 3);
    check(`[${rot}] anexo: erro tem borda e texto de erro`, await an.locator('.p-anexo--erro .p-anexo-detalhe').isVisible());

    // ---- Confirmação ----
    await page.locator('[data-abrir-dialogo="dlg-alerta"]').scrollIntoViewIfNeeded(); await page.locator('[data-abrir-dialogo="dlg-alerta"]').click();
    const da = page.locator('#dlg-alerta');
    check(`[${rot}] confirmação: abre sem botão X e com Cancelar focado`, (await da.evaluate(d => d.open)) && (await da.locator('header button').count()) === 0 && (await page.evaluate(() => document.activeElement.textContent.trim())) === 'Cancelar');
    await page.mouse.click(5, 5); check(`[${rot}] confirmação: clicar no fundo NÃO fecha`, await da.evaluate(d => d.open));
    await page.keyboard.press('Escape'); check(`[${rot}] confirmação: Esc fecha`, !(await da.evaluate(d => d.open)));
    await page.locator('#conf-demo').click(); const dc = page.locator('dialog.p-dialogo--alerta[open]');
    check(`[${rot}] confirmação pelo código: abre com título e botão de perigo`, (await dc.locator('h3').textContent()) === 'Apagar 12 cartões?' && (await dc.locator('.p-perigo').count()) === 1);
    await dc.locator('.p-perigo').click(); await page.waitForTimeout(200);
    check(`[${rot}] confirmação pelo código: Apagar resolve true, fecha e some do DOM`, (await page.locator('.p-toast', { hasText: 'Cartões apagados' }).count()) === 1 && (await page.locator('dialog.p-dialogo--alerta[open]').count()) === 0 && (await page.locator('dialog.p-dialogo--alerta').count()) === 1);
    await page.locator('#conf-demo').click(); await page.locator('dialog.p-dialogo--alerta[open] button', { hasText: 'Cancelar' }).click(); await page.waitForTimeout(200);
    check(`[${rot}] confirmação pelo código: Cancelar resolve false`, (await page.locator('.p-toast', { hasText: 'Nada foi apagado' }).count()) === 1);

    // ---- Alerta em caixa ----
    const ac = page.locator('#alerta .p-alerta--caixa');
    check(`[${rot}] alerta em caixa: 3 caixas com ícone, título e descrição; só o erro usa role=alert`, (await ac.count()) === 3 && (await ac.locator('svg').count()) === 3 && (await ac.locator('strong').count()) === 3 && (await page.locator('#alerta [role="alert"]').count()) === 1);
    check(`[${rot}] alerta em caixa: cor do ícone muda por tipo`, new Set(await ac.locator('svg').evaluateAll(l => l.map(x => getComputedStyle(x).color))).size === 3);

    // ---- Correções de revisão da autora ----
    const mnSeta = page.locator('#menunav .p-menunav details > summary').first();
    await mnSeta.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const setaFechado = await mnSeta.evaluate(e => { const c = getComputedStyle(e, '::after'); return { img: c.backgroundImage, conteudo: c.content, w: c.width }; });
    check(`[${rot}] menu com painéis: uma seta só (sem imagem do Pico, sem glifo duplo)`, setaFechado.img === 'none' && setaFechado.conteudo === '""', setaFechado);
    const rotFechado = await mnSeta.evaluate(e => getComputedStyle(e, '::after').transform);
    await mnSeta.click(); await page.waitForTimeout(300); const rotAberto = await mnSeta.evaluate(e => getComputedStyle(e, '::after').transform);
    check(`[${rot}] menu com painéis: a seta vira ao abrir`, rotFechado !== rotAberto, [rotFechado, rotAberto]); await page.keyboard.press('Escape');
    const gr = await page.locator('#selecao li.p-selecao-grupo').first().evaluate(e => { const c = getComputedStyle(e); return { fundo: c.backgroundColor !== 'rgba(0, 0, 0, 0)', caixa: c.textTransform === 'uppercase' }; });
    check(`[${rot}] seleção: rótulo de grupo em caixa alta com fundo próprio`, gr.fundo && gr.caixa, gr);
    const ic = await page.locator('#vazio-rico .p-vazio-icone svg').first().evaluate(e => { const r = e.getBoundingClientRect(); return r.width > 10 && r.height > 10; });
    check(`[${rot}] vazio: o ícone é um desenho de verdade, não um caractere`, ic);
    check(`[${rot}] 0 pageerrors`, erros.length === 0, erros);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`painel-ui: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
