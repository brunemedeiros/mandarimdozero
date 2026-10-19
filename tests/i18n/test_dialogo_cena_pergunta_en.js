// Lote D (Etapa 3): cena do diálogo (dialogue.scene) e pergunta de compreensão (dialogue.check k=understand)
// no overlay en (shared/content-i18n.js + fr/content.en.js e zh/content.en.js).
// Prova: toda cena/pergunta/opção tem versão en; a ordem das opções não muda (a resposta certa `ok` é um índice
// do content.js); onde a fala foi localizada (brésilienne -> américaine, 巴西 -> 美国) a resposta certa acompanha;
// voltar a pt-BR restaura o português byte a byte.
// Uso: node tests/i18n/test_dialogo_cena_pergunta_en.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const cc = require(path.join(ROOT, 'scripts', 'lib', 'course-content.js'));
let passed = 0, failed = 0;
const check = (name, ok, info) => { if (ok) passed++; else { failed++; console.log('  FALHOU:', name, info !== undefined ? JSON.stringify(info).slice(0, 300) : ''); } };

for (const site of ['fr', 'zh']){
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  vm.runInContext(cc.composedSource(site) + ';this.__U = UNITS;', ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'content-i18n.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, site, 'content.en.js'), 'utf8'), ctx);
  const U = ctx.__U;
  const before = JSON.stringify(U.map(u => u.dialogue || null));
  const ci = ctx.ContentI18n.create({ units: U, overlayUrl: () => '' });
  ci.apply('en');
  let scenes = 0, qs = 0;
  const ptU = JSON.parse(before);
  U.forEach((u, i) => {
    const d = u.dialogue, p = ptU[i];
    if (!d) return;
    if (p.scene !== undefined){
      scenes++;
      check(`${site} ${u.id}: cena em inglês`, typeof d.scene === 'string' && d.scene && d.scene !== p.scene, d.scene);
    }
    (d.check || []).forEach((c, ci2) => {
      if (c.k !== 'understand') return;
      qs++;
      const pc = p.check[ci2];
      check(`${site} ${u.id}: pergunta em inglês`, c.q && c.q !== pc.q, c.q);
      check(`${site} ${u.id}: mesmo número de opções`, Array.isArray(c.opts) && c.opts.length === pc.opts.length, c.opts);
      check(`${site} ${u.id}: resposta certa no mesmo índice`, c.ok === pc.ok && typeof c.opts[c.ok] === 'string');
      const same = c.opts.filter((o, oi) => o === pc.opts[oi] && !/^(\d+|Paul|Marc|Louis|China)$/.test(o));
      check(`${site} ${u.id}: opções em inglês`, same.length === 0, same);
      check(`${site} ${u.id}: sem "--" nem português comum`, !/--|\b(não|você|está|também|então)\b/i.test(c.q + ' ' + c.opts.join(' ') + ' ' + (d.scene || '')));
    });
  });
  check(`${site}: tem cenas e perguntas (${scenes}/${qs})`, scenes > 0 && qs > 0);
  // fala localizada: a resposta certa acompanha o que o diálogo diz em inglês
  const loc = site === 'fr' ? U.find(u => u.id === 'A1-2') : U.find(u => String(u.id) === '2');
  const lc = loc.dialogue.check.find(c => c.k === 'understand');
  const line = loc.dialogue.lines.map(l => l.f || l.c).join(' ');
  check(`${site}: país localizado (fala) bate com a resposta certa`, lc.opts[lc.ok] === 'The United States' && /américaine|美国/.test(line), { ans: lc.opts[lc.ok], line });
  ci.apply('pt-BR');
  check(`${site}: voltar a pt-BR restaura cena e perguntas`, JSON.stringify(U.map(u => u.dialogue || null)) === before);
  console.log(`${site}: ${scenes} cenas, ${qs} perguntas de compreensão`);
}
console.log(`cena e pergunta do diálogo em inglês: ${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
