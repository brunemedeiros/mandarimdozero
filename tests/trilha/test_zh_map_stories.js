// Histórias-checkpoint do zh aparecem no Mapa (bloqueada/disponível/concluída) e abrem.
// Rodar: node tests/trilha/test_zh_map_stories.js
const src = require('fs').readFileSync(__dirname + '/test_trail_map.js', 'utf8');
const head = src.slice(0, src.indexOf('(async () => {'));
eval(head.replace(/^const \{ chromium \}/m, 'var { chromium }').replace(/const /g, 'var ').replace(/let /g, 'var '));
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const { page, errors } = await boot(browser, port, 'zh');
  await page.evaluate(() => { localStorage.setItem('mandarim_trail_view', 'map'); renderUnitsGrid(); });
  let r = await page.evaluate(() => [...document.querySelectorAll('.tm-story')].map(b => ({ k: b.dataset.key, c: b.className })));
  check('4 histórias no mapa', r.length === 4 && STORIES_LEN(r), r);
  function STORIES_LEN(x){ return x.every(i => /locked/.test(i.c)); }
  await page.evaluate(() => { STATE.unitProgress[5].completed = true; STATE.unitProgress[5].started = true; renderUnitsGrid(); });
  r = await page.evaluate(() => document.querySelector('.tm-story').className);
  check('liberada após unidade 5', /available/.test(r), r);
  await page.click('.tm-story');
  await page.click('.tm-actions .btn');
  r = await page.evaluate(() => document.getElementById('story-wrap').style.display);
  check('abre a história', r === 'block', r);
  check('sem erros', errors.length === 0, errors);
  console.log(`zh histórias no mapa: ${passed} ok, ${failed} falhas`);
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})();
