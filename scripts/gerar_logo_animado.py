# Gera o logo animado "duas cobrinhas" (versão 5 aprovada pela dona em 2026-11-24): SVG com animação embutida (SMIL),
# sem script e sem biblioteca. Usado nos arquivos para baixar (docs/marca/logo-animado/) e na tela de abertura do site.
import re, sys
ROOT='/home/user/mandarimdozero'
LA, LR = 211.742, 221.867            # comprimento dos caminhos azul e rosa (getTotalLength)
DRAW, HOLD, FADE = 2.6, 0.9, 0.35    # devagar: 2,6 s para o B inteiro; pronto 0,9 s; some em 0,35 s
CYCLE = DRAW+HOLD+FADE
tA = DRAW*LA/(LA+LR)                 # mesma velocidade nas duas cobrinhas
k1, k2, k3 = tA/CYCLE, DRAW/CYCLE, (DRAW+HOLD)/CYCLE
AZ='M5.54,98 V54.2 H46 C61,54.2 71.9,44 71.9,30 C71.9,16 61,5.54 46,5.54 H-2'
RS='M5.54,-2 V36.7 H48 C57,36.7 62,39 66,45 C71,51 78.5,57 79,68 C79.5,81 68,89.4 52,89.4 H-2'

def shapes(file):
    src=open(f'{ROOT}/fr/logo/{file}').read()
    return re.findall(r'<path d="([^"]+)" style="fill:(#[0-9a-fA-F]+);"/>', src), re.search(r'viewBox="([^"]+)"',src).group(1)

def svg(mode, pre='la', extra_attrs='', standalone=True):
    if mode=='b':
        paths, vb = shapes('ativo3-icone.svg'); dx=0; B=paths; T=[]; vb='-3 -3 89.44 100.95'
    else:
        paths, vb = shapes('ativo1-lockup.svg'); dx=101.22; B=paths[:3]; T=paths[3:]
    pink=''.join(f'<path d="{d}" fill="{c}"/>' for d,c in B if c.lower()=='#e36bca')
    blue=''.join(f'<path d="{d}" fill="{c}"/>' for d,c in B if c.lower()=='#3498d6')
    txt=''.join(f'<path d="{d}" fill="{c}"/>' for d,c in T)
    f=lambda x: f'{x:.5f}'
    dur=f'{CYCLE:.2f}s'
    mask=lambda mid, d, anim: (f'<mask id="{pre}-{mid}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="330" height="210">'
        f'<path transform="translate({dx},0)" d="{d}" pathLength="1" fill="none" stroke="#fff" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 2" stroke-dashoffset="1">{anim}</path></mask>')
    anim_az=(f'<animate attributeName="stroke-dashoffset" dur="{dur}" repeatCount="indefinite" values="1;0;0" keyTimes="0;{f(k1)};1" calcMode="spline" keySplines=".3 0 .6 .6;0 0 1 1"/>')
    anim_rs=(f'<animate attributeName="stroke-dashoffset" dur="{dur}" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;{f(k1)};{f(k2)};1" calcMode="spline" keySplines="0 0 1 1;.4 .4 .7 1;0 0 1 1"/>'
             f'<animate attributeName="stroke-opacity" dur="{dur}" repeatCount="indefinite" values="0;1" keyTimes="0;{f(k1)}" calcMode="discrete"/>')
    out=(f'<svg {"xmlns=\"http://www.w3.org/2000/svg\" " if standalone else ""}viewBox="{vb}" {extra_attrs}>'
         f'<defs>{mask("azul", AZ, anim_az)}{mask("rosa", RS, anim_rs)}</defs>'
         f'<g><animate attributeName="opacity" dur="{dur}" repeatCount="indefinite" values="1;1;0" keyTimes="0;{f(k3)};1"/>'
         f'<g mask="url(#{pre}-azul)">{blue}</g><g mask="url(#{pre}-rosa)">{pink}</g></g>{txt}</svg>')
    return out

# Rodar: python3 scripts/gerar_logo_animado.py (regera os dois SVGs; MP4 e GIF: ver docs/marca/logo-animado/README.md).
if __name__=='__main__':
    D=f'{ROOT}/docs/marca/logo-animado'
    open(f'{D}/prof-brune-B-animado.svg','w').write('<?xml version="1.0" encoding="UTF-8"?>\n'+svg('b','b')+'\n')
    open(f'{D}/prof-brune-logo-animado.svg','w').write('<?xml version="1.0" encoding="UTF-8"?>\n'+svg('lockup','l')+'\n')
    print('ciclo', round(CYCLE,2), 's; azul', round(tA,3), 's; rosa', round(DRAW-tA,3), 's')
