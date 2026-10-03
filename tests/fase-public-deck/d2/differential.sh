#!/bin/bash
# D2 -- teste diferencial 062 x 067 x 068 (Postgres LOCAL, DB pubdeck preparado por run.sh).
# Para cada versão: carrega SÓ as 4 funções do caminho de cópia daquela versão (texto literal das
# migrations) dentro de uma transação, roda cada cenário num SAVEPOINT (desfeito ao fim) e grava a
# saída normalizada. Ao final a transação é desfeita (o banco volta à 068). Saídas devem ser IDÊNTICAS.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); OUT=${OUT:-$(mktemp -d)}
P="psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -At -v ON_ERROR_STOP=1"
python3 "$HERE/extract_versions.py" "$OUT" >/dev/null
$P -f "$HERE/fixtures.sql" >/dev/null 2>&1
$P -f "$HERE/runner.sql" >/dev/null
SCN="manifest_default manifest_explicit check_main ok_explicit ok_default_null_sel ok_extra_valid_key ok_dest_subdeck
 fail_missing_last fail_missing_middle fail_missing_first fail_empty_map fail_map_null fail_map_array
 fail_dest_other_user_folder fail_dest_original_same fail_dest_object_missing fail_dest_external fail_dest_dotdot
 fail_key_external fail_value_not_string fail_value_json_null fail_too_many_keys fail_manifest_too_many
 quirk_manifest_map quirk_full_map manifest_zh zh_ok zh_missing"
for v in v062 v067 v068; do
  { echo "begin;"; echo "\\i $OUT/$v.sql";
    for s in $SCN; do echo "savepoint s; select '$s' || chr(9) || d2t.run('$s')::text; rollback to savepoint s;"; done
    echo "rollback;"; } | $P > "$OUT/$v.out"
done
fail=0
for v in v062 v067; do
  if cmp -s "$OUT/$v.out" "$OUT/v068.out"; then echo "ok|068 == ${v#v} em $(wc -l < $OUT/v068.out) cenários";
  else echo "FALHA|068 != ${v#v}"; diff <(cut -c1-300 "$OUT/$v.out") <(cut -c1-300 "$OUT/v068.out") | head -20; fail=1; fi
done
echo "--- resumo por cenário (068) ---"
python3 "$HERE/summary.py" "$OUT/v068.out"
exit $fail
