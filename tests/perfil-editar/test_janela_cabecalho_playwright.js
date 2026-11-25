// Janelas no visual do painel (.janela-painel: Editar perfil, Reportar problema, Confirmar edição, Trocar de curso...):
// o cabeçalho é sticky e, ao rolar a janela, os campos não podem aparecer através do título (bug de 2026-11-11:
// o fundo era transparente). Confere: fundo do cabeçalho opaco e igual ao da janela; depois de rolar até o fim, o
// ponto do meio do título continua sendo o próprio cabeçalho (nenhum campo por cima/através).
// fr/zh x claro/escuro x 390/1280px; capturas em tests/perfil-editar/capturas/ (fora do git).
// Rodar: node tests/perfil-editar/test_janela_cabecalho_playwright.js
const { abrir } = require('../painel-alunos/harness.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
(async () => {
  for (const lang of ['fr', 'zh']) for (const scheme of ['light', 'dark']) for (const width of [390, 1280]) {
    const tag = `${lang} ${scheme} ${width}px`;
    const h = await abrir({ lang, scheme, width, height: width === 390 ? 700 : 560 }); const p = h.page;
    for (const id of ['profile-edit-modal', 'report-modal']) {
      await p.evaluate((id) => {
        document.querySelectorAll('.app-modal-overlay').forEach(o => { o.style.display = 'none'; });
        if (id === 'profile-edit-modal' && typeof openEditProfileModal === 'function') { try { openEditProfileModal([]); } catch (e) {} }
        document.getElementById(id).style.display = 'flex';
      }, id);
      await p.waitForTimeout(300);
      const r = await p.evaluate((id) => {
        const ov = document.getElementById(id), modal = ov.querySelector('.app-modal'), head = modal.querySelector('.app-modal-header');
        const rola = modal.scrollHeight > modal.clientHeight + 4;
        modal.scrollTop = modal.scrollHeight;
        const cor = (el) => getComputedStyle(el).backgroundColor;
        const opaco = (c) => /^rgb\(/.test(c) || /rgba\([^)]*,\s*1\)$/.test(c) || (/^color\(/.test(c) && (!c.includes('/') || /\/\s*1\)$/.test(c)));
        const hr = head.getBoundingClientRect(), t = head.querySelector('h3').getBoundingClientRect();
        const pontos = [[t.left + 4, t.top + t.height / 2], [t.left + t.width / 2, t.top + t.height / 2], [hr.left + hr.width / 2, hr.bottom - 3]];
        const fora = pontos.map(([x, y]) => document.elementFromPoint(x, y)).filter(e => !e || !head.contains(e)).map(e => e ? e.tagName + '.' + e.className : 'nada');
        return { rola, fundoCab: cor(head), fundoJanela: cor(modal), opaco: opaco(cor(head)), topoCab: Math.round(hr.top - modal.getBoundingClientRect().top), fora };
      }, id);
      L(`${tag} ${id}: fundo do cabeçalho opaco e igual ao da janela`, r.opaco && r.fundoCab === r.fundoJanela, r);
      L(`${tag} ${id}: depois de rolar, o cabeçalho continua no topo e nada aparece no lugar do título`, r.topoCab <= 1 && r.fora.length === 0, r);
      if (id === 'profile-edit-modal') L(`${tag} ${id}: a janela tem mesmo o que rolar (o teste vale)`, r.rola, r.rola);
      if (id === 'profile-edit-modal') await p.screenshot({ path: path.join(OUT, `editar-perfil-rolado-${lang}-${scheme}-${width}.png`) });
    }
    L(`${tag}: sem erros de JS`, h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`\n${ok}/${ok + bad} checks`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
