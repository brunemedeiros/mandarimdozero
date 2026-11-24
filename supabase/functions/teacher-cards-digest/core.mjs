// E-mail diário "cartões novos da professora" (proposta de 2026-11-23, prévia em docs/email/previas/cartoes-professora.html).
// Núcleo PURO (sem rede, sem banco): textos e HTML no padrão Prof Brune, regra de quem recebe qual e-mail, preferência e link de sair.
// Testes: node tests/email-cartoes-professora/test_core.js. A Edge Function (index.ts) só liga isto ao banco e ao Resend.

export const CATEGORY = 'cartoes_professora';
export const APP_URL = 'https://app.profbrune.com.br/';

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
    lembrete: {
      subject: (n, nome) => (nome ? `Seus cartões estão te esperando, ${nome}` : 'Seus cartões estão te esperando'),
      pre: 'Cinco minutinhos já ajudam a não esquecer o que a gente viu.',
      label: 'Saudade de você',
      titleA: () => 'Seus cartões', titleB: 'estão te esperando.',
      // sem número (decisão da dona, 2026-11-24): o total de cartões já recebidos assusta mais do que motiva
      body: (n, nome) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Faz alguns dias que você não aparece por aqui, e tem cartões da sua professora esperando na Revisão. Cinco minutinhos já ajudam a não esquecer o que a gente viu nas aulas.`,
      box: () => ['Cartões escolhidos por mim com o que vimos nas aulas', 'Você pode parar quando quiser: o progresso fica salvo'],
      button: 'Voltar para a Revisão', bye: 'Te espero lá!',
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
    lembrete: {
      subject: (n, nome) => (nome ? `Your cards are waiting for you, ${nome}` : 'Your cards are waiting for you'),
      pre: 'Five minutes already help you hold on to what we covered.',
      label: 'We miss you',
      titleA: () => 'Your cards', titleB: 'are waiting for you.',
      body: (n, nome) => `${nome ? `Hi, ${nome}!` : 'Hi!'} It has been a few days, and there are cards from your teacher waiting in your Review. Five minutes already help you hold on to what we covered in class.`,
      box: () => ['Cards I picked from what we covered in class', 'You can stop whenever you want: your progress is saved'],
      button: 'Back to my Review', bye: 'See you there!',
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

// Quem recebe qual e-mail. Máximo 1 por dia (garantido também pelo banco). `novos` tem prioridade.
//  newCount: cartões do Banco entregues desde o último e-mail "novos" (ou nos últimos 3 dias, na 1ª vez)
//  totalCards: cartões da professora ativos do aluno
//  daysSinceActivity: dias desde o último uso do site (null = nunca registrou uso)
//  daysSinceReminder: dias desde o último lembrete enviado (null = nunca)
//  remindersSinceActivity: lembretes enviados depois do último uso (para de insistir depois de 3)
export function decideKind({ newCount, totalCards, daysSinceActivity, daysSinceReminder, remindersSinceActivity }) {
  if (newCount >= 1) return 'novos';
  const stopped = daysSinceActivity == null || daysSinceActivity >= 7;
  if (stopped && totalCards >= 1 && (daysSinceReminder == null || daysSinceReminder >= 7) && (remindersSinceActivity || 0) < 3) return 'lembrete';
  return null;
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

export function renderEmail({ lang, kind, nome, n, unsubscribeUrl, test }) {
  const L = T[lang === 'en' ? 'en' : 'pt'], K = L[kind];
  const count = Math.max(1, Number(n) || 1);
  const subject = (test ? L.test : '') + K.subject(count, nome);
  const titleA = K.titleA(count), titleB = K.titleB, body = K.body(count, nome), box = K.box(count);
  const li = box.map(x => `<tr><td width="28" valign="top" style="padding:5px 0;color:#3498D6;font-weight:900;font-size:17px">&#10003;</td><td valign="top" style="padding:5px 0;font-size:15px;line-height:1.55">${esc(x)}</td></tr>`).join('');
  const stop = unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:#5d4f72">${esc(L.stop)}</a>` : '';
  const html = `<!doctype html>
<html lang="${L.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;700;800;900&display=swap">
<style>@media (max-width:520px){.px{padding-left:18px!important;padding-right:18px!important}.h1{font-size:30px!important}}</style></head>
<body style="margin:0;padding:0;background:#FAF5EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(K.pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA"><tr><td align="center" style="padding:24px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;color:#22113f">
<tr><td class="px" style="background:#3D167B;color:#FAF5EA;padding:34px 36px 30px">
<div style="font-weight:900;font-size:14px;letter-spacing:.04em;opacity:.9">${esc(L.brand)}</div>
<div style="margin-top:22px"><span style="display:inline-block;border:1px solid #E36BCA;color:#f6c4ec;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${esc(K.label)}</span></div>
<div class="h1" style="font-family:'Anton','Impact','Arial Narrow',sans-serif;font-weight:400;font-size:38px;line-height:1.05;margin:12px 0 0;letter-spacing:.01em;text-transform:uppercase">${esc(titleA)} <span style="color:#E36BCA">${esc(titleB)}</span></div>
</td></tr>
<tr><td class="px" style="padding:28px 28px 8px">
<p style="margin:0 0 18px;font-size:16px;line-height:1.65">${esc(body)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA;border-radius:16px;margin:0 0 24px"><tr><td style="padding:14px 20px"><table role="presentation" cellpadding="0" cellspacing="0">${li}</table></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 24px"><tr><td align="center" style="border-radius:999px;background:#E36BCA;border:2px solid #22113f;box-shadow:4px 4px 0 #22113f">
<a href="${APP_URL}" style="display:inline-block;padding:15px 32px;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:900;color:#22113f;text-decoration:none">${esc(K.button)}</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece4f2;margin-top:6px"><tr>
<td width="72" valign="middle" style="padding:20px 14px 6px 0"><img src="https://app.profbrune.com.br/icons/brune-email.jpg" width="60" height="60" alt="Brune" style="display:block;border-radius:50%;border:2.5px solid #E36BCA"></td>
<td valign="middle" style="padding:20px 0 6px;font-size:15px;line-height:1.5"><b>${esc(K.bye)}</b><br>${esc(L.sig)}<br><a href="https://www.instagram.com/prof.brune/" style="color:#1d6fa5">Instagram</a> &middot; <a href="https://app.profbrune.com.br" style="color:#1d6fa5">app.profbrune.com.br</a></td></tr></table>
<div style="height:22px"></div></td></tr></table>
<p style="max-width:560px;margin:16px auto 0;text-align:center;color:#5d4f72;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6">${esc(L.footer)}${stop ? ' ' + stop : ''}<br>@prof.brune &middot; ${esc(L.tag)}</p>
</td></tr></table></body></html>`;
  const text = [body, '', ...box.map(x => '- ' + x), '', `${K.button}: ${APP_URL}`, '', `${K.bye} ${L.sig}`, '', L.footer + (unsubscribeUrl ? ` ${L.stop}: ${unsubscribeUrl}` : '')].join('\n');
  return { subject, html, text };
}

