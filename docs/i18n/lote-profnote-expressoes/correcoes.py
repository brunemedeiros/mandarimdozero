# Correções aprovadas pela autora em 2026-11-24 (docs/voz-falas-jogos-expressoes.md, "Para a autora decidir"):
# 3) tirar o aviso de registro colado ao significado (o selo de registro já explica); 4) correções dos revisores;
# e as falas sem a professora falando de si mesma. Gera aplicar-correcoes.sql (pt, banco) e ajusta o overlay en.
# uso: python3 correcoes.py   (idempotente)
import json
EN = '../challenges-en.json'
def q(s):
    assert '$q$' not in s and '\r' not in s and '\n' not in s
    return '$q$' + s + '$q$'
SUF_PT = [" ⚠️ Registro: familiar — use com amigos e pessoas próximas, evite em contextos formais.",
          " Registro: familiar — use com amigos e pessoas próximas, evite em contextos formais.",
          " ⚠️ Registro: muito familiar/gíria — só com pessoas próximas; evite em contextos formais.",
          " ⚠️ Registro: vulgar — pode ofender. Evite em contextos formais ou com desconhecidos."]
SUF_EN = [" ⚠️ Register: informal — use with friends and people you're close to; avoid in formal settings.",
          " Register: informal — use with friends and people you're close to; avoid in formal settings.",
          " ⚠️ Register: very informal/slang — only with people you're close to; avoid in formal settings.",
          " ⚠️ Register: vulgar — can be offensive. Avoid in formal settings or with strangers."]
FAM = " Registre familier : à utiliser entre amis, pas dans un contexte formel."
# (id, caminho, valor atual, valor novo); caminho = {meaning,pt} | {explanation} | {register} | {literal,pt} | {example,pt}
PT = [
 ('expr-a1m3-002','{meaning,pt}',"De nada; por favor, fique à vontade.","De nada; por favor, pode passar."),
 ('expr-a1m6-002','{meaning,pt}',"Boa noite! Tenha uma boa noite!","Tenha uma boa noite!"),
 ('expr-a2-001','{register}',"familiar","neutral"),
 ('expr-a2-001','{explanation}',"C'est une expression familière pour demander ou proposer de l'aide. Donner un coup de main à quelqu'un, c'est l'aider un peu.","C'est une expression courante pour demander ou proposer de l'aide. Donner un coup de main à quelqu'un, c'est l'aider un peu."),
 ('expr-a1m5-003','{explanation}',"« Bienvenue » = « bien » + « venue » : arrivée bienvenue.","« Bienvenue » ne change pas au masculin ou au féminin quand il est seul."),
 ('expr-a1m6-005','{explanation}',"« Ça fait » + durée = depuis combien de temps quelque chose arrive.","« Ça fait » + durée, pour dire combien de temps a passé : ça fait deux ans."),
 ('expr-lote3-007','{register}',"familiar","neutral"),
 ('expr-lote3-007','{explanation}',"« C'est génial » veut dire que quelque chose est super. On le dit quand on est content."+FAM,"« C'est génial » veut dire que quelque chose est super. On le dit quand on est content."),
 ('expr-lote1-003','{register}',"vulgar","slang"),
 ('expr-lote2-002','{register}',"familiar","slang"),
 ('expr-002','{meaning,pt}',"Significa incomodar ou irritar muito alguém.","Incomodar ou irritar muito alguém; encher o saco."),
 ('expr-001','{meaning,pt}',"Sentir-se mal, ter dor de cabeça após ter bebido muito álcool.","Estar de ressaca."),
 ('expr-lote1-008','{literal,pt}',"jogar o acampamento","levantar acampamento (com um verbo vulgar)"),
 ('expr-lote2-009','{literal,pt}',"pare com o seu exagero","para com a sua carroça"),
 ('expr-lote3-001','{explanation}',"On dit « ça vaut le coup » quand une chose mérite le temps, l'effort ou l'argent qu'elle demande."+FAM,"On dit « ça vaut le coup » quand une chose mérite le temps, l'effort ou l'argent qu'elle demande."),
 ('expr-lote3-013','{register}',"familiar","slang"),
 ('expr-lote3-016','{meaning,pt}',"caramba / droga (interjeição forte)","droga / que merda (interjeição forte)"),
 ('expr-lote3-018','{meaning,pt}',"seu idiota (insulto)","seu babaca / seu imbecil (insulto)"),
 ('expr-lote3-018','{example,pt}','"Seu idiota, olha por onde anda!"','"Seu babaca, olha por onde anda!"'),
 ('expr-lote2-006','{explanation}',"« Être bourré », c'est être ivre. On l'entend surtout entre jeunes, après une soirée. Registre très familier : seulement avec des proches.","« Être bourré », c'est être ivre. On l'entend souvent après une soirée. Registre très familier : seulement avec des proches."),
 ('expr-lote4-013','{explanation}',"« Tirer la gueule », c'est montrer qu'on est mécontent en faisant une tête fermée, sans parler beaucoup. Registre vulgaire : peut choquer, à éviter dans un contexte formel ou avec des inconnus.","« Tirer la gueule », c'est montrer qu'on est mécontent en faisant une tête fermée, sans parler beaucoup."+FAM),
 ('expr-b2-001','{meaning,pt}',"Esclarecer todos os detalhes, ser preciso sobre todos os aspectos de uma situação ou acordo.","Deixar tudo bem claro, sem margem para dúvida."),
 ('expr-b2-001','{explanation}',"Cette expression signifie qu'il faut finaliser les choses en précisant tous les éléments importants pour éviter toute ambiguïté.","Cette expression signifie s'expliquer clairement, sans ambiguïté, souvent avec fermeté."),
 ('expr-lote4-016','{register}',"familiar","neutral"),
 ('expr-lote4-016','{explanation}',"« Il pleut des cordes » décrit une pluie très forte, comme si l'eau tombait en lignes continues."+FAM,"« Il pleut des cordes » décrit une pluie très forte, comme si l'eau tombait en lignes continues."),
 ('expr-b2-003','{register}',"familiar","neutral"),
 ('expr-b2-003','{meaning,pt}',"Agir com muita força, energia, sem hesitação, de forma muito direta ou virulenta.","Agir com muita força e energia, sem pegar leve."),
 ('expr-lote4-012','{register}',"slang","vulgar"),
]
EN_FIX = [  # (id, campo do overlay, atual, novo); 'meaning' é comparado já sem o aviso de registro
 ('expr-a1m3-002','meaning',"You're welcome; please, make yourself at home.","You're welcome; please, go ahead."),
 ('expr-002','meaning',"Means to bother or really irritate someone; to get on someone's nerves.","To bother or really irritate someone; to get on someone's nerves."),
 ('expr-001','meaning',"To feel sick and have a headache after drinking too much alcohol; to be hungover.","To be hungover."),
 ('expr-lote1-008','literal',"to throw the camp","to break camp (with a vulgar verb)"),
 ('expr-lote1-008','meaning',"to get out / to clear off","to get out / to get the hell out"),
 ('expr-lote2-009','literal',"stop your exaggeration","stop your chariot"),
 ('expr-lote3-019','meaning',"jerk (insult)","jerk / asshole (insult)"),
 ('expr-lote4-011','meaning',"you're driving me crazy / you're a pain in the neck","you're pissing me off / you're a pain in the ass"),
 ('expr-b2-001','meaning',"To clarify all the details; to be precise about every aspect of a situation or agreement.","To set the record straight; to make everything perfectly clear."),
 ('expr-b2-003','meaning',"To act with great force and energy, without holding back, in a very direct or forceful way.","To act with great force and energy, without holding back."),
]
FALAS = {  # profNote sem a professora falar de si (2026-11-24) e "ça craint" (todas as idades)
 'expr-a1m1-001': ("Homem escreve {enchanté}, mulher escreve {enchantée}, e o som é o mesmo.","Men write {enchanté}, women write {enchantée}, and they sound the same."),
 'expr-lote2-005': ("É informal e concorda com quem fala: uma mulher diz {je suis crevée}. Num pneu, {crevé} é furado.","It's casual and agrees with the speaker: a woman says {je suis crevée}. On a tire, {crevé} means flat."),
 'expr-lote4-006': ("Informal e bem comum. Concorda com quem fala: uma mulher diz {je suis fauchée}, com o \"e\" do feminino.","Casual and very common. It agrees with the speaker: a woman says {je suis fauchée}."),
 'expr-lote1-005': ("Muito comum no dia a dia. Também diz que um lugar é perigoso: {ce quartier craint}.","Very common in everyday speech. It can also mean a place is sketchy: {ce quartier craint}."),
}
# 1) falas
ff = json.load(open('falas-final.json'))
for x in ff:
    if x['id'] in FALAS: x['pt'], x['en'] = FALAS[x['id']]
