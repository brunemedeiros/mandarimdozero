// Selos das conquistas e passaporte do Perfil (decisão da autora, 2026-11-24; shared/selos.js e shared/selos.css).
// fr/zh x claro/escuro x 390/1280px, com o código de produção (só a rede é falsa):
//  1) Visão geral: passaporte (carimbo por idioma, barra "Rumo ao próximo nível"), um selo por conquista ganha;
//  2) tudo dentro do selo: ícone, nome, faixa e data ficam dentro da borda de dentro (1px de folga), nos 16 formatos
//     e nos estados nível / máximo / bloqueada / clássica (catálogo montado pelo teste com seloHTML);
//  3) faixa do nível com contraste >= 4,5:1; nível máximo com o selo inteiro em ouro; borda preenchida = progresso;
//  4) data só nas conquistas novas (a data fictícia do registro em lote, BADGE_BACKFILL_EARNED_AT, não aparece);
//  5) Progresso: cada cartão de trilha com o selo pequeno, cadeado nas bloqueadas e etiqueta do nível na cor do selo;
//  6) sem erros de JS. Capturas em tests/selos/capturas/ (fora do git).
// Rodar: node tests/selos/test_selos_playwright.js
const { abrir } = require('../painel-alunos/harness.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i).slice(0, 600)); } };

// Mede, dentro da página, se o conteúdo de cada selo cabe na borda de dentro.
const MEDIR = () => {
  const falhas = [];
  document.querySelectorAll('.track-chip.selo').forEach(chip => {
    const dentro = chip.querySelector('.selo-dentro'); if (!dentro) { falhas.push(chip.dataset.trackChip + '/sem-borda'); return; }
    const M = dentro.getScreenCTM().inverse(), svg = dentro.ownerSVGElement, caixas = [];
    const ico = chip.querySelector('.selo-ico'); if (ico) caixas.push(['ícone', ico.getBoundingClientRect()]);
    const rg = document.createRange(); rg.selectNodeContents(chip.querySelector('.track-chip-name')); [...rg.getClientRects()].forEach(x => caixas.push(['nome', x]));
    caixas.push(['nível', chip.querySelector('.selo-nivel').getBoundingClientRect()]);
    const dt = chip.querySelector('.selo-data'); if (dt) { const rd = document.createRange(); rd.selectNodeContents(dt); caixas.push(['data', rd.getBoundingClientRect()]); }
    caixas.forEach(([q, b]) => {
      const fora = [[b.left - 1, b.top - 1], [b.right + 1, b.top - 1], [b.left - 1, b.bottom + 1], [b.right + 1, b.bottom + 1]].filter(([x, y]) => {
        const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; return !dentro.isPointInFill(pt.matrixTransform(M)); });
      if (fora.length) falhas.push((chip.closest('[data-cat]') ? chip.closest('[data-cat]').dataset.cat + ':' : '') + chip.dataset.trackChip + '/' + q);
    });
  });
  return falhas;
};
const CONTRASTE = () => {
  const parse = s => { const m = s.match(/[\d.]+/g).map(Number); return m.length >= 3 ? m.slice(0, 3) : null; };
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  return [...document.querySelectorAll('.selo:not(.is-bloqueada) .selo-nivel')].map(e => { const cs = getComputedStyle(e), a = parse(cs.color), b = parse(cs.backgroundColor);
    const r = (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05); return { id: e.closest('.selo').dataset.trackChip, r: +r.toFixed(2) }; }).filter(x => x.r < 4.5);
};

(async () => {
  for (const lang of ['fr', 'zh']) for (const scheme of ['light', 'dark']) for (const width of [390, 1280]) {
    const tag = `${lang} ${scheme} ${width}px`;
    const h = await abrir({ lang, scheme, width, height: 1400 }); const p = h.page;
    await p.addStyleTag({ content: '.selos-pagina .track-chip.selo{ transform:none !important; }' }); // mede sem a inclinação
    const r = await p.evaluate(async () => {
      PROFILE_CACHE = { user_id: CURRENT_USER.id, display_name: 'Marina <b>Duarte</b>', username: 'marina.duarte', bio: 'Bio de teste', public_profile: true };
      STATE.xp = 5200; STATE.streak = 64; STATE.lastStudyDay = todayStr();
      UNITS.slice(0, 12).forEach(u => { STATE.unitProgress[u.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      STATE.cards.slice(0, 220).forEach(c => Object.assign(c, { reps: 3, state: 'review', stability: 10, due: Date.now() + 864e5 }));
      const ganhas = ownBadgeShowcase();
      const datas = ganhas.map((v, i) => i % 2 ? '2026-11-06T18:00:00Z' : BADGE_BACKFILL_EARNED_AT); // pares = antigas (sem data)
      fetchOwnBadgeEarnedAt = async () => { const m = {}; ganhas.forEach((v, i) => { m[v.classic ? v.id : BadgeTracks.levelId(v.id, v.level)] = datas[i]; }); return m; };
      switchTab('profile'); await renderProfileView(); window.scrollTo(0, 0);
      const v = document.getElementById('view-profile');
      const selos = [...v.querySelectorAll('.profile-track-showcase .track-chip.selo')];
      const resumo = computeProgressSummary();
      return {
        nome: v.querySelector('.pp .profile-name')?.textContent, temTagNoNome: !!v.querySelector('.pp .profile-name b'),
        carimbos: v.querySelectorAll('.pp-carimbo').length, barra: v.querySelector('.pp-rumo [role=progressbar]')?.getAttribute('aria-valuenow'), pct: String(resumo.pct),
        ganhas: ganhas.length, selos: selos.length, ids: selos.map(s => s.dataset.trackChip), esperado: ganhas.map(x => x.id),
        comData: selos.map((s, i) => [!!s.querySelector('.selo-data'), !!(i % 2)]),
        botoes: ['profile-edit-btn', 'profile-stats-link', 'profile-badges-link'].filter(id => document.getElementById(id)).length,
      };
    });
    L(`${tag}: passaporte com carimbo do idioma`, r.carimbos >= 1, r);
    L(`${tag}: nome escapado (sem HTML de quem digitou)`, !r.temTagNoNome && /Marina <b>Duarte<\/b>/.test(r.nome), r.nome);
    L(`${tag}: barra "Rumo ao próximo nível" com a % do nível atual`, r.barra === r.pct, [r.barra, r.pct]);
    L(`${tag}: um selo por conquista ganha, na mesma ordem`, r.selos === r.ganhas && r.ganhas > 0 && JSON.stringify(r.ids) === JSON.stringify(r.esperado), r);
    L(`${tag}: data só nas conquistas novas`, r.comData.every(([tem, nova]) => tem === nova), r.comData);
    L(`${tag}: botões Editar, Ver estatísticas e Ver todas presentes`, r.botoes === 3, r.botoes);
    L(`${tag}: Visão geral, tudo dentro dos selos`, (await p.evaluate(MEDIR)).length === 0, await p.evaluate(MEDIR));
    await (await p.$('#view-profile')).screenshot({ path: path.join(OUT, `perfil-${lang}-${scheme}-${width}.png`) });

    // Catálogo: 16 formatos x estados (nível baixo, nível alto, máximo, bloqueada, sem dado de progresso) + clássica.
    const cat = await p.evaluate(() => {
      const box = document.createElement('div'); box.className = 'profile-section selos-caixa'; box.id = 'teste-catalogo';
      const estados = [['n1', { level: 1, total: 4, barFrom: 0, barTo: 10, barValue: 3 }], ['n6', { level: 6, total: 7, barFrom: 0, barTo: 10, barValue: 7 }],
        ['max', { level: 4, total: 4, maxed: true }], ['blq', { level: 0, total: 4 }], ['pub', { level: 2, total: 5 }]];
      const trilhas = Object.keys(SELO_POR_TRILHA); let html = '';
      estados.forEach(([nome, st]) => {
        html += `<div class="selos-pagina" data-cat="${nome}">` + trilhas.map(id => {
          const tr = BadgeTracks.trackById(id) || {}; const v = Object.assign({ id, track: id, fluent: tr.fluent, icon: tr.icon, name: 'Dicionário de Bolso' }, st);
          return seloHTML(v, { bloqueada: nome === 'blq', earnedAt: '2026-11-20T10:00:00Z' }); }).join('') + '</div>';
      });
      html += `<div class="selos-pagina" data-cat="classic">${seloHTML({ id: 'multitasker', classic: true, name: 'Multitarefa', fluent: (BadgeTracks.CLASSIC.multitasker || {}).fluent, icon: '🎯' })}</div>`;
      box.innerHTML = html; document.getElementById('profile-content').appendChild(box);
      const q = (s) => [...box.querySelectorAll(s)];
      return {
        n: q('.track-chip.selo').length, trilhas: trilhas.length,
        maxOuro: q('[data-cat="max"] .selo').every(s => s.classList.contains('is-max') && s.querySelector('path[fill="url(#selo-g-ouro-cheio)"]')),
        progresso: q('[data-cat="n1"] .selo').every(s => s.querySelector('path[pathLength="100"]').getAttribute('stroke-dasharray') === '30 100'),
        semDado: q('[data-cat="pub"] .selo').every(s => s.querySelector('path[pathLength="100"]').getAttribute('stroke-dasharray') === '100 100'),
        formas: new Set(q('[data-cat="n1"] .selo').map(x => x.dataset.forma)).size,
      };
    });
    L(`${tag}: catálogo montado (16 formatos x 5 estados + clássica)`, cat.n === cat.trilhas * 5 + 1 && cat.trilhas === 16, cat);
    L(`${tag}: cada trilha com formato próprio`, cat.formas === 16, cat.formas);
    L(`${tag}: nível máximo = selo inteiro em ouro`, cat.maxOuro, cat);
    L(`${tag}: borda preenchida conforme o progresso (30%)`, cat.progresso, cat);
    L(`${tag}: sem dado de progresso (perfil de outra pessoa) = borda cheia`, cat.semDado, cat);
    const fora = await p.evaluate(MEDIR);
    L(`${tag}: catálogo, tudo dentro dos selos em todos os formatos e estados`, fora.length === 0, fora.slice(0, 12));
    L(`${tag}: faixa do nível com contraste >= 4,5:1`, (await p.evaluate(CONTRASTE)).length === 0, await p.evaluate(CONTRASTE));
    await p.evaluate(() => document.getElementById('teste-catalogo')?.scrollIntoView());
    if (width === 390) await (await p.$('#teste-catalogo')).screenshot({ path: path.join(OUT, `catalogo-${lang}-${scheme}.png`) });

    // Progresso: selo pequeno no lugar da medalha; barra e meta continuam.
    const pr = await p.evaluate(async () => {
      switchTab('progress'); await new Promise(r => setTimeout(r, 300));
      const cards = [...document.querySelectorAll('#badge-grid .track-card')];
      const cor = (el) => getComputedStyle(el).backgroundColor;
      const ref = (m) => { const i = document.createElement('i'); i.style.background = `var(--selo-${m}-2)`; document.body.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; };
      return {
        n: cards.length, comSelo: cards.filter(c => c.querySelector('.selo-mini svg.selo-borda')).length,
        cadeado: cards.filter(c => c.classList.contains('is-locked')).every(c => c.querySelector('.selo-mini .track-medal-lock')),
        barra: cards.every(c => c.querySelector('.track-bar') || c.querySelector('.track-max')),
        etiqueta: cards.filter(c => !c.classList.contains('is-locked')).map(c => { const v = badgeTrackViews(STATE).find(x => x.id === c.dataset.track); return cor(c.querySelector('.track-level')) === ref(seloMetal(v)); }),
      };
    });
    L(`${tag}: Progresso, todo cartão com o selo pequeno`, pr.n > 0 && pr.comSelo === pr.n, pr);
    L(`${tag}: Progresso, cadeado nas bloqueadas`, pr.cadeado, pr);
    L(`${tag}: Progresso, barra e meta continuam`, pr.barra, pr);
    L(`${tag}: Progresso, etiqueta do nível na cor do selo`, pr.etiqueta.length > 0 && pr.etiqueta.every(Boolean), pr.etiqueta);
    await (await p.$('#badge-grid')).screenshot({ path: path.join(OUT, `progresso-${lang}-${scheme}-${width}.png`) });
    L(`${tag}: sem erros de JS`, h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`\n${ok}/${ok + bad} checks`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
