import re,json
IC=json.load(open('../build/icons.json'))
def ico(n,size=None):
    s=IC[n]
    if size: s=s.replace('width="20"','width="%d"'%size).replace('height="20"','height="%d"'%size)
    return '<span class="ico" aria-hidden="true">%s</span>'%s
NAV=["Alunos","Decks e cartões","Materiais de apoio","Relatórios","Notificações","Configurações","Guia de estilo"]

class Lib:
    key=''; libs=[]; native=set(); extra_css=''
    def nav(self,active): raise NotImplementedError
    def shell(self,active,inner): raise NotImplementedError
    def srcTag(self,k): return '<span class="src native">Nativo</span>' if k in self.native else '<span class="src">Feito à mão</span>'

class Pico(Lib):
    key='pico'; libs=['pico.css']; native={'botoes','campos','progresso','modal','cartao'}
    extra_css='''.warn{--pico-background-color:var(--b-warn);--pico-border-color:var(--b-warn);--pico-color:var(--b-on-vivid)}
.chip.info{background:var(--b-primary-dark);color:#fff}.chip.neutral{background:var(--b-line);color:var(--b-ink)}
.callout.ok{background:color-mix(in srgb,var(--b-ok) 14%,var(--b-bg));border-color:color-mix(in srgb,var(--b-ok) 45%,transparent)}.callout.err{background:color-mix(in srgb,var(--b-err) 12%,var(--b-bg));border-color:color-mix(in srgb,var(--b-err) 45%,transparent)}.callout.info{background:color-mix(in srgb,var(--b-primary) 14%,var(--b-bg));border-color:color-mix(in srgb,var(--b-primary) 45%,transparent)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--b-line);margin:0}.tabs a{padding:.5rem .9rem;text-decoration:none;font-weight:700;color:var(--b-ink-soft);border-bottom:3px solid transparent}.tabs a[aria-current]{color:var(--b-ink);border-color:var(--b-primary)}
article{margin:0}article>header,article>footer{margin-inline:calc(var(--pico-block-spacing-horizontal)*-1)}
.main label{margin:0}.main fieldset{margin:0}.main input,.main select,.main textarea{margin-bottom:0}.main input[type=checkbox],.main input[type=radio]{margin-right:.5rem}
.stack label{display:block}.who-big .av{width:4rem;height:4rem;font-size:1.2rem}
.modalbox{max-width:440px;box-shadow:var(--b-shadow)}.main input[type=checkbox],.main input[type=radio]{width:1.25em;height:1.25em;flex:none}.tabs a{padding:.5rem .6rem}
'''
    def btn(self,l,k='primary',sm=False):
        c={'primary':'','outline':'outline','ghost':'outline secondary','secondary':'secondary','warn':'warn','disabled':''}[k]
        if sm: c+=' sm'
        return '<button class="%s"%s>%s</button>'%(c.strip(),' disabled' if k=='disabled' else '',l)
    def badge(self,l,t='ok'): return '<span class="chip %s">%s</span>'%({'stop':'stop','warn':'warn','ok':'ok','info':'info','neutral':'neutral'}[t],l)
    def progress(self,v): return '<progress value="%d" max="100" style="width:100%%"></progress>'%v
    def alert(self,h,t='warn',act=''): return '<div class="callout %s"><span>%s</span>%s</div>'%({'warn':'','ok':'ok','stop':'err','info':'info'}[t],h,act)
    def text(self,i,l,ph): return '<label>%s<input id="%s" placeholder="%s"></label>'%(l,i,ph)
    def select(self,i,l,o): return '<label>%s<select id="%s">%s</select></label>'%(l,i,''.join('<option>%s</option>'%x for x in o))
    def check(self,l,c=False): return '<label><input type="checkbox"%s> %s</label>'%(' checked' if c else '',l)
    def radio(self,n,l,c=False): return '<label><input type="radio" name="%s"%s> %s</label>'%(n,' checked' if c else '',l)
    def switch(self,l,c=False): return '<label><input type="checkbox" role="switch"%s> %s</label>'%(' checked' if c else '',l)
    def textarea(self,i,l,ph): return '<label>%s<textarea id="%s" rows="3" placeholder="%s"></textarea></label>'%(l,i,ph)
    def card(self,t,body,foot=''): return '<article><header><strong>%s</strong></header>%s%s</article>'%(t,body,'<footer>%s</footer>'%foot if foot else '')
    def avatar(self,i,big=False): return '<span class="av">%s</span>'%i
    def tabs(self,ls,a=0): return '<nav class="tabs">%s</nav>'%''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==a else '',l) for i,l in enumerate(ls))
    def modal(self,t,body,acts): return '<article class="modalbox"><header><strong>%s</strong></header>%s<footer class="wrapx" style="justify-content:flex-end">%s</footer></article>'%(t,body,acts)
    def nav(self,a): return ''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==a else '',x) for i,x in enumerate(NAV))
    def shell(self,a,inner): return '<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div class="who2">Brune · conta admin</div></aside><main class="main">%s</main></div>'%(self.nav(a),inner)
    def h1(self,t,sub): return '<div class="head"><div><div class="eyebrow">Painel da professora</div><h1>%s</h1><small>%s</small></div>%s</div>'
    def ring(self,v,t,s): return '<div class="ring" style="--v:%d"><b>%s<small>%s</small></b></div>'%(v,t,s)

