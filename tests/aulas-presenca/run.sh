#!/bin/bash
# 094 (Presença, Competências, aula de turma) -- Postgres LOCAL (nunca produção): banco com 001..092 + 094 (duas vezes:
# idempotente) e o teste. Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" aulas94 >/dev/null 2>&1
$P aulas94 -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P aulas94 -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^(0(59|6[1-9]|7[0-9]|8[0-5]|87|94)|101|103)_'); do
  $P aulas94 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P aulas94 -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P aulas94 -f "$MIG/094_class_logs_attendance_skills.sql" >/dev/null
$P aulas94 -f "$MIG/101_class_schedule.sql" >/dev/null
echo "migrations aplicadas (094, 101 e 103 duas vezes cada)"
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_094.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_101.sql" 2>&1 | grep -v '^\s*$'
$P aulas94 -f "$MIG/103_class_calendar_feed.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_103.sql" 2>&1 | grep -v '^\s*$'
# 107 precisa de _ui_lang (102); o 102 inteiro depende de amigos, então só a função aqui.
$P aulas94 -c "create or replace function public._ui_lang(p_user uuid) returns text language sql stable security definer set search_path = public as \$\$ select case when (select g.data #>> '{_meta,uiLanguage}' from progress g where g.user_id = p_user) = 'en' then 'en' else 'pt-BR' end; \$\$" >/dev/null
$P aulas94 -f "$MIG/107_calendar_feed_short_token.sql" >/dev/null
$P aulas94 -f "$MIG/107_calendar_feed_short_token.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_107.sql" 2>&1 | grep -v '^\s*$'
# 117 (Google Agenda): precisa da 096 (Banco ligado a turma).
$P aulas94 -f "$MIG/096_review_bank_classrooms.sql" >/dev/null
$P aulas94 -f "$MIG/117_google_calendar_sync.sql" >/dev/null
$P aulas94 -f "$MIG/117_google_calendar_sync.sql" >/dev/null
$P aulas94 -f "$MIG/118_gcal_retry_review.sql" >/dev/null
$P aulas94 -f "$MIG/119_gcal_review_skip_outside.sql" >/dev/null
$P aulas94 -f "$MIG/119_gcal_review_skip_outside.sql" >/dev/null
$P aulas94 -f "$MIG/120_gcal_outside_tab.sql" >/dev/null
$P aulas94 -f "$MIG/120_gcal_outside_tab.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_117.sql" 2>&1 | grep -v '^\s*$'
# 121 (Mural estilo Classroom): avisos automáticos de aula e material, capa da turma.
$P aulas94 -f "$MIG/121_mural_classroom_style.sql" >/dev/null
$P aulas94 -f "$MIG/121_mural_classroom_style.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_121.sql" 2>&1 | grep -v '^\s*$'
# 122: o aviso da aula conta os cartões do Banco daquela aula.
$P aulas94 -f "$MIG/122_mural_lesson_bank_cards.sql" >/dev/null
$P aulas94 -f "$MIG/122_mural_lesson_bank_cards.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_121.sql" 2>&1 | grep -v '^\s*$' | tail -1
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_122.sql" 2>&1 | grep -v '^\s*$'
