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

- **Mapa de erros:** completo para a professora; versão leve e positiva para a aluna dentro de Meus erros.
- **Meta semanal:** padrão fixo de 40 cartões foi recusado (aluna com 1 aula por semana não gera tantos). Pensar uma meta que acompanhe o ritmo de cada aluna.
- **Revisão por período:** só a professora escolhe o período (no Modo aula); a aluna não.
- **Cadernos:** relatório por aula (linhas lidas, itens criados, ignoradas); preview em `docs/banco-revisao-preview-relatorio.png`, ainda sem decisão de implementar.
- **Privacidade:** política cobre o site inteiro (conta sem vínculo, com vínculo, professora, pessoas sem conta), mapa do fluxo dos dados e pontos para o advogado, tudo na aba temporária do Admin.

- **Cortar ou corrigir enquanto estuda (decisões de 2026-10-20):** Modo aula tem só o botão Editar; Cortar fica dentro da janela de edição (vale para todas as alunas; mudar o sentido reinicia o progresso). A aluna não corta nem edita sozinha: ela faz um **pedido** (cortar, sugerir correção ou "parece errado"), que chega como pendente para a professora aprovar, recusar ou editar e aprovar. O Banco é um só, sempre sincronizado: não existe corte só para uma aluna.
- **Banco do aluno em abas:** feito no estilo atual; Pico só se a professora aprovar (preview em `docs/banco-revisao-preview-abas-atual-x-pico.png`).

## Em decisão (entrevista com a professora, 2026-10-19)
O que fica, o que muda, o que sai e o que entra de novo: Récap, Última aula, Erros (também para a aluna), tipos de item.

## Ainda não feito
Tipos de item novos (proposta B), visões para a aluna (proposta D), teclado de acentos do português, artifact.

Detalhes técnicos (só para consulta): `docs/banco-revisao-proposta-v2.md` e `docs/banco-revisao-auditoria.md`.
