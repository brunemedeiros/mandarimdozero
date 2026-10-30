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

## Auditoria dos literais em dicionários (2026-10-29)
Wiktionnaire, CNRTL (pela API do site) e Larousse abriram; Expressio não (403/DNS). Mesmo defeito de "dalle/con/gueule" (literal pegou o sentido comum, a expressão vem de outro):
- **Aplicados (confiança alta; Staging atualizado, hash `a9f09484493bd136925204fbc7424937`):** `arrête ton char` = "para com a sua lorota" (char = charre = blefe; Larousse/CNRTL); `être crevé` = "estar morto" (CNRTL); `ça marche` = "Isso funciona!" (marcher = funcionar/topar); `tu m'emmerdes` = "você me cobre de merda" (CNRTL "couvrir, souiller d'excréments"); en de `n'importe quoi` = "it doesn't matter what".
- **Esperando a autora (média/baixa):** `bol` (sentido antigo "cul": "ter rabo"/"sem rabo" em vez de "tigela"; só Wiktionnaire), `être à côté de la plaque` ("ao lado do alvo", CNRTL põe junto de "plaque de tir"), `se planter` ("se plantar" em pt-BR é ficar parado; origem "bater/esborrachar"), `ça vaut le coup` ("golpe" lembra fraude; coup = lance), `coup de fil` ("toque", não pancada), `coup de main` ("golpe de mão" já existe em pt com outro sentido).
- Literais conferidos e mantidos: gueule de bois (boca seca como madeira), flemme, cafard, fauché, cinglé, bourré, casser les bonbons, à fond la caisse, grasse matinée, poser un lapin, tomber dans les pommes, faire la queue, main morte, c'est parti.
- Sem fonte para a origem (hipótese): avoir les boules, avoir la pêche, mettre le paquet, se casser, foutre le camp, briques, casser les pieds.
- Duplicata: `expr-a1m4-001` (despublicada em 2026-10-19) e `expr-lote4-016` são a mesma expressão (il pleut des cordes).

## Decisões da autora sobre os literais (2026-10-29)
- `arrête ton char`: fica "para com a sua lorota" (origem charre = exagero; trocadilho com o carro/Ben-Hur só em nota).
- `bol` (avoir du bol / pas de bol): volta a "ter tigela / sem tigela" + **nota** de que "bol" vem do sentido antigo de "bunda" (eufemismo de "cul"). A nota ainda não tem campo no app: entra no PR do app.
- Os três `coup`: literal mesmo ("isso vale o golpe", "golpe de fio", "golpe de mão"); o sentido de "ação rápida" fica na explicação.
- `n'importe quoi`: "qualquer coisa" / "any thing".
- `Comme ci, comme ça` (expr-a1m1-002): **despublicada** em produção e no Staging em 2026-10-29 (status `approved` + `unpublished_*`, igual ao botão Despublicar). Continua no lote porque o SQL só preenche campos.
- Hash do `data` esperado no Staging depois de tudo: `695d3b5a8786e419ec10075dcc0e7d78`.

- 2026-10-30: `arrête ton char` = "pare com o seu exagero" / "stop your exaggeration" (preferência da autora). Hash esperado em produção e no Staging depois do lote: `c2701c9e20b7f62aeb296dcae24307d6`. `avoir un poil dans la main` ex. 2: a autora manteve a frase francesa e a tradução como estão.
- Nota de `coup de main` (autora): origem militar (séc. XVIII, ataque-surpresa rápido), depois sentido de ajuda rápida (séc. XIX). Entra na nota do app junto com a do `bol`.

## Produção (2026-10-30)
- SQL rodado pela autora no SQL Editor + 1 ajuste pelo conector (`arrête ton char` = exagero). Hash do `data` das 122 linhas = `c2701c9e20b7f62aeb296dcae24307d6` (igual ao Staging). `Comme ci, comme ça` (expr-a1m1-002) despublicada.
- Código no app: `exprExampleView/exprHighlightHTML/exprLiteralHTML` em `shared/desafios-telas.js`; CSS `.expr-mark/.expr-tr-btn/.expr-example-tr/.expr-literal` em `shared/desafios.css`; inglês em `docs/i18n/challenges-en.json` (+ `scripts/build-challenges-overlay.js`, `validate-challenges-en.js`). Regressão: 80/80 no teste novo, sem falha nova (pré-existentes: `test_desafios_css.js` regras `.rb-big`, `test_content_en.js` aviso de gramática).
- Pendente: `literal.note` em produção (bol: pas de bol e avoir du bol; coup de main) e PR do app.

## Ajustes de tela depois da conferência da autora (2026-10-30)
- Áudio da expressão toca sozinho ao abrir a pergunta; caixa do "Monte a frase" com destaque, áudio e tradução; "Sua vez" com tradução da frase quando existir (`microActivity.pt` no banco / `microActivity` no overlay en: AINDA SEM CONTEÚDO); linha "significa [francês]" saiu do painel da resposta; tela final com festa e XP em destaque; XP opção A.
- Falta (lote de conteúdo): opções das 122 expressões no idioma do site (hoje em francês) e tradução da frase da "Sua vez".
