#!/usr/bin/env node
// Papel das frases "Na frase" (decisões 226, 227 e 233 do docs/i18n/curriculo/12-decisoes-apos-maquete-m1.md).
//
// Cada frase de exemplo da unidade (chave `-p`, recurso "Na frase") tem um papel:
//   'essencial'  = essencial para a função comunicativa da unidade (ex.: "L'addition, s'il vous plaît" em "Pedir no restaurante"):
//                  o aluno precisa saber usar, então pode ser cobrada em qualquer lugar;
//   'so_exemplo' = só ilustra o cartão; pode trazer palavra que ainda não é cartão (decisão 211), por isso só aparece onde a
//                  tradução está à vista e o aluno não precisa digitar a frase.
// Os papéis ficam em docs/i18n/curriculo/dados/frases_na_frase.json ({chave: {papel, unidade, nota}}), marcados junto com o
// conteúdo, módulo a módulo (decisão 227). Aqui fica só a regra, em função pura (sem DOM, sem estado global).
//
// Uso: node fr/scripts/curriculo_papel.js --conferir   (confere o formato do frases_na_frase.json; sai com 1 se algo falhar)
// Teste: node tests/curriculo/test_papel_frases.js
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DADOS = path.join(ROOT, 'docs', 'i18n', 'curriculo', 'dados');

const PAPEIS = ['essencial', 'so_exemplo'];

// Lugares onde uma frase pode aparecer para o aluno. Os mesmos nomes valem para o validador "só palavras vistas"
// (fr/scripts/curriculo_palavras_vistas.js), que importa esta lista: um lugar só para os contextos.
const CONTEXTOS = [
  'ficha',                      // ficha da palavra / recurso "Na frase", com a tradução logo abaixo
  'revisao',                    // Revisão (cartões)
  'exercicio_licao',            // exercícios da lição que não pedem digitar (reordenar, blocos, cenário, completar tocando)
  'ponto_verificacao_unidade',  // Ponto de verificação no fim da unidade
  'ponto_verificacao_modulo',   // exame do módulo: o aluno digita a frase inteira ou escreve o que ouviu
  'teste_nivel',                // Teste de Nível
  'dialogo',                    // fala de diálogo (regra 11: só palavras vistas)
  'ditado',                     // Ditados
  'desafio',                    // Desafios
];

// Onde a frase 'so_exemplo' pode aparecer (decisão 226). Todo o resto fica fechado para ela.
// ponto_verificacao_unidade fica FECHADO por escolha conservadora: a 226 só cita o exame do módulo e o Teste de Nível, mas o
// Ponto de verificação da unidade também cobra produção (o aluno digita e escreve o que ouviu), e frase só de exemplo pode ter
// palavra que nem é cartão ainda. Abrir depende de decisão da dona; se ela abrir, muda só esta lista e o teste.
const CONTEXTOS_SO_EXEMPLO = new Set(['ficha', 'revisao', 'exercicio_licao']);

function frasePodeAparecer(papel, contexto){
  if (!PAPEIS.includes(papel)) throw new Error(`papel desconhecido: ${papel}`);
  if (!CONTEXTOS.includes(contexto)) throw new Error(`contexto desconhecido: ${contexto}`);
  if (papel === 'essencial') return true;
  return CONTEXTOS_SO_EXEMPLO.has(contexto);
}

// Papel de uma chave de frase; frase ainda sem marca devolve null (a marca é feita com o conteúdo, decisão 227).
function papelDaFrase(frases, chave){
  const f = frases && frases[chave];
  return f ? f.papel : null;
}

function carregarFrases(dir){ return JSON.parse(fs.readFileSync(path.join(dir || DADOS, 'frases_na_frase.json'), 'utf8')); }

// Formato do frases_na_frase.json: chave `-p`, papel conhecido, unidade preenchida.
function conferirFrases(frases){
  const problemas = [];
  for (const [chave, f] of Object.entries(frases || {})){
    if (chave.startsWith('_')) continue;
    if (!/^A[12]-g?[0-9]+-p[0-9]+$/.test(chave)) problemas.push({ chave, problema: 'chave não é de frase "Na frase" (-p)' });
    if (!f || !PAPEIS.includes(f.papel)) problemas.push({ chave, problema: 'papel inválido', papel: f && f.papel });
    if (!f || !f.unidade) problemas.push({ chave, problema: 'sem unidade' });
  }
  return problemas;
}

module.exports = { PAPEIS, CONTEXTOS, CONTEXTOS_SO_EXEMPLO, frasePodeAparecer, papelDaFrase, carregarFrases, conferirFrases };

if (require.main === module){
  if (process.argv[2] === '--conferir'){
    const frases = carregarFrases();
    const p = conferirFrases(frases);
    const n = Object.keys(frases).filter(k => !k.startsWith('_')).length;
    console.log(`frases marcadas: ${n}; problemas: ${p.length}`);
    p.forEach(x => console.log('  ' + JSON.stringify(x)));
    process.exit(p.length ? 1 : 0);
  }
  console.log('Uso: node fr/scripts/curriculo_papel.js --conferir');
}
