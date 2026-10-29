# Gera aplicar-lote-exemplos.sql e overlay-en-novos-campos.json a partir de rascunho-final.json
# uso: python3 gerar.py rascunho-final.json
import json,sys
f=sys.argv[1]; r=json.load(open(f))
def q(s):
    # Sem quebra de linha escrita dentro do texto (colar no navegador troca \n por \r\n): usa chr(10)
    assert '$q$' not in s
    if '\n' in s: return '(' + ' || chr(10) || '.join('$q$'+p+'$q$' for p in s.split('\n')) + ')'
    return '$q$'+s+'$q$'
def sql(x):
    e='data'
    for path,val in [('{example,pt}',x['pt1']),('{example,mark}',x['mark1']),('{secondExample,pt}',x['pt2']),('{secondExample,mark}',x['mark2'])]:
        e=f"jsonb_set({e},'{path}',to_jsonb({q(val)}::text))"
    if x.get('lit_pt'): e=f"jsonb_set({e},'{{literal}}',jsonb_build_object('pt',{q(x['lit_pt'])}::text))"
    return (f"update public.challenges set data = {e} where id = '{x['id']}' "
            f"and data->'example'->>'text' = {q(x['text1'])} and data->'secondExample'->>'text' = {q(x['text2'])};")
out=['-- Lote de exemplos das Expressões (2026-10-28). ADITIVO: só acrescenta example.pt/mark, secondExample.pt/mark e literal.pt.',
 '-- Cada UPDATE só roda se o texto em francês do exemplo for exatamente o do rascunho (guarda). Esperado: 122 linhas alteradas + 1 (tirer la gueule).','begin;']
out+=[sql(x) for x in r]
out+=["-- tirer la gueule: aviso de registro dentro do texto do significado (autorizado em 2026-10-28)",
 "update public.challenges set data = jsonb_set(data,'{meaning,pt}',to_jsonb(replace(data->'meaning'->>'pt','Registro: vulgar — pode ofender. Evite em contextos formais ou com desconhecidos.','Registro: familiar — use com amigos e pessoas próximas, evite em contextos formais.'))) where id='expr-lote4-013' and data->'meaning'->>'pt' like '%Registro: vulgar%';",
 "commit;"]
open('aplicar-lote-exemplos.sql','w').write('\n'.join(out)+'\n')
ov={x['id']:{k:v for k,v in [('example',x['en1']),('secondExample',x['en2']),('literal',x.get('lit_en'))] if v} for x in r}
json.dump(ov,open('overlay-en-novos-campos.json','w'),ensure_ascii=False,indent=1)
print(len(r),'itens;',sum(1 for l in out if l.startswith('update')),'updates')
