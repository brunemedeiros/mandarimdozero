// PROTÓTIPO (não está no app): telas candidatas do Desafio "Expressões" no molde da trilha, montadas na página real
// do site (CSS e classes reais) só para a autora comparar. Nada daqui é carregado pelo app.
// Rodar: node docs/prototipos/expressoes/gerar-capturas.js <pasta-de-saida>
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = process.argv[2] || path.join(__dirname, 'saida');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){ const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) }, functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client }; })();`;

// ---------- peças (classes reais do site) ----------
const BAR = pct => `<div class="lesson-focus-bar"><div class="lesson-progress-track"><div class="lesson-progress-fill" style="width:${pct}%"></div></div>
  <button class="lesson-close-btn">⚑</button><button class="lesson-close-btn">⌨️</button><button class="lesson-close-btn">✕</button></div>`;
const HEAD = `<div class="lesson-unit-context"><div class="lesson-hint-eyebrow">DESAFIOS · EXPRESSÕES · A1</div><div class="lesson-unit-title">Avoir faim</div></div>`;
const PROMPT = `<div class="exercise-prompt-label">O que significa?</div>
  <div class="exercise-prompt"><div class="prompt-french">avoir faim</div><button class="audio-btn">🔊</button><span class="expr-reg-proto" style="font-size:12px;color:var(--ink-soft)">Dia a dia</span></div>`;
const OPTS = ['Être fatigué', 'Avoir très envie de manger', 'Être content', 'Avoir soif'];
const opts = (cls = [], hints = true, blur = false) => `<div class="exercise-options" ${blur ? 'style="filter:blur(6px);pointer-events:none"' : ''}>${OPTS.map((o, i) =>
  `<button class="exercise-option ${cls[i] || ''}" style="position:relative">${hints ? `<span class="kbd-hint">${i + 1}</span>` : ''}<div class="opt-text">${o}</div></button>`).join('')}</div>`;
const DK = `<button class="exercise-dontknow">Não sei</button>`;
const wrap = inner => `<div class="exercise-wrap">${inner}</div>`;
const MEANING = `<div class="feedback-inner-box"><strong>avoir faim</strong><br>Significa: <em>avoir envie de manger</em><br>Em português: <em>estar com fome</em></div>`;
const EXPL = `<div class="feedback-inner-box">On utilise « avoir » (et non « être ») avec la faim, la soif, le froid, le chaud.</div>`;

const SCREENS = {
  // A: desfoque mantido, no molde da trilha
  'A1-desfoque': HEAD + BAR(0) + wrap(PROMPT + `<div style="position:relative">${opts([], true, true)}<button class="btn btn-secondary" style="position:absolute;inset:0;margin:auto;width:max-content;height:max-content">Ver as respostas</button></div>`),
  'A2-desfoque-aberto': HEAD + BAR(0) + wrap(PROMPT + opts() + DK),
  // B: "Meu palpite" + botão menor "Ver opções"
  'B1-palpite': HEAD + BAR(0) + wrap(PROMPT + `<div class="feedback-inner-box" style="text-align:left;margin:0 0 14px"><label style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft)">Meu palpite (opcional)</label>
      <input type="text" style="width:100%;margin-top:8px;padding:12px 14px;border:2px solid var(--paper-line);border-radius:12px;background:var(--paper);color:var(--ink);font:inherit" placeholder="O que você acha que significa?"></div>
      <div style="display:flex;justify-content:center"><button class="btn btn-secondary">Ver opções</button></div>`),
  'B2-palpite-opcoes': HEAD + BAR(0) + wrap(PROMPT + `<p style="margin:0 0 12px;font-size:13.5px;color:var(--ink-soft)">Seu palpite: <strong style="color:var(--ink)">“estar com fome?”</strong></p>` + opts() + DK),
  // C: opções sempre visíveis (igual à trilha, sem tempo de reflexão)
  'C-visivel': HEAD + BAR(0) + wrap(PROMPT + opts() + DK),
  // Feedback proposto (vale para A, B ou C): em passos curtos, como a trilha
  'F1-resposta-certa': HEAD + BAR(25) + wrap(PROMPT + opts(['', 'correct', '', '']) + `<div class="correct-feedback" style="margin-top:14px"><div class="feedback-card-body"><div class="correct-feedback-header">✅ Isso mesmo!</div>${MEANING}<button class="btn btn-primary btn-block correct-feedback-continue">Continuar →</button></div></div>`),
  'F1-resposta-errada': HEAD + BAR(25) + wrap(PROMPT + opts(['incorrect', 'correct', '', '']) + `<div class="wrong-feedback" style="margin-top:14px"><div class="feedback-card-body"><div class="wrong-feedback-header">Não foi dessa vez</div><div class="wrong-feedback-why"><div class="wrong-feedback-why-label">Por que não</div>${EXPL}</div><div class="wrong-feedback-why"><div class="wrong-feedback-why-label">Sentido</div>${MEANING}</div><button class="btn btn-primary btn-block wrong-feedback-continue">Continuar →</button></div></div>`),
  'F2-exemplos': HEAD + BAR(50) + wrap(`<div class="exercise-prompt-label">Veja em frases</div>
      ${['J’ai faim, je vais manger quelque chose.', 'Les enfants ont faim après l’école.'].map((x, i) => `<div class="exercise-prompt" style="margin-bottom:12px;align-items:flex-start"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft)">Exemplo ${i + 1}</div><div style="font-size:19px;font-weight:800;text-align:left">${x}</div><div style="display:flex;gap:8px"><button class="audio-btn">🔊</button><button class="audio-btn">🐢</button></div></div>`).join('')}
      <button class="btn btn-primary btn-block">Continuar →</button>`),
  'F3-sua-vez': HEAD + BAR(75) + wrap(`<div class="exercise-prompt-label">Sua vez</div>
      <div class="exercise-prompt"><div style="font-size:20px;font-weight:800;text-align:center;line-height:1.5">Hier soir, j’ai trop bu, alors ce matin, je <span style="display:inline-block;min-width:120px;border-bottom:3px dashed var(--paper-line)">&nbsp;</span> et je ne veux pas sortir.</div></div>
      <input type="text" style="width:100%;padding:12px 14px;border:2px solid var(--paper-line);border-radius:12px;background:var(--paper);color:var(--ink);font:inherit;margin-bottom:12px" placeholder="Digite em francês">
      <button class="btn btn-primary btn-block">Verificar</button>${DK}`)
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [tag, vw, vh, theme] of [['desktop-claro', 1000, 640, 'light'], ['celular-escuro', 390, 760, 'dark']]){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(([th]) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, [theme]);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    // Abre a área dos Desafios em modo foco (mesma moldura do player real) e troca só o conteúdo.
    await page.evaluate(() => { switchTab('challenges'); document.getElementById('challenges-categories-wrap').style.display = 'none';
      document.getElementById('challenge-player-wrap').style.display = 'block'; });
    await page.waitForTimeout(300);
    await page.addStyleTag({ content: '#challenge-back-to-list, .activity-focus-bar{ display:none !important; } #challenge-player-content > .exercise-wrap, #challenge-player-content > .lesson-unit-context, #challenge-player-content > .lesson-focus-bar{ max-width:760px; margin-left:auto; margin-right:auto; }' });
    for (const [name, html] of Object.entries(SCREENS)){
      await page.evaluate(h => { document.getElementById('challenge-player-content').innerHTML = h; window.scrollTo(0, 0); }, html);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: false });
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log('ok:', fs.readdirSync(OUT).length, 'capturas em', OUT);
})().catch(e => { console.error(e); process.exit(1); });
