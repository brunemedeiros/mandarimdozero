#!/usr/bin/env python3
"""Gera os artefatos de PWA a partir de shared/app-identity.json.

Fonte única de verdade pro nome/identidade do produto (ver Fase 2/3 da
tarefa "PWA-ready / mobile-app-ready"): mudar de marca no futuro é editar
SÓ shared/app-identity.json e rodar este script de novo -- nunca editar os
arquivos abaixo à mão, eles são sempre reescritos do zero:

  - fr/manifest.json, zh/manifest.json
  - shared/app-identity.js (mesmo conteúdo do .json, exposto como
    window.APP_IDENTITY pra qualquer tela que precise mostrar o nome do
    produto sem duplicar a string)
  - fr/icons/icon-*-maskable.png, zh/icons/icon-*-maskable.png (variante
    "maskable" dos ícones existentes -- o SO aplica sua própria máscara de
    forma, então o conteúdo precisa caber numa "zona segura" central; aqui
    isso é feito reduzindo o ícone atual pra ~80% do canvas e centralizando
    sobre um fundo sólido da cor de fundo do próprio app, sem inventar
    nenhum desenho novo -- ver "Fase 3: não faça redesign").

Depende só de Pillow (`pip install Pillow`) -- não faz parte do deploy (não
há build step no GitHub Pages), é rodado manualmente sempre que a
identidade mudar, e o resultado é commitado como arquivo estático normal,
igual a qualquer outro asset do projeto.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDENTITY_PATH = os.path.join(ROOT, 'shared', 'app-identity.json')

ICON_SIZES = [192, 512]
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


def main():
    identity = load_identity()
    brand = identity['brand']
    print(f"Gerando assets de PWA pra \"{brand['productName']}\"...")
    for lang_id, app in identity['apps'].items():
        write_manifest(lang_id, app, brand)
        for size in ICON_SIZES:
            make_maskable_icon(lang_id, size, app['backgroundColor'])
    write_identity_js(identity)
    print('Pronto.')


if __name__ == '__main__':
    main()
