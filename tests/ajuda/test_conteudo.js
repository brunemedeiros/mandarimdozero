// Central de Ajuda (rascunho): confere o conteúdo de ajuda/conteudo.js e os textos de ajuda/textos/.
// Regras de escrita das respostas curtas: docs/ajuda-central-guia-de-escrita.md. Rodar: node tests/ajuda/test_conteudo.js
const fs = require('fs'), path = require('path');
const A = require('../../ajuda/conteudo.js');
const raiz = path.join(__dirname, '..', '..', 'ajuda');
let ok = 0, falhas = [];
const L = (nome, cond, extra) => { if (cond) ok++; else falhas.push(nome + (extra ? ' -> ' + extra : '')); };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const catIds = new Set(A.categorias.map(c => c.id));
const artSlugs = new Set(A.artigos.map(a => a.slug));
L('categorias sem id repetido', catIds.size === A.categorias.length);
L('artigos sem slug repetido', artSlugs.size === A.artigos.length);

// Palavras de advogado que não podem aparecer nas respostas curtas (use as simples e deixe o termo técnico para o texto completo).
const PROIBIDAS = A.glossario.map(g => g.termo).concat(['controladora', 'operadora', 'tratamento de dados', 'finalidade', 'art\\.', 'inciso']);
const TETO = 380;

A.perguntas.forEach((p, i) => {
  const id = 'pergunta ' + (i + 1) + ' (' + p.q + ')';
  L(id + ': categoria existe', catIds.has(p.cat));
  L(id + ': tem resposta curta', typeof p.curta === 'string' && p.curta.length > 20);
  L(id + ': resposta curta até ' + TETO + ' caracteres', p.curta.length <= TETO, p.curta.length);
  L(id + ': termina com ponto', /[.!?]$/.test(p.curta));
  L(id + ': sem "--" nem " pra "', !/--|\spra\s/.test(p.curta + ' ' + p.q));
  PROIBIDAS.forEach(t => {
    const re = new RegExp('(^|[^\\p{L}\\p{N}])' + t + '(?![\\p{L}\\p{N}])', 'iu');
    L(id + ': sem a palavra técnica "' + t + '"', !re.test(p.curta), p.curta);
  });
  if (p.artigo) {
    L(id + ': artigo existe', artSlugs.has(p.artigo), p.artigo);
    const a = A.artigos.find(x => x.slug === p.artigo);
    if (a && p.ancora) {
      const html = fs.readFileSync(path.join(raiz, a.arquivo), 'utf8');
      L(id + ': âncora "' + p.ancora + '" existe no texto', html.includes('id="' + p.ancora + '"'));
    }
  }
});

A.artigos.forEach(a => {
  const id = 'artigo ' + a.slug;
  L(id + ': categoria existe', catIds.has(a.cat));
  L(id + ': arquivo existe', fs.existsSync(path.join(raiz, a.arquivo)));
  L(id + ': tem "Em palavras simples"', Array.isArray(a.simples) && a.simples.length > 0);
  L(id + ': estado válido', ['publicado', 'rascunho', 'redacao'].includes(a.estado));
  (a.relacionados || []).forEach(r => L(id + ': relacionado "' + r + '" existe', artSlugs.has(r)));
  a.simples.forEach(s => L(id + ': "simples" sem "--"', !/--/.test(s)));
});

// Textos completos: ids únicos e sem script.
fs.readdirSync(path.join(raiz, 'textos')).forEach(f => {
  const html = fs.readFileSync(path.join(raiz, 'textos', f), 'utf8');
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  L('textos/' + f + ': ids sem repetição', new Set(ids).size === ids.length);
  L('textos/' + f + ': sem <script>', !/<script/i.test(html));
});

// Categoria "Planos e pagamentos" só pode aparecer quando houver cobrança (hoje não há): sem perguntas, fica escondida.
L('categoria planos sem perguntas enquanto não houver cobrança', !A.perguntas.some(p => p.cat === 'planos'));

console.log(falhas.length ? 'FALHAS:\n' + falhas.join('\n') : 'ok');
console.log(ok + ' checagens, ' + falhas.length + ' falhas');
process.exit(falhas.length ? 1 : 0);
