#!/usr/bin/env python3
"""Gera os artefatos de PWA/identidade visual a partir de duas fontes:
shared/app-identity.json (nome/cores) e shared/brand/ (logo/ícone-mestre).

Fonte única de verdade (ver Fase 2/3 da tarefa "PWA-ready /
mobile-app-ready"): mudar de marca no futuro é editar SÓ esses dois lugares
e rodar este script de novo -- nunca editar os arquivos abaixo à mão, eles
são sempre reescritos do zero:

  - fr/manifest.json, zh/manifest.json
  - shared/app-identity.js (mesmo conteúdo do .json, exposto como
    window.APP_IDENTITY pra qualquer tela que precise mostrar o nome do
    produto sem duplicar a string)
  - fr/logo/*.svg, zh/logo/*.svg (cópia verbatim de shared/brand/*.svg --
    os dois idiomas usavam cópias próprias e já-idênticas antes desta
    centralização; ver Fase 3)
  - fr/icons/icon-{192,512}.png, zh/icons/... (cópia verbatim de
    shared/brand/icon-*.png -- MESMOS bytes de antes da Fase 3, só
    passaram a ter uma fonte única em vez de duas cópias mantidas por
    acaso em sincronia)
  - fr/icons/icon-*-maskable.png, zh/icons/icon-*-maskable.png (variante
    "maskable" -- o SO aplica sua própria máscara de forma, então o
    conteúdo precisa caber numa "zona segura" central; aqui isso é feito
    reduzindo o ícone-mestre pra ~80% do canvas e centralizando sobre um
    fundo sólido da cor de fundo do próprio app, sem inventar nenhum
    desenho novo -- ver "Fase 3: não faça redesign")
  - shared/brand/favicon-{32,16}.png e as cópias em fr/icons/, zh/icons/
    e icons/ (raiz) -- reduzidos do ícone-mestre de 192px, nunca do de
    512 (menos perda de nitidez numa redução menor)

Depende só de Pillow (`pip install Pillow`) -- não faz parte do deploy (não
há build step no GitHub Pages), é rodado manualmente sempre que a
identidade/marca mudar, e o resultado é commitado como arquivo estático
normal, igual a qualquer outro asset do projeto.

O que este script DELIBERADAMENTE não gera ainda (ver Fase 13 da tarefa --
"não implementar ainda"): ícone 1024x1024 sem alpha pra App Store, feature
graphic 1024x500 pra Play Store, splash screens nativas. Esses só fazem
sentido quando existir de fato um empacotamento de loja -- até lá, o
splash "de fato" do PWA já é sintetizado pelo próprio Android/iOS a partir
de background_color + theme_color + ícone do manifest, sem precisar de
nenhum arquivo extra.
"""
import json
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDENTITY_PATH = os.path.join(ROOT, 'shared', 'app-identity.json')
BRAND_DIR = os.path.join(ROOT, 'shared', 'brand')

ICON_SIZES = [192, 512]
FAVICON_SIZES = [32, 16]
LOGO_FILES = {
    'logo-lockup.svg': 'ativo1-lockup.svg',
    'logo-mark.svg': 'ativo3-icone.svg',
}
# Fração do canvas que o conteúdo original ocupa na versão maskable --
# 0.8 é a margem seguro-padrão recomendada (W3C Maskable Icons): o SO pode
# recortar até a borda de um círculo inscrito no canvas, então nada
# importante pode ficar nos 20% mais próximos da borda.
MASKABLE_SAFE_SCALE = 0.8


def load_identity():
    with open(IDENTITY_PATH, encoding='utf-8') as f:
        return json.load(f)