class Daisy(Lib):
    key='daisyui'; libs=['daisyui.css']; native={'botoes','campos','selos','progresso','alerta','abas','modal','cartao','avatar','anel'}
    extra_css='''.w-full{width:100%}.stack .fieldset,.stack label{width:100%}.stack .input,.stack .select,.stack .textarea{width:100%}.who-big .avatar>div{width:4rem}.modal-box{box-shadow:var(--b-shadow)}
.radial-progress{--thickness:11px;color:var(--b-primary)}.card-title{font-family:var(--b-font-display);font-weight:800}.modal-box{opacity:1!important;translate:none!important;scale:1!important;pointer-events:auto!important;background:var(--b-raised);color:var(--b-ink);border:1px solid var(--b-line)}.alert{color:var(--b-ink)}.alert-success{background:color-mix(in srgb,var(--b-ok) 16%,var(--b-bg))}.alert-warning{background:color-mix(in srgb,var(--b-warn) 16%,var(--b-bg))}.alert-error{background:color-mix(in srgb,var(--b-err) 14%,var(--b-bg))}.alert-info{background:color-mix(in srgb,var(--b-primary) 16%,var(--b-bg))}.alert-soft{border-color:var(--b-line)}'''
    def btn(self,l,k='primary',sm=False):
        c={'primary':'btn-primary','outline':'btn-outline','ghost':'btn-ghost','secondary':'btn-secondary','warn':'btn-warning','disabled':'btn-primary btn-disabled'}[k]
        return '<button class="btn %s%s">%s</button>'%(c,' btn-sm' if sm else '',l)
    def badge(self,l,t='ok'): return '<span class="badge %s">%s</span>'%({'stop':'badge-error','warn':'badge-warning','ok':'badge-success','info':'badge-info','neutral':'badge-neutral'}[t],l)
    def progress(self,v): return '<progress class="progress progress-primary w-full" value="%d" max="100"></progress>'%v
    def alert(self,h,t='warn',act=''): return '<div role="alert" class="alert alert-soft %s"><span>%s</span>%s</div>'%({'warn':'alert-warning','ok':'alert-success','stop':'alert-error','info':'alert-info'}[t],h,act)
    def text(self,i,l,ph): return '<fieldset class="fieldset"><legend class="fieldset-legend">%s</legend><input id="%s" class="input" placeholder="%s"></fieldset>'%(l,i,ph)
    def select(self,i,l,o): return '<fieldset class="fieldset"><legend class="fieldset-legend">%s</legend><select id="%s" class="select">%s</select></fieldset>'%(l,i,''.join('<option>%s</option>'%x for x in o))
    def check(self,l,c=False): return '<label class="hbox" style="gap:.5rem"><input type="checkbox" class="checkbox checkbox-primary"%s> %s</label>'%(' checked' if c else '',l)
    def radio(self,n,l,c=False): return '<label class="hbox" style="gap:.5rem"><input type="radio" name="%s" class="radio radio-primary"%s> %s</label>'%(n,' checked' if c else '',l)
    def switch(self,l,c=False): return '<label class="hbox" style="gap:.5rem"><input type="checkbox" class="toggle toggle-primary"%s> %s</label>'%(' checked' if c else '',l)
    def textarea(self,i,l,ph): return '<fieldset class="fieldset"><legend class="fieldset-legend">%s</legend><textarea id="%s" class="textarea" rows="3" placeholder="%s"></textarea></fieldset>'%(l,i,ph)
    def card(self,t,body,foot=''): return '<div class="card"><div class="card-body"><h3 class="card-title">%s</h3>%s%s</div></div>'%(t,body,'<div class="card-actions justify-end">%s</div>'%foot if foot else '')
    def avatar(self,i,big=False): return '<div class="avatar avatar-placeholder"><div class="bg-neutral text-neutral-content w-10 rounded-full"><span class="text-xs">%s</span></div></div>'%i
    def tabs(self,ls,a=0): return '<div role="tablist" class="tabs tabs-box">%s</div>'%''.join('<a role="tab" class="tab%s">%s</a>'%(' tab-active' if i==a else '',l) for i,l in enumerate(ls))
    def modal(self,t,body,acts): return '<div class="modal-box" style="max-width:440px"><h3 class="card-title">%s</h3><div style="margin:.6rem 0 1rem">%s</div><div class="modal-action" style="margin:0">%s</div></div>'%(t,body,acts)
    def nav(self,a): return '<ul class="menu">%s</ul>'%''.join('<li><a%s>%s</a></li>'%(' class="menu-active"' if i==a else '',x) for i,x in enumerate(NAV))
    def shell(self,a,inner): return '<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div style="margin-top:auto;padding:.8rem;font-size:.85rem;opacity:.7">Brune · conta admin</div></aside><main class="main">%s</main></div>'%(self.nav(a),inner)
    def ring(self,v,t,s): return '<div class="radial-progress" style="--value:%d;--size:7rem" role="progressbar"><b style="color:var(--b-ink)">%s<small style="display:block;font-size:.7rem;font-weight:700;opacity:.7">%s</small></b></div>'%(v,t,s)