json.dump(ff, open('falas-final.json', 'w'), ensure_ascii=False, indent=1)
# 2) SQL pt
out = ['-- Correções de 2026-11-24 (aprovadas pela autora). Guarda: cada troca só acontece se o texto atual for o esperado.', 'begin;',
       '-- aviso de registro colado ao significado (65 itens): sai; o selo de registro da tela já explica']
e = "data->'meaning'->>'pt'"
for s in SUF_PT: e = f"replace({e},{q(s)},'')"
out.append(f"update public.challenges set data = jsonb_set(data,'{{meaning,pt}}',to_jsonb({e})) where type='expression' and data->'meaning'->>'pt' like '%Registro:%';")
for i, path, old, new in PT:
    cur = "data->>'" + path.strip('{}') + "'" if ',' not in path else "data#>>'" + path + "'"
    out.append(f"update public.challenges set data = jsonb_set(data,'{path}',to_jsonb({q(new)}::text)) where id='{i}' and {cur} = {q(old)};")
out.append('commit;')
open('aplicar-correcoes.sql', 'w').write('\n'.join(out) + '\n')
# 3) overlay en
d = json.load(open(EN)); n = 0
for i, v in d.items():
    if isinstance(v, dict) and isinstance(v.get('meaning'), str):
        m = v['meaning']
        for s in SUF_EN: m = m.replace(s, '')
        if m != v['meaning']: v['meaning'] = m; n += 1
for i, k, old, new in EN_FIX:
    if d[i].get(k) == new: continue
    assert d[i].get(k) == old, (i, k, d[i].get(k)); d[i][k] = new
for i, (pt, en) in FALAS.items(): d[i]['profNote'] = en
json.dump(d, open(EN, 'w'), ensure_ascii=False, indent=1); open(EN, 'a').write('\n')
print('avisos en removidos:', n, '| trocas pt:', len(PT), '| trocas en:', len(EN_FIX))
