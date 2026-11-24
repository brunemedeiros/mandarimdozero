---
paths:
  - "fr/**"
  - "zh/**"
  - "pt/**"
  - "shared/**"
  - "courses/**"
  - "languages/**"
---

# Onde fica cada coisa (código dos sites)

Complementa `.claude/rules/frontend-fr-zh.md` (lista dos motores comuns que já existem) e a tabela "Onde registrar decisões"
do `CLAUDE.md` (onde vai cada documento). Aqui fica só o roteiro de decisão e o aviso de repetição.

## Antes de criar função, CSS ou HTML novo

1. Procurar se já existe algo parecido em `shared/` e no outro site (`grep -rn` pelo nome e por um trecho do código). Se existir, reaproveitar.
2. Escolher o lugar pela pergunta "isso muda conforme o idioma estudado?":
   - Não muda: `shared/core/` (lição, trilha, Revisão, estado) ou `shared/<recurso>.js` com `shared/<recurso>.css`.
   - Muda só um detalhe (texto, regra de escrita, voz): motor em `shared/` e gancho em `LANG_HOOKS` (`<site>/lang-hooks.js`;
     o gancho novo entra no contrato `shared/core/lang-hooks-contrato.js`).
   - Depende de como a família de línguas se escreve: `shared/core/familias/` (latina: fr e pt).
   - Só existe naquele idioma (hanzi, pinyin, histórias do zh; configuração da Conjugação do fr): `<site>/app.js` ou
     `<site>/<recurso>-config.js`, com a classificação em `docs/auditoria-paridade-fr-zh.md`.
   - Conteúdo (unidades, frases, Desafios): arquivos de dados do site (`<site>/content.js` e afins), nunca em `shared/`.
3. CSS novo de peça usada por mais de um site: em um `.css` de `shared/`, carregado depois do `<style>` de cada `index.html`,
   e não colado nos dois `index.html` (eles já repetem cerca de 2.360 regras iguais).
4. No resumo da entrega, uma linha dizendo onde cada peça nova ficou e por quê.

## Achou repetição? Avisar, não mover

- Código igual ou quase igual entre sites (ou entre um site e `shared/`) encontrado no meio de outra tarefa: **não mover por
  conta própria**. Terminar o que foi pedido e, no fim, listar para a autora o que está repetido (nome da peça e arquivos),
  o tamanho e o lugar sugerido.
- Não é exceção a isto: se a própria tarefa já muda aquela peça em mais de um site, mudar em `shared/` faz parte da tarefa
  (regra de Paridade do `CLAUDE.md`).
- Conferência completa: `scripts/e4-classify-functions.js` (compara `fr/app.js` com `zh/app.js`; grava o resultado em
  `docs/i18n/e4-levantamento-funcoes.*`).
