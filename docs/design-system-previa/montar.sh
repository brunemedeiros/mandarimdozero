#!/usr/bin/env bash
# Recria a prévia comparativa em docs/design-system-previa/ds/out/ (precisa de Node 20+, npm, Python 3 e internet).
# Uso: bash docs/design-system-previa/montar.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")" && pwd)"
cd "$RAIZ/build"
npm install --no-audit --no-fund --silent
node icons.mjs
mkdir -p dist
for e in shadcn shadcn-aluno shadcn-comp; do
  node -e "require('esbuild').buildSync({entryPoints:['src/$e.tsx'],bundle:true,minify:true,format:'iife',outfile:'dist/$e.js',define:{'process.env.NODE_ENV':'\"production\"'},alias:{cn:'./src/cn.ts'},jsx:'automatic',logLevel:'error'})"
done
for e in mui mui-aluno mui-comp; do
  node -e "require('esbuild').buildSync({entryPoints:['src/$e.tsx'],bundle:true,minify:true,format:'iife',outfile:'dist/$e.js',define:{'process.env.NODE_ENV':'\"production\"'},jsx:'automatic',logLevel:'error'})"
done
npx @tailwindcss/cli -i src/shadcn.css -o dist/shadcn.css --minify >/dev/null 2>&1

cd "$RAIZ/ds"
rm -rf out && mkdir -p out/vendor
N="$RAIZ/build/node_modules"
cp "$N/@picocss/pico/css/pico.min.css" out/vendor/pico.css
cp "$N/daisyui/daisyui.css" out/vendor/daisyui.css
cp "$N/@tabler/core/dist/css/tabler.min.css" out/vendor/tabler.css
cp "$N/open-props/open-props.min.css" out/vendor/open-props.css
cp "$N/open-props/normalize.min.css" out/vendor/open-props-normalize.css
cp "$RAIZ/build/dist/shadcn.css" out/vendor/shadcn.css
cp "$RAIZ"/estatico/* out/
cp "$RAIZ/build/dist/shadcn.js" out/shadcn-app.js
cp "$RAIZ/build/dist/shadcn-aluno.js" out/shadcn-aluno-app.js
cp "$RAIZ/build/dist/shadcn-comp.js" out/shadcn-componentes-app.js
cp "$RAIZ/build/dist/mui.js" out/mui-app.js
cp "$RAIZ/build/dist/mui-aluno.js" out/mui-aluno-app.js
cp "$RAIZ/build/dist/mui-comp.js" out/mui-componentes-app.js

# páginas das quatro bibliotecas CSS (Pico, daisyUI, Tabler, Open Props)
cp "$RAIZ/build/icons.json" ../build/icons.json 2>/dev/null || true
python3 gen.py
python3 gen2.py

# páginas das duas bibliotecas React
pagina() { # $1=chave $2=js $3=link de css extra
  cat > "out/$1.html" <<HTML
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alunos - $1</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap">
$3<link rel="stylesheet" href="brune.css"><link rel="stylesheet" href="game.css"><style>.who{display:flex;align-items:center;gap:12px;min-width:200px}</style><script src="bridge.js"></script></head><body><div id="root"></div><script src="$2"></script></body></html>
HTML
}
CSS='<link rel="stylesheet" href="vendor/shadcn.css">'
pagina shadcn shadcn-app.js "$CSS"; pagina shadcn-aluno shadcn-aluno-app.js "$CSS"; pagina shadcn-componentes shadcn-componentes-app.js "$CSS"
pagina mui mui-app.js ""; pagina mui-aluno mui-aluno-app.js ""; pagina mui-componentes mui-componentes-app.js ""
echo "Pronto: abra $RAIZ/ds/out/index.html por um servidor local (ex.: python3 -m http.server dentro de ds/out)."
