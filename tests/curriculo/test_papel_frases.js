// Papel das frases "Na frase" (decisões 226 e 233): regra em fr/scripts/curriculo_papel.js, dados em
// docs/i18n/curriculo/dados/frases_na_frase.json. Rodar: node tests/curriculo/test_papel_frases.js
'use strict';
const path = require('path');
const { check, summary } = require('../fase-e/harness');
const ROOT = path.resolve(__dirname, '..', '..');
const P = require(path.join(ROOT, 'fr/scripts/curriculo_papel.js'));

console.log('== frasePodeAparecer (decisão 226)');
check('só exemplo: permitida na ficha', P.frasePodeAparecer('so_exemplo', 'ficha') === true);
check('só exemplo: permitida na Revisão', P.frasePodeAparecer('so_exemplo', 'revisao') === true);
check('só exemplo: permitida no exercício da lição (sem digitar)', P.frasePodeAparecer('so_exemplo', 'exercicio_licao') === true);
for (const c of ['ponto_verificacao_modulo', 'teste_nivel', 'ditado', 'desafio', 'dialogo']){
  check(`só exemplo: bloqueada em ${c}`, P.frasePodeAparecer('so_exemplo', c) === false);
}
check('só exemplo: bloqueada no Ponto de verificação da unidade (escolha conservadora)', P.frasePodeAparecer('so_exemplo', 'ponto_verificacao_unidade') === false);
check('essencial: permitida em todos os contextos', P.CONTEXTOS.every(c => P.frasePodeAparecer('essencial', c) === true));
check('só exemplo abre exatamente 3 contextos', P.CONTEXTOS.filter(c => P.frasePodeAparecer('so_exemplo', c)).length === 3);
{
  let erro1 = false, erro2 = false;
  try { P.frasePodeAparecer('talvez', 'ficha'); } catch (e) { erro1 = true; }
  try { P.frasePodeAparecer('essencial', 'prova'); } catch (e) { erro2 = true; }
  check('papel desconhecido dá erro (não passa calado)', erro1);
  check('contexto desconhecido dá erro (não passa calado)', erro2);
}

console.log('== frases_na_frase.json');
{
  const frases = P.carregarFrases();
  check('arquivo tem _doc', typeof frases._doc === 'string' && frases._doc.length > 50);
  check('formato válido (chaves -p, papel conhecido, unidade)', P.conferirFrases(frases).length === 0, P.conferirFrases(frases));
  check('papelDaFrase: frase sem marca devolve null', P.papelDaFrase(frases, 'A1-1-p999') === null);
  const sint = { 'A1-25-p3': { papel: 'essencial', unidade: 'A1-25', nota: "L'addition, s'il vous plaît" } };
  check('papelDaFrase: lê o papel marcado', P.papelDaFrase(sint, 'A1-25-p3') === 'essencial');
  check('conferirFrases acusa papel inválido e chave que não é -p',
    P.conferirFrases({ 'A1-5-d0': { papel: 'essencial', unidade: 'A1-5' }, 'A1-5-p1': { papel: 'x', unidade: 'A1-5' } }).length === 2);
}

summary('curriculo papel das frases');
