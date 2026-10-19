// Menu "Mais" da sidebar (desktop): Configurações e Sair da conta saem da lista fixa e abrem por hover ou clique.
// Roda fr e zh, claro e escuro, no navegador real; Supabase vira stub (harness do painel de alunos).
const { abrir } = require('../painel-alunos/harness.js');
const path = require('path');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]) {
    const tag = `${lang} ${scheme}`;
    const h = await abrir({ lang, scheme });
    const p = h.page;
    const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }, sel);
    // 1. A lista fixa não tem mais Configurações nem Sair; Admin e Professora continuam
    const fixos = await p.evaluate(() => [...document.querySelectorAll('.sidebar-nav > .tab-btn')].map(b => b.dataset.tab || b.id));
    L(tag + ': Configurações e Sair fora da lista fixa', !fixos.includes('settings') && !fixos.includes('sidebar-logout-btn'), fixos);
    L(tag + ': Professora e Admin continuam na lista fixa', fixos.includes('teacher-panel') && fixos.includes('admin-badges'), fixos);
    const ordem = await p.evaluate(() => { const k = [...document.getElementById('sidebar-mais').parentElement.children]; return k.indexOf(document.getElementById('sidebar-mais')) === k.length - 1; });
    L(tag + ': "Mais" é o último item', ordem);
    L(tag + ': botão "Mais" visível e menu fechado', await vis('#sidebar-mais-btn') && !(await vis('#sidebar-mais-menu')));
    L(tag + ': rótulo "Mais" traduzido', (await p.textContent('#sidebar-mais-btn .sidebar-label')).trim().length > 0);
    // 2. Hover abre; mouse atravessa até o menu sem fechar; sair fecha
    await p.hover('#sidebar-mais-btn'); await sleep(250);
    L(tag + ': hover abre o menu', await vis('#sidebar-mais-menu'));
    L(tag + ': aria-expanded=true', (await p.getAttribute('#sidebar-mais-btn', 'aria-expanded')) === 'true');
    const bx = await p.locator('#sidebar-mais-btn').boundingBox(), ix = await p.locator('#sidebar-mais-menu [data-tab="settings"]').boundingBox();
    await p.mouse.move(bx.x + bx.width - 2, bx.y + bx.height / 2); await p.mouse.move(ix.x + 20, ix.y + ix.height / 2, { steps: 8 }); await sleep(350);
    L(tag + ': menu continua aberto com o mouse nele', await vis('#sidebar-mais-menu'));
    await p.mouse.move(700, 300); await sleep(450);
    L(tag + ': tirar o mouse fecha', !(await vis('#sidebar-mais-menu')));
    // 3. Clique fixa o menu; Esc fecha e devolve o foco
    await p.click('#sidebar-mais-btn'); await p.mouse.move(700, 300); await sleep(450);
    L(tag + ': aberto por clique fica aberto sem o mouse', await vis('#sidebar-mais-menu'));
    await p.keyboard.press('Escape'); await sleep(50);
    L(tag + ': Esc fecha', !(await vis('#sidebar-mais-menu')));
    L(tag + ': foco volta ao botão', await p.evaluate(() => document.activeElement && document.activeElement.id === 'sidebar-mais-btn'));
    await p.click('#sidebar-mais-btn'); await p.click('body', { position: { x: 700, y: 400 } }); await sleep(50);
    L(tag + ': clique fora fecha', !(await vis('#sidebar-mais-menu')));
    // 4. Teclado: Enter abre e Tab chega nos itens
    await p.focus('#sidebar-mais-btn'); await p.keyboard.press('Enter'); await p.keyboard.press('Tab');
    L(tag + ': Tab vai para Configurações', await p.evaluate(() => document.activeElement && document.activeElement.dataset.tab === 'settings'));
    await p.keyboard.press('Escape');
    // 5. Itens: nomes, Configurações abre a aba e marca "Mais"
    await p.hover('#sidebar-mais-btn'); await sleep(250);
    const itens = await p.evaluate(() => [...document.querySelectorAll('#sidebar-mais-menu [role="menuitem"]')].map(e => e.textContent.trim()));
    L(tag + ': menu tem Configurações e Sair da conta', itens.length === 2 && itens.every(t => t.length > 0), itens);
    await p.click('#sidebar-mais-menu [data-tab="settings"]'); await sleep(250);
    L(tag + ': Configurações abre a aba', await p.evaluate(() => document.getElementById('view-settings').classList.contains('active')));
    await p.mouse.move(700, 300); await sleep(450);
    L(tag + ': menu fecha depois de escolher', !(await vis('#sidebar-mais-menu')));
    const mark = await p.evaluate(() => { const b = document.getElementById('sidebar-mais-btn'); return getComputedStyle(b).boxShadow !== 'none'; });
    L(tag + ': "Mais" fica marcado quando Configurações está ativa', mark);
    // 6. Sair dispara o logout existente
    await p.evaluate(() => { window.__sai = 0; document.getElementById('logout-btn').addEventListener('click', (e) => { window.__sai++; e.stopImmediatePropagation(); }, true); });
    await p.hover('#sidebar-mais-btn'); await sleep(250); await p.click('#sidebar-logout-btn');
    L(tag + ': Sair aciona o logout existente', (await p.evaluate(() => window.__sai)) === 1);
    // 7. Menu recolhido: ícones só, menu com rótulos e dentro da tela
    await p.mouse.move(700, 300); await sleep(300);
    await p.click('#sidebar-toggle-btn'); await sleep(250);
    await p.hover('#sidebar-mais-btn'); await sleep(250);
    const col = await p.evaluate(() => { const m = document.getElementById('sidebar-mais-menu'), r = m.getBoundingClientRect(); const l = m.querySelector('[data-tab="settings"] span'); return { aberto: r.width > 0, rot: l.getBoundingClientRect().width > 0, dentro: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, rotBtn: document.querySelector('#sidebar-mais-btn .sidebar-label').getBoundingClientRect().width }; });
    L(tag + ': recolhido: menu abre com rótulos e dentro da tela', col.aberto && col.rot && col.dentro, col);
    L(tag + ': recolhido: botão só com ícone', col.rotBtn === 0, col);
    await p.screenshot({ path: path.join(process.env.SHOTS || '/tmp/claude-0', `menu-mais-${lang}-${scheme}.png`), clip: { x: 0, y: 60, width: 520, height: 700 } });
    L(tag + ': sem erros de JS', h.errors.length === 0, h.errors);
    await h.close();
  }
  // 8. Celular: sem sidebar; o "Mais" da barra de baixo segue igual
  const m = await abrir({ lang: 'fr', width: 390, height: 800 });
  const mob = await m.page.evaluate(() => ({ side: getComputedStyle(document.getElementById('app-sidebar')).display, mais: !!document.getElementById('mais-btn') }));
  L('celular: sidebar escondida e "Mais" da barra de baixo existe', mob.side === 'none' && mob.mais, mob);
  await m.close();
  console.log(`menu-mais: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
