import html
S=[("Marina Alves","marina.alves","MA","A2","Módulo 4",23,"hoje",91,"ok"),
("Rafael Costa","rafa.costa","RC","A1","Módulo 2",4,"ontem",84,"ok"),
("Helena Duarte","helena.d","HD","B1","Módulo 7",0,"há 9 dias",72,"stop"),
("Tiago Nunes","tiagonunes","TN","A1","Módulo 1",2,"há 3 dias",78,"warn"),
("Camila Ferraz","cafer","CF","A2","Módulo 5",41,"hoje",95,"ok"),
("Bruno Teles","brunot","BT","A1","Módulo 3",0,"há 12 dias",66,"stop")]
LBL={"ok":"Em dia","warn":"Atenção","stop":"Parado"}
NAV=["Alunos","Decks e cartões","Materiais de apoio","Relatórios","Notificações","Configurações"]
HEAD='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Noto+Serif+SC:wght@600;700&display=swap">
%s
<link rel="stylesheet" href="brune.css">
<style>%s</style>
<script src="bridge.js"></script></head><body>'''
TAIL='</body></html>'
def page(name,libs,css,body):
    l=''.join('<link rel="stylesheet" href="vendor/%s">'%x for x in libs)
    open('out/%s.html'%name,'w').write(HEAD%("Alunos - "+name,l,css)+body+TAIL)

# ---------- 1. Pico ----------
def pico():
    rows=''.join('''<tr><td><div class="who"><span class="av">%s</span><div><strong>%s</strong><small>@%s</small></div></div></td>
<td>%s <small>%s</small></td><td class="num">%s</td><td>%s</td><td><progress value="%d" max="100"></progress> <small class="num">%d%%</small></td>
<td><span class="chip %s">%s</span></td><td><a href="#" role="button" class="outline secondary sm">Abrir</a></td></tr>'''%(i,n,u,lv,m,("%d dias"%st if st else "zerada"),la,r,r,s,LBL[s]) for n,u,i,lv,m,st,la,r,s in S)
    css='''
