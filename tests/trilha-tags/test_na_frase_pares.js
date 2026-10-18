// "Na frase" de item em par ("le vendeur / la vendeuse"): vale qualquer uma das duas formas.
// Node/VM sobre o código REAL. Rodar: node tests/trilha-tags/test_na_frase_pares.js
const { loadLang, check, summary } = require('../fase-e/harness');

const fr = loadLang('fr');
const find = (units, word, unit) => fr.findStudyExamplePhrase(units, word, unit, fr.APP_KEY);
const mk = (id, vocab, phrases) => ({ id, vocab, phrases: phrases.map(f => ({ f, t: f })), dialogue: { lines: [] } });

// formas separadas, frase só com a 2ª forma
let u = mk('T-1', [{ f: 'le vendeur / la vendeuse', t: 'vendedor' }], ['Elle est vendeuse.', 'Je suis étudiant.']);
let m = find([u], u.vocab[0], u);
check('par: acha frase só com a 2ª forma (vendeuse)', m && m.idx === 0 && m.kind === 'p', m);
// frase só com a 1ª forma
u = mk('T-1', [{ f: 'français / française', t: 'francês' }], ['Je parle anglais.', 'Il est français.']);
m = find([u], u.vocab[0], u);
check('par: acha frase só com a 1ª forma (français)', m && m.idx === 1, m);
// vence a primeira frase na ordem do conteúdo
u = mk('T-1', [{ f: 'français / française', t: 'francês' }], ['Elle est française.', 'Il est français.']);
m = find([u], u.vocab[0], u);
check('par: vence a primeira frase na ordem do conteúdo', m && m.idx === 0, m);
// "un / une" não casa dentro de "lundi" nem "chacun"
u = mk('T-1', [{ f: 'un / une', t: 'um / uma' }], ['Je vais lundi.', 'Chacun son tour.', 'Elle a une sœur.']);
m = find([u], u.vocab[0], u);
check('par curto: casa palavra inteira (une), não o meio de "lundi"/"chacun"', m && m.idx === 2, m);
// nenhuma forma presente: sem frase
u = mk('T-1', [{ f: 'un / une', t: 'um / uma' }], ['Je vais lundi.']);
check('par: sem frase quando nenhuma forma aparece como palavra', find([u], u.vocab[0], u) === null);
// unidade anterior
const u0 = mk('T-0', [{ f: 'x', t: 'x' }], ['Il est portugais.']);
const u1 = mk('T-1', [{ f: 'portugais / portugaise', t: 'português' }], ['Autre phrase.']);
m = find([u0, u1], u1.vocab[0], u1);
check('par: cai na unidade anterior se a atual não tem', m && m.unitId === 'T-0', m);
// item simples: comportamento antigo (substring, "(de)" ignorado, caixa)
u = mk('T-1', [{ f: 'un kilo (de)', t: 'um quilo' }], ['Je prends un kilo de pommes.']);
check('simples: "(de)" ignorado e substring como antes', find([u], u.vocab[0], u) !== null);
u = mk('T-1', [{ f: 'bonjour', t: 'bom dia' }], ['Bonjour !']);
check('simples: sem caixa', find([u], u.vocab[0], u) !== null);
// findMatchingPhrase do app = mesma busca
const real = fr.UNITS.find(x => x.id === 'A1-2');
let eq = true;
fr.UNITS.forEach(unit => { if (unit.type === 'grammar') return; (unit.vocab || []).forEach(v => {
  const a = fr.findMatchingPhrase(v, unit), b = find(fr.UNITS, v, unit);
  if ((a || null) !== (b ? b.phrase : null)) eq = false; }); });
check('findMatchingPhrase do app = findStudyExamplePhrase em todas as palavras reais', eq);
// conteúdo real: todos os 11 pares da trilha agora têm frase?
const pares = [];
fr.UNITS.forEach(unit => (unit.vocab || []).forEach(v => { if (v.f && v.f.includes(' / ')) pares.push({ unit, v, m: find(fr.UNITS, v, unit) }); }));
console.log('  pares reais:', pares.length, '| com frase:', pares.filter(p => p.m).length, '| sem:', pares.filter(p => !p.m).map(p => p.v.f).join('; '));
check('conteúdo real tem pares', pares.length === 11);
summary('trilha na frase de pares');
