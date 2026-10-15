// Link de agenda (103): testa buildIcs da Edge Function class-calendar-feed com o arquivo de produção.
// node --experimental-strip-types tests/aulas-presenca/test_ics.mjs (o import npm: é trocado por um stub).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const src = fs.readFileSync(new URL('../../supabase/functions/class-calendar-feed/index.ts', import.meta.url), 'utf8')
  .replace(/^import \{ createClient \} from 'npm:[^']+';$/m, 'const createClient = null as any;')
  .replace(/Deno\.env\.get\([^)]*\)!/g, "''")
  .replace(/^Deno\.serve\(/m, '((..._a: any[]) => null)(');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ics-')), 'feed.mts');
fs.writeFileSync(tmp, src);
const { buildIcs, feedToken } = await import(pathToFileURL(tmp).href);
let ok = 0, n = 0; const L = (name, c, extra) => { n++; if (c) ok++; else console.log('FALHOU', name, extra ?? ''); };
const rows = [
  { id: 1, role: 'student', language_app_key: 'frances', class_date: '2026-11-03', start_at: '2026-11-03T22:30:00+00:00', duration_minutes: 90,
    topic: 'Subjonctif; exceções, e mais', homework: 'Ex. 3\nEx. 4', attendance_name: null, who: 'Prof Brune', updated_at: '2026-10-15T10:00:00+00:00' },
  { id: 2, role: 'teacher', language_app_key: 'mandarim', class_date: '2026-12-31', start_at: null, duration_minutes: null,
    topic: 'Sem horário', homework: null, attendance_name: 'Cancelada pela professora', who: 'Turma Jeanne', updated_at: null },
  { id: 3, role: 'teacher', language_app_key: 'frances', class_date: '2026-11-04', start_at: '2026-11-04T15:00:00+00:00', duration_minutes: null,
    topic: 'É'.repeat(60), homework: null, attendance_name: 'Presente', who: 'Ana', updated_at: null },
];
const ics = buildIcs(rows, 'pt', new Date('2026-10-15T12:00:00Z'));
const lines = ics.split('\r\n');
L('começa e termina como VCALENDAR com CRLF', ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
L('3 eventos', (ics.match(/BEGIN:VEVENT/g) || []).length === 3);
L('nome do calendário', ics.includes('X-WR-CALNAME:Aulas · Prof. Brune'));
L('início/fim em UTC com a duração', ics.includes('DTSTART:20261103T223000Z') && ics.includes('DTEND:20261104T000000Z'));
L('sem duração = 1h', ics.includes('DTSTART:20261104T150000Z') && ics.includes('DTEND:20261104T160000Z'));
L('sem horário = dia inteiro, virada de ano', ics.includes('DTSTART;VALUE=DATE:20261231') && ics.includes('DTEND;VALUE=DATE:20270101'));
L('título do aluno', ics.includes('SUMMARY:Aula de francês · Prof Brune'));
L('cancelada: rótulo no título e não ocupa horário', ics.includes('SUMMARY:Cancelada pela professora: Aula de mandarim · Turma Jeanne') && /UID:aula-2@[\s\S]*?TRANSP:TRANSPARENT/.test(ics));
L('aula normal ocupa horário', /UID:aula-1@[\s\S]*?TRANSP:OPAQUE/.test(ics));
const unfolded = ics.replace(/\r\n /g, '');
L('escapa ; , e quebra de linha', unfolded.includes('Tema: Subjonctif\\; exceções\\, e mais\\nTarefa: Ex. 3\\nEx. 4'), unfolded.split('\r\n').find(l => l.startsWith('DESCRIPTION')));
L('linhas com no máximo 75 bytes', lines.every(l => Buffer.byteLength(l) <= 75), lines.filter(l => Buffer.byteLength(l) > 75));
L('dobra sem partir acento', unfolded.includes('Tema: ' + 'É'.repeat(60)));
L('link do site do idioma', ics.includes('URL:https://app.profbrune.com.br/fr/') && ics.includes('URL:https://app.profbrune.com.br/zh/'));
L('UID estável por aula', ics.includes('UID:aula-1@profbrune.com.br'));
L('DTSTAMP do updated_at ou de agora', ics.includes('DTSTAMP:20261015T100000Z') && ics.includes('DTSTAMP:20261015T120000Z'));
const en = buildIcs(rows.slice(0, 1), 'en');
L('inglês', en.includes('SUMMARY:Lesson: French · Prof Brune') && en.includes('X-WR-CALNAME:Lessons · Prof. Brune') && en.replace(/\r\n /g, '').includes('Topic: '));
L('calendário vazio válido', buildIcs([], 'pt').split('\r\n').filter(Boolean).at(-1) === 'END:VCALENDAR' && !buildIcs([], 'pt').includes('VEVENT'));
const F = (x) => feedToken(new URL(x));
L('senha curta no caminho (Netlify)', F('https://x.supabase.co/functions/v1/class-calendar-feed/k7qx9mp2vn4nr8st') === 'k7qx9mp2vn4nr8st');
L('senha curta com .ics', F('https://x.supabase.co/functions/v1/class-calendar-feed/k7qx9mp2vn4nr8st.ics') === 'k7qx9mp2vn4nr8st');
L('forma antiga ?t= com 64 hex', F('https://x.supabase.co/functions/v1/class-calendar-feed?t=' + 'a'.repeat(64)) === 'a'.repeat(64));
L('sem senha = nada', F('https://x.supabase.co/functions/v1/class-calendar-feed') === null);
L('senha inválida = nada', F('https://x.supabase.co/functions/v1/class-calendar-feed/abc') === null && F('https://x.supabase.co/functions/v1/class-calendar-feed/k7qx9mp2vn4nr8s1') === null);
console.log(`${ok}/${n} ok`);
process.exit(ok === n ? 0 : 1);
