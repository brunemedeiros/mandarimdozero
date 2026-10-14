# Decisão: um curso por par (idioma estudado × idioma do site) -- 2026-10-08

Decisão da dona do projeto, tomada na conversa sobre o site `/pt`. Complementa `auditoria-progresso-por-curso.md`
(progresso por curso) e `roadmap-i18n-l1.md`.

## Regras
1. **Curso = idioma estudado × idioma do site.** Trocar o idioma do site troca o curso (como no Duolingo), com progresso próprio.
2. **URLs**: `/fr`, `/zh`, `/pt` e, no futuro, `/it`, `/es`, `/ja` (código ISO do japonês é `ja`, não `jp`). O `/pt` usa a bandeira do Brasil,
   dialeto do português brasileiro no conteúdo e voz `pt-BR`.
3. **O conteúdo estudado é sempre o mesmo** (palavras, frases, áudio, ids das unidades, estrutura dos exercícios): uma base por idioma
   estudado, corrigida uma vez só.
4. **A camada que depende do idioma do site é por curso e ESCRITA DE PROPÓSITO para quem fala aquele idioma** (decisão mais importante):
   traduções, explicações, notas de realidade e culturais comparadas à língua de origem, armadilhas de pronúncia, regras de correção de
   "Ouça e traduza". Não é tradução das notas em português. O mecanismo deve permitir acrescentar e substituir, não só traduzir.
5. Novo curso = pasta do curso (camada da língua de origem) + base do idioma estudado se ela ainda não existe.
6. Chave interna no banco (`appKey`): `frances`, `mandarim`, `portugues`; idioma novo precisa de chave nova e de ajuste das listas fixas
   (CHECK do banco, mapas em `shared/`). Recomendação: trocar a lista fixa do banco por regra aberta uma única vez.

## Em aberto
Estrutura de código (núcleo + família latina/caracteres + idioma) e as etapas: aguardando a dona aprovar o plano. Nada foi implementado.