:root:root:root{--pico-font-family:var(--b-font);--pico-font-size:100%;--pico-border-radius:10px;--pico-primary:var(--b-primary);--pico-primary-background:var(--b-primary);--pico-primary-underline:var(--b-primary-dark);--pico-primary-hover:var(--b-primary-dark);--pico-primary-hover-background:var(--b-primary-dark);--pico-primary-hover-underline:var(--b-primary-dark);--pico-primary-focus:color-mix(in srgb,var(--b-primary) 35%,transparent);--pico-primary-inverse:var(--b-on-primary);
--pico-background-color:var(--b-bg);--pico-color:var(--b-ink);--pico-muted-color:var(--b-ink-soft);--pico-muted-border-color:var(--b-line);--pico-card-background-color:var(--b-surface);--pico-card-border-color:var(--b-line);--pico-card-box-shadow:var(--b-shadow);--pico-card-sectioning-background-color:var(--b-surface);--pico-form-element-background-color:var(--b-raised);--pico-form-element-border-color:var(--b-line);--pico-form-element-color:var(--b-ink);--pico-form-element-placeholder-color:var(--b-ink-soft);--pico-form-element-active-background-color:var(--b-raised);--pico-form-element-active-border-color:var(--b-primary);--pico-form-element-focus-color:var(--b-primary);--pico-h1-color:var(--b-ink);--pico-h2-color:var(--b-ink);--pico-h3-color:var(--b-ink);--pico-table-border-color:var(--b-line);--pico-table-row-stripped-background-color:color-mix(in srgb,var(--b-surface) 55%,transparent);--pico-secondary:var(--b-ink-soft);--pico-secondary-background:var(--b-ink-soft);--pico-secondary-hover-background:var(--b-ink);--pico-secondary-inverse:var(--b-bg);--pico-switch-checked-background-color:var(--b-primary);--pico-progress-background-color:var(--b-line);--pico-progress-color:var(--b-primary);--pico-mark-background-color:color-mix(in srgb,var(--b-accent) 25%,transparent);--pico-mark-color:var(--b-ink);--pico-block-spacing-vertical:1rem;--pico-block-spacing-horizontal:1.1rem;--pico-form-element-spacing-vertical:.55rem;--pico-form-element-spacing-horizontal:.9rem;--pico-spacing:.75rem}
h1,h2,h3{font-family:var(--b-font-display);font-weight:800}
.side{background:var(--b-surface);border-right:1px solid var(--b-line)}
.side a{display:block;padding:.55rem .8rem;border-radius:10px;text-decoration:none;color:var(--b-ink-soft);font-weight:700}
.side a[aria-current]{background:var(--b-primary);color:var(--b-on-primary)}
.brand{font:800 1.1rem var(--b-font-display);padding:.3rem .8rem 1rem;color:var(--b-ink)}
.side .who2{margin-top:auto;padding:.8rem;color:var(--b-ink-soft);font-size:.85rem}
.main{gap:1.1rem}.main>*{margin:0}
.eyebrow{font-weight:800;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--b-ink-soft)}
.main button,.main [role=button],.main input,.main select{margin:0;width:auto}
.main input[type=search],.main select{min-width:0}
.sm{padding:.3rem .7rem;font-size:.85rem}
article{margin:0}article>*{margin:0}
.stat b{display:block;font:800 2rem/1.1 var(--b-font-display);color:var(--b-ink);margin:.15rem 0}
.stat span{font-size:.85rem;color:var(--b-ink-soft)}
.chip{display:inline-block;padding:.15rem .65rem;border-radius:999px;font-size:.8rem;font-weight:800;color:var(--b-on-vivid)}
.chip.ok{background:var(--b-ok)}.chip.warn{background:var(--b-warn)}.chip.stop{background:var(--b-err)}
.av{display:inline-grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:var(--b-primary-dark);color:#fff;font-weight:800;font-size:.85rem;flex:none}
:root[data-theme=dark] .av{background:var(--b-surface);color:var(--b-ink);outline:1px solid var(--b-line)}
.callout{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:.8rem 1.1rem;border-radius:var(--b-radius);background:color-mix(in srgb,var(--b-warn) 14%,var(--b-bg));border:1px solid color-mix(in srgb,var(--b-warn) 45%,transparent)}
table progress{width:5.5rem;display:inline-block;vertical-align:middle;margin:0;height:.5rem}
table td,table th{vertical-align:middle;white-space:nowrap}
.tools{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}.tools label{margin:0;display:flex;gap:.5rem;align-items:center}
'''
    body='''<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div class="who2">Brune · conta admin</div></aside>
<main class="main">
<div class="head"><div><div class="eyebrow">Painel da professora</div><h1>Alunos de <span data-lang-name>Francês</span></h1><small>18 alunos ativos · dados de exemplo</small></div>
<div class="hbox"><button class="outline secondary">Exportar lista</button><button>Convidar aluno</button></div></div>
<div class="callout"><span><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</span><button class="sm">Enviar lembrete</button></div>
<div class="stats4">
<article class="stat"><span>Alunos ativos</span><b class="num">18</b><span>2 novos este mês</span></article>
<article class="stat"><span>Estudaram hoje</span><b class="num">11</b><span>61%% da turma</span></article>
<article class="stat"><span>Cartões vencidos</span><b class="num">142</b><span>média de 8 por aluno</span></article>
<article class="stat"><span>Parados há 7+ dias</span><b class="num">3</b><span>precisam de atenção</span></article></div>
<div class="tools"><input class="grow" type="search" placeholder="Buscar por nome ou @usuário" aria-label="Buscar aluno"><select aria-label="Idioma"><option>Francês</option><option>Mandarim</option></select><label><input type="checkbox" role="switch"> Só quem precisa de atenção</label></div>
<article class="tablewrap"><table class="striped"><thead><tr><th>Aluno</th><th>Nível</th><th>Sequência</th><th>Atividade</th><th>Retenção</th><th>Situação</th><th></th></tr></thead><tbody>%s</tbody></table></article>
</main></div>'''%(''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==0 else '',x) for i,x in enumerate(NAV)),rows)
    page('pico',['pico.css'],css,body)

# ---------- 2. daisyUI ----------
def daisy():
    bm={'ok':'badge-success','warn':'badge-warning','stop':'badge-error'}
    rows=''.join('''<tr><td><div class="who"><div class="avatar avatar-placeholder"><div class="bg-neutral text-neutral-content w-10 rounded-full"><span class="text-xs">%s</span></div></div><div><div class="font-bold">%s</div><small class="opacity-70">@%s</small></div></div></td>
<td>%s <small class="opacity-70">%s</small></td><td class="num">%s</td><td>%s</td><td><div class="hbox" style="flex-wrap:nowrap"><progress class="progress progress-primary" style="width:5.5rem" value="%d" max="100"></progress><small class="num">%d%%</small></div></td>
<td><span class="badge %s">%s</span></td><td><button class="btn btn-ghost btn-sm">Abrir</button></td></tr>'''%(i,n,u,lv,m,("%d dias"%st if st else "zerada"),la,r,r,bm[s],LBL[s]) for n,u,i,lv,m,st,la,r,s in S)
    css='''
:root:root:root{--color-base-100:var(--b-bg);--color-base-200:var(--b-surface);--color-base-300:var(--b-line);--color-base-content:var(--b-ink);--color-primary:var(--b-primary);--color-primary-content:var(--b-on-primary);--color-secondary:var(--b-accent);--color-secondary-content:var(--b-ink);--color-accent:var(--b-accent);--color-accent-content:var(--b-ink);--color-neutral:var(--b-primary-dark);--color-neutral-content:#fff;--color-info:var(--b-primary-dark);--color-info-content:#fff;--color-success:var(--b-ok);--color-success-content:var(--b-on-vivid);--color-warning:var(--b-warn);--color-warning-content:var(--b-on-vivid);--color-error:var(--b-err);--color-error-content:var(--b-on-vivid);--radius-box:14px;--radius-field:10px;--radius-selector:999px;--depth:0;font-family:var(--b-font)}
body{background:var(--b-bg);color:var(--b-ink);font-family:var(--b-font)}
:root[data-theme=dark] .avatar .bg-neutral{background:var(--b-surface);color:var(--b-ink);outline:1px solid var(--b-line)}
h1{font:800 1.9rem/1.15 var(--b-font-display);margin:0}
.side{background:var(--b-surface);border-right:1px solid var(--b-line)}
.brand{font:800 1.1rem var(--b-font-display);padding:.3rem .8rem 1rem}
.side .menu{width:100%;padding:0}
.eyebrow{font-weight:800;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.card-body{gap:.15rem}.v{font:800 2rem/1.1 var(--b-font-display)}
.grow{width:auto}
.w-10{width:2.5rem}.rounded-full{border-radius:9999px}.avatar-placeholder>div{display:flex;align-items:center;justify-content:center}
.table td,.table th{white-space:nowrap}
.font-bold{font-weight:800}.text-xs{font-size:.75rem}.opacity-70{opacity:.7}
.card{background:var(--b-surface);border:1px solid var(--b-line);box-shadow:var(--b-shadow)}
.table :where(th){font-weight:800}.main .btn{box-shadow:none}
'''
    body='''<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div><ul class="menu">%s</ul><div style="margin-top:auto;padding:.8rem;font-size:.85rem;opacity:.7">Brune · conta admin</div></aside>
<main class="main">
<div class="head"><div><div class="eyebrow">Painel da professora</div><h1>Alunos de <span data-lang-name>Francês</span></h1><small class="opacity-70">18 alunos ativos · dados de exemplo</small></div>
<div class="hbox"><button class="btn btn-outline">Exportar lista</button><button class="btn btn-primary">Convidar aluno</button></div></div>
<div role="alert" class="alert alert-warning alert-soft"><span><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</span><button class="btn btn-sm btn-warning">Enviar lembrete</button></div>
<div class="stats4">
<div class="card"><div class="card-body"><span class="opacity-70 text-xs">Alunos ativos</span><span class="v num">18</span><span class="text-xs opacity-70">2 novos este mês</span></div></div>
<div class="card"><div class="card-body"><span class="opacity-70 text-xs">Estudaram hoje</span><span class="v num">11</span><span class="text-xs opacity-70">61%% da turma</span></div></div>
<div class="card"><div class="card-body"><span class="opacity-70 text-xs">Cartões vencidos</span><span class="v num">142</span><span class="text-xs opacity-70">média de 8 por aluno</span></div></div>
<div class="card"><div class="card-body"><span class="opacity-70 text-xs">Parados há 7+ dias</span><span class="v num">3</span><span class="text-xs opacity-70">precisam de atenção</span></div></div></div>
<div class="hbox"><input class="input grow" type="search" placeholder="Buscar por nome ou @usuário" aria-label="Buscar aluno"><select class="select" style="width:auto" aria-label="Idioma"><option>Francês</option><option>Mandarim</option></select>
<label class="hbox" style="gap:.5rem"><input type="checkbox" class="toggle toggle-primary"> Só quem precisa de atenção</label></div>
<div class="card"><div class="tablewrap"><table class="table"><thead><tr><th>Aluno</th><th>Nível</th><th>Sequência</th><th>Atividade</th><th>Retenção</th><th>Situação</th><th></th></tr></thead><tbody>%s</tbody></table></div></div>
</main></div>'''%(''.join('<li><a%s>%s</a></li>'%(' class="menu-active"' if i==0 else '',x) for i,x in enumerate(NAV)),rows)
    page('daisyui',['daisyui.css'],css,body)

# ---------- 3. Tabler ----------
def tabler():
    bm={'ok':'bg-success','warn':'bg-warning','stop':'bg-danger'}
    rows=''.join('''<tr><td><div class="who"><span class="avatar">%s</span><div><div class="fw-bold">%s</div><div class="text-secondary small">@%s</div></div></div></td>
<td>%s <span class="text-secondary small">%s</span></td><td class="num">%s</td><td>%s</td><td><div class="hbox" style="flex-wrap:nowrap"><div class="progress progress-sm" style="width:5.5rem"><div class="progress-bar" style="width:%d%%"></div></div><span class="small num">%d%%</span></div></td>
<td><span class="badge %s">%s</span></td><td><a href="#" class="btn btn-sm btn-ghost-secondary">Abrir</a></td></tr>'''%(i,n,u,lv,m,("%d dias"%st if st else "zerada"),la,r,r,bm[s],LBL[s]) for n,u,i,lv,m,st,la,r,s in S)
    css='''
:root:root:root{--tblr-font-sans-serif:var(--b-font);--tblr-body-font-family:var(--b-font);--tblr-body-bg:var(--b-bg);--tblr-body-color:var(--b-ink);--tblr-bg-surface:var(--b-surface);--tblr-bg-surface-secondary:var(--b-raised);--tblr-bg-surface-tertiary:var(--b-line);--tblr-border-color:var(--b-line);--tblr-border-color-translucent:var(--b-line);--tblr-secondary:var(--b-ink-soft);--tblr-secondary-color:var(--b-ink-soft);--tblr-text-secondary:var(--b-ink-soft);--tblr-muted:var(--b-ink-soft);--tblr-heading-color:var(--b-ink);--tblr-border-radius:10px;--tblr-border-radius-lg:14px;--tblr-card-border-radius:14px;--tblr-shadow-card:var(--b-shadow);--tblr-primary:var(--b-primary);--tblr-primary-fg:var(--b-on-primary);--tblr-link-color:var(--b-primary-dark);--tblr-success:var(--b-ok);--tblr-warning:var(--b-warn);--tblr-danger:var(--b-err);--tblr-green:var(--b-ok);--tblr-orange:var(--b-warn);--tblr-red:var(--b-err);--tblr-form-control-bg:var(--b-raised)}
:root:root:root{--tblr-primary-rgb:0,0,0}
body{background:var(--b-bg);color:var(--b-ink);font-family:var(--b-font)}
.btn-primary{--tblr-btn-bg:var(--b-primary);--tblr-btn-color:var(--b-on-primary);--tblr-btn-border-color:var(--b-primary);--tblr-btn-hover-bg:var(--b-primary-dark);--tblr-btn-hover-color:#fff;--tblr-btn-hover-border-color:var(--b-primary-dark);--tblr-btn-active-bg:var(--b-primary-dark);--tblr-btn-active-color:#fff;--tblr-btn-active-border-color:var(--b-primary-dark)}
.btn-warning{--tblr-btn-bg:var(--b-warn);--tblr-btn-color:var(--b-on-vivid);--tblr-btn-border-color:var(--b-warn);--tblr-btn-hover-bg:var(--b-warn);--tblr-btn-hover-color:var(--b-on-vivid)}
.progress-bar{background-color:var(--b-primary)}
.badge.bg-success,.badge.bg-warning,.badge.bg-danger{color:var(--b-on-vivid)}
.alert-warning{--tblr-alert-bg:color-mix(in srgb,var(--b-warn) 14%,var(--b-bg));--tblr-alert-border-color:color-mix(in srgb,var(--b-warn) 45%,transparent);--tblr-alert-color:var(--b-ink)}
.avatar{background:var(--b-primary-dark);color:#fff;font-weight:800}
:root[data-theme=dark] .avatar{background:var(--b-surface);color:var(--b-ink)}
h1{font-family:var(--b-font-display);font-weight:800;font-size:1.9rem;margin:0}
.side{background:var(--b-surface);border-right:1px solid var(--b-line)}
.side .nav-link{color:var(--b-ink-soft);font-weight:700;border-radius:10px;padding:.55rem .8rem}
.side .nav-link.active{background:var(--b-primary);color:var(--b-on-primary)}
.brand{font:800 1.1rem var(--b-font-display);padding:.3rem .8rem 1rem}
.eyebrow{font-weight:800;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--b-ink-soft)}
.v{font:800 2rem/1.1 var(--b-font-display)}
.grow{width:auto}
.table thead th{font-weight:800}
.table td,.table th{text-align:start;white-space:nowrap}
'''
    body='''<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div><ul class="nav flex-column">%s</ul><div class="text-secondary small" style="margin-top:auto;padding:.8rem">Brune · conta admin</div></aside>
<main class="main">
<div class="head"><div><div class="eyebrow">Painel da professora</div><h1>Alunos de <span data-lang-name>Francês</span></h1><div class="text-secondary small">18 alunos ativos · dados de exemplo</div></div>
<div class="hbox"><a href="#" class="btn">Exportar lista</a><a href="#" class="btn btn-primary">Convidar aluno</a></div></div>
<div class="alert alert-warning mb-0" role="alert"><div class="hbox" style="justify-content:space-between;width:100%%"><span><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</span><a href="#" class="btn btn-sm btn-warning">Enviar lembrete</a></div></div>
<div class="stats4">
<div class="card"><div class="card-body"><div class="subheader">Alunos ativos</div><div class="v num">18</div><div class="text-secondary small">2 novos este mês</div></div></div>
<div class="card"><div class="card-body"><div class="subheader">Estudaram hoje</div><div class="v num">11</div><div class="text-secondary small">61%% da turma</div></div></div>
<div class="card"><div class="card-body"><div class="subheader">Cartões vencidos</div><div class="v num">142</div><div class="text-secondary small">média de 8 por aluno</div></div></div>
<div class="card"><div class="card-body"><div class="subheader">Parados há 7+ dias</div><div class="v num">3</div><div class="text-secondary small">precisam de atenção</div></div></div></div>
<div class="hbox"><input class="form-control grow" type="search" placeholder="Buscar por nome ou @usuário" aria-label="Buscar aluno"><select class="form-select" style="width:auto" aria-label="Idioma"><option>Francês</option><option>Mandarim</option></select>
<label class="form-check form-switch m-0"><input class="form-check-input" type="checkbox"><span class="form-check-label">Só quem precisa de atenção</span></label></div>
<div class="card"><div class="table-responsive"><table class="table card-table table-vcenter"><thead><tr><th>Aluno</th><th>Nível</th><th>Sequência</th><th>Atividade</th><th>Retenção</th><th>Situação</th><th></th></tr></thead><tbody>%s</tbody></table></div></div>
</main></div>'''%(''.join('<li class="nav-item"><a class="nav-link%s" href="#">%s</a></li>'%(' active' if i==0 else '',x) for i,x in enumerate(NAV)),rows)
    page('tabler',['tabler.css'],css,body)

# ---------- 4. Open Props + CSS próprio ----------
def openprops():
    rows=''.join('''<tr><td><div class="who"><span class="av">%s</span><div><strong>%s</strong><small>@%s</small></div></div></td>
<td>%s <small>%s</small></td><td class="num">%s</td><td>%s</td><td><div class="bar"><i style="width:%d%%"></i></div> <small class="num">%d%%</small></td>
<td><span class="chip %s">%s</span></td><td><button class="btn ghost sm">Abrir</button></td></tr>'''%(i,n,u,lv,m,("%d dias"%st if st else "zerada"),la,r,r,s,LBL[s]) for n,u,i,lv,m,st,la,r,s in S)
    css='''
/* Open Props só entrega tokens (--size-*, --radius-*, --font-weight-*, --ease-*). Os componentes abaixo são nossos. */
body{background:var(--b-bg);color:var(--b-ink);font-family:var(--b-font);font-size:var(--font-size-1);line-height:var(--font-lineheight-3)}
h1{font:var(--font-weight-8) var(--font-size-6)/1.15 var(--b-font-display);margin:0;max-inline-size:none}
small{color:var(--b-ink-soft);font-size:var(--font-size-0)}
.side{background:var(--b-surface);border-inline-end:1px solid var(--b-line)}
.side a{display:block;padding:var(--size-2) var(--size-3);border-radius:var(--radius-2);color:var(--b-ink-soft);font-weight:var(--font-weight-7);text-decoration:none;transition:background .15s var(--ease-out-3)}
.side a:hover{background:var(--b-line)}
.side a[aria-current]{background:var(--b-primary);color:var(--b-on-primary)}
.brand{font:var(--font-weight-8) var(--font-size-2) var(--b-font-display);padding:var(--size-1) var(--size-3) var(--size-4)}
.eyebrow{font-weight:var(--font-weight-8);font-size:var(--font-size-0);letter-spacing:.08em;text-transform:uppercase;color:var(--b-ink-soft)}
.btn{font:inherit;font-weight:var(--font-weight-7);padding:var(--size-2) var(--size-4);border-radius:var(--radius-2);border:1px solid var(--b-primary);background:var(--b-primary);color:var(--b-on-primary);cursor:pointer;transition:background .15s var(--ease-out-3)}
.btn:hover{background:var(--b-primary-dark);border-color:var(--b-primary-dark);color:#fff}
.btn.line{background:transparent;color:var(--b-ink);border-color:var(--b-line)}.btn.line:hover{background:var(--b-surface);color:var(--b-ink)}
.btn.ghost{background:transparent;border-color:transparent;color:var(--b-primary-dark)}.btn.ghost:hover{background:var(--b-surface);color:var(--b-primary-dark)}
.btn.warn{background:var(--b-warn);border-color:var(--b-warn);color:var(--b-on-vivid)}
.btn.sm{padding:var(--size-1) var(--size-3);font-size:var(--font-size-0)}
:focus-visible{outline:2px solid var(--b-accent);outline-offset:2px}
.callout{display:flex;align-items:center;justify-content:space-between;gap:var(--size-3);flex-wrap:wrap;padding:var(--size-3) var(--size-4);border-radius:var(--b-radius);background:color-mix(in srgb,var(--b-warn) 14%,var(--b-bg));border:1px solid color-mix(in srgb,var(--b-warn) 45%,transparent)}
.card{background:var(--b-surface);border:1px solid var(--b-line);border-radius:var(--b-radius);box-shadow:var(--b-shadow)}
.stat{padding:var(--size-4);display:grid;gap:var(--size-1)}
.stat b{font:var(--font-weight-8) var(--font-size-6)/1.1 var(--b-font-display)}
.field{font:inherit;color:var(--b-ink);background:var(--b-raised);border:1px solid var(--b-line);border-radius:var(--radius-2);padding:var(--size-2) var(--size-3)}
.field:focus{border-color:var(--b-primary)}
.switch{display:inline-flex;align-items:center;gap:var(--size-2);cursor:pointer}
.switch input{appearance:none;inline-size:2.4rem;block-size:1.4rem;border-radius:999px;background:var(--b-line);position:relative;transition:background .2s var(--ease-out-3);cursor:pointer}
.switch input::after{content:"";position:absolute;inset:3px auto 3px 3px;aspect-ratio:1;border-radius:50%;background:var(--b-raised);transition:transform .2s var(--ease-out-3)}
.switch input:checked{background:var(--b-primary)}.switch input:checked::after{transform:translateX(1rem)}
table{inline-size:100%;border-collapse:collapse;background:transparent;border:0;outline:0}
thead th,tbody tr,tbody tr:nth-child(even),td{background:transparent;text-align:start;white-space:nowrap}
th{text-align:start;font-size:var(--font-size-0);font-weight:var(--font-weight-8);color:var(--b-ink-soft);padding:var(--size-3) var(--size-4);border-block-end:1px solid var(--b-line)}
td{padding:var(--size-3) var(--size-4);border-block-end:1px solid var(--b-line);vertical-align:middle}
tbody tr:last-child td{border-block-end:0}
tbody tr:hover{background:color-mix(in srgb,var(--b-line) 35%,transparent)}
.av{display:inline-grid;place-items:center;inline-size:2.4rem;block-size:2.4rem;border-radius:50%;background:var(--b-primary-dark);color:#fff;font-weight:var(--font-weight-8);font-size:var(--font-size-0);flex:none}
:root[data-theme=dark] .av{background:var(--b-raised);color:var(--b-ink);outline:1px solid var(--b-line)}
.bar{display:inline-block;inline-size:5.5rem;block-size:.5rem;border-radius:999px;background:var(--b-line);vertical-align:middle;overflow:hidden}.bar i{display:block;block-size:100%;background:var(--b-primary)}
.chip{display:inline-block;padding:2px var(--size-3);border-radius:999px;font-size:var(--font-size-0);font-weight:var(--font-weight-8);color:var(--b-on-vivid)}
.chip.ok{background:var(--b-ok)}.chip.warn{background:var(--b-warn)}.chip.stop{background:var(--b-err)}
'''
    body='''<div class="app"><aside class="side"><div class="brand">Idiomas com Prof. Brune</div>%s<div style="margin-top:auto;padding:var(--size-3)"><small>Brune · conta admin</small></div></aside>
<main class="main">
<div class="head"><div><div class="eyebrow">Painel da professora</div><h1>Alunos de <span data-lang-name>Francês</span></h1><small>18 alunos ativos · dados de exemplo</small></div>
<div class="hbox"><button class="btn line">Exportar lista</button><button class="btn">Convidar aluno</button></div></div>
<div class="callout"><span><strong>3 alunos</strong> estão há mais de 7 dias sem estudar.</span><button class="btn warn sm">Enviar lembrete</button></div>
<div class="stats4">
<div class="card stat"><small>Alunos ativos</small><b class="num">18</b><small>2 novos este mês</small></div>
<div class="card stat"><small>Estudaram hoje</small><b class="num">11</b><small>61%% da turma</small></div>
<div class="card stat"><small>Cartões vencidos</small><b class="num">142</b><small>média de 8 por aluno</small></div>
<div class="card stat"><small>Parados há 7+ dias</small><b class="num">3</b><small>precisam de atenção</small></div></div>
<div class="hbox"><input class="field grow" type="search" placeholder="Buscar por nome ou @usuário" aria-label="Buscar aluno"><select class="field" aria-label="Idioma"><option>Francês</option><option>Mandarim</option></select>
<label class="switch"><input type="checkbox"> Só quem precisa de atenção</label></div>
<div class="card"><div class="tablewrap"><table><thead><tr><th>Aluno</th><th>Nível</th><th>Sequência</th><th>Atividade</th><th>Retenção</th><th>Situação</th><th></th></tr></thead><tbody>%s</tbody></table></div></div>
</main></div>'''%(''.join('<a href="#"%s>%s</a>'%(' aria-current="page"' if i==0 else '',x) for i,x in enumerate(NAV)),rows)
    page('open-props',['open-props.css','open-props-normalize.css'],css,body)

pico();daisy();tabler();openprops()
