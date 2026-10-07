---
name: teste-navegador
description: Testar fr/zh no navegador real com Playwright neste sandbox (boot sem Supabase real, login simulado, screenshots claro/escuro e celular) e fazer a validação visual obrigatória dos 4 cenários. Use antes de dar como pronta qualquer mudança de UI ou de fluxo no app.
---

# Teste no navegador (Playwright)

Modelos prontos: `tests/deck-browser/test_playwright.js`, `tests/fase-f/test_playwright.js`.

- Chromium já instalado (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); nunca `playwright install`.
- Servir o repo estático (servidor local tratando caminho terminado em `/` como `index.html`; o router tira `/index.html`).
- CDN do Supabase é bloqueado: stubar `window.supabase.createClient()` antes do app. `ERR_TUNNEL_CONNECTION_FAILED` é esperado.
- `browser.newContext({ serviceWorkers: 'block' })` (o SW do PWA intercepta fetch).
- Login simulado: atribuir `CURRENT_USER = {...}` SEM `window.` (é `let` top-level). Monkey-patch só de funções de rede.
- Microfone: `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` + permissão `microphone`.
- Usar cliques/digitação reais; esperar re-render (nó antigo some depois de clique).
- Validação visual obrigatória para cor/layout novo: fr claro, fr escuro, zh claro, zh escuro (+ 390px de largura).
  Olhar os screenshots de verdade, não só o assert.
- Relatar: N/N checks por idioma, pageerrors (deve ser 0) e erros de console fora do esperado.
