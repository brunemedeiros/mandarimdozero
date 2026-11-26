// E-mail diário "cartões novos da professora" (proposta de 2026-11-23, prévia em docs/email/previas/cartoes-professora.html).
// Núcleo PURO (sem rede, sem banco): textos e HTML no padrão Prof Brune, regra de quem recebe qual e-mail, preferência e link de sair.
// Testes: node tests/email-cartoes-professora/test_core.js. A Edge Function (index.ts) só liga isto ao banco e ao Resend.

export const CATEGORY = 'cartoes_professora';
export const APP_URL = 'https://app.profbrune.com.br/';
// Link do botão com UTM (padrão do site; o GA4 só guarda depois do "Aceitar").
export const BUTTON_URL = APP_URL + '?utm_source=email&utm_medium=email&utm_campaign=cartoes_novos';
export const BUTTON_URL_WEEKLY = APP_URL + '?utm_source=email&utm_medium=email&utm_campaign=cartoes_semanal';

// Resumo semanal (escolha de quem sai do aviso diário): sempre aos domingos, no mesmo agendamento das 11h UTC (8h de Brasília).
export const isSunday = ymd => new Date(String(ymd) + 'T12:00:00Z').getUTCDay() === 0;

// Motivos de saída aceitos (a mesma lista da tela e do check da migration 149).
export const EXIT_REASONS = ['muitos_emails', 'sem_tempo', 'cartoes_nao_servem', 'sem_interesse', 'prefiro_site', 'outro'];
// Lê o que a página do site (ou o "cancelar inscrição" do Gmail) manda no POST: a = sair | semanal | voltar; r = motivo; o = texto do "outro".
// Sem nada (POST de 1 clique do Gmail: `List-Unsubscribe=One-Click`) = sair, sem motivo.
export function parseExitForm(...sources) {
  const g = k => { for (const sp of sources) { const v = sp && sp.get && sp.get(k); if (v != null && v !== '') return v; } return ''; };
  const a = g('a'), action = a === 'semanal' || a === 'voltar' ? a : 'sair';
  const r = g('r'), reason = action !== 'voltar' && EXIT_REASONS.includes(r) ? r : null;
  const other = reason === 'outro' ? g('o').replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  return { action, reason, other: other || null };
}

