# Banco de Revisão: resumo de uma página (para a professora)

**O que é:** a lista de itens (palavras, frases, erros...) tirados das aulas. Cada item aprovado vira cartão para a aluna estudar em casa, e a professora também revisa os itens em aula (Modo aula).

## Como a professora revisa (Modo aula)
- **Récap:** até 8 itens para aquecer no início da aula (os que a aluna errou, depois os mais atrasados).
- **Última aula:** todos os itens da aula mais recente.
- **Erros:** os itens que a aluna errou (até 30).

## Como a aluna estuda (site, Aluno > Revisão)
Botão "Estudar N": os cartões que vencem hoje. Hoje ela **não** tem Récap, Última aula nem Erros.

## Já feito
- Modo aula e estudo em casa usam o mesmo agendamento (FSRS) e o mesmo banco. Já na produção (migration 112 e rotina v9).
- Modo aula com 4 botões (Errei, Difícil, Bom, Fácil) e intervalo. Digitar: acerto escolhe Bom ou Fácil. Cores iguais no fr e no zh.
- Telas novas estão na branch do PR #347; chegam ao site quando o PR for mesclado.

## Decidido na entrevista (2026-10-19)
- **Récap** fica como aquecimento de até 8 itens (só da professora).
- **Erros** e **Última aula** são importantes para a professora **e** para a aluna: a aluna passa a ter os dois.
- Última aula da aluna: todos os itens da aula mais recente, em partes, com "continuar depois".
- Um erro só sai de Erros depois de **2 acertos seguidos**.
- Estudar por Erros e Última aula **vale como revisão normal** (agendamento e XP).

- **Modelo do Google Docs:** aceitos a terceira coluna "Erros" (frase da aluna, forma certa, por quê), o prefixo "Ex.:" nos exemplos e uma lista de "incompletos" na mensagem da madrugada. **Recusados:** linha "Tema:" por aula (poderia afirmar algo falso) e ⭐ de reforçar (não dá para saber durante a aula).
- **Erros** mostra o que a aluna errou na aula e em casa, com a origem de cada erro.
- **Privacidade:** a janela de aviso da aluna só tem o botão "Entendi" (a política completa virá no menu Mais > Ajuda). Rascunho da política em aba temporária "Privacidade" do Painel de Admin (`shared/privacy-draft.js`), para o advogado revisar.
- **Ideias aceitas para depois:** mapa de erros, ranking dos itens mais errados, revisão por período e meta semanal.

## Em decisão (entrevista com a professora, 2026-10-19)
O que fica, o que muda, o que sai e o que entra de novo: Récap, Última aula, Erros (também para a aluna), tipos de item.

## Ainda não feito
Tipos de item novos (proposta B), visões para a aluna (proposta D), teclado de acentos do português, artifact.

Detalhes técnicos (só para consulta): `docs/banco-revisao-proposta-v2.md` e `docs/banco-revisao-auditoria.md`.
