# Lote de exemplos das Expressões (rascunho, 2026-10-28)

Tradução pt-BR e en dos 2 exemplos de cada uma das 122 expressões, marcação da expressão na frase e "Tradução literal".
**Nada disto está gravado no banco nem no site.** Aguarda a autora aprovar a amostra e o plano (abaixo).

## Arquivos
- `rascunho-final.json`: 122 itens (`text1/2` = francês igual ao banco; `pt1/2`, `en1/2`; `mark1/2` = trecho exato do francês a destacar; `lit_pt`/`lit_en` = tradução literal; `conf`, `lit_conf`).
- `aplicar-lote-exemplos.sql`: UPDATE aditivo (só acrescenta `example.pt/mark`, `secondExample.pt/mark`, `literal.pt`), com guarda pelo texto em francês. Testado num Postgres local: 122 linhas + 1 (tirer la gueule), áudios intactos.
- `overlay-en-novos-campos.json`: inglês por id (`example`, `secondExample`, `literal`) para `docs/i18n/challenges-en.json`.
- `gerar.py`: gera o SQL e o inglês a partir de `rascunho-final.json` (`python3 gerar.py rascunho-final.json`).
- `overlay-en-significados-novos.json`: significado em inglês das 9 expressões que não tinham nenhuma tradução + aviso de registro de `tirer la gueule`.
- `backup-producao-antes.json`: as 122 linhas de produção ANTES do lote (2026-10-28), para voltar atrás.
- `validar.js`: `node validar.js rascunho-final.json` (122 itens, 0 problemas).
- `revisao-exemplos.md`: relatório do revisor de conteúdo sobre as traduções dos exemplos. Literais: revisados em 2026-10-28 e aplicados.

## Decisões da autora (2026-10-28)
- Diálogo: uma fala por linha, cada uma começando com travessão "—". Aspas retas. "!" e "?" fora da marcação.
- Marcação: verbo com auxiliar, sem sujeito nem pronome objeto antes do verbo; inclui o "ne" quando inclui o "pas".
- Traduzir pelo mais próximo do francês e indicar o registro; campo novo **Tradução literal** (estilo Memrise), só onde ajuda.
- `tirer la gueule` é "familiar" (corrigido em produção em 2026-10-28; falta o aviso dentro do texto do significado, no SQL).
- Não trocar a frase francesa de `expr-b2-002` (o nome do mp3 vem do texto).

## Plano de gravação (cada passo só com "pode" da autora)
1. Backup: SELECT das 121 linhas de produção salvo em arquivo (só leitura).
2. Staging está VAZIO (`challenges` = 0 linhas): copiar as 121 linhas de produção para o Staging (só dados).
3. Rodar `aplicar-lote-exemplos.sql` no Staging; conferir 122 + 1 linhas e amostra de 10.
4. App (PR): "Veja em frases" mostra tradução e destaque, painel da resposta mostra o literal. Campos opcionais (não entram em `CHALLENGE_SITE_LANG_FIELDS`, nada some do site em inglês).
5. Overlay em inglês (`challenges-en.json` + `scripts/build-challenges-overlay.js` + `scripts/validate-challenges-en.js`).
6. Produção: o mesmo SQL, depois da prévia aprovada no Staging.
- Pré-existente: 9 expressões (expr-a1-001..003, a2-001..003, b2-001..003) não têm nenhuma tradução em inglês e por isso não aparecem no site em inglês.

## Andamento (2026-10-28)
- Backup feito. Staging semeado com as 122 linhas (hash do `data` idêntico ao de produção).
- Literais corrigidos pela autora: `dalle` = goela/gullet (fonte: Expressio, Linternaute), `con` = idiota (sentido de insulto, não o anatômico), `ta gueule` = focinho. Conferência em dicionários: `Wiktionnaire`/`CNRTL`/`Larousse` não abriram nesta sessão (rede bloqueada), só resumos de busca; conferir direto quando liberar.
- Origens (gueule de bois, pommes, plaque, pêche, boules, poil dans la main, cinglé) são hipóteses nas fontes: não escrever "história de origem" no texto sem esse aviso.

## Staging (2026-10-29)
- Staging semeado (idêntico a produção) e lote aplicado: 122 linhas com `example.pt`, 80 com `literal.pt`; hash final do `data` = `3c99dbde66794e001d9e002a77091943` (igual ao teste local).
- Achado: colar o SQL no editor do navegador trocou `\n` por `\r\n` nos 24 diálogos. Corrigido com `reparo-crlf.sql` e o gerador agora escreve a quebra com `chr(10)`. **Sempre conferir pelo hash/por linha depois de gravar.**
- Falta: auditoria dos literais nos dicionários (Wiktionnaire/CNRTL/Larousse abriram em 2026-10-29), PR do app, inglês no overlay, produção.
