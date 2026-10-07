// Fase 6: prova do Ponto de verificação (shared/checkpoint-exam.js) com o conteúdo REAL do fr.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/checkpoint-exam.js'), 'utf8'), c);
const cc = {}; vm.createContext(cc);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'fr/content.js'), 'utf8') + ';this.UNITS=UNITS;this.MODULES=MODULES;', cc);
let ok = 0, bad = 0; const t = (n, x, d) => x ? ok++ : (bad++, console.log('FALHOU', n, d !== undefined ? JSON.stringify(d) : ''));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shuf = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const unitsOf = m => m.unitIds.map(id => cc.UNITS.find(u => u.id === id));

cc.MODULES.forEach(m => {
  const q = c.buildCheckpointExamQueue(unitsOf(m), { shuffle: shuf, canSpeak: () => true });
  const by = k => q.filter(i => i.kind === k).length;
  t(`${m.id}: 12 itens`, q.length === 12, q.length);
  t(`${m.id}: tem palavra, frase, escuta e gramática`, by('word') >= 1 && by('phrase') >= 1 && by('listen') >= 1 && by('grammar') >= 1, ['word', 'phrase', 'listen', 'grammar'].map(by));
  t(`${m.id}: nunca repete a mesma pergunta`, new Set(q.map(i => i.kind + '|' + i.answer)).size === q.length);
  t(`${m.id}: sem forma dupla`, q.every(i => !i.answer.includes(' / ')));
  t(`${m.id}: item de escuta tem texto para o áudio`, q.filter(i => i.kind === 'listen').every(i => i.audioText === i.answer));
});
// sem áudio disponível: não cria item de escuta e completa com o resto
const m1 = unitsOf(cc.MODULES[0]);
const noAudio = c.buildCheckpointExamQueue(m1, { shuffle: shuf, canSpeak: () => false });
t('sem áudio: nenhum item de escuta e ainda 12 itens', noAudio.every(i => i.kind !== 'listen') && noAudio.length === 12);
// unidade sem frases: completa com palavras
const onlyWords = c.buildCheckpointExamQueue([{ id: 'x', vocab: Array.from({ length: 20 }, (_, i) => ({ f: 'mot' + i, t: 'palavra' + i })) }], { shuffle: shuf });
t('só vocabulário: 12 palavras', onlyWords.length === 12 && onlyWords.every(i => i.kind === 'word'));
t('módulo vazio: fila vazia, sem erro', c.buildCheckpointExamQueue([], {}).length === 0);

const S = (g, e, k) => c.scoreCheckpointAnswer(g, e, k);
t('palavra exata', S('bonjour', 'bonjour', 'word').score === 1);
t('palavra sem acento = 0,5', S('francais', 'français', 'word').score === 0.5 && S('francais', 'français', 'word').status === 'almost');
t('palavra errada = 0', S('chat', 'chien', 'word').score === 0);
t('frase: pontuação e maiúscula não descontam', S("comment tu t'appelles", "Comment tu t'appelles ?", 'phrase').score === 1);
t('frase: apóstrofo curvo do celular', S('Comment tu t’appelles ?', "Comment tu t'appelles ?", 'phrase').score === 1);
t('frase: acento faltando = 0,5', S('Je suis bresilienne.', 'Je suis brésilienne.', 'phrase').score === 0.5);
t('frase: palavra diferente = 0', S('Je suis brésilien.', 'Je suis brésilienne.', 'phrase').score === 0);
t('escuta usa a mesma regra de frase', S("tu es de quel pays", 'Tu es de quel pays ?', 'listen').score === 1);
t('resposta vazia nunca pontua', S('', 'Bonjour', 'phrase').score === 0 && S('   ', 'oui', 'word').score === 0);
t('gramática igual a palavra', S('suis', 'suis', 'grammar').score === 1);
console.log(`Fase 6 prova do checkpoint: ${ok}/${ok + bad} verificações — ${bad ? 'FALHOU' : 'OK'}`); process.exit(bad ? 1 : 0);
