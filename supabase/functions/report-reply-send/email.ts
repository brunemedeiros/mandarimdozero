// E-mail de resposta a um report, no padrão Prof Brune (variação 1c; docs/email/PADRAO-EMAIL.md, modelo
// docs/email/supabase/confirmar-conta.html). Sai no idioma do SITE de quem recebe (regra do projeto: site em inglês não tem
// nada em português). O texto do meio é o que a admin digitou no Painel (Admin > Reports), com as quebras de linha dela.
// Arquivo sem dependência do Deno: o teste roda no Node (tests/email-report-reply/).

export type UiLang = 'pt-BR' | 'en';

// Mesmo mapeamento key->rótulo de shared/admin-reports.js (REPORT_LANGUAGE_LABELS) e de course_name() em
// scripts/generate_pwa_assets.py, repetido aqui porque Edge Functions rodam isoladas (sem bundler).
const COURSE_NAME_BY_UI_LANG: Record<UiLang, Record<string, string>> = {
  'pt-BR': {
    frances: 'Francês com Prof. Brune',
    mandarim: 'Chinês com Prof. Brune',
    portugues: 'Português com Prof. Brune',
    _default: 'Idiomas com Prof. Brune',
  },
  en: {
    frances: 'French with Prof. Brune',
    mandarim: 'Chinese with Prof. Brune',
    portugues: 'Portuguese with Prof. Brune',
    _default: 'Languages with Prof. Brune',
  },
};

const COURSE_PATH: Record<string, string> = { frances: '/fr/', mandarim: '/zh/', portugues: '/pt/' };

const TEXTS: Record<UiLang, Record<string, string>> = {
  'pt-BR': {
    brand: 'IDIOMAS COM PROF BRUNE',
    tag: 'Resposta ao seu report',
    title: 'Obrigada',
    titleHighlight: 'por avisar!',
    button: 'Voltar ao site',
    bye: 'Até já!',
    teacherDefault: 'Brune, sua professora de idiomas',
    'teacher.frances': 'Brune, sua professora de francês',
    'teacher.mandarim': 'Brune, sua professora de mandarim',
    'teacher.portugues': 'Brune, sua professora de português',
    tagline: '@prof.brune · aulas de idiomas online',
  },
  en: {
    brand: 'LANGUAGES WITH PROF BRUNE',
    tag: 'Reply to your report',
    title: 'Thanks for',
    titleHighlight: 'letting me know!',
    button: 'Back to the site',
    bye: 'See you soon!',
    teacherDefault: 'Brune, your language teacher',
    'teacher.frances': 'Brune, your French teacher',
    'teacher.mandarim': 'Brune, your Chinese teacher',
    'teacher.portugues': 'Brune, your Portuguese teacher',
    tagline: '@prof.brune · online language classes',
  },
};

// Idioma do e-mail: o do site da conta, se conhecido; senão (convidado ou conta sem a preferência) o idioma do curso
// manda: o curso de português só existe em inglês (Q-04); fr e zh seguem em português como sempre.
export function replyUiLanguage(languageAppKey: string | null | undefined, accountUiLanguage: string | null | undefined): UiLang {
  if (accountUiLanguage === 'en') return 'en';
  if (accountUiLanguage === 'pt-BR') return 'pt-BR';
  return languageAppKey === 'portugues' ? 'en' : 'pt-BR';
}

export function replyFooter(languageAppKey: string | null | undefined, accountUiLanguage: string | null | undefined): string {
  const ui = replyUiLanguage(languageAppKey, accountUiLanguage);
  const names = COURSE_NAME_BY_UI_LANG[ui];
  const courseName = names[languageAppKey || ''] || names._default;
  return ui === 'en'
    ? `Reply to the report you sent in ${courseName}.`
    : `Resposta ao report que você enviou no ${courseName}.`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Monta o e-mail (HTML e texto puro). `body` é o texto da admin, sem HTML.
export function buildReplyEmail(body: string, languageAppKey: string | null | undefined, accountUiLanguage: string | null | undefined): { html: string; text: string } {
  const ui = replyUiLanguage(languageAppKey, accountUiLanguage);
  const T = TEXTS[ui];
  const key = languageAppKey || '';
  const teacher = T['teacher.' + key] || T.teacherDefault;
  const footer = replyFooter(languageAppKey, accountUiLanguage);
  const siteUrl = 'https://app.profbrune.com.br' + (COURSE_PATH[key] || '/');
  const preheader = body.replace(/\s+/g, ' ').trim().slice(0, 110);
  const F = "'Nunito','Helvetica Neue',Arial,sans-serif";
  const html = `<!doctype html>
<html lang="${ui}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(T.tag)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;700;800;900&display=swap">
<style>@media (max-width:520px){.px{padding-left:18px!important;padding-right:18px!important}.h1{font-size:30px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#FAF5EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EA"><tr><td align="center" style="padding:24px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;font-family:${F};color:#22113f">
<tr><td class="px" style="background:#3D167B;color:#FAF5EA;padding:34px 36px 30px">
<div style="font-weight:900;font-size:14px;letter-spacing:.04em;opacity:.9">${esc(T.brand)}</div>
<div style="margin-top:22px"><span style="display:inline-block;border:1px solid #E36BCA;color:#f6c4ec;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${esc(T.tag)}</span></div>
<div class="h1" style="font-family:'Anton','Impact','Arial Narrow',sans-serif;font-weight:400;font-size:38px;line-height:1.05;margin:12px 0 0;letter-spacing:.01em;text-transform:uppercase">${esc(T.title)} <span style="color:#E36BCA">${esc(T.titleHighlight)}</span></div>
</td></tr>
<tr><td class="px" style="padding:28px 28px 8px">
<p style="margin:0 0 22px;font-size:16px;line-height:1.65;white-space:pre-wrap">${esc(body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 22px"><tr><td align="center" style="border-radius:999px;background:#E36BCA;border:2px solid #22113f;box-shadow:4px 4px 0 #22113f">
<a href="${siteUrl}" style="display:inline-block;padding:15px 32px;font-family:${F};font-size:16px;font-weight:900;color:#22113f;text-decoration:none">${esc(T.button)}</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece4f2;margin-top:18px"><tr>
<td width="72" valign="middle" style="padding:20px 14px 6px 0"><img src="https://app.profbrune.com.br/icons/brune-email.jpg" width="60" height="60" alt="Brune" style="display:block;border-radius:50%;border:2.5px solid #E36BCA"></td>
<td valign="middle" style="padding:20px 0 6px;font-size:15px;line-height:1.5"><b>${esc(T.bye)}</b><br>${esc(teacher)}<br><a href="https://www.instagram.com/prof.brune/" style="color:#1d6fa5">Instagram</a> · <a href="https://app.profbrune.com.br" style="color:#1d6fa5">app.profbrune.com.br</a></td>
</tr></table>
<div style="height:22px"></div>
</td></tr></table>
<p style="max-width:560px;margin:16px auto 0;text-align:center;color:#5d4f72;font-family:${F};font-size:12px;line-height:1.6">${esc(footer)}<br>${esc(T.tagline)}</p>
</td></tr></table>
</body>
</html>`;
  const text = `${body}\n\n${T.bye}\n${teacher}\n${siteUrl}\n\n${footer}`;
  return { html, text };
}
