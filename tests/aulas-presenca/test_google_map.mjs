// Google Agenda (117): testa mapEvent da Edge Function google-calendar com o arquivo de produção.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const src = fs.readFileSync(new URL('../../supabase/functions/google-calendar/index.ts', import.meta.url), 'utf8')
  .replace(/^import \{ createClient \} from 'npm:[^']+';$/m, 'const createClient = null as any;')
  .replace(/Deno\.env\.get\(([^)]*)\)!?/g, "''")
  .replace(/^Deno\.serve\(/m, '((..._a: any[]) => null)(');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gcal-')), 'f.mts');
fs.writeFileSync(tmp, src);
const { mapEvent, readPlan } = await import(pathToFileURL(tmp).href);
let ok = 0, n = 0; const L = (name, c, x) => { n++; if (c) ok++; else console.log('FALHOU', name, x ?? ''); };
const a = mapEvent({ id: 'x1', summary: 'Cat - Prof. Brune', status: 'confirmed',
  start: { dateTime: '2026-10-26T16:00:00-03:00', timeZone: 'America/Sao_Paulo' }, end: { dateTime: '2026-10-26T17:00:00-03:00' },
  attendees: [{ email: 'brune@x.com', self: true }, { email: 'Ana@X.com', displayName: 'Ana' }, { email: 'sala@resource.calendar.google.com', resource: true }] }, 'Europe/Paris');
L('horário e fuso do evento', a.start === '2026-10-26T16:00:00-03:00' && a.time_zone === 'America/Sao_Paulo' && !a.all_day);
L('convidados sem a própria professora nem sala, e-mail minúsculo', a.attendees.length === 1 && a.attendees[0].email === 'ana@x.com' && a.attendees[0].name === 'Ana', a.attendees);
const b = mapEvent({ id: 'x2', summary: 'Aniversário', start: { date: '2026-10-26' }, end: { date: '2026-10-27' } }, 'America/Sao_Paulo');
L('dia inteiro sem horário', b.all_day && b.start === null && b.time_zone === 'America/Sao_Paulo');
const c = mapEvent({ id: 'x3', status: 'cancelled' }, null);
L('apagado vira cancelled sem título', c.status === 'cancelled' && c.title === null && c.start === null);
const d = mapEvent({ id: 'x4', summary: 'Evan', start: { dateTime: '2026-10-26T10:00:00-03:00' }, end: { dateTime: '2026-10-26T11:00:00-03:00' } }, 'America/Sao_Paulo');
L('sem fuso no evento usa o da agenda', d.time_zone === 'America/Sao_Paulo' && d.attendees.length === 0);
const now = Date.parse('2026-10-23T15:00:00Z');
L('primeira vez: desde maio de 2025', readPlan({ sync_token: null }, now).kind === 'backfill');
L('primeira do dia: janela inteira', readPlan({ sync_token: 'janela:2026-10-22', last_synced_at: '2026-10-22T23:50:00Z' }, now).kind === 'full');
const inc = readPlan({ sync_token: 'janela:2026-10-23', last_synced_at: '2026-10-23T14:45:00Z' }, now);
L('mesmo dia: só o que mudou, com 15 min de folga', inc.kind === 'incremental' && inc.updatedMin === '2026-10-23T14:30:00.000Z', inc);
L('dia muda pelo horário de Brasília (00:30 em SP ainda é o dia anterior em UTC-3)', readPlan({ sync_token: 'janela:2026-10-23', last_synced_at: '2026-10-24T02:00:00Z' }, Date.parse('2026-10-24T02:30:00Z')).kind === 'incremental');
console.log(`${ok}/${n} ok`); process.exit(ok === n ? 0 : 1);
