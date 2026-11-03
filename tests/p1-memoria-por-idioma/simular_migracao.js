// P1: simulação da migração com dados copiados (SELECT) da produção. NÃO grava nada em lugar nenhum.
// O arquivo de dados NÃO fica no repositório (é dado de aluno): gerar com o SELECT de docs/p1-memoria-por-idioma.md (seção 8)
// e passar o caminho. Formato: { accounts: { nome: { currentCourse, blocks: { chave: { trail, trailMd5, hist: [[id, reps,
// lastReview, stability, firstLearnedDate]], noHist: "id,id,..." } } } } }.
// Simula, para cada conta, o 1º salvar do código novo no curso atual e depois no outro curso (ida e volta), e confere:
// nenhum cartão perde histórico, a trilha de cada bloco fica igual byte a byte, _lang.frances tem a memória juntada.
// Rodar: node tests/p1-memoria-por-idioma/simular_migracao.js <arquivo.json>
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LCM = require(path.join(ROOT, 'shared/lang-card-memory.js'));
const file = process.argv[2];
if (!file){ console.error('uso: node simular_migracao.js <arquivo.json>'); process.exit(2); }
const fx = JSON.parse(fs.readFileSync(file, 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
let bad = 0;

function expandBlock(b){
  const trail = Array.from({ length: b.trail }, (_, i) => ({ id: 'u-trilha-' + i, reps: i % 3, marker: b.trailMd5 }));
  const origin = id => id[0] === 't' ? 'teacher' : 'self';
  const row = id => Number(String(id).slice(1).split('-')[0]);
  const hist = b.hist.map(([id, reps, lastReview, stability, firstLearnedDate]) => ({ id, origin: origin(id), rowId: row(id), flashcardStatus: 'active', note: { conteudo: '...' },
    ef: 2.5, reps, lapses: 0, interval: Math.round(stability), due: lastReview + Math.round(stability) * 86400000, stability, difficulty: 5, state: 'review', lastReview, fsrsReps: reps, fsrsLapses: 0, fsrsMigrated: true, firstLearnedDate }));
  const none = (b.noHist ? b.noHist.split(',') : []).map(id => ({ id, origin: origin(id), rowId: row(id), flashcardStatus: 'active', note: { conteudo: '...' },
    ef: 2.5, reps: 0, lapses: 0, interval: 0, due: 0, stability: 0, difficulty: 0, state: 'new', lastReview: null, fsrsReps: 0, fsrsLapses: 0, fsrsMigrated: true, firstLearnedDate: null }));
  return { xp: 1, cards: trail.concat(hist, none) };
}
const ts = cards => (cards || []).filter(LCM.isMemoryEntry);
const summary = cards => { const m = ts(cards); return { total: m.length, professora: m.filter(c => LCM.entryOrigin(c) === 'teacher').length, proprios: m.filter(c => LCM.entryOrigin(c) === 'self').length,
  comHistorico: m.filter(LCM.hasHistory).length, somaReps: m.reduce((s, c) => s + (c.reps || 0), 0) }; };
const fmt = s => `${s.total} (prof ${s.professora}, próprios ${s.proprios}), com histórico ${s.comHistorico}, soma de reps ${s.somaReps}`;

// "Salvar" do código novo numa página do curso `blockKey`: carrega (blockForLoad) e grava o que carregou (prepareSave).
function saveFrom(data, blockKey){
  const loaded = LCM.blockForLoad(data, 'frances', blockKey) || { cards: LCM.memoryEntriesForLoad(data, 'frances') };
  const r = LCM.prepareSave(data, 'frances', blockKey, clone(loaded), '2026-10-29T00:00:00Z');
  return Object.assign({}, data, r.otherBlocks, { [blockKey]: r.payload, _lang: r.lang });
}

Object.entries(fx.accounts).forEach(([name, acc]) => {
  const before = { _meta: { currentCourse: acc.currentCourse } };
  Object.entries(acc.blocks).forEach(([k, b]) => { before[k] = expandBlock(b); });
  const curKey = acc.currentCourse === 'frances@pt-BR' ? 'frances' : acc.currentCourse;
  const otherKey = Object.keys(acc.blocks).find(k => k !== curKey);
  const after1 = saveFrom(clone(before), curKey);
  const after = saveFrom(after1, otherKey); // ida e volta

  console.log(`\n== Conta ${name} (curso atual ${acc.currentCourse})`);
  Object.keys(acc.blocks).forEach(k => console.log(`  ANTES  ${k.padEnd(11)} ${fmt(summary(before[k].cards))}`));
  Object.keys(acc.blocks).forEach(k => console.log(`  DEPOIS ${k.padEnd(11)} ${fmt(summary(after[k].cards))}`));
  console.log(`  DEPOIS _lang.frances ${fmt(summary(after._lang.frances.cards))}`);

  // conferências
  const maxReps = {};
  Object.keys(acc.blocks).forEach(k => ts(before[k].cards).forEach(c => { maxReps[c.id] = Math.max(maxReps[c.id] || 0, c.reps || 0); }));
  const lost = [];
  Object.keys(maxReps).forEach(id => {
    if (!maxReps[id]) return;
    const inLang = after._lang.frances.cards.find(c => c.id === id);
    if (!inLang || inLang.reps !== maxReps[id]) lost.push(id + ' em _lang');
    Object.keys(acc.blocks).forEach(k => { const c = after[k].cards.find(x => x.id === id); if (c && c.reps < maxReps[id]) lost.push(id + ' em ' + k); });
  });
  Object.keys(acc.blocks).forEach(k => ts(before[k].cards).forEach(c => { const a = after[k].cards.find(x => x.id === c.id); if (!a) lost.push(c.id + ' sumiu de ' + k); }));
  const trailOk = Object.keys(acc.blocks).every(k => JSON.stringify(before[k].cards.filter(c => !LCM.isMemoryEntry(c))) === JSON.stringify(after[k].cards.filter(c => !LCM.isMemoryEntry(c))));
  const contentOk = Object.keys(acc.blocks).every(k => ts(before[k].cards).every(c => { const a = after[k].cards.find(x => x.id === c.id); return a && a.note && a.note.conteudo === '...'; }));
  const again = saveFrom(after, curKey);
  const idem = JSON.stringify(again) === JSON.stringify(after);
  console.log(`  histórico perdido: ${lost.length ? lost.join(', ') : 'nenhum'} | trilha igual nos dois blocos: ${trailOk ? 'sim' : 'NÃO'} | conteúdo das entradas mantido: ${contentOk ? 'sim' : 'NÃO'} | salvar de novo não muda nada: ${idem ? 'sim' : 'NÃO'}`);
  if (lost.length || !trailOk || !contentOk || !idem) bad++;
});
console.log(bad ? `\n${bad} conta(s) com problema` : '\nOK: nenhuma conta perdeu histórico');
process.exit(bad ? 1 : 0);
