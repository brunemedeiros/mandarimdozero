# Identidade visual — fonte única

Esta pasta é a fonte única da marca "Idiomas com Prof. Brune" (ver
`shared/app-identity.json` pro nome/cores). Não editar os arquivos de fora
desta pasta que existem por causa dela — eles são gerados/copiados por
`scripts/generate_pwa_assets.py`, que sincroniza tudo daqui pra
`fr/`/`zh/`/raiz.

## Arquivos

- `logo-lockup.svg` — logo completa (marca + nome), usada no rodapé/créditos.
- `logo-mark.svg` — só o ícone (o "B"), fonte pro ícone do app.
- `icon-192.png` / `icon-512.png` — ícone raster já existente do app
  (fundo creme + marca), tamanhos padrão de manifest PWA.
- `favicon-32.png` / `favicon-16.png` — reduzidos do `icon-192.png` (Fase 3),
  pro ícone de aba do navegador.

## Como mudar a marca no futuro

1. Editar `shared/app-identity.json` (nome, cores) e/ou substituir os
   arquivos desta pasta (logo/ícone) — **sem redesenhar por conta própria
   dentro do código**, só trocar o arquivo fonte aqui.
2. Rodar `python3 scripts/generate_pwa_assets.py` (precisa de Pillow --
   `pip install Pillow`).
3. Conferir visualmente os ícones/manifests gerados e commitar tudo.

## O que ainda falta gerar aqui (só quando existir empacotamento de loja de verdade — ver Fase 13/14 da tarefa PWA/mobile, "não implementar ainda")

- **Android (empacotamento nativo)**: ícone adaptativo (foreground +
  background separados) a partir de `logo-mark.svg` — hoje o ícone
  "maskable" do PWA já cobre a mesma necessidade de zona de segurança;
  faltaria só o par foreground/background do formato Android Studio.
- **iOS (App Store)**: ícone 1024×1024 **sem** canal alpha (a Apple rejeita
  ícone com transparência) — hoje `icon-512.png` tem fundo sólido, então é
  só re-exportar em 1024 quando for a hora.
- **Play Store**: ícone 512×512 (já existe, `icon-512.png` serve) + feature
  graphic 1024×500 (não existe ainda — é uma peça de divulgação, não um
  ícone, precisa ser desenhada quando a ficha da loja for criada).
- **Splash screen nativa**: não precisa de arquivo nenhum enquanto for só
  PWA — Android e iOS já sintetizam a splash sozinhos a partir de
  `background_color` + `theme_color` + ícone do manifest (ver Fase 2). Uma
  splash desenhada à mão só volta a fazer sentido com Capacitor (plugin
  próprio de splash screen), na fase de empacotamento nativo.
