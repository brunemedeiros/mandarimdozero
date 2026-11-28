// E-mail de cartões novos da professora (migration 141): núcleo puro (textos, regra de quem recebe, preferência, link de sair)
// e a categoria nova na tela Configurações > Notificações. Rodar: node tests/email-cartoes-professora/test_core.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  const core = await import(path.join(ROOT, 'supabase/functions/teacher-cards-digest/core.mjs'));
  const D = core.decideKind;
  check('novos: cartões novos viram e-mail "novos", mesmo para quem está ativo', D({ newCount: 3 }) === 'novos' && D({ newCount: 1 }) === 'novos');
  check('sem cartões novos: nada (o lembrete para quem some saiu; fica o aviso antigo do notification-cron)', D({ newCount: 0 }) === null && D({ newCount: 0, totalCards: 50, daysSinceActivity: 30 }) === null);

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
  const pn = E({ lang: 'pt', kind: 'novos' }), en = E({ lang: 'en', kind: 'novos' });
  check('pt novos: assunto e corpo com o número e o nome', pn.subject === 'Você tem 12 cartões novos da sua professora' && pn.text.includes('Oi, Ana!') && pn.html.includes('12 cartões novos'));
  check('singular: "1 cartão novo"', E({ lang: 'pt', kind: 'novos', n: 1 }).subject === 'Você tem 1 cartão novo da sua professora' && E({ lang: 'en', kind: 'novos', n: 1 }).subject === 'You have 1 new card from your teacher');
  check('sem nome: cumprimento sem nome', E({ lang: 'pt', kind: 'novos', nome: '' }).text.startsWith('Oi! '));
  const ptWords = /você|cartões|cartão|aulas|professora|Revisão|Saudade|Parar de receber|idiomas/i;
  check('site em inglês: NADA em português (assunto, html e texto)', ![en].some(m => ptWords.test(m.subject) || ptWords.test(m.html.replace(/<style[\s\S]*?<\/style>/, '')) || ptWords.test(m.text)));
  check('textos em português sem "--" e sem "pra"', ![pn].some(m => /--/.test(m.text) || /\bpra\b/i.test(m.text) || /\bpra\b/i.test(m.subject)));
  check('marca do topo no idioma do e-mail (LANGUAGES WITH PROF BRUNE em inglês, IDIOMAS COM PROF BRUNE em português)', en.html.includes('LANGUAGES WITH PROF BRUNE') && !en.html.includes('IDIOMAS COM') && pn.html.includes('IDIOMAS COM PROF BRUNE') && !pn.html.includes('LANGUAGES WITH'));
  check('html: padrão Prof Brune (faixa roxa, botão rosa com sombra, foto da assinatura, texto de pré-visualização escondido)', pn.html.includes('#3D167B') && pn.html.includes('box-shadow:4px 4px 0 #22113f') && pn.html.includes('icons/brune-email.jpg') && pn.html.includes('display:none;max-height:0'));
  check('html: link de sair no rodapé e no texto puro', pn.html.includes('https://x.test/sair?u=1&amp;t=2') && pn.text.includes('https://x.test/sair?u=1&t=2'));
  check('html escapa o nome (sem injeção)', E({ lang: 'pt', kind: 'novos', nome: '<img src=x onerror=1>' }).html.includes('&lt;img src=x onerror=1&gt;') && !E({ lang: 'pt', kind: 'novos', nome: '<img src=x onerror=1>' }).html.includes('<img src=x'));
  check('e-mail de teste leva o prefixo TESTE/TEST', E({ lang: 'pt', kind: 'novos', test: true }).subject.startsWith('TESTE: ') && E({ lang: 'en', kind: 'novos', test: true }).subject.startsWith('TEST: '));

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
  check('domingo: isSunday só para domingo', core.isSunday('2026-11-29') && !core.isSunday('2026-11-30') && !core.isSunday('2026-11-25'));
  const fd = (o) => new URLSearchParams(o);
  const pf = core.parseExitForm;
  check('parseExitForm: sem nada = sair sem motivo (1 clique do Gmail)', JSON.stringify(pf(fd('List-Unsubscribe=One-Click'))) === JSON.stringify({ action: 'sair', reason: null, other: null }));
  check('parseExitForm: semanal com motivo; motivo inválido some; voltar nunca leva motivo; texto só no "outro" e até 200', pf(fd({ a: 'semanal', r: 'sem_tempo' })).reason === 'sem_tempo' && pf(fd({ r: 'xx' })).reason === null && pf(fd({ a: 'voltar', r: 'sem_tempo' })).reason === null && pf(fd({ r: 'outro', o: 'a  b' })).other === 'a b' && pf(fd({ r: 'sem_tempo', o: 'a' })).other === null && pf(fd({ r: 'outro', o: 'z'.repeat(300) })).other.length === 200 && pf(fd({ a: 'apagar' })).action === 'sair');
  const wp = core.renderEmail({ lang: 'pt', kind: 'semanal', nome: 'Ana', n: 3, unsubscribeUrl: 'https://app.profbrune.com.br/sair-cartoes/?u=1' });
  const we = core.renderEmail({ lang: 'en', kind: 'semanal', nome: '', n: 1 });
  check('e-mail semanal pt: assunto, UTM semanal, domingo no texto', wp.subject === 'Seu resumo da semana: 3 cartões novos' && wp.html.includes('utm_campaign=cartoes_semanal') && wp.text.includes('utm_campaign=cartoes_semanal') && /domingo/.test(wp.html));
  check('e-mail semanal en: sem português', we.subject === 'Your weekly summary: 1 new card' && !/você|cartão|Revisão|semana|domingo/i.test(we.html.replace(/<style[\s\S]*?<\/style>/, '').replace(/utm_campaign=\w+/g, '')) && /Sunday/.test(we.html));
  check('allowsWeekly: só com cartoes_professora_semanal ligado no e-mail', core.allowsWeekly({ cartoes_professora_semanal: ['email'] }) && !core.allowsWeekly({ cartoes_professora_semanal: [] }) && !core.allowsWeekly({}) && !core.allowsWeekly(null) && !core.allowsWeekly({ cartoes_professora_semanal: ['in_app'] }));
  console.log(`E-mail de cartões da professora: ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
