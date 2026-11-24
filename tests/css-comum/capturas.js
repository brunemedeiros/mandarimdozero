// Plano do CSS comum (docs/css-comum/plano.md), prova nº 2 de cada etapa: capturas de tela de uma árvore de arquivos,
// para comparar ANTES (árvore de referência, ex.: worktree de origin/main) e DEPOIS pixel a pixel:
//   node tests/css-comum/capturas.js <árvore> <saída> [larguras=1200,390,360] [temas=light,dark]
//   node tests/e4/comparar-capturas.js <antes> <depois> 0
// Telas: topo, todas as abas que o site tem (Trilha em lista e em Mapa, Revisão, Decks, Progresso, Metas, Perfil, Amigos,
// Ranking, Configurações e cada seção, painéis do Aluno e da Professora, Conquistas do admin, Desafios, Conjugação,
// Ditados, Hanzi...) e janelas (meta de estudo, reportar ⚑, sino, menu da conta, troca de idioma, tela de login).
// As telas de LIÇÃO e de REVISÃO passo a passo ficam com tests/paridade-sites/capturas_quase_iguais.js (mesmo uso).
// Visitante (sem conta), Supabase de mentira, relógio parado, sorteios com semente e animações desligadas: a mesma árvore
// dá as mesmas imagens toda vez (conferido na etapa 0).
const fs = require('fs'), path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const H = require('../paridade-sites/quase-iguais-harness.js');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || 'capturas-css');
const LARG = (process.argv[4] || '1200,390,360').split(',').map(Number), TEMAS = (process.argv[5] || 'light,dark').split(',');
const SITES = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'index.html')) && fs.existsSync(path.join(ROOT, d, 'app.js')));
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const server = H.serve(ROOT); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  let total = 0, falhas = 0; const indice = [];
  for (const site of SITES) for (const theme of TEMAS) for (const width of LARG){
    const { ctx, page, errors } = await H.abrir(browser, port, site, { width, theme });
    const tick = (ms = 800) => page.clock.runFor(ms);
    const foto = async (nome, alvo) => {
      const arq = `${site}-${theme}-${width}-${nome}.png`;
      await tick(100);
      if (alvo){ const el = await page.$(alvo); if (!el) return; await el.screenshot({ path: path.join(OUT, arq) }); }
      else await page.screenshot({ path: path.join(OUT, arq), fullPage: true });
      indice.push(arq); total++;
    };
    const cena = async (nome, fn, alvo, arg) => {
      try { await page.evaluate(fn, arg); await tick(); await foto(nome, alvo); }
      catch (e) { falhas++; console.log(`  ${site} ${theme} ${width} ${nome}: ${String(e.message).split('\n')[0]}`); }
      await page.evaluate(() => { document.querySelectorAll('.modal, [id$="-modal"], [id$="-dropdown"]').forEach(m => { if (getComputedStyle(m).display !== 'none' && !m.closest('#app > .view')) m.style.display = 'none'; }); document.body.classList.remove('modal-open'); }).catch(() => {});
    };
    // Conta de mentira no topo (mesmo texto nos dois sites, para o topo ter a largura de uso real).
    await page.evaluate(() => { const b = document.getElementById('user-menu-btn'); if (b){ b.style.removeProperty('display'); b.hidden = false; }
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('user-label', 'Brune Medeiros'); set('streak-count', '12'); set('xp-count', '340'); });
    await cena('topo', () => switchTab('path'), '.topbar, header');
    const abas = await page.evaluate(() => [...document.querySelectorAll('.view[id^="view-"]')].map(v => v.id.slice(5)));
    for (const aba of abas){
      if (aba === 'path'){
        await cena('aba-path-lista', () => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'list'); } catch (e) {} switchTab('path'); renderUnitsGrid(); });
        await cena('aba-path-mapa', () => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'map'); } catch (e) {} renderUnitsGrid(); });
        await page.evaluate(() => { try { localStorage.setItem(LANG_HOOKS.appKey === 'frances' ? 'frances_trail_view' : 'mandarim_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); });
      } else await cena('aba-' + aba, (a) => switchTab(a), undefined, aba);
    }
    const secoes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-settings-section]')].map(b => b.getAttribute('data-settings-section')))]);
    for (const s of secoes) await cena('config-' + s, (x) => { switchTab('settings'); switchSettingsSection(x); }, undefined, s);
    await cena('janela-meta', () => { switchTab('goals'); openStudyPlanModal(); });
    await cena('janela-reportar', () => { switchTab('path'); document.getElementById('report-topbar-btn').click(); });
    await cena('janela-sino', () => { switchTab('path'); document.getElementById('notifications-topbar-btn').click(); });
    await cena('menu-conta', () => { switchTab('path'); document.getElementById('user-menu-btn').click(); });
    await cena('menu-idioma', () => { switchTab('path'); document.getElementById('lang-switcher-btn').click(); });
    await cena('tela-login', () => { document.getElementById('login-screen').style.display = 'flex'; document.getElementById('app').style.display = 'none'; });
    if (errors.length){ falhas++; console.log(`  ${site} ${theme} ${width}: erros de página`, errors.slice(0, 3)); }
    await ctx.close();
  }
  server.close(); await browser.close();
  fs.writeFileSync(path.join(OUT, 'indice.txt'), indice.join('\n') + '\n');
  console.log(`${total} capturas em ${OUT}; ${falhas} problema(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