const T = {
  pt: {
    lang: 'pt-BR', brand: 'IDIOMAS COM PROF BRUNE',
    novos: {
      subject: n => (n === 1 ? 'Você tem 1 cartão novo da sua professora' : `Você tem ${n} cartões novos da sua professora`),
      pre: 'Já estão na sua Revisão. Leva poucos minutos.',
      label: 'Cartões novos',
      titleA: n => (n === 1 ? '1 cartão novo' : `${n} cartões novos`), titleB: 'para você!',
      body: (n, nome) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Separei ${n === 1 ? '1 cartão novo' : `${n} cartões novos`} para você revisar, com o que a gente viu nas últimas aulas.`,
      box: n => [n === 1 ? '1 cartão novo na sua Revisão' : `${n} cartões novos na sua Revisão`, 'Leva poucos minutos por dia', 'Quanto mais você revisa, mais fácil fica lembrar na hora de falar'],
      button: 'Revisar meus cartões', bye: 'Até já!',
    },
    semanal: {
      subject: n => (n === 1 ? 'Seu resumo da semana: 1 cartão novo' : `Seu resumo da semana: ${n} cartões novos`),
      pre: 'Os cartões novos da semana, num só e-mail.',
      label: 'Resumo da semana',
      titleA: n => (n === 1 ? '1 cartão novo' : `${n} cartões novos`), titleB: 'nesta semana!',
      body: (n, nome) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Este é o seu resumo de domingo: ${n === 1 ? '1 cartão novo' : `${n} cartões novos`} para você revisar, com o que a gente viu nas aulas da semana.`,
      box: n => [n === 1 ? '1 cartão novo na sua Revisão' : `${n} cartões novos na sua Revisão`, 'Leva poucos minutos por dia', 'Um e-mail por semana, sempre aos domingos'],
      button: 'Revisar meus cartões', bye: 'Boa semana!',
    },
    footer: 'Você recebe este aviso porque é aluno(a) da professora Brune.', stop: 'Parar de receber estes e-mails', sig: 'Brune, sua professora de idiomas', tag: 'aulas de idiomas online',
    test: 'TESTE: ',
  },
  en: {
    lang: 'en', brand: 'LANGUAGES WITH PROF BRUNE',
    novos: {
      subject: n => (n === 1 ? 'You have 1 new card from your teacher' : `You have ${n} new cards from your teacher`),
      pre: 'They are already in your Review. It only takes a few minutes.',
      label: 'New cards',
      titleA: n => (n === 1 ? '1 new card' : `${n} new cards`), titleB: 'for you!',
      body: (n, nome) => `${nome ? `Hi, ${nome}!` : 'Hi!'} I added ${n === 1 ? '1 new card' : `${n} new cards`} to your Review, based on what we covered in our latest classes.`,
      box: n => [n === 1 ? '1 new card in your Review' : `${n} new cards in your Review`, 'Only a few minutes a day', 'The more you review, the easier it is to remember when you speak'],
      button: 'Review my cards', bye: 'See you soon!',
    },
    semanal: {
      subject: n => (n === 1 ? 'Your weekly summary: 1 new card' : `Your weekly summary: ${n} new cards`),
      pre: 'This week\'s new cards, in a single email.',
      label: 'Weekly summary',
      titleA: n => (n === 1 ? '1 new card' : `${n} new cards`), titleB: 'this week!',
      body: (n, nome) => `${nome ? `Hi, ${nome}!` : 'Hi!'} This is your Sunday summary: ${n === 1 ? '1 new card' : `${n} new cards`} to review, based on what we covered in this week's classes.`,
      box: n => [n === 1 ? '1 new card in your Review' : `${n} new cards in your Review`, 'Only a few minutes a day', 'One email a week, always on Sundays'],
      button: 'Review my cards', bye: 'Have a great week!',
    },
    footer: 'You get this notice because you are a student of Prof Brune.', stop: 'Stop receiving these emails', sig: 'Brune, your language teacher', tag: 'online language classes',
    test: 'TEST: ',
  },
};

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Primeiro nome para o cumprimento ('' se não houver nome de verdade).
export function firstName(displayName) {
  const s = String(displayName == null ? '' : displayName).trim();
  if (!s) return '';
  return s.split(/\s+/)[0];
}

// Quem recebe e-mail: só quando entraram cartões novos do Banco desde o último e-mail "novos" (ou nos últimos 3 dias, na 1ª vez).
// Máximo 1 por dia por aluno (garantido também pelo banco). O lembrete para quem está parado foi retirado em 2026-11-25 (decisão da dona):
// quem some continua recebendo o aviso "sentimos sua falta" do notification-cron (dias 9, 15, 20 e 30 sem estudar).
export function decideKind({ newCount }) {
  return newCount >= 1 ? 'novos' : null;
}

// Preferência da conta (notification_preferences.channels): sem nada salvo = ligado (decisão da dona, 2026-11-23);
// desligado quando a categoria foi salva sem 'email' (Configurações > Notificações ou o link "Parar de receber").
export function allowsDigest(channels) {
  const c = channels && channels[CATEGORY];
  if (!Array.isArray(c)) return true;
  return c.includes('email');
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
}
function safeEq(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let d = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) d |= (ea[i] || 0) ^ (eb[i] || 0);
  return d === 0;
}
// Link de sair assinado: HMAC(segredo do agendamento, contexto + id da conta). Sem expiração (sair deve funcionar sempre).
export async function signUnsubscribe(secret, userId) { return hmacHex(secret, 'cartoes-prof-sair:' + userId); }
export async function verifyUnsubscribe(secret, userId, token) {
  if (!secret || secret.length < 24 || !userId || !token) return false;
  return safeEq(await signUnsubscribe(secret, userId), String(token));
}

