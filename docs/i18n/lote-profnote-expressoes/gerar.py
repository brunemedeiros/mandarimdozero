# Gera aplicar-profnote.sql (pt-BR em challenges.data.profNote.pt) e overlay-en-profnote.json (en, campo profNote
# do overlay docs/i18n/challenges-en.json) a partir de falas-final.json ([{id, expr, pt, en}]).
# uso: python3 gerar.py falas-final.json
import json, sys, hashlib
r = json.load(open(sys.argv[1]))
def q(s):
    assert '$q$' not in s and '\n' not in s and '\r' not in s
    return '$q$' + s + '$q$'
out = ['-- Falas da professora (profNote) nas Expressões publicadas. ADITIVO: só cria data.profNote = {pt}.',
       '-- Cada UPDATE só roda se a expressão em francês (canonicalExpression) for exatamente a do lote (guarda).',
       f'-- Esperado: {len(r)} linhas alteradas.', 'begin;']
for x in r:
    out.append(f"update public.challenges set data = jsonb_set(data,'{{profNote}}',jsonb_build_object('pt',{q(x['pt'])}::text)) "
               f"where id = '{x['id']}' and type = 'expression' and data->>'canonicalExpression' = {q(x['expr'])};")
out.append('commit;')
open('aplicar-profnote.sql', 'w').write('\n'.join(out) + '\n')
open('aplicar-profnote.sql', 'w').write('-- Mesmo lote em um só UPDATE (cabe numa chamada). Guarda: canonicalExpression igual.\n' +
    "update public.challenges c set data = jsonb_set(c.data,'{profNote}',jsonb_build_object('pt',v.pt)) from (values " +
    ','.join(f"('{x['id']}',{q(x['expr'])},{q(x['pt'])})" for x in r) +
    ") v(id,e,pt) where c.id=v.id and c.type='expression' and c.data->>'canonicalExpression'=v.e;\n")
json.dump({x['id']: x['en'] for x in r}, open('overlay-en-profnote.json', 'w'), ensure_ascii=False, indent=1)
# hash para conferir depois de gravar: md5 de string_agg(id||':'||profNote.pt, '|' order by id)
s = '|'.join(f"{x['id']}:{x['pt']}" for x in sorted(r, key=lambda x: x['id']))
print(len(r), 'falas; hash esperado', hashlib.md5(s.encode()).hexdigest())
