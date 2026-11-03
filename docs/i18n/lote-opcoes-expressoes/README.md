# Lote: opções das Expressões no idioma do site + tradução da frase da "Sua vez" (iniciado 2026-10-31)

Decisão da autora (2026-10-30): as 4 opções de cada expressão passam para o idioma do site (hoje só em francês); a linha "significa [francês]" já saiu do painel.
Também falta a tradução da frase da "Sua vez" (`microActivity`), que o app já sabe mostrar (`microActivity.pt` no banco, `microActivity` no overlay en).

Regras: nada é gravado sem a autora aprovar uma amostra de 10; Staging primeiro; conferir por hash; SQL com `chr(10)` (colar no navegador troca `\n` por `\r\n`).
Estado: rascunho em andamento (ver arquivos desta pasta).

## Rascunho pronto (2026-10-31) — NADA gravado em banco
- `entrada-todos.json` (122 expressões do retrato de produção de 28/10), `saida-final.json` (optionsPt/optionsEn, turnPt/turnEn; 4 agentes + revisor de conteúdo, 24 ajustes aplicados), `gerar-opcoes.py` -> `aplicar-opcoes.sql` (testado em Postgres local: 122 linhas; hash da projeção `c0817722bd7e1f6f1f11b65cb4068f46`) e `overlay-en-opcoes.json` (já mesclado em `docs/i18n/challenges-en.json`, mas só vale no site quando o PR for mesclado).
- Modelo: banco `data.optionsPt` (4 itens, MESMA ordem de `options`) e `microActivity.pt`; inglês no overlay (`options`, `microActivity`). A correção segue o francês; o rótulo mostrado é o do idioma do site (`exprOptionLabel`), com volta ao francês se faltar.
- Problemas do conteúdo ORIGINAL achados pelo revisor (para a autora decidir; nada alterado): em 16 expressões a opção certa já é bem mais longa no francês (entrega a resposta: expr-001, 002, 003, a1m2-005, a1m3-001, a1m4-005, a1m5-001, a1m5-003, a1m6-005, a2-003, b2-001, lote1-009, 011, 016, lote3-019, lote4-009) e 3 opções têm dica no texto ("(ironie)", "de façon brutale", ", grossièrement"); `meaning_pt` com "aspetos" (expr-b2-001) e "pra" (expr-lote1-014); `expr-lote3-016`/`017`: a frase da Sua vez usa "bordel"/"putain" com função diferente da das opções; `expr-003`: resposta "poser de lapin" sem `alsoAccept` para "poser un lapin"; `expr-a1m3-005`: as opções respondem "quem diz?", não "o que significa?"; duplicata expr-a1m4-001 = expr-lote4-016.

## Decisões da autora e ajustes (2026-11-01) — NADA gravado em banco ainda
- Opções que entregavam a resposta pelo tamanho/dica (16 + 3): reescritas SÓ em pt-BR e en (`equilibrio.json`, 19 itens; diferença máx. 7 letras). O francês não mudou (fica escondido atrás do idioma do site; só reaparece se faltar a tradução).
- `expr-lote3-016` (bordel): a certa cobre irritação E bagunça/confusão. `expr-lote1-003` (s'en foutre): registro VULGAR (pt "tô me fodendo", en "I don't fucking care").
- Modo da pergunta: 23 expressões não perguntam "O que significa?" (21 "Quando se usa isso?", `expr-a1m3-005` "Quem diz isso?", `expr-a1m4-003` "A quem se diz isso?"). Novo campo opcional `questionMode` (when|who|whom) em `modo-pergunta.json`; o app mostra o rótulo no idioma do site (`exprQuestionKey`). Antes (28/10) o app mostrava sempre "O que significa?": erro meu da padronização, corrigido aqui.
- `expr-003`: `poser de lapin` está certo (depois de "ne ... pas", "un" vira "de"); sugestão pendente: aceitar também `poser un lapin` (`microActivity.alsoAccept`).
- Pendências para a autora aprovar (dados em produção): register de `s'en foutre` (slang -> vulgar) e o aviso embutido no `meaning.pt`; `expr-lote1-014` ainda tem "pra baixo" (a `expr-b2-001` já foi corrigida em outra sessão); `ça vaut le coup` (familiar -> neutral?) e `se casser` (slang -> familiar?).
- SQL: `aplicar-opcoes.sql` (122 UPDATEs, inclui `questionMode` em 23; testado em Postgres local; hash da projeção em `esperado-hash.txt` = `dfad085f0db4c66720ddec68d35de914`).

## Correções aprovadas e gravadas (2026-11-03; Staging e produção, só estas 4 linhas)
- `poser un lapin` (expr-003): `microActivity.alsoAccept = ["poser un lapin"]` (a resposta certa "poser de lapin" continua valendo).
- `s'en foutre` (expr-lote1-003): register slang -> **vulgar** + aviso do significado.
- `ça vaut le coup` (expr-lote3-001): familiar -> **neutral**, sem aviso.
- `se casser` (expr-lote2-002): slang -> **familiar** + aviso.
- O inglês dessas 3 (`meaning` em `docs/i18n/challenges-en.json`) foi atualizado no repositório (vale no site quando o PR for mesclado).
- Ainda aguardam a autora: texto do significado de `avoir le cafard` (expr-lote1-014, hoje "estar na fossa / estar pra baixo"); gravação do lote das opções (Staging primeiro).
- Regra de comunicação com a autora: ela não reconhece os códigos expr-...; sempre citar a expressão em francês e o sentido junto do código.
