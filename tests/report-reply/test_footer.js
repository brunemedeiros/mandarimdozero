// report-reply-send (T6 de docs/i18n/e6-minimo-servidor-pt.md): nome do curso e rodapé do e-mail de resposta no idioma do SITE
// de quem recebe, com `portugues` no mapa. Carrega o código REAL de supabase/functions/report-reply-send/index.ts (recorte do
// mapa e das duas funções puras, tipos removidos pelo Node 22). Sem rede. Rodar: node tests/report-reply/test_footer.js
const fs = require('fs'), vm = require('vm'), path = require('path'), mod = require('module');
const src = fs.readFileSync(path.join(__dirname, '../../supabase/functions/report-reply-send/index.ts'), 'utf8');
const a = src.indexOf('const COURSE_NAME_BY_UI_LANG');
const b = src.indexOf('function jsonResponse');
if (a < 0 || b < 0) { console.log('FALHOU: recorte não encontrado'); process.exit(1); }
const js = mod.stripTypeScriptTypes(src.slice(a, b));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(js + '\nthis.F = replyFooter; this.U = replyUiLanguage; this.N = COURSE_NAME_BY_UI_LANG;', ctx);
let pass = 0, fail = 0;
const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FALHOU', n, x !== undefined ? JSON.stringify(x) : ''); } };
const PT_WORDS = /(Resposta|você|Francês|Chinês|Português|Idiomas| com Prof)/;

// português (sem mudança para quem usa o site em português)
t('fr, site pt-BR: igual ao de antes', ctx.F('frances', 'pt-BR') === 'Resposta ao report que você enviou no Francês com Prof. Brune.', ctx.F('frances', 'pt-BR'));
t('zh, site pt-BR: igual ao de antes', ctx.F('mandarim', 'pt-BR') === 'Resposta ao report que você enviou no Chinês com Prof. Brune.');
t('fr sem preferência (convidado): português como antes', ctx.F('frances', null) === 'Resposta ao report que você enviou no Francês com Prof. Brune.');
t('zh sem preferência: português como antes', ctx.F('mandarim', undefined) === 'Resposta ao report que você enviou no Chinês com Prof. Brune.');
t('idioma desconhecido, sem preferência: nome geral como antes', ctx.F('klingon', null) === 'Resposta ao report que você enviou no Idiomas com Prof. Brune.');
t('preferência estranha (es) cai no idioma do curso', ctx.U('frances', 'es') === 'pt-BR' && ctx.U('portugues', 'es') === 'en');

// inglês: nada em português
for (const k of ['frances', 'mandarim', 'portugues', 'klingon']) {
  const f = ctx.F(k, 'en');
  t(`site em inglês (${k}): rodapé sem português`, !PT_WORDS.test(f), f);
}
t('pt, site em inglês: nome do curso', ctx.F('portugues', 'en') === 'Reply to the report you sent in Portuguese with Prof. Brune.', ctx.F('portugues', 'en'));
t('fr, site em inglês', ctx.F('frances', 'en') === 'Reply to the report you sent in French with Prof. Brune.');
t('zh, site em inglês', ctx.F('mandarim', 'en') === 'Reply to the report you sent in Chinese with Prof. Brune.');

// português (curso): só existe em inglês, então sem preferência conhecida o idioma do curso manda
t('pt sem preferência (convidado): inglês', ctx.F('portugues', null) === 'Reply to the report you sent in Portuguese with Prof. Brune.');
t('pt com site em português (conta que trocou): português com o nome do curso', ctx.F('portugues', 'pt-BR') === 'Resposta ao report que você enviou no Português com Prof. Brune.');

// mapa: os três idiomas nos dois idiomas do site, sem chave faltando
for (const ui of ['pt-BR', 'en']) for (const k of ['frances', 'mandarim', 'portugues', '_default']) t(`mapa ${ui}.${k}`, typeof ctx.N[ui][k] === 'string' && ctx.N[ui][k].length > 0);
t('sem "--" nem "pra" nos textos', !/(--| pra )/.test(JSON.stringify(ctx.N) + ctx.F('frances', 'en') + ctx.F('frances', 'pt-BR')));

console.log(`report-reply-send: ${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