// Página do GET do link de sair: SÓ pergunta; quem grava é o POST (do botão desta página ou do "cancelar inscrição" do Gmail).
// Assim antivírus e pré-visualizadores de link, que abrem links sozinhos, não desligam o aviso de ninguém.
export function unsubscribeConfirmPage(lang, postUrl) {
  const en = lang === 'en';
  const title = en ? 'Stop receiving these emails?' : 'Parar de receber estes e-mails?';
  const msg = en ? 'You will no longer get the email about new cards from your teacher.' : 'Você não vai mais receber o e-mail de cartões novos da sua professora.';
  const btn = en ? 'Yes, stop receiving' : 'Sim, parar de receber';
  const keep = en ? 'Keep receiving' : 'Continuar recebendo';
  return `<!doctype html><html lang="${en ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#FAF5EA;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;color:#22113f"><div style="max-width:480px;margin:48px auto;padding:0 20px"><div style="background:#fff;border-radius:22px;padding:28px"><h1 style="margin:0 0 12px;font-size:26px">${esc(title)}</h1><p style="margin:0 0 20px;line-height:1.6">${esc(msg)}</p>
<form method="post" action="${esc(postUrl)}" style="margin:0 0 14px"><button type="submit" style="font:inherit;font-weight:900;color:#22113f;background:#E36BCA;border:2px solid #22113f;box-shadow:4px 4px 0 #22113f;border-radius:999px;padding:13px 26px;cursor:pointer">${esc(btn)}</button></form>
<a href="${APP_URL}" style="color:#1d6fa5">${esc(keep)}</a></div></div></body></html>`;
}

// Página mostrada depois de "Parar de receber".
export function unsubscribePage(lang, ok) {
  const en = lang === 'en';
  const title = ok ? (en ? 'Done!' : 'Pronto!') : (en ? 'This link is not valid' : 'Este link não é válido');
  const msg = ok
    ? (en ? 'You will no longer get the email about new cards from your teacher. To turn it back on, go to Settings > Notifications in the app.' : 'Você não vai mais receber o e-mail de cartões novos da sua professora. Para voltar a receber, ligue em Configurações > Notificações, dentro do site.')
    : (en ? 'Open the app and turn this email off in Settings > Notifications.' : 'Abra o site e desligue este e-mail em Configurações > Notificações.');
  return `<!doctype html><html lang="${en ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#FAF5EA;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;color:#22113f"><div style="max-width:480px;margin:48px auto;padding:0 20px"><div style="background:#fff;border-radius:22px;padding:28px"><h1 style="margin:0 0 12px;font-size:26px">${esc(title)}</h1><p style="margin:0 0 20px;line-height:1.6">${esc(msg)}</p><a href="${APP_URL}" style="color:#1d6fa5">app.profbrune.com.br</a></div></div></body></html>`;
}