class Tabler(Lib):
    key='tabler'; libs=['tabler.css']; native={'botoes','campos','selos','progresso','alerta','abas','modal','cartao','avatar'}
    extra_css='''.stack .form-control,.stack .form-select{width:100%}.who-big .avatar{--tblr-avatar-size:4rem}.modal-content{display:block;position:static;background:var(--b-raised);border:1px solid var(--b-line);border-radius:14px;box-shadow:var(--b-shadow);max-width:440px}.modal-footer{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.modal-header,.modal-footer{border-color:var(--b-line)}
.mb-0{margin-bottom:0}.nav-tabs .nav-link{color:var(--b-ink-soft);font-weight:700}.nav-tabs .nav-link.active{color:var(--b-ink);background:transparent;border-bottom-color:var(--b-primary)}
:root:root:root{--tblr-info:var(--b-primary-dark)}.card-title{font-family:var(--b-font-display);font-weight:800}.badge.bg-info{color:#fff}.badge.bg-secondary{color:var(--b-ink);background:var(--b-line)!important}'''
    def btn(self,l,k='primary',sm=False):
        c={'primary':'btn-primary','outline':'btn-outline-primary','ghost':'btn-ghost-secondary','secondary':'','warn':'btn-warning','disabled':'btn-primary disabled'}[k]
        return '<button class="btn %s%s">%s</button>'%(c,' btn-sm' if sm else '',l)
    def badge(self,l,t='ok'): return '<span class="badge %s">%s</span>'%({'stop':'bg-danger','warn':'bg-warning','ok':'bg-success','info':'bg-info','neutral':'bg-secondary'}[t],l)
    def progress(self,v): return '<div class="progress progress-sm"><div class="progress-bar" style="width:%d%%"></div></div>'%v
    def alert(self,h,t='warn',act=''): return '<div class="alert %s mb-0" role="alert"><div class="hbox" style="justify-content:space-between;width:100%%"><span>%s</span>%s</div></div>'%({'warn':'alert-warning','ok':'alert-success','stop':'alert-danger','info':'alert-info'}[t],h,act)
    def text(self,i,l,ph): return '<div><label class="form-label" for="%s">%s</label><input id="%s" class="form-control" placeholder="%s"></div>'%(i,l,i,ph)
    def select(self,i,l,o): return '<div><label class="form-label" for="%s">%s</label><select id="%s" class="form-select">%s</select></div>'%(i,l,i,''.join('<option>%s</option>'%x for x in o))
    def check(self,l,c=False): return '<label class="form-check"><input class="form-check-input" type="checkbox"%s><span class="form-check-label">%s</span></label>'%(' checked' if c else '',l)
    def radio(self,n,l,c=False): return '<label class="form-check"><input class="form-check-input" type="radio" name="%s"%s><span class="form-check-label">%s</span></label>'%(n,' checked' if c else '',l)
    def switch(self,l,c=False): return '<label class="form-check form-switch"><input class="form-check-input" type="checkbox"%s><span class="form-check-label">%s</span></label>'%(' checked' if c else '',l)
    def textarea(self,i,l,ph): return '<div><label class="form-label" for="%s">%s</label><textarea id="%s" class="form-control" rows="3" placeholder="%s"></textarea></div>'%(i,l,i,ph)
    def card(self,t,body,foot=''): return '<div class="card"><div class="card-header"><h3 class="card-title">%s</h3></div><div class="card-body">%s</div>%s</div>'%(t,body,'<div class="card-footer"><div class="hbox" style="justify-content:flex-end">%s</div></div>'%foot if foot else '')
    def avatar(self,i,big=False): return '<span class="avatar">%s</span>'%i
    def tabs(self,ls,a=0): return '<ul class="nav nav-tabs">%s</ul>'%''.join('<li class="nav-item"><a class="nav-link%s" href="#">%s</a></li>'%(' active' if i==a else '',l) for i,l in enumerate(ls))
    def modal(self,t,body,acts): return '<div class="modal-content"><div class="modal-header"><h5 class="modal-title">%s</h5></div><div class="modal-body">%s</div><div class="modal-footer">%s</div></div>'%(t,body,acts)
    def nav(self,a): return '<ul class="nav flex-column">%s</ul>'%''.join('<li class="nav-item"><a class="nav-link%s" href="#">%s</a></li>'%(' active' if i==a else '',x) for i,x in enumerate(NAV))
    def shell(self,a,inner): return '<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div class="text-secondary small" style="margin-top:auto;padding:.8rem">Brune · conta admin</div></aside><main class="main">%s</main></div>'%(self.nav(a),inner)
    def ring(self,v,t,s): return '<div class="ring" style="--v:%d"><b>%s<small>%s</small></b></div>'%(v,t,s)

