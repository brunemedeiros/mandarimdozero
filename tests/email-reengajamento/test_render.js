// E-mails automáticos do notification-cron no visual Prof Brune (supabase/functions/notification-cron/email-brand.mjs).
// Rodar: node tests/email-reengajamento/test_render.js
const fs = require('fs'), path = require('path');
const ts = require('typescript');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  const m = await import(path.join(ROOT, 'supabase/functions/notification-cron/email-brand.mjs'));
  const S9 = 'Sentimos sua falta no francês 👋', B9 = 'Já faz 9 dias que você não estuda por aqui. Sem pressa nenhuma: seu progresso continua guardado, exatamente como você deixou. Quando quiser, é só voltar.';
  const pt = m.renderBrandedEmail({ lang: 'pt', eventType: 'user_inactive_9', subject: S9, body: B9 });
  const en = m.renderBrandedEmail({ lang: 'en', eventType: 'user_inactive_9', subject: 'We miss you in French 👋', body: "It's been 9 days since you studied here. No rush at all." });

  check('tipo do aviso: "sumiu há N dias" = saudade; qualquer outro evento = aviso', m.kindForEvent('user_inactive_9') === 'saudade' && m.kindForEvent('user_inactive_30') === 'saudade' && m.kindForEvent('review_overdue') === 'aviso' && m.kindForEvent(undefined) === 'aviso');
  check('título em duas frases: a 2ª vai em rosa', JSON.stringify(m.splitTitle('Ainda por aí? Seu francês te espera')) === JSON.stringify(['Ainda por aí?', 'Seu francês te espera']) && JSON.stringify(m.splitTitle('Um mês sem estudar francês. Tudo bem?')) === JSON.stringify(['Um mês sem estudar francês.', 'Tudo bem?']));
  check('título de uma frase: metade final das palavras em rosa; emoji sai da faixa', JSON.stringify(m.splitTitle(S9)) === JSON.stringify(['Sentimos sua falta', 'no francês']) && JSON.stringify(m.splitTitle('Seu francês está esperando por você')) === JSON.stringify(['Seu francês está', 'esperando por você']) && JSON.stringify(m.splitTitle('')) === JSON.stringify(['', '']));
  check('pt: marca, etiqueta, botão e assinatura em português; texto do banco intacto; assunto no <title>', pt.html.includes('IDIOMAS COM PROF BRUNE') && pt.html.includes('Saudade de você') && pt.html.includes('Voltar a estudar') && pt.html.includes('Brune, sua professora de idiomas') && pt.html.includes(B9) && pt.html.includes('<title>Sentimos sua falta no francês 👋</title>'));
  check('pt: linha de ajuste dos e-mails em Configurações > Notificações no rodapé', pt.html.includes('Você pode ajustar quais e-mails recebe em Configurações &gt; Notificações, dentro do app.'));
  check('padrão Prof Brune: faixa roxa, botão rosa com sombra, foto, texto de pré-visualização escondido', pt.html.includes('#3D167B') && pt.html.includes('box-shadow:4px 4px 0 #22113f') && pt.html.includes('icons/brune-email.jpg') && pt.html.includes('display:none;max-height:0') && pt.html.includes('href="https://app.profbrune.com.br/?utm_source=email'));
  const ptWords = /você|estuda|progresso|professora|idiomas|Voltar|Saudade|Configurações|Notificações/i;
  check('en: NADA em português (marca, etiqueta, botão, assinatura, rodapé)', en.html.includes('LANGUAGES WITH PROF BRUNE') && en.html.includes('We miss you') && en.html.includes('Back to studying') && !ptWords.test(en.html.replace(/<style[\s\S]*?<\/style>/, '')) && !ptWords.test(en.text), en.text);
  check('texto puro: corpo, botão com o endereço e rodapé sem entidade HTML', pt.text.startsWith(B9) && pt.text.includes('Voltar a estudar: https://app.profbrune.com.br/?utm_source=email&utm_medium=email&utm_campaign=reengajamento') && pt.text.includes('Configurações > Notificações') && !pt.text.includes('&gt;'));
  check('botão com UTM: saudade = reengajamento, outro aviso = aviso; no html o & vira &amp;', pt.html.includes('href="https://app.profbrune.com.br/?utm_source=email&amp;utm_medium=email&amp;utm_campaign=reengajamento"') && m.renderBrandedEmail({ lang: 'pt', eventType: 'review_overdue', subject: 'a b', body: 'c' }).html.includes('utm_campaign=aviso'));
  const inj = m.renderBrandedEmail({ lang: 'pt', eventType: 'user_inactive_9', subject: '<b>x</b>', body: '<script>alert(1)</script>' });
  check('escapa assunto e corpo (sem injeção de HTML)', !inj.html.includes('<script>alert') && inj.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && !inj.html.includes('<b>x</b>'));
  const other = m.renderBrandedEmail({ lang: 'pt', eventType: 'review_overdue', subject: 'Cartões para revisar', body: 'Oi' });
  check('evento sem texto próprio na moldura cai em "Um aviso para você" / "Abrir o site"', other.html.includes('Um aviso para você') && other.html.includes('Abrir o site') && !other.html.includes('Saudade'));
  check('textos em português sem "--" e sem "pra"', !/--|\bpra\b/i.test(JSON.stringify(m.renderBrandedEmail({ lang: 'pt', eventType: 'x', subject: 'a b', body: 'c' }).text)));

  // index.ts: sintaxe e ligação com o render (sem rodar a função inteira)
  const src = fs.readFileSync(path.join(ROOT, 'supabase/functions/notification-cron/index.ts'), 'utf8');
  const r = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  check('index.ts: sintaxe ok', r.diagnostics.length === 0, r.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')));
  check('index.ts: importa o render, passa o tipo do evento e envia html e texto do render', src.includes("import { renderBrandedEmail } from './email-brand.mjs'") && src.includes('emailBody, eventType)') && src.includes('html: mail.html, text: mail.text') && !src.includes('font-family:-apple-system'));
  console.log(`E-mail de reengajamento (visual novo): ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
