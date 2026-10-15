// ---------- Link de agenda (migration 103) ----------
//
// Devolve as aulas da conta em formato iCalendar (.ics) para assinatura no Google Agenda, Apple ou Outlook:
//   GET .../functions/v1/class-calendar-feed?t=<token de 64 hex>[&lang=en]
// O Google busca o link sozinho, sem login, por isso esta função roda com verify_jwt = false: o token É a
// autenticação (256 bits, gerado por my_calendar_feed_token; "Gerar outro link" invalida o antigo).
// Lê com a service role a RPC class_calendar_feed, que só devolve tema, tarefa e presença (nunca Anotações
// nem Observações). Nunca loga o token.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE = 'https://app.profbrune.com.br';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Row = {
  id: number; role: 'teacher' | 'student'; language_app_key: string; class_date: string; start_at: string | null;
  duration_minutes: number | null; topic: string | null; homework: string | null; attendance_name: string | null;
  who: string | null; updated_at: string | null;
};

const TEXTS = {
  pt: {
    cal: 'Aulas · Prof. Brune', lesson: 'Aula de', topic: 'Tema', homework: 'Tarefa', attendance: 'Presença',
    langs: { frances: 'francês', mandarim: 'mandarim', portugues: 'português' } as Record<string, string>,
  },
  en: {
    cal: 'Lessons · Prof. Brune', lesson: 'Lesson:', topic: 'Topic', homework: 'Homework', attendance: 'Attendance',
    langs: { frances: 'French', mandarim: 'Mandarin', portugues: 'Portuguese' } as Record<string, string>,
  },
};
const SITE_PATH: Record<string, string> = { frances: '/fr/', mandarim: '/zh/', portugues: '/pt/' };

// RFC 5545: escapar \ ; , e quebra de linha; dobrar linhas em 75 bytes (UTF-8, sem partir caractere).
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
const enc = new TextEncoder();
function fold(line: string): string {
  const out: string[] = [];
  let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function ymd(dateStr: string, plusDays = 0): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function buildIcs(rows: Row[], lang: 'pt' | 'en', now = new Date()): string {
  const T = TEXTS[lang];
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prof Brune//Aulas//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(T.cal)}`, 'X-PUBLISHED-TTL:PT1H', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ];
  for (const r of rows) {
    const langName = T.langs[r.language_app_key] || r.language_app_key;
    const cancelled = /cancel/i.test(r.attendance_name || '');
    let summary = `${T.lesson} ${langName}${r.who ? ' · ' + r.who : ''}`;
    if (cancelled && r.attendance_name) summary = `${r.attendance_name}: ${summary}`;
    const desc: string[] = [];
    if (r.topic) desc.push(`${T.topic}: ${r.topic}`);
    if (r.homework) desc.push(`${T.homework}: ${r.homework}`);
    if (r.attendance_name) desc.push(`${T.attendance}: ${r.attendance_name}`);
    const url = SITE + (SITE_PATH[r.language_app_key] || '/');
    desc.push(url);
    const stamp = r.updated_at ? new Date(r.updated_at) : now;
    L.push('BEGIN:VEVENT', `UID:aula-${r.id}@profbrune.com.br`, `DTSTAMP:${utc(stamp)}`, `LAST-MODIFIED:${utc(stamp)}`);
    if (r.start_at) {
      const start = new Date(r.start_at);
      const end = new Date(start.getTime() + (r.duration_minutes || 60) * 60000);
      L.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${ymd(r.class_date)}`, `DTEND;VALUE=DATE:${ymd(r.class_date, 1)}`);
    }
    L.push(`SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc.join('\n'))}`, `URL:${url}`);
    // Aula cancelada continua no calendário (com o rótulo no título), mas não ocupa o horário.
    L.push(`TRANSP:${cancelled || !r.start_at ? 'TRANSPARENT' : 'OPAQUE'}`, 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('method_not_allowed', { status: 405, headers: CORS });
  }
  const u = new URL(req.url);
  const token = (u.searchParams.get('t') || '').trim().toLowerCase();
  const lang = u.searchParams.get('lang') === 'en' ? 'en' : 'pt';
  if (!/^[0-9a-f]{64}$/.test(token)) return new Response('not_found', { status: 404, headers: CORS });

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('class_calendar_feed', { p_token: token });
  if (error) {
    console.error('class_calendar_feed falhou:', error.code, error.message);
    return new Response('error', { status: 500, headers: CORS });
  }
  // Token inexistente devolve 0 linhas, igual a uma conta sem aulas: calendário vazio (não revela se existe).
  const body = buildIcs((data || []) as Row[], lang);
  return new Response(req.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="aulas-prof-brune.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  });
});
