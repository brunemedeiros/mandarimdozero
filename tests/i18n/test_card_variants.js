// Progresso por palavra: trocar o idioma do site nunca faz o histórico de uma
// palavra valer para outra (país do aluno, hanzi 美/巴).
const CV = require('../../shared/card-variants.js');
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const fresh = (id, word) => ({ id, front: word, ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0, stability: 0, difficulty: 0, state: 'new', lastReview: null, fsrsReps: 0, fsrsLapses: 0 });

// 1) mesma palavra: nada muda
{ const c = fresh('u2-v8', 'brésilien'); c.reps = 3; const st = {};
  ok(CV.swapCardWordProgress(c, 'brésilien', 'brésilien', st) === false && c.reps === 3 && Object.keys(st).length === 0, 'mesma palavra não troca nem cria gaveta'); }

// 2) pt -> en -> pt: cada palavra mantém o próprio histórico
{ const c = fresh('u2-v8', 'brésilien'); const st = {};
  Object.assign(c, { reps: 5, due: 111, stability: 9, state: 'review', fsrsMigrated: true });
  ok(CV.swapCardWordProgress(c, 'brésilien', 'américain', st) === true, 'troca detectada');
  ok(c.reps === 0 && c.due === 0 && c.state === 'new' && c.fsrsMigrated === undefined, 'palavra nova começa do zero');
  Object.assign(c, { reps: 2, due: 222, state: 'learning' });
  CV.swapCardWordProgress(c, 'américain', 'brésilien', st);
  ok(c.reps === 5 && c.due === 111 && c.state === 'review' && c.fsrsMigrated === true, 'voltar restaura o histórico original');
  CV.swapCardWordProgress(c, 'brésilien', 'américain', st);
  ok(c.reps === 2 && c.due === 222 && c.state === 'learning', 'ir de novo restaura o histórico do inglês');
  ok(c.id === 'u2-v8', 'id nunca muda'); }

// 3) não toca em campos que não são progresso
{ const c = fresh('h4-c1', '巴'); c.lessonIndex = 4; c.reps = 4; const st = {};
  CV.swapCardWordProgress(c, '巴', '美', st);
  ok(c.lessonIndex === 4 && c.id === 'h4-c1', 'campos de identidade preservados'); }

// 4) entradas inválidas
{ const c = fresh('x', 'a'); c.reps = 1;
  ok(CV.swapCardWordProgress(c, undefined, 'b', {}) === false && CV.swapCardWordProgress(c, 'a', '', {}) === false && CV.swapCardWordProgress(c, 'a', 'b', null) === false && c.reps === 1, 'palavra ausente/gaveta ausente = não troca'); }

// 5) gaveta vinda do save
ok(JSON.stringify(CV.normalizeCardVariants({ a: { w: { reps: 1 } }, b: 5, c: { w: 'x' }, d: {} })) === '{"a":{"w":{"reps":1}}}', 'normalizeCardVariants descarta lixo');
ok(JSON.stringify(CV.normalizeCardVariants(null)) === '{}' && JSON.stringify(CV.normalizeCardVariants('x')) === '{}', 'save sem gaveta = vazia');

// 6) round-trip pelo JSON (gaveta salva e relida)
{ const c = fresh('u2-v8', 'brésilien'); c.reps = 7; const st = {};
  CV.swapCardWordProgress(c, 'brésilien', 'américain', st);
  const back = CV.normalizeCardVariants(JSON.parse(JSON.stringify(st)));
  const c2 = fresh('u2-v8', 'américain');
  CV.swapCardWordProgress(c2, 'américain', 'brésilien', back);
  ok(c2.reps === 7, 'gaveta sobrevive a salvar/recarregar'); }

process.exit(fails ? 1 : 0);
