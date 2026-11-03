// Valida os rascunhos do lote: node validar.js <arquivo.json>...   (cada arquivo = lista de objetos)
// Campos: id, expr, text1, pt1, en1, mark1, text2, pt2, en2, mark2, conf ('alta'|'media'|'baixa'), nota
const fs = require('fs');
let total = 0, erros = [];
for (const f of process.argv.slice(2)){
  const list = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const e of list){
    total++;
    for (const n of ['1', '2']){
      const t = e['text' + n], pt = e['pt' + n], en = e['en' + n], mk = e['mark' + n];
      if (!t) erros.push(`${e.id}: text${n} vazio`);
      if (!pt || !en) erros.push(`${e.id}: falta tradução do exemplo ${n}`);
      if (!mk || !String(t).includes(mk)) erros.push(`${e.id}: mark${n} não é um trecho exato do texto (${JSON.stringify(mk)})`);
      if (pt && (/ -- /.test(pt) || /\bpra\b/i.test(pt))) erros.push(`${e.id}: pt${n} tem "--" ou "pra"`);
      if (en && /[ãõç]/i.test(en)) erros.push(`${e.id}: en${n} parece ter português (${en})`);
      if (pt && en && pt.trim() === en.trim()) erros.push(`${e.id}: pt${n} igual ao en${n}`);
    }
    if (!['alta', 'media', 'baixa'].includes(e.conf)) erros.push(`${e.id}: conf inválida`);
  }
}
const ids = new Set(); process.argv.slice(2).forEach(f => JSON.parse(fs.readFileSync(f, 'utf8')).forEach(e => { if (ids.has(e.id)) erros.push('id repetido ' + e.id); ids.add(e.id); }));
console.log(`${total} expressões; ${erros.length} problemas`); erros.forEach(x => console.log(' -', x));
process.exit(erros.length ? 1 : 0);