class Open(Lib):
    key='open-props'; libs=['open-props.css','open-props-normalize.css']; native=set()
    extra_css='''.btn.disabled{opacity:.5;pointer-events:none}.btn.secondary{background:var(--b-surface);color:var(--b-ink);border-color:var(--b-line)}
.chip.info{background:var(--b-primary-dark);color:#fff}.chip.neutral{background:var(--b-line);color:var(--b-ink)}
.callout.ok{background:color-mix(in srgb,var(--b-ok) 14%,var(--b-bg));border-color:color-mix(in srgb,var(--b-ok) 45%,transparent)}.callout.err{background:color-mix(in srgb,var(--b-err) 12%,var(--b-bg));border-color:color-mix(in srgb,var(--b-err) 45%,transparent)}.callout.info{background:color-mix(in srgb,var(--b-primary) 14%,var(--b-bg));border-color:color-mix(in srgb,var(--b-primary) 45%,transparent)}
.tabs{display:flex;gap:4px;border-block-end:1px solid var(--b-line)}.tabs a{padding:var(--size-2) var(--size-3);text-decoration:none;font-weight:var(--font-weight-7);color:var(--b-ink-soft);border-block-end:3px solid transparent}.tabs a[aria-current]{color:var(--b-ink);border-color:var(--b-primary)}
.lbl{display:grid;gap:var(--size-1);font-weight:var(--font-weight-7)}.stack .field{width:100%}.chk{display:flex;align-items:center;gap:var(--size-2)}.chk input{accent-color:var(--b-primary);inline-size:1.1rem;block-size:1.1rem}
.who-big .av{inline-size:4rem;block-size:4rem;font-size:var(--font-size-2)}.modalbox{max-width:440px;padding:var(--size-4);display:grid;gap:var(--size-3)}.modalbox .btn{padding:var(--size-1) var(--size-3)}.card-pad{padding:var(--size-4)}.card-pad>h3{margin:0 0 var(--size-3);font:var(--font-weight-8) var(--font-size-2) var(--b-font-display)}'''
    def btn(self,l,k='primary',sm=False):
        c={'primary':'','outline':'line','ghost':'ghost','secondary':'secondary','warn':'warn','disabled':'disabled'}[k]
        return '<button class="btn %s%s">%s</button>'%(c,' sm' if sm else '',l)
    def badge(self,l,t='ok'): return '<span class="chip %s">%s</span>'%({'stop':'stop','warn':'warn','ok':'ok','info':'info','neutral':'neutral'}[t],l)
    def progress(self,v): return '<div class="bar" style="display:block;inline-size:100%%"><i style="width:%d%%"></i></div>'%v
    def alert(self,h,t='warn',act=''): return '<div class="callout %s"><span>%s</span>%s</div>'%({'warn':'','ok':'ok','stop':'err','info':'info'}[t],h,act)
    def text(self,i,l,ph): return '<label class="lbl">%s<input id="%s" class="field" placeholder="%s"></label>'%(l,i,ph)
    def select(self,i,l,o): return '<label class="lbl">%s<select id="%s" class="field">%s</select></label>'%(l,i,''.join('<option>%s</option>'%x for x in o))
    def check(self,l,c=False): return '<label class="chk"><input type="checkbox"%s> %s</label>'%(' checked' if c else '',l)
    def radio(self,n,l,c=False): return '<label class="chk"><input type="radio" name="%s"%s> %s</label>'%(n,' checked' if c else '',l)
    def switch(self,l,c=False): return '<label class="switch"><input type="checkbox"%s> %s</label>'%(' checked' if c else '',l)
    def textarea(self,i,l,ph): return '<label class="lbl">%s<textarea id="%s" class="field" rows="3" placeholder="%s"></textarea></label>'%(l,i,ph)
    def card(self,t,body,foot=''): return '<div class="card card-pad"><h3>%s</h3>%s%s</div>'%(t,body,'<div class="wrapx" style="justify-content:flex-end;margin-top:var(--size-3)">%s</div>'%foot if foot else '')
    def avatar(self,i,big=False): return '<span class="av">%s</span>'%i
    def tabs(self,ls,a=0): return '<nav class="tabs">%s</nav>'%''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==a else '',l) for i,l in enumerate(ls))
    def modal(self,t,body,acts): return '<div class="card modalbox"><strong>%s</strong>%s<div class="wrapx" style="justify-content:flex-end">%s</div></div>'%(t,body,acts)
    def nav(self,a): return ''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==a else '',x) for i,x in enumerate(NAV))
    def shell(self,a,inner): return '<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div style="margin-top:auto;padding:var(--size-3)"><small>Brune · conta admin</small></div></aside><main class="main">%s</main></div>'%(self.nav(a),inner)
    def ring(self,v,t,s): return '<div class="ring" style="--v:%d"><b>%s<small>%s</small></b></div>'%(v,t,s)

