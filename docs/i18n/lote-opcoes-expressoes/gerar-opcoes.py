# Gera aplicar-opcoes.sql e overlay-en-opcoes.json a partir de entrada-todos.json + saida-final.json
# uso: python3 gerar-opcoes.py entrada-todos.json saida-final.json
import json,sys
ent={x['id']:x for x in json.load(open(sys.argv[1]))}; sai=json.load(open(sys.argv[2]))
def q(s):
    assert '$q$' not in s and '\n' not in s; return '$q$'+s+'$q$'
out=['-- Lote das opções das Expressões no idioma do site (2026-10-31). ADITIVO: acrescenta optionsPt (4 opções em pt-BR, MESMA ORDEM de options) e microActivity.pt (frase da Sua vez).',
     '-- Cada UPDATE só roda se correctAnswer e microActivity.answer forem exatamente os do rascunho (guarda). Esperado: 122 linhas.','begin;']
for x in sai:
    e=ent[x['id']]
    opts=json.dumps(x['optionsPt'],ensure_ascii=False)
    out.append(f"update public.challenges set data = jsonb_set(jsonb_set(data,'{{optionsPt}}',{q(opts)}::jsonb),'{{microActivity,pt}}',to_jsonb({q(x['turnPt'])}::text)) where id = '{x['id']}' and data->>'correctAnswer' = {q(e['correctAnswer'])} and data->'microActivity'->>'answer' = {q(e['turn_answer'])};")
out.append('commit;')
open('aplicar-opcoes.sql','w').write('\n'.join(out)+'\n')
json.dump({x['id']:{'options':x['optionsEn'],'microActivity':x['turnEn']} for x in sai},open('overlay-en-opcoes.json','w'),ensure_ascii=False,indent=1)
print(len(sai),'itens')
