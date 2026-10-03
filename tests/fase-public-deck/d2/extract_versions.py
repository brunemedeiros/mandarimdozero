#!/usr/bin/env python3
"""Gera v062.sql / v067.sql / v068.sql com SOMENTE as 4 funções do caminho de cópia de cada versão:
_validate_media_map, _public_deck_plan, get_public_deck_media_manifest(uuid,jsonb), copy_public_deck(4 args).
Texto copiado literalmente dos arquivos de migration (nada reescrito)."""
import re, sys, os
M = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared', 'supabase_migrations')
def body(fname, name, nth=0):
    s = open(os.path.join(M, fname)).read()
    starts = [m.start() for m in re.finditer(r'create or replace function public\.' + re.escape(name) + r'\(', s)]
    i = starts[nth]; a = s.index('$$', i); b = s.index('$$;', a + 2) + 3
    return s[i:b] + '\n'
V = {
 'v062': [('061_public_decks.sql','_validate_media_map',0), ('062_public_deck_duplicates.sql','_public_deck_plan',0),
          ('062_public_deck_duplicates.sql','get_public_deck_media_manifest',0), ('062_public_deck_duplicates.sql','copy_public_deck',0)],
 'v067': [('061_public_decks.sql','_validate_media_map',0), ('067_public_deck_copy_linear_plan.sql','_public_deck_plan',0),
          ('062_public_deck_duplicates.sql','get_public_deck_media_manifest',0), ('067_public_deck_copy_linear_plan.sql','copy_public_deck',0)],
 'v068': [('068_public_deck_copy_media_linear.sql','_validate_media_map',0), ('067_public_deck_copy_linear_plan.sql','_public_deck_plan',0),
          ('068_public_deck_copy_media_linear.sql','get_public_deck_media_manifest',0), ('068_public_deck_copy_media_linear.sql','copy_public_deck',0)],
}
out = sys.argv[1]
for v, items in V.items():
    open(os.path.join(out, v + '.sql'), 'w').write(''.join(body(*it) for it in items))
print('ok')