# ---------- composições compartilhadas ----------
def week():
    return '<div class="week">%s</div>'%''.join('<span class="%s">%s</span>'%(c,d) for d,c in zip("SDTQQSS".replace("SDTQQSS","STQQSSD"),["on","on","on","on","on","today",""]))
def streak(n): return '<span class="streak">%s%s</span>'%(ico('Flame',20),n)
def xp(): return '<div class="xp"><div class="xp-top"><span>Nível 7</span><span>3.420 de 4.000 XP</span></div><div class="xp-bar"><i style="width:85%"></i></div></div>'
ACH=[("Flame","Sequência de 21 dias","Conquistada",1),("Star","100 cartões no mês","Conquistada",1),("Target","Meta diária 10 vezes","Conquistada",1),("BookOpen","Módulo 4 concluído","Conquistada",1),("Trophy","Retenção acima de 90%","Falta 1 semana",0),("Zap","500 cartões revisados","312 de 500",0)]
def achv(): return '<div class="achv">%s</div>'%''.join('<div class="ach%s"><span class="badge-ico">%s</span><strong>%s</strong><small>%s</small></div>'%('' if on else ' lock',ico(i if on else 'Lock' if i!='Trophy' and i!='Zap' else i,24),t,s) for i,t,s,on in ACH)
def rank(L): return '<ul class="rank">%s</ul>'%''.join('<li><span class="pos">%d</span>%s<strong>%s</strong><span class="xpn num">%s XP</span></li>'%(i+1,L.avatar(a),n,x) for i,(a,n,x) in enumerate([("CF","Camila Ferraz","4.810"),("MA","Marina Alves","3.420"),("RC","Rafael Costa","2.250")]))

