// E4: compara duas pastas de capturas (de tests/e4/capturas.js) pixel a pixel, com tolerância (ruído de gradiente/antialias).
// Uso: node tests/e4/comparar-capturas.js <antes> <depois> [limite % de pixels diferentes, padrão 0.2]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path');
const [A, B] = [path.resolve(process.argv[2]), path.resolve(process.argv[3])];
const LIMIT = Number(process.argv[4] || 0.2);
(async () => {
  const names = fs.readdirSync(A).filter(f => f.endsWith('.png')).sort();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  let bad = 0;
  for (const n of names) {
    if (!fs.existsSync(path.join(B, n))) { console.log('FALTA depois:', n); bad++; continue; }
    const a = 'data:image/png;base64,' + fs.readFileSync(path.join(A, n)).toString('base64');
    const b = 'data:image/png;base64,' + fs.readFileSync(path.join(B, n)).toString('base64');
    const r = await page.evaluate(async ([a, b]) => {
      const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: false };
      const px = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const da = px(ia), db = px(ib); let diff = 0, max = 0;
      for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); if (d > max) max = d; if (d > 12) diff++; }
      return { size: true, pct: 100 * diff / (da.length / 4), max };
    }, [a, b]);
    const ok = r.size && r.pct <= LIMIT;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'DIFF ') + n + (r.size ? `  ${r.pct.toFixed(3)}% dos pixels (maior diferença de canal ${r.max})` : '  tamanhos diferentes'));
  }
  await browser.close();
  console.log(`${names.length - bad} de ${names.length} capturas iguais (tolerância ${LIMIT}%)`);
  process.exit(bad ? 1 : 0);
})();
