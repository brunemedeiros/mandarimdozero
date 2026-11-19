// Rascunho da resposta por e-mail (shared/admin-reports.js, reportReplyDraft/reportReplyLang): idioma de quem recebe.
// Rodar: node tests/email-report-reply/test_rascunho.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, t: k => k, tp: k => k, window: {}, document: { getElementById: () => null }, supabaseClient: {}, showToast(){} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../shared/admin-reports.js'), 'utf8') + ';this.__d=reportReplyDraft;this.__l=reportReplyLang;this.__P=ADMIN_REPORTS_PROFILES;this.__re=REPORT_REPLY_TODO_RE;', ctx);
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) ok++; else { bad++; console.log('  FALHOU:', n, x === undefined ? '' : JSON.stringify(x)); } };
Object.assign(ctx.__P, { u1: { display_name: 'Ana Souza', username: 'ana' }, u2: { display_name: '', username: 'john.doe' } });
const base = { created_at: '2026-11-10T15:00:00Z', description: 'O áudio da frase "Je voudrais un café" corta no meio.' };
const a = ctx.__d({ ...base, user_id: 'u1', language_app_key: 'frances', context: { ui_language: 'pt-BR' } });
check('pt: assunto com a data', a.lang === 'pt-BR' && a.subject === 'Sobre o seu report de 10/11', a);
check('pt: primeiro nome, trecho e colchetes', a.body.startsWith('Oi, Ana!') && a.body.includes('Obrigada por avisar sobre: "O áudio da frase') && a.body.includes('[Escreva aqui o que foi feito.]'), a.body);
const b = ctx.__d({ ...base, user_id: 'u2', language_app_key: 'frances', kind: 'sugestao', description: 'Seria bom ter modo noturno.', context: { ui_language: 'en' } });
check('en pelo idioma gravado no report, mesmo no curso de francês', b.lang === 'en' && b.subject === 'About your report from Nov 10' && b.body.startsWith('Hi, john.doe!') && b.body.includes('Thanks for your suggestion: "') && b.body.includes('[Write here what will happen with it.]'), b);
check('en: nada em português no rascunho', !/Oi|Obrigada|Escreva|Sobre/.test(b.subject + b.body));
check('report antigo do curso de português: inglês, marcado como palpite', JSON.stringify(ctx.__l({ language_app_key: 'portugues', context: {} })) === '{"lang":"en","fromReport":false}');
check('report antigo do francês: português', ctx.__l({ language_app_key: 'frances' }).lang === 'pt-BR');
const c = ctx.__d({ ...base, reporter_email: 'x@y.z', language_app_key: 'mandarim', description: 'a '.repeat(200) });
check('convidado sem nome: "Oi!" e trecho cortado em até 120', c.body.startsWith('Oi!\n\n') && c.body.split('"')[1].length <= 120 && c.body.split('"')[1].endsWith('...'), c.body);
check('trava pega os dois colchetes', ctx.__re.test(a.body) && ctx.__re.test(b.body) && !ctx.__re.test('Oi! Já corrigi [o áudio].'));
console.log(`rascunho da resposta a report: ${ok}/${ok + bad} checks`);
process.exit(bad ? 1 : 0);
