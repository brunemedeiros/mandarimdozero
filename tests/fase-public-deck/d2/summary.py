import json, sys
for line in open(sys.argv[1]):
    s, j = line.rstrip('\n').split('\t', 1)
    d = json.loads(j); r = d.get('result', d)
    if 'error' in r: t = 'ERRO ' + r['error']
    elif 'notes_copied' in r:
        sn = d['snapshot']; t = 'notes=%s decks=%s media_remapped=%s | criadas=%d decks_criados=%d' % (r['notes_copied'], r['decks_created'], r['media_remapped'], len(sn['notes']), len(sn['decks']))
        if r['notes_copied'] == 0 and sn['notes']: t += ' !!'
    elif 'count' in r: t = 'manifest itens=%s' % r['count']
    else: t = 'plano notes=%s' % len(r.get('notes', []))
    if 'notes_copied' in r:
        # independência física: toda URL do bucket na cópia aponta para a pasta do COPIADOR (dd3),
        # nenhuma para a do autor (dd1); storagePath/generationKey nunca sobrevivem.
        import re
        P = re.compile(r'^https?://[^/?#]+/storage/v1/object/public/flashcard-media/([^?#]+)$')
        own = cop = leak = 0
        for n in d['snapshot']['notes']:
            for f in n['fields'] or []:
                for k in ('audio', 'image'):
                    o = f.get(k)
                    if isinstance(o, dict):
                        if 'storagePath' in o or 'generationKey' in o: leak += 1
                        for kk in ('url', 'generatedUrl'):
                            u = o.get(kk)
                            m = P.match(u) if isinstance(u, str) and '..' not in u else None
                            if m:
                                if m.group(1).startswith('00000000-0000-0000-0000-000000000dd1/'): own += 1
                                elif m.group(1).startswith('00000000-0000-0000-0000-000000000dd3/'): cop += 1
                                else: own += 1
        t += ' | urls_copiador=%d urls_autor=%d storagePath/generationKey=%d %s' % (cop, own, leak, 'OK' if own == 0 and leak == 0 and cop > 0 else '!! INDEPENDÊNCIA')
    if 'snapshot' in d and 'error' in r and (d['snapshot']['notes'] or d['snapshot']['decks']): t += ' !! RESÍDUO'
    print(f'{s:28s} {t}')
