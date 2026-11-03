// Lado do balão no diálogo (decisão da dona, 2026-10-30): quem abre o diálogo à esquerda, o outro à direita, em TODOS os
// sites; se a aluna faz o papel dela mesma (`dialogue.learner`), ela fica sempre à direita, como no WhatsApp.
// Rodar: node tests/dialogo-lado/test_lado.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { load } = require(path.join(ROOT, 'scripts/lib/course-content.js'));

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/core/licao-dialogo.js'), 'utf8') + ';this.side = dlgSpeakerSide;', ctx);
const side = ctx.side;

// Regra geral
const d1 = { lines: [{ spk: 'Garçom' }, { spk: 'Brune' }, { spk: 'Garçom' }] };
check('quem abre fica à esquerda', side(d1, 'Garçom') === 'a');
check('o outro fica à direita', side(d1, 'Brune') === 'b');
// Aluna no papel dela mesma: à direita mesmo abrindo o diálogo, e mesmo falando depois
const d2 = { learner: 'A', lines: [{ spk: 'A' }, { spk: 'B' }] };
check('aluna que abre o diálogo fica à direita', side(d2, 'A') === 'b');
check('quem conversa com a aluna fica à esquerda', side(d2, 'B') === 'a');
const d3 = { learner: 'Eu', lines: [{ spk: 'Vendedor' }, { spk: 'Eu' }] };
check('aluna que responde fica à direita', side(d3, 'Eu') === 'b');
check('quem abre e fala com a aluna fica à esquerda', side(d3, 'Vendedor') === 'a');

// Todos os sites usam a regra comum (nenhum gancho próprio de lado)
const sites = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'lang-hooks.js')));
check('achou fr e zh', sites.includes('fr') && sites.includes('zh'), sites);
for (const s of sites) {
  const src = fs.readFileSync(path.join(ROOT, s, 'lang-hooks.js'), 'utf8');
  check(`${s}: dlgSide usa a regra comum`, /dlgSide:\s*\(dlg, spk\) => dlgSpeakerSide\(dlg, spk\),/.test(src));
}

// Nada muda nos diálogos do francês de hoje: A (quem abre) à esquerda, B à direita
for (const s of ['fr', 'zh']) {
  const U = load(s).UNITS;
  for (const u of U) {
    const d = u.dialogue; if (!d || !d.lines) continue;
    const sides = [...new Set(d.lines.map(l => l.spk))].map(k => side(d, k));
    check(`${s} ${u.id}: um falante de cada lado`, sides.length === 2 ? sides[0] === 'a' && sides[1] === 'b' : true, sides);
    if (s === 'fr') check(`fr ${u.id}: B à direita como antes`, d.lines.every(l => side(d, l.spk) === (l.spk === 'B' ? 'b' : 'a')));
  }
}

console.log(`Lado do balão no diálogo: ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
process.exit(failed ? 1 : 0);
