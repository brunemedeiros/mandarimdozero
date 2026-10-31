# Lote: opções das Expressões no idioma do site + tradução da frase da "Sua vez" (iniciado 2026-10-31)

Decisão da autora (2026-10-30): as 4 opções de cada expressão passam para o idioma do site (hoje só em francês); a linha "significa [francês]" já saiu do painel.
Também falta a tradução da frase da "Sua vez" (`microActivity`), que o app já sabe mostrar (`microActivity.pt` no banco, `microActivity` no overlay en).

Regras: nada é gravado sem a autora aprovar uma amostra de 10; Staging primeiro; conferir por hash; SQL com `chr(10)` (colar no navegador troca `\n` por `\r\n`).
Estado: rascunho em andamento (ver arquivos desta pasta).

## Rascunho pronto (2026-10-31) — NADA gravado em banco
- `entrada-todos.json` (122 expressões do retrato de produção de 28/10), `saida-final.json` (optionsPt/optionsEn, turnPt/turnEn; 4 agentes + revisor de conteúdo, 24 ajustes aplicados), `gerar-opcoes.py` -> `aplicar-opcoes.sql` (testado em Postgres local: 122 linhas; hash da projeção `c0817722bd7e1f6f1f11b65cb4068f46`) e `overlay-en-opcoes.json` (já mesclado em `docs/i18n/challenges-en.json`, mas só vale no site quando o PR for mesclado).
- Modelo: banco `data.optionsPt` (4 itens, MESMA ordem de `options`) e `microActivity.pt`; inglês no overlay (`options`, `microActivity`). A correção segue o francês; o rótulo mostrado é o do idioma do site (`exprOptionLabel`), com volta ao francês se faltar.
- Problemas do conteúdo ORIGINAL achados pelo revisor (para a autora decidir; nada alterado): em 16 expressões a opção certa já é bem mais longa no francês (entrega a resposta: expr-001, 002, 003, a1m2-005, a1m3-001, a1m4-005, a1m5-001, a1m5-003, a1m6-005, a2-003, b2-001, lote1-009, 011, 016, lote3-019, lote4-009) e 3 opções têm dica no texto ("(ironie)", "de façon brutale", ", grossièrement"); `meaning_pt` com "aspetos" (expr-b2-001) e "pra" (expr-lote1-014); `expr-lote3-016`/`017`: a frase da Sua vez usa "bordel"/"putain" com função diferente da das opções; `expr-003`: resposta "poser de lapin" sem `alsoAccept` para "poser un lapin"; `expr-a1m3-005`: as opções respondem "quem diz?", não "o que significa?"; duplicata expr-a1m4-001 = expr-lote4-016.