def write_manifest(lang_id, app, brand):
    manifest = {
        'name': app['name'],
        'short_name': app['shortName'],
        'description': app['description'],
        'start_url': './',
        'scope': './',
        'display': 'standalone',
        'background_color': app['backgroundColor'],
        'theme_color': app['themeColor'],
        'lang': brand['lang'],
        'icons': [
            {'src': f'icons/icon-{size}.png', 'sizes': f'{size}x{size}', 'type': 'image/png', 'purpose': 'any'}
            for size in ICON_SIZES
        ] + [
            {'src': f'icons/icon-{size}-maskable.png', 'sizes': f'{size}x{size}', 'type': 'image/png', 'purpose': 'maskable'}
            for size in ICON_SIZES
        ],
    }
    path = os.path.join(ROOT, lang_id, 'manifest.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'  escrito {os.path.relpath(path, ROOT)}')


def write_identity_js(identity):
    js = (
        "// GERADO por scripts/generate_pwa_assets.py a partir de "
        "shared/app-identity.json -- não editar à mão.\n"
        "// Fonte única do nome/identidade do produto pra qualquer tela "
        "que precise exibi-lo (Perfil, títulos etc.), sem duplicar a "
        "string em cada arquivo.\n"
        f"window.APP_IDENTITY = {json.dumps(identity, ensure_ascii=False, indent=2)};\n"
    )
    path = os.path.join(ROOT, 'shared', 'app-identity.js')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f'  escrito {os.path.relpath(path, ROOT)}')


def make_maskable_icon(lang_id, size, background_color):
    src_path = os.path.join(ROOT, lang_id, 'icons', f'icon-{size}.png')
    dst_path = os.path.join(ROOT, lang_id, 'icons', f'icon-{size}-maskable.png')
    original = Image.open(src_path).convert('RGB')

    canvas = Image.new('RGB', (size, size), background_color)
    inner = max(1, round(size * MASKABLE_SAFE_SCALE))
    resized = original.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(resized, (offset, offset))
    canvas.save(dst_path)
    print(f'  escrito {os.path.relpath(dst_path, ROOT)}')


def _copy(src, dst):
    shutil.copyfile(src, dst)
    print(f'  copiado {os.path.relpath(dst, ROOT)}')


def sync_brand_assets(lang_id):
    """Copia (bytes idênticos, sem reprocessar) o logo e os ícones-mestre
    de shared/brand/ pros caminhos que fr/zh já esperavam antes da Fase 3
    -- HTML, manifest.json e service-worker.js continuam apontando pros
    mesmos arquivos de sempre (fr/logo/ativo1-lockup.svg etc.), só que
    agora eles vêm de uma fonte única em vez de duas cópias mantidas em
    sincronia "no olho"."""
    logo_dir = os.path.join(ROOT, lang_id, 'logo')
    icons_dir = os.path.join(ROOT, lang_id, 'icons')
    for brand_name, lang_name in LOGO_FILES.items():
        _copy(os.path.join(BRAND_DIR, brand_name), os.path.join(logo_dir, lang_name))
    for size in ICON_SIZES:
        _copy(os.path.join(BRAND_DIR, f'icon-{size}.png'), os.path.join(icons_dir, f'icon-{size}.png'))


def make_favicons():
    """Reduz o ícone-mestre de 192px (não o de 512 -- menos perda numa
    redução menor) pros tamanhos clássicos de favicon, guarda o
    resultado em shared/brand/ (fonte única) e devolve os caminhos
    gerados pra sync_favicons() copiar."""
    master = Image.open(os.path.join(BRAND_DIR, 'icon-192.png')).convert('RGB')
    for size in FAVICON_SIZES:
        resized = master.resize((size, size), Image.LANCZOS)
        dst = os.path.join(BRAND_DIR, f'favicon-{size}.png')
        resized.save(dst)
        print(f'  escrito {os.path.relpath(dst, ROOT)}')


def sync_favicons(lang_id=None):
    """lang_id=None copia pro favicon da raiz (portão neutro, sem PWA
    próprio -- só precisa de um ícone de aba, não do conjunto completo)."""
    icons_dir = os.path.join(ROOT, lang_id, 'icons') if lang_id else os.path.join(ROOT, 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    for size in FAVICON_SIZES:
        _copy(os.path.join(BRAND_DIR, f'favicon-{size}.png'), os.path.join(icons_dir, f'favicon-{size}.png'))


def main():
    identity = load_identity()
    brand = identity['brand']
    print(f"Gerando assets de PWA/marca pra \"{brand['productName']}\"...")
    for lang_id, app in identity['apps'].items():
        sync_brand_assets(lang_id)
        write_manifest(lang_id, app, brand)
        for size in ICON_SIZES:
            make_maskable_icon(lang_id, size, app['backgroundColor'])
    make_favicons()
    for lang_id in identity['apps']:
        sync_favicons(lang_id)
    sync_favicons(None)
    write_identity_js(identity)
    print('Pronto.')


if __name__ == '__main__':
    main()
