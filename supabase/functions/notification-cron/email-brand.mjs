// E-mails automáticos do notification-cron no padrão visual Prof Brune (docs/email/PADRAO-EMAIL.md; mesmo modelo do e-mail de cartões da
// professora e do `report-reply-send`). Antes saía um parágrafo solto sem marca (decisão da dona, 2026-11-25: trazer para o visual novo).
// Núcleo PURO (sem rede, sem banco). Testes: node tests/email-reengajamento/test_render.js. O texto e o assunto continuam vindo de
// notification_templates (channel='email'); só a moldura muda. O link de ajuste continua sendo Configurações > Notificações.

export const APP_URL = 'https://app.profbrune.com.br/';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Textos da moldura por idioma do site. `label` e `button` variam pelo tipo de aviso: "sumiu há N dias" = saudade; qualquer outro
// evento que ganhe e-mail no futuro cai em "Aviso" e "Abrir o site" até ter texto próprio aqui.
const L = {
  pt: { code: 'pt-BR', brand: 'IDIOMAS COM PROF BRUNE', tag: 'aulas de idiomas online', sig: 'Brune, sua professora de idiomas',
    footer: 'Você pode ajustar quais e-mails recebe em Configurações &gt; Notificações, dentro do app.',
    kinds: { saudade: { label: 'Saudade de você', button: 'Voltar a estudar', bye: 'Te espero lá!', pre: 'Seu progresso está guardado. Quando quiser, é só voltar.' },
             aviso: { label: 'Um aviso para você', button: 'Abrir o site', bye: 'Até já!', pre: 'Um aviso da sua professora.' } } },
  en: { code: 'en', brand: 'LANGUAGES WITH PROF BRUNE', tag: 'online language classes', sig: 'Brune, your language teacher',
    footer: 'You can adjust which emails you receive in Settings &gt; Notifications, inside the app.',
    kinds: { saudade: { label: 'We miss you', button: 'Back to studying', bye: 'See you there!', pre: 'Your progress is saved. Come back whenever you want.' },
             aviso: { label: 'A note for you', button: 'Open the app', bye: 'See you soon!', pre: 'A note from your teacher.' } } },
};

// Tipo de aviso a partir do evento (user_inactive_9, user_inactive_15...). Qualquer outro = 'aviso'.
export function kindForEvent(eventType) { return /^user_inactive_\d+$/.test(String(eventType || '')) ? 'saudade' : 'aviso'; }

// Título da faixa: sem emoji (a fonte do título não tem). Duas frases (pontuação no meio) = a 2ª em rosa; senão, a metade final das palavras em rosa.
export function splitTitle(title) {
  const clean = String(title == null ? '' : title).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!clean) return ['', ''];
  const m = clean.match(/^(.+?[?.!])\s+(.+)$/);
  if (m) return [m[1], m[2]];
  const w = clean.split(' '), k = Math.ceil(w.length / 2);
  return [w.slice(0, k).join(' '), w.slice(k).join(' ')];
}

export function renderBrandedEmail({ lang, eventType, subject, body }) {
  const l = L[lang === 'en' ? 'en' : 'pt'], k = l.kinds[kindForEvent(eventType)];
  const [titleA, titleB] = splitTitle(subject);
  const html = `<!doctype html>
<html lang="${l.code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;700;800;900&display=swap">
<style>@media (max-width:520px){.px{padding-left:18px!important;padding-right:18px!important}.h1{font-size:30px!important}}</style></head>
<body style="margin:0;padding:0;background:#FAF5EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(k.pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA"><tr><td align="center" style="padding:24px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;color:#22113f">
<tr><td class="px" style="background:#3D167B;color:#FAF5EA;padding:34px 36px 30px">
<div style="font-weight:900;font-size:14px;letter-spacing:.04em;opacity:.9">${esc(l.brand)}</div>
<div style="margin-top:22px"><span style="display:inline-block;border:1px solid #E36BCA;color:#f6c4ec;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${esc(k.label)}</span></div>
<div class="h1" style="font-family:'Anton','Impact','Arial Narrow',sans-serif;font-weight:400;font-size:38px;line-height:1.05;margin:12px 0 0;letter-spacing:.01em;text-transform:uppercase">${esc(titleA)} <span style="color:#E36BCA">${esc(titleB)}</span></div>
</td></tr>
<tr><td class="px" style="padding:28px 28px 8px">
<p style="margin:0 0 22px;font-size:16px;line-height:1.65">${esc(body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 24px"><tr><td align="center" style="border-radius:999px;background:#E36BCA;border:2px solid #22113f;box-shadow:4px 4px 0 #22113f">
<a href="${APP_URL}" style="display:inline-block;padding:15px 32px;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:900;color:#22113f;text-decoration:none">${esc(k.button)}</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece4f2;margin-top:6px"><tr>
<td width="72" valign="middle" style="padding:20px 14px 6px 0"><img src="https://app.profbrune.com.br/icons/brune-email.jpg" width="60" height="60" alt="Brune" style="display:block;border-radius:50%;border:2.5px solid #E36BCA"></td>
<td valign="middle" style="padding:20px 0 6px;font-size:15px;line-height:1.5"><b>${esc(k.bye)}</b><br>${esc(l.sig)}<br><a href="https://www.instagram.com/prof.brune/" style="color:#1d6fa5">Instagram</a> &middot; <a href="https://app.profbrune.com.br" style="color:#1d6fa5">app.profbrune.com.br</a></td></tr></table>
<div style="height:22px"></div></td></tr></table>
<p style="max-width:560px;margin:16px auto 0;text-align:center;color:#5d4f72;font-family:'Nunito','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6">${l.footer}<br>@prof.brune &middot; ${esc(l.tag)}</p>
</td></tr></table></body></html>`;
  const text = `${body}\n\n${k.button}: ${APP_URL}\n\n${k.bye} ${l.sig}\n\n${l.footer.replace(/&gt;/g, '>')}`;
  return { html, text };
}