def aluno_page(L):
    stats=''.join(L.card(t,'<div class="v num" style="font:800 2rem/1.1 var(--b-font-display)">%s</div><small>%s</small>'%(v,d)) for t,v,d in [("Sequência","23 dias","recorde: 41 dias"),("XP total","3.420","580 para o nível 8"),("Cartões hoje","48","meta de 60"),("Retenção","91%","últimos 30 dias")])
    inner='''<div class="head"><div class="who-big">%s<div><div class="eyebrow">Aluna</div><h1>Marina Alves</h1><small>@marina.alves · <span data-lang-name>Francês</span> A2 · Módulo 4</small></div></div><div class="wrapx">%s %s</div></div>
<div class="stats4">%s</div>
<div class="cols2">%s%s</div>
%s
<div class="gal">%s%s</div>'''%(
 L.avatar("MA"),L.btn("Enviar mensagem",'outline'),L.btn("Ver cartões"),stats,
 L.card("Meta do dia",'<div class="wrapx" style="gap:20px">%s<div class="stack">%s%s</div></div>'%(L.ring(80,"48/60","cartões"),streak("23 dias"),week()),''),
 L.card("Nível e conquistas",'<div class="stack">%s%s</div>'%(xp(),achv()),''),
 L.card("Atividade recente",'<ul class="list">%s</ul>'%''.join('<li><span>%s</span>%s</li>'%(a,L.badge(b,t)) for a,b,t in [("Hoje · 48 cartões revisados","Em dia",'ok'),("Ontem · Ditado do módulo 4","Acertou 8 de 10",'info'),("Há 2 dias · Checkpoint do módulo 3","Aprovada",'ok'),("Há 5 dias · Ouça e traduza","Acertou 5 de 10",'warn')]),''),
 L.card("Anotação da professora",'<div class="stack">%s</div>'%L.textarea("nota","Lembrete para a próxima aula","Ex.: reforçar os verbos do passé composé"),L.btn("Salvar anotação")),
 L.card("Ranking da turma",rank(L),''))
    return L.shell(0,inner)

