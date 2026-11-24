// E-mail de cartões novos da professora (migration 141): núcleo puro (textos, regra de quem recebe, preferência, link de sair)
// e a categoria nova na tela Configurações > Notificações. Rodar: node tests/email-cartoes-professora/test_core.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  const core = await import(path.join(ROOT, 'supabase/functions/teacher-cards-digest/core.mjs'));
  const D = core.decideKind;
  const base = { newCount: 0, totalCards: 10, daysSinceActivity: 1, daysSinceReminder: null, remindersSinceActivity: 0 };
  check('novos: cartões novos viram e-mail "novos", mesmo para quem está ativo', D({ ...base, newCount: 3 }) === 'novos');
  check('novos tem prioridade sobre lembrete (parado há 30 dias com cartões novos)', D({ ...base, newCount: 1, daysSinceActivity: 30 }) === 'novos');
  check('sem novos e ativo: nada', D(base) === null);
  check('parado há 7 dias com cartões: lembrete', D({ ...base, daysSinceActivity: 7 }) === 'lembrete');
  check('parado há 6 dias: nada ainda', D({ ...base, daysSinceActivity: 6 }) === null);
  check('nunca usou o site (sem registro) com cartões: lembrete', D({ ...base, daysSinceActivity: null }) === 'lembrete');
  check('parado mas sem cartões: nada', D({ ...base, daysSinceActivity: 20, totalCards: 0 }) === null);
  check('lembrete no máximo 1 por semana', D({ ...base, daysSinceActivity: 20, daysSinceReminder: 3 }) === null && D({ ...base, daysSinceActivity: 20, daysSinceReminder: 7 }) === 'lembrete');
  check('para de insistir depois de 3 lembretes sem a pessoa voltar', D({ ...base, daysSinceActivity: 40, daysSinceReminder: 10, remindersSinceActivity: 3 }) === null && D({ ...base, daysSinceActivity: 40, daysSinceReminder: 10, remindersSinceActivity: 2 }) === 'lembrete');

  check('preferência: sem nada salvo = ligado', core.allowsDigest(undefined) === true && core.allowsDigest({}) === true && core.allowsDigest({ estudo: ['email'] }) === true);
  check('preferência: categoria salva com e-mail = ligado', core.allowsDigest({ cartoes_professora: ['email'] }) === true);
  check('preferência: categoria salva sem e-mail (desligou) = desligado', core.allowsDigest({ cartoes_professora: [] }) === false && core.allowsDigest({ cartoes_professora: ['in_app'] }) === false);

  check('primeiro nome', core.firstName('Francielly Barbosa') === 'Francielly' && core.firstName('  ') === '' && core.firstName(null) === '');

  const S = 'segredo-de-teste-com-mais-de-24-caracteres';
  const tk = await core.signUnsubscribe(S, 'user-1');
  check('link de sair: assinatura confere', await core.verifyUnsubscribe(S, 'user-1', tk) === true);
  check('link de sair: outra conta, assinatura adulterada e segredo curto recusam', await core.verifyUnsubscribe(S, 'user-2', tk) === false && await core.verifyUnsubscribe(S, 'user-1', tk.slice(0, -1) + (tk.endsWith('0') ? '1' : '0')) === false && await core.verifyUnsubscribe('curto', 'user-1', tk) === false && await core.verifyUnsubscribe(S, 'user-1', '') === false);

  // textos
  const E = (o) => core.renderEmail({ nome: 'Ana', n: 12, unsubscribeUrl: 'https://x.test/sair?u=1&t=2', ...o });
  const pn = E({ lang: 'pt', kind: 'novos' }), pl = E({ lang: 'pt', kind: 'lembrete', n: 17 }), en = E({ lang: 'en', kind: 'novos' }), el = E({ lang: 'en', kind: 'lembrete', n: 17 });
  check('pt novos: assunto e corpo com o número e o nome', pn.subject === 'Você tem 12 cartões novos da sua professora' && pn.text.includes('Oi, Ana!') && pn.html.includes('12 cartões novos'));
  check('singular: "1 cartão novo"', E({ lang: 'pt', kind: 'novos', n: 1 }).subject === 'Você tem 1 cartão novo da sua professora' && E({ lang: 'en', kind: 'novos', n: 1 }).subject === 'You have 1 new card from your teacher');
  check('pt lembrete: assunto com o nome e 17 cartões', pl.subject === 'Seus cartões estão te esperando, Ana' && pl.html.includes('17 cartões'));
  check('sem nome: cumprimento sem nome e assunto sem vírgula solta', E({ lang: 'pt', kind: 'lembrete', nome: '' }).subject === 'Seus cartões estão te esperando' && E({ lang: 'pt', kind: 'novos', nome: '' }).text.startsWith('Oi! '));
  const ptWords = /você|cartões|cartão|aulas|professora|Revisão|Saudade|Parar de receber/i;
  check('site em inglês: NADA em português (assunto, html e texto)', ![en, el].some(m => ptWords.test(m.subject) || ptWords.test(m.html.replace(/<style[\s\S]*?<\/style>/, '')) || ptWords.test(m.text)));
  check('textos em português sem "--" e sem "pra"', ![pn, pl].some(m => /--/.test(m.text) || /\bpra\b/i.test(m.text) || /\bpra\b/i.test(m.subject)));
  check('html: padrão Prof Brune (faixa roxa, botão rosa com sombra, foto da assinatura, texto de pré-visualização escondido)', pn.html.includes('#3D167B') && pn.html.includes('box-shadow:4px 4px 0 #22113f') && pn.html.includes('icons/brune-email.jpg') && pn.html.includes('display:none;max-height:0'));
  check('html: link de sair no rodapé e no texto puro', pn.html.includes('https://x.test/sair?u=1&amp;t=2') && pn.text.includes('https://x.test/sair?u=1&t=2'));
  check('html escapa o nome (sem injeção)', E({ lang: 'pt', kind: 'novos', nome: '<img src=x onerror=1>' }).html.includes('&lt;img src=x onerror=1&gt;') && !E({ lang: 'pt', kind: 'novos', nome: '<img src=x onerror=1>' }).html.includes('<img src=x'));
  check('e-mail de teste leva o prefixo TESTE/TEST', E({ lang: 'pt', kind: 'novos', test: true }).subject.startsWith('TESTE: ') && E({ lang: 'en', kind: 'novos', test: true }).subject.startsWith('TEST: '));
  check('página de sair: pt, en e link inválido', core.unsubscribePage('pt', true).includes('Pronto!') && core.unsubscribePage('en', true).includes('Done!') && core.unsubscribePage('pt', false).includes('não é válido'));

  // Configurações > Notificações: a categoria nova só tem e-mail, ligada por padrão
  const ctx = vm.createContext({ t: k => k, escapeHTML: s => s, document: {}, window: {} });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/notification-preferences.js'), 'utf8'), ctx);
  const cat = vm.runInContext("NOTIFICATION_PREF_CATEGORIES.find(c => c.id === 'cartoes_professora')", ctx);
  check('Configurações: categoria "cartões da professora" existe, só e-mail', !!cat && cat.emailOnly === true);
  const R = (src, vars) => { Object.entries(vars || {}).forEach(([k, v]) => { ctx['__' + k] = v; }); const v = vm.runInContext(src, ctx); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  check('Configurações: sem preferência salva aparece ligada (e-mail)', JSON.stringify(R('notifPrefEffectiveChannels({channels:{}}, __c)', { c: cat })) === '["email"]');
  check('Configurações: desligada salva como [] aparece desligada', JSON.stringify(R('notifPrefEffectiveChannels({channels:{cartoes_professora:[]}}, __c)', { c: cat })) === '[]');
  check('Configurações: no sino e no celular não existe (canal ausente), e-mail existe', !!R('notifPrefChannelMissing(__c, "in_app")', { c: cat }) && !!R('notifPrefChannelMissing(__c, "push")', { c: cat }) && !R('notifPrefChannelMissing(__c, "email")', { c: cat }));
  check('Configurações: salvo com sino/push por engano só vale o e-mail', JSON.stringify(R('notifPrefEffectiveChannels({channels:{cartoes_professora:["in_app","push","email"]}}, __c)', { c: cat })) === '["email"]');
  console.log(`E-mail de cartões da professora: ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
