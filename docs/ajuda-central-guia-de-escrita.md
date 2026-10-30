# Central de Ajuda: guia de escrita e como trocar os textos

Rascunho de 2026-10-30. Páginas: `ajuda/index.html` (casca), `ajuda/conteudo.js` (perguntas, artigos, glossário), `ajuda/textos/*.html` (textos completos).
Teste: `node tests/ajuda/test_conteudo.js`. Ainda não está ligada a nenhum menu (Mais > Ajuda não existe) e tem `noindex`.

## Como funciona
Categoria → pergunta curta (abre uma resposta de 2 a 4 linhas) → "Ver mais" → texto completo, com "Em palavras simples" no alto,
palavras difíceis sublinhadas (passe o mouse ou toque) e lista delas no fim, "Artigos nessa seção" ao lado e "Artigos relacionados".
Categoria sem pergunta e sem artigo fica escondida (Estudo e Planos entram quando houver conteúdo; Planos só com cobrança).

## Regras da resposta curta
1. De 2 a 4 linhas (o teste barra mais de 380 caracteres). Frases curtas, "você", palavras do dia a dia.
2. Nada de palavra de advogado (lista no glossário: controlador, base legal, titular, anonimização...). Diga o que acontece:
   em vez de "direito de portabilidade", "receber uma cópia dos seus dados". O termo técnico fica no texto completo, onde a
   "palavra difícil" é explicada.
3. A resposta curta **nunca promete mais do que o texto completo**. Se os dois divergirem, vale o completo. Ao receber o texto
   do advogado, reler cada resposta curta contra ele.
4. Passo de tela só quando a gente tem certeza de onde fica (ex.: Configurações > Excluir minha conta). Senão, descrever sem inventar caminho.
5. Pergunta que depende de um ponto ainda aberto leva `revisar: true`: a Central mostra "Resposta a rever com o texto do advogado".
6. Português do Brasil coloquial, sem "--" e sem "pra". Versão em inglês só depois do texto do advogado (nada em português no site em inglês).

## Quando o advogado entregar o texto
1. Trocar o conteúdo de `ajuda/textos/termos.html` e `politica.html` (HTML simples: `h2`/`h3` com `id`, `p`, `ul`, `table` dentro de `div.tabela`).
   Âncoras usadas pelas perguntas: se mudar um título, atualizar `ancora` em `conteudo.js` (o teste acusa âncora que sumiu).
2. Em `conteudo.js`: `estado` do artigo para `publicado` e `atualizado` com a data; reescrever o "Em palavras simples"; tirar `revisar`
   das respostas conferidas; conferir que não sobrou nenhum `[CONFIRMAR]` nem `mark.confirmar`.
3. Trocar o aviso de rascunho da casca (`<p class="rascunho">`) e tirar o `noindex`.
4. Ligar a Central ao menu Mais > Ajuda (e ao rodapé de `sobre.html`) e tirar a aba temporária Privacidade do Painel de Admin
   (lembrete: tirar `privacy` das listas de abas em `tests/painel-professora/` e `tests/painel-admin/`).
5. Traduzir (pt-BR e en) no mesmo lote e relatar a confiança da tradução.

## Grátis x Premium
Tudo grátis. A categoria Planos e pagamentos só aparece quando o Premium for cobrado.
