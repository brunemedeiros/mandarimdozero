// E-mail de resposta a report (supabase/functions/report-reply-send/email.ts): padrão Prof Brune e idioma do site de quem recebe.
// Rodar: node --experimental-strip-types tests/email-report-reply/test_email.mjs [pasta-de-prévias]
import { buildReplyEmail, replyUiLanguage } from '../../supabase/functions/report-reply-send/email.ts';
import fs from 'node:fs'; import path from 'node:path';
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) ok++; else { bad++; console.log('  FALHOU:', n, x ?? ''); } };
const OUT = process.argv[2];
const corpo = 'Oi! Obrigada pelo aviso.\nJá corrigi o áudio da lição 3. <b>teste</b> & "aspas"';

check('conta com site em inglês recebe em inglês', replyUiLanguage('frances', 'en') === 'en');
check('conta com site em português recebe em português', replyUiLanguage('portugues', 'pt-BR') === 'pt-BR');
check('sem preferência: curso de português sai em inglês', replyUiLanguage('portugues', null) === 'en');
check('sem preferência: francês sai em português', replyUiLanguage('frances', null) === 'pt-BR');

const pt = buildReplyEmail(corpo, 'frances', 'pt-BR'), en = buildReplyEmail('Hi! Thanks for letting me know.', 'portugues', 'en');
for (const [n, e] of [['pt', pt], ['en', en]]) {
  check(n + ': faixa roxa, botão rosa, foto e fundo bege', ['#3D167B', '#E36BCA', 'brune-email.jpg', '#FAF5EA', 'role="presentation"'].every(s => e.html.includes(s)));
  check(n + ': sem "--" nem "pra"', !/--|\bpra\b/.test(e.html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/, '')));
  check(n + ': texto puro existe', e.text.length > 20);
}
check('pt: textos em português', ['Resposta ao seu report', 'Obrigada', 'Voltar ao site', 'sua professora de francês', 'Resposta ao report que você enviou no Francês com Prof. Brune.', 'lang="pt-BR"', 'IDIOMAS COM PROF BRUNE'].every(s => pt.html.includes(s)));
check('pt: botão leva ao francês', pt.html.includes('https://app.profbrune.com.br/fr/'));
check('pt: texto da admin escapado (sem HTML injetado)', pt.html.includes('&lt;b&gt;teste&lt;/b&gt; &amp; &quot;aspas&quot;') && !pt.html.includes('<b>teste</b>'));
check('pt: quebra de linha preservada (pre-wrap)', pt.html.includes('white-space:pre-wrap') && pt.html.includes('Obrigada pelo aviso.\nJá corrigi'));
const semPt = en.html.replace(/<!--[\s\S]*?-->/g, '');
check('en: nada em português', !/Obrigada|Resposta|Voltar|professora|você|aulas de idiomas|Até já|IDIOMAS/.test(semPt));
check('en: marca em inglês', en.html.includes('LANGUAGES WITH PROF BRUNE'));
check('en: textos em inglês', ['Reply to your report', 'Thanks for', 'Back to the site', 'your Portuguese teacher', 'Reply to the report you sent in Portuguese with Prof. Brune.', 'lang="en"'].every(s => en.html.includes(s)));
check('en: botão leva ao português', en.html.includes('https://app.profbrune.com.br/pt/'));
check('sem curso conhecido: link geral e "de idiomas"', buildReplyEmail('x', null, null).html.includes('https://app.profbrune.com.br/"') && buildReplyEmail('x', null, null).html.includes('sua professora de idiomas'));

if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'resposta-report-pt.html'), pt.html); fs.writeFileSync(path.join(OUT, 'resposta-report-en.html'), en.html); }
console.log(`e-mail de resposta a report: ${ok}/${ok + bad} checks`);
process.exit(bad ? 1 : 0);
