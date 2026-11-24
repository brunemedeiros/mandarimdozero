# Plano: CSS repetido dos `index.html` para `shared/`

Situação: **etapa 0 feita (2026-11-24); nenhuma regra mudou de lugar ainda.** Cada etapa só começa com a autorização da autora.
Lista das diferenças fr x zh que vieram antes deste plano, e o que já foi decidido sobre elas: `docs/css-comum/diferencas-fr-zh.md`.

## Por que

Cada site tem o visual escrito dentro do próprio `index.html`, e quase tudo é cópia: **2.042 dos 2.213 blocos de estilo do
`fr/index.html` existem iguais, na mesma ordem, no `zh/index.html`** (medido em 2026-11-24, base `main` em `ce55b06` mais
esta branch). Um conserto feito num site não chega ao outro (foi o que aconteceu com a janela "Minha meta de estudo" e com
vários itens de `diferencas-fr-zh.md`), e o site de português teria de copiar tudo de novo.

## Método (o que garante "nada muda na tela")

Quando duas regras disputam o mesmo elemento, vale a que aparece por último. Por isso nada é juntado num arquivo só: cada
trecho igual sai do `<style>` e é carregado **no mesmo lugar**, como arquivo de `shared/`:

    <style> ...regras só do site... </style>
    <link rel="stylesheet" href="../shared/<nome>.css">
    <style> ...regras só do site... </style>

A ordem fica idêntica por construção. Outras conversas já usaram o mesmo método (`shared/audio-btn.css`,
`shared/sem-internet.css`, `shared/conclusao.css`), por isso hoje cada `index.html` tem 3 blocos `<style>`.

Provas em cada etapa:
1. Lista das regras que o navegador montou (CSSOM), na ordem, antes x depois: tem que ser igual (método do
   `tests/paridade-sites/test_desafios_css.js`).
2. Capturas de tela antes x depois, pixel a pixel: fr e zh, claro e escuro, computador e celular (360 e 390 px). Telas:
   login, Trilha (lista e Mapa), lição (diálogo, explicação, exercício, acerto, erro, tela final), Revisão, Decks, Perfil
   (Visão geral, Conquistas, Amigos), Ranking, Metas e assistente de meta, Configurações, janela de reportar ⚑, sino, topo
   no celular, Painel da professora.
3. Regressão: `tests/paridade-sites/`, `tests/css-equilibrio/`, `tests/cores-marca/`, `tests/painel-ds/`,
   `tests/respostas-digitadas/`.

Cuidados já conferidos: nenhum `url(...)` dentro dos `<style>` (mudar de arquivo não quebra endereço); os `.css` de `shared/`
não estão no pré-cache do service worker (igual aos que já existem); `tests/css-equilibrio/test_variaveis.js` e
`tests/painel-ds/_css.js` passaram a ler também os `.css` de `shared/` ligados na página (etapa 0).

## Ferramentas (feitas na etapa 0, 2026-11-24)

Roteiro de cada etapa, nesta ordem:

1. **Mapa do dia:** `node scripts/css-comum-mapa.js` grava `docs/css-comum/mapa.md` com os trechos iguais e as linhas de hoje.
2. **Mover** o trecho da etapa: sai do `<style>` dos dois sites e entra como `<link rel="stylesheet" href="../shared/<nome>.css">`
   no mesmo lugar (fechando e reabrindo o `<style>` em volta).
3. **Prova 1, cascata:** `node tests/css-comum/test_cascata.js` (referência padrão `origin/main`; outra: `CSS_COMUM_REF=<commit>`).
   Lista todas as regras que o navegador montou, na ordem, antes e depois; tem que dar igual (hoje: fr 4866, zh 4298 regras).
4. **Prova 2, capturas:** `git worktree add --detach <pasta-ref> origin/main`, depois
   - `node tests/css-comum/capturas.js <pasta-ref> <antes>` e `node tests/css-comum/capturas.js . <depois>` (topo, todas as
     abas, seções de Configurações e janelas; fr e zh, claro e escuro, 1200, 390 e 360 px);
   - `node tests/paridade-sites/capturas_quase_iguais.js <pasta-ref> <antes-licao> fr,zh light,dark 390,1200` e o mesmo
     com `.` (lição e Revisão passo a passo);
   - `node tests/e4/comparar-capturas.js <antes> <depois> 0` para cada par: tolerância zero.
   As capturas "antes" não ficam guardadas: saem da árvore de referência na hora, sempre iguais.
5. **Regressão:** as pastas listadas em "Método". `tests/css-equilibrio/test_variaveis.js` e `tests/painel-ds/_css.js` já
   leem o CSS da página inteira na ordem (`tests/css-comum/css-da-pagina.js`), então continuam valendo depois da mudança.

## Etapas (1 branch e 1 PR por etapa; a próxima só com aprovação)

Os números de linha mudam toda semana (outras conversas mexem no CSS), por isso as etapas são por ÁREA. A etapa 0 gera o
mapa com as linhas do dia.

| Etapa | O que sai do `<style>` | Risco |
|---|---|---|
| 0. Preparação (FEITA, 2026-11-24) | Nada. Mapa, teste da cascata, roteiro de capturas e testes antigos lendo o CSS inteiro | nenhum |
| 1. Piloto | Fim do arquivo: "cara de jogo", conquistas com níveis, sugestões de amigos, missão em dupla | baixo |
| 2 | Decks e Aluno > Revisão | baixo |
| 3 | Carteirinha, Progresso, Amigos, Pódio, Ranking, abas da Conjugação | baixo |
| 4 | Perfil, Admin, Perfil público, Configurações | médio |
| 5 | Meta de estudo, avisos, toasts, sino, menu no celular | médio |
| 6 | Lição e Revisão (parte misturada com as regras de pinyin do zh) | médio |
| 7 | Arremate: juntar arquivos vizinhos quando provado seguro, atualizar `.claude/rules/frontend-fr-zh.md`, registro em `docs/historico/` | baixo |

Cores que são de propósito diferentes (azul/rosa no fr, vermelho/dourado no zh) não impedem a mudança: a regra vira uma só
em `shared/` e cada site informa só a sua cor por uma variável (`--brand-fill`, `--seal-red-dark`...), como já se faz com os botões.

**Grátis x Premium:** nada muda; é só organização dos arquivos.

## Regras enquanto o plano não termina

- CSS novo de peça usada por mais de um site vai num `.css` de `shared/`, nunca colado nos dois `index.html`
  (`.claude/rules/onde-fica-cada-coisa.md`).
- Cada etapa deve ser curta e mesclada logo; em conflito com outra conversa, manter os dois lados e refazer a prova CSSOM.
