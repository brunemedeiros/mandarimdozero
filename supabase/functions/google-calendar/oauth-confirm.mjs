// Confirmação da ligação pela sessão logada (migration 156; achado A5 da auditoria, docs/historico/36-*).
// Peças puras (Node e Deno, só Web Crypto). Cópia IGUAL em supabase/functions/google-calendar/ e .../notion-sync/
// (o deploy de cada função só leva os arquivos da própria pasta); tests/oauth-confirmar/test_oauth_confirm.mjs confere.

export const CONFIRM_TTL_MS = 15 * 60 * 1000;

// Resposta HTTP de cada resultado da ação 'confirm'.
export const CONFIRM_STATUS = {
  ok: 200, invalid_code: 400, not_authorized: 401, not_same_user: 403, not_found: 404, already_used: 409, expired: 410,
};

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 32 bytes aleatórios (256 bits) em base64url: 43 caracteres.
export function newConfirmCode() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b64url(b);
}

export function isConfirmCode(c) {
  return typeof c === 'string' && /^[A-Za-z0-9_-]{43}$/.test(c);
}

// Só o hash (SHA-256, hex) vai para o banco.
export async function hashConfirmCode(c) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c)));
  return Array.from(d, x => x.toString(16).padStart(2, '0')).join('');
}

// Mesmo critério de public.oauth_pending_confirm (156), para teste sem banco.
// row: {user_id, expires_at (ms ou ISO), consumed_at} | null.
export function decideConfirm(row, caller, now) {
  if (!row) return 'not_found';
  if (row.consumed_at) return 'already_used';
  if (new Date(row.expires_at).getTime() <= now) return 'expired';
  if (!caller || caller !== row.user_id) return 'not_same_user';
  return 'ok';
}

// Endereço de volta ao site com o pedido de confirmação (ex.: ?gcal=confirmar&c=<código>).
export function confirmReturnUrl(returnUrl, param, code) {
  const back = new URL(returnUrl);
  back.searchParams.set(param, 'confirmar');
  back.searchParams.set('c', code);
  return back.toString();
}