def sect(L,k,title,body): return '<section class="gal-item">%s</section>'%L.card('%s %s'%(title,L.srcTag(k)),body)
def comp_page(L):
    S=[]
    S.append(sect(L,'botoes','Botões','<div class="wrapx">%s%s%s%s%s%s</div>'%(L.btn("Primário"),L.btn("Secundário",'secondary'),L.btn("Contorno",'outline'),L.btn("Texto",'ghost'),L.btn("Atenção",'warn'),L.btn("Desabilitado",'disabled'))))
    S.append(sect(L,'campos','Campos','<div class="stack">%s%s%s</div>'%(L.text("c1","Nome do aluno","Ex.: Marina Alves"),L.select("c2","Idioma",["Francês","Mandarim"]),L.textarea("c3","Mensagem","Escreva um recado"))))
    S.append(sect(L,'campos','Seleção','<div class="stack">%s%s<div class="wrapx">%s%s</div>%s%s</div>'%(L.check("Receber lembretes",True),L.check("Resumo semanal"),L.radio("n","Todos",True),L.radio("n","Só atenção"),L.switch("Notificações por e-mail",True),L.switch("Modo escuro"))))
    S.append(sect(L,'selos','Selos de situação','<div class="wrapx">%s%s%s%s%s</div>'%(L.badge("Em dia",'ok'),L.badge("Atenção",'warn'),L.badge("Parado",'stop'),L.badge("Novo",'info'),L.badge("Rascunho",'neutral'))))
    S.append(sect(L,'progresso','Progresso','<div class="stack">%s%s%s</div>'%(L.progress(91),L.progress(62),L.progress(25))))
    S.append(sect(L,'alerta','Alertas','<div class="stack">%s%s%s%s</div>'%(L.alert("Cartões salvos com sucesso.",'ok'),L.alert("3 alunos estão parados há mais de 7 dias.",'warn'),L.alert("Não foi possível salvar. Tente de novo.",'stop'),L.alert("Novo módulo disponível no francês A2.",'info'))))
    S.append(sect(L,'abas','Abas','<div class="stack">%s<small>Conteúdo da aba selecionada.</small></div>'%L.tabs(["Resumo","Cartões","Atividade"],0)))
    S.append(sect(L,'avatar','Avatares','<div class="wrapx">%s%s%s%s</div>'%tuple(L.avatar(x) for x in ["MA","RC","HD","TN"])))
    S.append(sect(L,'modal','Janela de confirmação',L.modal("Remover o vínculo com a aluna?","<p style='margin:0'>O progresso dela continua guardado. Você pode vincular de novo depois.</p>",L.btn("Cancelar",'outline')+L.btn("Remover",'warn'))))
    S.append(sect(L,'anel','Gamificação: meta e sequência','<div class="wrapx" style="gap:20px">%s<div class="stack">%s%s</div></div>'%(L.ring(80,"48/60","cartões"),streak("23 dias"),week())))
    S.append(sect(L,'xp','Gamificação: nível','<div class="stack">%s</div>'%xp()))
    S.append(sect(L,'conq','Gamificação: conquistas',achv()))
    inner='''<div class="head"><div><div class="eyebrow">Guia de estilo</div><h1>Componentes</h1><small>Catálogo da tela, para comparar com o do shadcn · <span class="src native">Nativo</span> = vem na biblioteca, <span class="src">Feito à mão</span> = escrevi aqui</small></div></div><div class="gal">%s</div>'''%''.join(S)
    return L.shell(6,inner)

HEAD='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap">
%s<link rel="stylesheet" href="brune.css"><link rel="stylesheet" href="game.css"><style>%s</style><script src="bridge.js"></script></head><body>'''
for L in [Pico(),Daisy(),Tabler(),Open()]:
    base=open('out/%s.html'%L.key).read()
    css=re.search(r'<style>(.*?)</style>',base,re.S).group(1)+L.extra_css
    links=''.join('<link rel="stylesheet" href="vendor/%s">'%x for x in L.libs)
    for suffix,fn in (('-aluno',aluno_page),('-componentes',comp_page)):
        open('out/%s%s.html'%(L.key,suffix),'w').write(HEAD%(L.key+suffix,links,css)+fn(L)+'</body></html>')
print('ok')
