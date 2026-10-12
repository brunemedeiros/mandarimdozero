// Design System do painel, Fase 1 -- Playwright (Chromium real). Guia de estilo em fr/zh x claro/escuro (+ 390px),
// e a prova principal da fase: o CSS do painel NÃO muda nada fora de um elemento .painel.
// Rodar: node tests/painel-ds/test_playwright.js   (SHOT_DIR=/caminho para salvar screenshots)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH, '/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'].filter(Boolean) }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'); const OUT = process.env.SHOT_DIR || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };
const COR = { fr: { light: { marca: 'rgb(52, 152, 214)', ok: 'rgb(58, 115, 89)', erro: 'rgb(214, 38, 25)' }, dark: { marca: 'rgb(77, 169, 232)', ok: 'rgb(82, 180, 135)', erro: 'rgb(255, 107, 92)' } },
              zh: { light: { marca: 'rgb(192, 35, 31)', ok: 'rgb(58, 115, 89)', erro: 'rgb(168, 58, 46)' }, dark: { marca: 'rgb(225, 82, 75)', ok: 'rgb(82, 180, 135)', erro: 'rgb(255, 123, 110)' } } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---------- 1. Guia de estilo nos 4 cenários + celular ----------
  for (const curso of ['fr', 'zh']){
    for (const tema of ['light', 'dark']){
      for (const largura of [1280, 390]){
        const rot = `${curso} ${tema} ${largura}px`;
        const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, colorScheme: tema, serviceWorkers: 'block' });
        const page = await ctx.newPage(); const erros = [], falhas = [];
        page.on('pageerror', e => erros.push(e.message));
        page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) falhas.push(r.status() + ' ' + r.url()); });
        await page.addInitScript(([c, t]) => { try { localStorage.setItem('guia-painel', JSON.stringify({ curso: c, tema: t })); } catch (e) {} }, [curso, tema]);
        await page.goto(base + '/shared/painel/guia-de-estilo.html'); await page.waitForTimeout(250);
        check(`[${rot}] 0 pageerrors`, erros.length === 0, erros);
        check(`[${rot}] nenhum arquivo do guia falhou ao carregar`, falhas.length === 0, falhas);
        check(`[${rot}] sem rolagem horizontal na página`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
        const info = await page.evaluate(() => {
          const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
          return {
            curso: document.documentElement.getAttribute('data-curso'), tema: document.documentElement.getAttribute('data-theme'),
            pMarca: getComputedStyle(document.querySelector('.painel')).getPropertyValue('--p-marca').trim(),
            botao: cs('#conteudo .g-palco button:not([disabled]):not(.secondary):not(.contrast):not(.outline)', 'backgroundColor'),
            seloOk: cs('.p-selo--ok', 'backgroundColor'), seloErro: cs('.p-selo--erro', 'backgroundColor'),
            fonte: cs('.painel', 'fontFamily'), fonteH1: cs('.painel h1', 'fontFamily'),
            abaBorda: cs('.p-abas a[aria-current]', 'borderBottomColor'), tokens: document.querySelectorAll('.g-token').length,
            tabelaOverflow: (() => { const t = document.querySelector('.p-tabela'); return t ? getComputedStyle(t).overflowX : null; })(),
            abasEspalhadas: (() => { const a = document.querySelectorAll('.p-abas a'); if (a.length < 3) return null; const g = a[1].getBoundingClientRect().left - a[0].getBoundingClientRect().right; return g; })(),
          };
        });
        const esp = COR[curso][tema];
        check(`[${rot}] atributos aplicados`, info.curso === curso && info.tema === tema, info);
        check(`[${rot}] botão primário usa a cor do curso (${esp.marca})`, info.botao === esp.marca, info.botao);
        check(`[${rot}] selo ok e selo erro com as cores do curso`, info.seloOk === esp.ok && info.seloErro === esp.erro, [info.seloOk, info.seloErro]);
        check(`[${rot}] fonte única Nunito, também no título`, /nunito/i.test(info.fonte) && /nunito/i.test(info.fonteH1) && !/serif sc/i.test(info.fonteH1), [info.fonte, info.fonteH1]);
        check(`[${rot}] aba atual sublinhada com a cor do curso`, info.abaBorda === esp.marca, info.abaBorda);
        check(`[${rot}] abas agrupadas à esquerda (não espalhadas)`, info.abasEspalhadas !== null && info.abasEspalhadas < 40, info.abasEspalhadas);
        check(`[${rot}] 15 tokens de cor no guia`, info.tokens === 15, info.tokens);
        check(`[${rot}] tabela rola só nela`, info.tabelaOverflow === 'auto', info.tabelaOverflow);
        if (OUT){ fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, `guia-${curso}-${tema}-${largura}.png`), fullPage: largura === 390 ? false : false }); }
        await ctx.close();
      }
    }
  }

  // ---------- 2. Troca de curso e tema pelos botões do guia ----------
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
    await page.goto(base + '/shared/painel/guia-de-estilo.html');
    await page.click('#curso button[data-v="zh"]'); await page.click('#tema button[data-v="dark"]');
    const cor = await page.evaluate(() => getComputedStyle(document.querySelector('.painel')).getPropertyValue('--p-marca').trim());
    check('clicar Mandarim + Escuro troca --p-marca para o vermelho escuro do zh', cor.toUpperCase() === '#E1524B', cor);
    const erro = await page.evaluate(() => getComputedStyle(document.querySelector('.p-selo--erro')).backgroundColor);
    check('zh usa --grade-again-bg como erro (fallback de --error-red)', erro === 'rgb(255, 123, 110)', erro);
    await ctx.close(); }

  // ---------- 3. Prova de que NADA fora de .painel muda ----------
  // Mesma página de controle com e sem os 3 CSS do painel: elementos FORA de .painel precisam ficar idênticos.
  const medir = () => ({
    h1: (() => { const e = document.getElementById('fora-h1'), c = getComputedStyle(e); return [c.fontSize, c.fontWeight, c.marginTop, c.color, c.fontFamily]; })(),
    botao: (() => { const c = getComputedStyle(document.getElementById('fora-btn')); return [c.backgroundColor, c.color, c.borderRadius, c.padding, c.fontFamily]; })(),
    link: (() => { const c = getComputedStyle(document.getElementById('fora-a')); return [c.color, c.textDecorationLine]; })(),
    input: (() => { const c = getComputedStyle(document.getElementById('fora-in')); return [c.backgroundColor, c.borderTopWidth, c.borderRadius, c.height]; })(),
    tabela: (() => { const c = getComputedStyle(document.getElementById('fora-td')); return [c.padding, c.borderBottomWidth]; })(),
    div: (() => { const c = getComputedStyle(document.getElementById('fora-div')); return [c.boxSizing, c.width]; })(),
    corpo: (() => { const c = getComputedStyle(document.body); return [c.margin, c.backgroundColor, c.color, c.fontFamily, c.fontSize, c.lineHeight]; })(),
    html: (() => { const c = getComputedStyle(document.documentElement); return [c.fontSize, c.colorScheme, c.backgroundColor]; })(),
  });
  const corpo = `<body><h1 id="fora-h1">Fora</h1><button id="fora-btn">Botão</button> <a id="fora-a" href="#">link</a> <input id="fora-in"> <table><tr><td id="fora-td">x</td></tr></table>
    <div id="fora-div" style="width:100px;padding:10px;border:1px solid red">caixa</div>
    <div class="painel" id="dentro"><h1 id="dentro-h1">Dentro</h1><button id="dentro-btn">Botão</button></div></body>`;
  // Stub dos tokens que o site já define no :root (valores reais do fr claro). Nas duas páginas, para a única diferença ser o CSS do painel.
  const STUB = '<style>:root{--seal-red:#3498D6;--seal-red-dark:#1D5A82;--on-seal-red:#201335;--imperial-gold:#E36BCA;--paper:#FAF5EA;--paper-warm:#F0E8D8;--paper-line:#E1D6C0;--ink:#201335;--ink-soft:#5C4E73;--jade:#3A7359;--error-red:#D62619;--on-vivid:#FFF;--grade-hard-bg:#8C5F0E;--count-new:#1D5A82;--font-body:Nunito,sans-serif;--radius:14px}</style>';
  const html = (comCss) => `<!doctype html><html data-theme="light"><head><meta charset="utf-8">${STUB}${comCss ? ['vendor/pico.painel.css', 'painel-tokens.css', 'painel-componentes.css'].map(f => `<link rel="stylesheet" href="${base}/shared/painel/${f}">`).join('') : ''}</head>${corpo}</html>`;
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, serviceWorkers: 'block' });
  const sem = await ctx.newPage(); await sem.route('**/controle-sem', r => r.fulfill({ contentType: 'text/html', body: html(false) })); await sem.goto(base + '/controle-sem');
  const com = await ctx.newPage(); await com.route('**/controle-com', r => r.fulfill({ contentType: 'text/html', body: html(true) })); await com.goto(base + '/controle-com'); await com.waitForTimeout(300);
  const a = await sem.evaluate(medir), b = await com.evaluate(medir);
  for (const k of Object.keys(a)) check(`FORA de .painel: ${k} idêntico com e sem o CSS do painel`, JSON.stringify(a[k]) === JSON.stringify(b[k]), { sem: a[k], com: b[k] });
  const dentro = await com.evaluate(() => { const c = getComputedStyle(document.getElementById('dentro-btn')); return c.backgroundColor; });
  check('DENTRO de .painel o botão recebe o estilo do painel', dentro === 'rgb(52, 152, 214)', dentro);
  const h1d = await com.evaluate(() => getComputedStyle(document.getElementById('dentro-h1')).color), h1f = await sem.evaluate(() => getComputedStyle(document.getElementById('fora-h1')).color);
  check('DENTRO de .painel o h1 recebe a cor de tinta do site (a base do Pico está ativa)', h1d === 'rgb(32, 19, 53)' && h1f !== h1d, [h1d, h1f]);
  await ctx.close();

  // ---------- 4. Fase 1 não toca nas telas existentes ----------
  for (const f of ['fr/index.html', 'zh/index.html', 'index.html']){
    const txt = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(`${f} não carrega o CSS do painel (Fase 1 não altera telas)`, !/shared\/painel\//.test(txt));
  }
  await browser.close(); server.close();
  console.log(`\npainel-ds playwright: ${passed}/${passed + failed} checks`); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
