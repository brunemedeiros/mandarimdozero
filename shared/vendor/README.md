# Bibliotecas de terceiros guardadas no próprio site

Decisão de 2026-11-24 (auditoria de segurança, `docs/historico/36-auditoria-seguranca-2026-11.md`, achado 3):
antes o site puxava estas bibliotecas de CDNs externos, e o supabase-js vinha pelo endereço `@2`, que muda sozinho
a cada versão nova. Agora ficam aqui com a versão no nome da pasta: nada muda sem um commit, e o site não depende do
CDN estar no ar nem confiável.

O Hanzi Writer (só no `zh`) continua no jsdelivr, com versão exata e "lacre" (`integrity`, SRI) em `zh/index.html`,
porque ele busca os desenhos dos caracteres (hanzi-writer-data) no jsdelivr de qualquer jeito.

| Pasta | Biblioteca | Versão | Origem (conferida em 2 CDNs, idênticos) | Licença |
|---|---|---|---|---|
| `supabase-js-2.119.2/supabase.js` | @supabase/supabase-js (UMD) | 2.119.2 | jsdelivr e unpkg, `dist/umd/supabase.js` | MIT |
| `jszip-3.10.1/jszip.min.js` | JSZip | 3.10.1 | cdnjs e jsdelivr, `dist/jszip.min.js` | MIT ou GPLv3 (usamos MIT) |
| `sqljs-1.8.0/sql-wasm.js` e `sql-wasm.wasm` | sql.js | 1.8.0 | cdnjs e jsdelivr, `dist/` | MIT |

Impressões digitais (sha256) para conferir que ninguém mexeu:

```
8816af04d9915dbba1882d6f84f0b402dc40268063a63d9c66d24f52f371c263  supabase-js-2.119.2/supabase.js
acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e  jszip-3.10.1/jszip.min.js
2ef9c614e826f1e6fee7d6b8ed6a42676ac2c296fc47fdb7b9ac59699b992ba5  sqljs-1.8.0/sql-wasm.js
18fc45ef410e6015296dad9fa775684c96e71e7007b99f2d87799a18a354e750  sqljs-1.8.0/sql-wasm.wasm
```

## Como atualizar uma biblioteca

1. Baixar o arquivo da versão nova de DOIS CDNs (ex.: jsdelivr e unpkg) e conferir que o sha256 é igual.
2. Criar a pasta nova com a versão no nome (ex.: `supabase-js-2.120.0/`), sem apagar a antiga no mesmo commit.
3. Trocar o endereço nas páginas: `index.html`, `fr/index.html`, `zh/index.html` (supabase-js) e `fr`/`zh` (jszip, sql.js);
   o sql.js também em `shared/anki-export.js` e `shared/anki-import-ui.js` (`locateFile`).
4. Rodar a regressão: os testes interceptam o supabase-js pelo endereço (`/shared\/vendor\/supabase-js/`); ler as
   notas de versão do supabase-js antes, porque o site usa Auth, Storage e funções.
5. Atualizar esta tabela e as impressões digitais; apagar a pasta antiga num commit seguinte.

Hanzi Writer: trocar a versão e o `integrity` em `zh/index.html` (sha384 do arquivo:
`openssl dgst -sha384 -binary hanzi-writer.min.js | openssl base64 -A`).

O servidor (Edge Functions) usa `npm:@supabase/supabase-js@2` no Deno; isso é resolvido no deploy e fica fora desta pasta.
