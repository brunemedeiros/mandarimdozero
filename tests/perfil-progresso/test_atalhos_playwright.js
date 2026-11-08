// Perfil > Progresso (decisão da dona, 2026-10-31): números primeiro e Conquistas no fim.
//  - "Ver estatísticas completas" (Visão geral) abre o Progresso no topo, com os números à vista;
//  - "Ver todas" (Conquistas da Visão geral) abre o Progresso já rolado até as Conquistas;
//  - aviso "Nova conquista!" no sino (action_tab 'profile' gravado pelo banco) abre as Conquistas com a conquista em destaque;
//  - outro aviso com action_tab 'profile' continua abrindo a Visão geral.
// fr/zh x claro/escuro x 390px/1280px; capturas em tests/perfil-progresso/capturas/ (fora do git).
// Rodar: node tests/perfil-progresso/test_atalhos_playwright.js
const { abrir } = require('../painel-alunos/harness.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const visivel = (p, sel) => p.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) return { ok: false, motivo: 'sem elemento' };
  const bar = [...document.querySelectorAll('.topbar')].find(b => b.offsetParent !== null && /sticky|fixed/.test(getComputedStyle(b).position));
  const topo = bar ? bar.getBoundingClientRect().bottom : 0, r = el.getBoundingClientRect();
  return { ok: r.top >= topo - 1 && r.top < innerHeight - 40, top: Math.round(r.top), topo: Math.round(topo), scrollY: Math.round(scrollY) };
}, sel);
(async () => {
  for (const lang of ['fr', 'zh']) for (const scheme of ['light', 'dark']) for (const width of [390, 1280]) {
    const tag = `${lang} ${scheme} ${width}px`;
    const h = await abrir({ lang, scheme, width, height: 850 }); const p = h.page;
    const ativa = () => p.evaluate(() => document.querySelector('.view.active')?.id);

    // Ordem da tela
    const ordem = await p.evaluate(() => { const s = document.getElementById('stat-cards'), b = document.getElementById('badge-grid');
      return !!(s && b && (s.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    L(`${tag}: números vêm antes das Conquistas`, ordem);

    // "Ver estatísticas completas", clicado com a Visão geral rolada até o botão
    await p.evaluate(() => switchTab('profile')); await p.waitForTimeout(500);
    await p.locator('#profile-stats-link').scrollIntoViewIfNeeded(); await p.locator('#profile-stats-link').click(); await p.waitForTimeout(400);
    L(`${tag}: "Ver estatísticas completas" abre o Progresso`, await ativa() === 'view-progress', await ativa());
    const nums = await visivel(p, '#stat-cards');
    L(`${tag}: os números aparecem sem rolar`, nums.ok, nums);

    // "Ver todas"
    await p.evaluate(() => switchTab('profile')); await p.waitForTimeout(500);
    await p.locator('#profile-badges-link').scrollIntoViewIfNeeded(); await p.locator('#profile-badges-link').click(); await p.waitForTimeout(400);
    L(`${tag}: "Ver todas" abre o Progresso`, await ativa() === 'view-progress', await ativa());
    const conq = await visivel(p, '#view-progress .conquests-label');
    L(`${tag}: "Ver todas" cai no título Conquistas, abaixo da barra do topo`, conq.ok, conq);

    // Sino: "Nova conquista!" (gravado com action_tab 'profile', como no banco) e outro aviso com 'profile'
    const nome = await p.evaluate(() => document.querySelector('#badge-grid .track-card .track-name')?.textContent.trim());
    L(`${tag}: há cartão de conquista com nome`, !!nome, nome);
    await p.evaluate(() => switchTab('path')); await p.waitForTimeout(300); await p.evaluate(() => window.scrollTo(0, 0));
    await p.evaluate((nome) => {
      const agora = new Date().toISOString();
      fetchRecentNotifications = async () => [
        { id: 'n1', category: 'gamificacao', event_type: 'achievement_unlocked', title: 'Nova conquista! 🏅', body: `Você ganhou a conquista "${nome}" 📚`, action_tab: 'profile', created_at: agora, read_at: null },
        { id: 'n2', category: 'perfil', event_type: 'profile_viewed', title: 'Perfil', body: 'Alguém viu seu perfil', action_tab: 'profile', created_at: agora, read_at: null },
      ];
      markNotificationRead = async () => {};
    }, nome);
    await p.evaluate(() => renderNotificationDropdown()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('[data-notification-id="n1"]').click()); await p.waitForTimeout(500);
    L(`${tag}: aviso "Nova conquista!" abre o Progresso`, await ativa() === 'view-progress', await ativa());
    const conq2 = await visivel(p, '#view-progress .conquests-label');
    L(`${tag}: aviso cai no título Conquistas`, conq2.ok, conq2);
    const destaque = await p.evaluate(() => [...document.querySelectorAll('#badge-grid .is-spotlight')].map(e => e.querySelector('.track-name, .track-chip-name')?.textContent.trim()));
    L(`${tag}: a conquista do aviso fica em destaque (só ela)`, destaque.length === 1 && destaque[0] === nome, destaque);
    await p.screenshot({ path: path.join(OUT, `atalho-conquista-${lang}-${scheme}-${width}.png`) });

    await p.evaluate(() => renderNotificationDropdown()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('[data-notification-id="n2"]').click()); await p.waitForTimeout(500);
    L(`${tag}: outro aviso com 'profile' continua abrindo a Visão geral`, await ativa() === 'view-profile', await ativa());

    L(`${tag}: sem erros de JS`, h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`\n${ok}/${ok + bad} checks`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
