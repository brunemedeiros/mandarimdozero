// Página "Privacidade: cookies e medição de visitas" (Fase 2 do GA4, privacidade-cookies.html). Node puro, sem navegador.
// Confere: as duas línguas, inglês sem português, o que a política tem de dizer (pedido da dona no prompt da Fase 2),
// o nome do cookie igual ao ID do GA4 e os links nos rodapés. Rodar: node tests/privacidade-padrao/test_pagina_cookies.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'privacidade-cookies.html'), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const sec = (id) => { const m = new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`).exec(html); return m ? strip(m[1]) : ''; };
const pt = sec('pt'), en = sec('en');
const GA_ID = 'G-CE3282C1FB';

check('tem as seções #pt e #en', pt.length > 500 && en.length > 500);
check('a seção en tem lang="en"', /<section id="en" lang="en">/.test(html));
// O que a política precisa dizer (prompt da dona, Fase 2)
const need = [
  ['necessários', /Login/.test(pt) && /Idioma do site/.test(pt)],
  ['opcional: Google Analytics', /Google Analytics/.test(pt)],
  ['cookies do GA com nome, finalidade e duração', /_ga\b/.test(pt) && /_ga_CE3282C1FB/.test(pt) && /13 meses/.test(pt)],
  ['nome do cookie igual ao ID do GA4', html.includes('_ga_' + GA_ID.replace(/^G-/, ''))],
  ['Google como fornecedor', /Google LLC/.test(pt)],
  ['dados fora do Brasil', /fora do Brasil/.test(pt)],
  ['aceitar, recusar e mudar depois', /Recusar opcionais/.test(pt) && /Aceitar todos/.test(pt) && /Preferências de cookies/.test(pt)],
  ['direitos da LGPD e a ANPD', /LGPD/.test(pt) && /ANPD/.test(pt) && /revogação/.test(pt)],
  ['contato', /contato@profbrune\.com\.br/.test(pt)],
  ['14 meses de retenção', /14 meses/.test(pt)],
  ['não envia dado pessoal', /não envia ao Google/.test(pt)],
];
for (const [n, ok] of need) check('pt: ' + n, ok);
const needEn = [/Google Analytics/, /_ga_CE3282C1FB/, /13 months/, /14 months/, /Google LLC/, /outside Brazil/, /Reject optional/, /Accept all/, /Cookie preferences/, /LGPD/, /ANPD/, /contato@profbrune\.com\.br/];
for (const re of needEn) check('en: ' + re.source, re.test(en));
// Inglês sem português (regra do site em inglês)
const PT = /\b(Privacidade|cookies do Google Analytics para|Recusar|Aceitar|Preferências|você|não|também|dados|aparelho|navegador|Última)\b/;
check('en: nada em português', !PT.test(en), (en.match(PT) || [])[0]);
// Sem travessão duplo e sem "pra" no texto visível
check('sem "--" no texto', !/--/.test(pt + en));
check('sem "pra" no texto', !/\bpra\b/i.test(pt));
// Links nos rodapés
for (const f of ['sobre.html', 'privacidade-login.html', 'privacidade-google-agenda.html', 'privacidade-notion.html']){
  check(`${f} leva à página de cookies`, fs.readFileSync(path.join(ROOT, f), 'utf8').includes('href="privacidade-cookies.html"'));
}
console.log(`página de cookies: ${passed}/${passed + failed} ok`);
process.exit(failed ? 1 : 0);
