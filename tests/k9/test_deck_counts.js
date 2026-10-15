// K.9 -- get_teacher_student_deck_counts (migration 078) num Postgres LOCAL, com paridade contra o cliente:
// os cartões são gerados pelo motor REAL (buildEngineCardsFromRow) e o esperado vem de getDeckCounts
// (shared/deck-engine.js) sobre os mesmos cartões. Também cobre porta (vínculo), Decks de outra professora,
// arquivados, saves antigos sem rowId e ids de linhas de outra conta.
// Rodar (root, Postgres 16): node tests/k9/test_deck_counts.js
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { loadLang, check, summary } = require('../fase-e/harness');

const ROOT = path.resolve(__dirname, '..', '..');
const ctx = loadLang('fr');
const appKey = 'frances';
const NOW = Date.now(), PAST = NOW - 86400e3, FUT = NOW + 86400e3 * 5;
const U = { teacher: '00000000-0000-0000-0000-0000000000a1', other: '00000000-0000-0000-0000-0000000000a2',
  student: '00000000-0000-0000-0000-0000000000b1', stranger: '00000000-0000-0000-0000-0000000000b2' };

// Árvore do aluno: root > personal_root(10) > Viagem(11) > Aeroporto(12); personal_root > Vazio(13);
// teacher_root da professora (20) > Unidade 1 (21); teacher_root de OUTRA professora (30).
const decks = [
  { id: 1, kind: 'root', parent_deck_id: null, owner_id: U.student, teacher_id: null, name: 'Francês' },
  { id: 10, kind: 'personal_root', parent_deck_id: 1, owner_id: U.student, teacher_id: null, name: 'Meus Decks' },
  { id: 11, kind: 'personal', parent_deck_id: 10, owner_id: U.student, teacher_id: null, name: 'Viagem' },
  { id: 12, kind: 'personal', parent_deck_id: 11, owner_id: U.student, teacher_id: null, name: 'Aeroporto' },
  { id: 13, kind: 'personal', parent_deck_id: 10, owner_id: U.student, teacher_id: null, name: 'Novidades' },
  { id: 14, kind: 'personal', parent_deck_id: 10, owner_id: U.student, teacher_id: null, name: 'Vazio' },
  { id: 20, kind: 'teacher_root', parent_deck_id: 1, owner_id: U.student, teacher_id: U.teacher, name: 'Cartões da professora' },
  { id: 21, kind: 'teacher', parent_deck_id: 20, owner_id: U.student, teacher_id: U.teacher, name: 'Unidade 1' },
  { id: 30, kind: 'teacher_root', parent_deck_id: 1, owner_id: U.student, teacher_id: U.other, name: 'Outra professora' },
  { id: 40, kind: 'personal_root', parent_deck_id: null, owner_id: U.stranger, teacher_id: null, name: 'Meus Decks' },
];
const F = (id, l, v) => ({ id, lang: l, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
const text = (a, b) => [F('f0', 'fr', a), F('f1', 'pt-BR', b)];
const cloze = () => [F('f0', 'fr', 'Je {{c1::suis}} {{c2::ici}} {{c3::la}}'), F('f1', 'pt-BR', 'Eu estou aqui')];
const row = (id, mode, fields, deck_id, extra) => Object.assign({ id, revision: 0, status: 'active', note: null, tags: [], deck_id, fields, card_generation_mode: mode, language_app_key: appKey }, extra || {});
const own = [
  row(101, 'normal', text('a', 'b'), 10),
  row(102, 'normal_reversed', text('c', 'd'), 11),
  row(103, 'cloze', cloze(), 12),
  row(104, 'normal', text('e', 'f'), 12),
  row(105, 'normal', text('arq', 'x'), 11, { status: 'archived' }),
  row(106, 'normal', text('novo', 'y'), 13),
];
const teacherRows = [
  row(201, 'normal_reversed', text('g', 'h'), 21, { teacher_id: U.teacher }),
  row(202, 'normal', text('i', 'j'), 20, { teacher_id: U.teacher }),
  row(301, 'normal', text('k', 'l'), 30, { teacher_id: U.other }),
];
const strangerRow = row(901, 'normal', text('z', 'z'), 40);

const build = (r, origin) => ctx.buildEngineCardsFromRow(r, { origin, appKey, idPrefix: origin === 'teacher' ? 't' : 's' });
const states = [
  { reps: 0, state: 'new', due: 0 },
  { reps: 3, state: 'review', due: PAST, interval: 10 },
  { reps: 1, state: 'learning', due: PAST },
  { reps: 4, state: 'review', due: FUT, interval: 20 },
  { reps: 2, state: 'relearning', due: FUT },
  { reps: 2, state: 'new', due: PAST },          // save antigo: "Errei" com state new => Learning
];
let k = 0;
const cards = [];
for (const r of own) build(r, 'self').forEach(c => cards.push(Object.assign(c, states[k++ % states.length], { deckId: r.deck_id })));
for (const r of teacherRows) build(r, 'teacher').forEach(c => cards.push(Object.assign(c, states[k++ % states.length], { deckId: r.deck_id })));
// save antigo sem rowId (s104 já existe; este simula uma 2ª revisão "-r1" da mesma linha)
const legacy = Object.assign(build(own[3], 'self')[0], { reps: 5, state: 'review', due: PAST, deckId: 12 });
legacy.id = 's104-r1'; delete legacy.rowId; delete legacy.origin;
cards.push(legacy);
// lixo que nunca pode contar: linha de outra conta, trilha, rowId inválido, origem estranha
const foreign = Object.assign(build(strangerRow, 'self')[0], { reps: 1, state: 'review', due: PAST, deckId: 10 });
cards.push(foreign);
cards.push({ id: 'u1-v0', origin: 'study', reps: 3, state: 'review', due: PAST, unitId: 1 });
cards.push({ id: 's101', rowId: 'abc', origin: 'self', reps: 1, state: 'review', due: PAST });
cards.push({ id: 'x9', rowId: 101, origin: 'weird', reps: 1, state: 'review', due: PAST });
cards.push('não é objeto');

// ---------- esperado (cliente) ----------
// O cliente do ALUNO só monta cartões das linhas dele (a "foreign" não existiria lá) e o legado ganha
// rowId/origin ao ser lido; as outras sujeiras não têm deckId.
const clientCards = cards.filter(c => c && typeof c === 'object' && c !== foreign && c.deckId != null)
  .map(c => c === legacy ? Object.assign({}, c, { origin: 'self', rowId: 104, flashcardStatus: 'active' }) : c);
const expected = {};
for (const d of decks.filter(d => [10, 11, 12, 13, 14, 20, 21].includes(d.id))){
  const c = ctx.getDeckCounts(decks, d.id, clientCards, NOW);
  expected[d.id] = { total: c.total, new: c.new, learning: c.learning, review: c.review, due: c.due };
}

// ---------- banco local ----------
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const sql = [];
sql.push(`create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;
create table teacher_students(id bigint generated always as identity primary key, teacher_id uuid, student_id uuid, language_app_key text, status text);
create table decks(id bigint primary key, owner_id uuid, teacher_id uuid, parent_deck_id bigint, kind text, name text, language_app_key text, created_at timestamptz default now());
create table own_flashcards(id bigint primary key, owner_id uuid, language_app_key text, status text, deck_id bigint);
create table teacher_flashcards(id bigint primary key, teacher_id uuid, student_id uuid, language_app_key text, status text, deck_id bigint);
create table progress(user_id uuid primary key, data jsonb);
grant usage on schema public, auth to authenticated, anon; grant execute on all functions in schema auth to authenticated, anon;`);
sql.push(`insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 (${q(U.teacher)}, ${q(U.student)}, 'frances', 'active'), (${q(U.other)}, ${q(U.student)}, 'frances', 'removed');`);
for (const d of decks) sql.push(`insert into decks values (${d.id}, ${q(d.owner_id)}, ${d.teacher_id ? q(d.teacher_id) : 'null'}, ${d.parent_deck_id ?? 'null'}, ${q(d.kind)}, ${q(d.name)}, 'frances');`);
for (const r of own) sql.push(`insert into own_flashcards values (${r.id}, ${q(U.student)}, 'frances', ${q(r.status)}, ${r.deck_id});`);
sql.push(`insert into own_flashcards values (${strangerRow.id}, ${q(U.stranger)}, 'frances', 'active', 40);`);
for (const r of teacherRows) sql.push(`insert into teacher_flashcards values (${r.id}, ${q(r.teacher_id)}, ${q(U.student)}, 'frances', ${q(r.status)}, ${r.deck_id});`);
sql.push(`insert into progress values (${q(U.student)}, ${q(JSON.stringify({ frances: { cards } }))}::jsonb);`);
sql.push(fs.readFileSync(path.join(ROOT, 'shared/supabase_migrations/078_teacher_student_deck_counts.sql'), 'utf8'));
sql.push(fs.readFileSync(path.join(ROOT, 'shared/supabase_migrations/078_teacher_student_deck_counts.sql'), 'utf8'));
const call = (uid, student, lang) => `select set_config('request.jwt.claims', ${q(JSON.stringify({ sub: uid }))}, false) is null;
set role authenticated; select 'OUT ' || get_teacher_student_deck_counts(${q(student)}, ${q(lang)})::text; reset role;`;
sql.push(call(U.teacher, U.student, 'frances'));
sql.push(call(U.other, U.student, 'frances'));
sql.push(call(U.teacher, U.student, 'mandarim'));
sql.push(call(U.student, U.student, 'frances'));
sql.push(`set role anon; select 'OUT ' || coalesce((select has_function_privilege('anon', 'get_teacher_student_deck_counts(uuid,text)', 'execute'))::text, '');`);

const tmp = fs.mkdtempSync('/tmp/k9-');
fs.writeFileSync(path.join(tmp, 't.sql'), sql.join('\n'));
fs.chmodSync(tmp, 0o755); fs.chmodSync(path.join(tmp, 't.sql'), 0o644);
execSync('pg_ctlcluster 16 main start 2>/dev/null || true; sleep 1');
execSync(`su postgres -c "psql -q -c 'drop database if exists k9' -c 'create database k9'"`);
const out = execSync(`su postgres -c "psql -q -t -A -v ON_ERROR_STOP=1 -d k9 -f ${tmp}/t.sql"`, { encoding: 'utf8' });
const lines = out.split('\n').filter(l => l.startsWith('OUT ')).map(l => l.slice(4)).filter(l => l !== '');
const [okRes, otherRes, langRes, selfRes, anonExec] = lines;

const res = JSON.parse(okRes);
const got = Object.fromEntries(res.decks.map(d => [d.id, d]));
check('devolve só Meus Decks + Decks desta professora', JSON.stringify(Object.keys(got).map(Number).sort((a, b) => a - b)) === '[10,11,12,13,14,20,21]', Object.keys(got));
for (const id of Object.keys(expected)){
  const g = got[id] || {};
  const e = expected[id];
  check(`paridade Deck ${id} (${decks.find(d => d.id === +id).name})`, ['total', 'new', 'learning', 'review', 'due'].every(f => g[f] === e[f]), { got: g, expected: e });
}
check('subárvore soma os filhos (Meus Decks >= Viagem >= Aeroporto)', got[10].total >= got[11].total && got[11].total >= got[12].total && got[12].total > 0);
check('Deck vazio = zeros', got[14].total === 0 && got[14].due === 0 && got[14].new === 0);
check('arquivado fora (Viagem: reverso 2 cartões + Aeroporto)', got[11].total === got[12].total + 2, got[11]);
check('save antigo sem rowId conta no Deck da linha', got[12].total === 3 + 1 + 1, got[12]);
check('nome e tipo do Deck vêm junto, sem conteúdo', got[11].name === 'Viagem' && got[11].kind === 'personal' && got[11].parentId === 10 && !('cards' in got[11]));
check('Deck de outra professora fora', !got[30]);
check('outra professora (vínculo removido) barrada', JSON.parse(otherRes).error === 'not_authorized', otherRes);
check('idioma sem vínculo barrado', JSON.parse(langRes).error === 'not_authorized', langRes);
check('o próprio aluno não chama', JSON.parse(selfRes).error === 'not_authorized', selfRes);
check('anon sem execute', anonExec === 'false', anonExec);
summary('K.9 -- deck counts');