// Esqueleto do padrão Prof Brune (faixa roxa, caixa de destaque, botão rosa, assinatura, rodapé). Usado pelo e-mail de cartões novos e
// pela prévia do aviso "sentimos sua falta" (mesmo visual). `footerHtml` já vem montado (pode ter link).
export function brandEmailHtml({ langCode, brand, subject, pre, label, titleA, titleB, body, box, button, buttonUrl, bye, sig, tag, footerHtml }) {
  const li = (box || []).map(x => `<tr><td width="28" valign="top" style="padding:5px 0;color:#3498D6;font-weight:900;font-size:17px">&#10003;</td><td valign="top" style="padding:5px 0;font-size:15px;line-height:1.55">${esc(x)}</td></tr>`).join('');
  const boxHtml = li ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA;border-radius:16px;margin:0 0 24px"><tr><td style="padding:14px 20px"><table role="presentation" cellpadding="0" cellspacing="0">${li}</table></td></tr></table>` : '';
  return `<!doctype html>
<html lang="${langCode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;700;800;900&display=swap">
<style>@media (max-width:520px){.px{padding-left:18px!important;padding-right:18px!important}.h1{font-size:30px!important}}</style></head>
<body style="margin:0;padding:0;background:#FAF5EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA"><tr><td align="center" style="padding:24px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;color:#22113f">
<tr><td class="px" style="background:#3D167B;color:#FAF5EA;padding:34px 36px 30px">
<div style="font-weight:900;font-size:14px;letter-spacing:.04em;opacity:.9">${esc(brand)}</div>
<div style="margin-top:22px"><span style="display:inline-block;border:1px solid #E36BCA;color:#f6c4ec;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${esc(label)}</span></div>
<div class="h1" style="font-family:'Anton','Impact','Arial Narrow',sans-serif;font-weight:400;font-size:38px;line-height:1.05;margin:12px 0 0;letter-spacing:.01em;text-transform:uppercase">${esc(titleA)} <span style="color:#E36BCA">${esc(titleB)}</span></div>
</td></tr>
<tr><td class="px" style="padding:28px 28px 8px">
<p style="margin:0 0 18px;font-size:16px;line-height:1.65">${esc(body)}</p>
${boxHtml}<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 24px"><tr><td align="center" style="border-radius:999px;background:#E36BCA;border:2px solid #22113f;box-shadow:4px 4px 0 #22113f">
<a href="${esc(buttonUrl)}" style="display:inline-block;padding:15px 32px;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:900;color:#22113f;text-decoration:none">${esc(button)}</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece4f2;margin-top:6px"><tr>
<td width="72" valign="middle" style="padding:20px 14px 6px 0"><img src="https://app.profbrune.com.br/icons/brune-email.jpg" width="60" height="60" alt="Brune" style="display:block;border-radius:50%;border:2.5px solid #E36BCA"></td>
<td valign="middle" style="padding:20px 0 6px;font-size:15px;line-height:1.5"><b>${esc(bye)}</b><br>${esc(sig)}<br><a href="https://www.instagram.com/prof.brune/" style="color:#1d6fa5">Instagram</a> &middot; <a href="https://app.profbrune.com.br" style="color:#1d6fa5">app.profbrune.com.br</a></td></tr></table>
<div style="height:22px"></div></td></tr></table>
<p style="max-width:560px;margin:16px auto 0;text-align:center;color:#5d4f72;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6">${footerHtml}<br>@prof.brune &middot; ${esc(tag)}</p>
</td></tr></table></body></html>`;
}

export function renderEmail({ lang, kind, nome, n, unsubscribeUrl, test }) {
  const L = T[lang === 'en' ? 'en' : 'pt'], K = L[kind];
  const count = Math.max(1, Number(n) || 1);
  const subject = (test ? L.test : '') + K.subject(count, nome);
  const body = K.body(count, nome), box = K.box(count);
  const stop = unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:#5d4f72">${esc(L.stop)}</a>` : '';
  const html = brandEmailHtml({ langCode: L.lang, brand: L.brand, subject, pre: K.pre, label: K.label, titleA: K.titleA(count), titleB: K.titleB, body, box, button: K.button, buttonUrl: kind === 'semanal' ? BUTTON_URL_WEEKLY : BUTTON_URL, bye: K.bye, sig: L.sig, tag: L.tag, footerHtml: `${esc(L.footer)}${stop ? ' ' + stop : ''}` });
  const text = [body, '', ...box.map(x => '- ' + x), '', `${K.button}: ${kind === 'semanal' ? BUTTON_URL_WEEKLY : BUTTON_URL}`, '', `${K.bye} ${L.sig}`, '', L.footer + (unsubscribeUrl ? ` ${L.stop}: ${unsubscribeUrl}` : '')].join('\n');
  return { subject, html, text };
}
