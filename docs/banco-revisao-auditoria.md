# Banco de Revisão: auditoria do funcionamento (2026-10-16)

> **Versão 2 (respostas, decisões da autora e propostas): `docs/banco-revisao-proposta-v2.md`.** Este arquivo descreve o funcionamento **antes** das mudanças propostas; as seções 6 e 7 foram superadas por lá.

Feita lendo o código (`shared/review-bank*.js`, `shared/review-answer-extras.js`, renderizadores de Revisão em `fr/app.js`), a função da rotina
(`supabase/functions/review-bank-agent/`), o artifact do Banco (a área do aluno com código) e **contagens reais da produção**. Não testei com conta de aluno de verdade.
O que não verifiquei está marcado como "não conferi".

## 1. Resumo

- O Banco guarda **itens** extraídos das aulas (5 tipos). Cada item tem um status: pendente, aprovado ou cortado.
- Um item aprovado vira **cartão** na conta do aluno só se o aluno tem **conta vinculada** (ou Turma). O cartão aparece em **Aluno > Revisão** (não na Revisão geral).
- Existem **três lugares** onde um item é estudado, com regras diferentes: **Modo aula** (a professora), **Aluno > Revisão no site** (o aluno, com FSRS e XP) e a **área do aluno do artifact** (com código, para quem ainda não tem conta).
- Os dois jeitos de estudar **não conversam**: o que o aluno faz sozinho não entra nas estatísticas nem no Récap, e vice-versa só em parte (seção 6).

## 2. Itens: tipos, status e de onde vêm

| Tipo | O que é | Campos usados |
|---|---|---|
| Vocabulário | palavra ou expressão = sentido | pergunta (sentido), resposta (forma), observação |
| Estrutura | regra gramatical com frase de exemplo | pergunta (sentido da frase), resposta (a frase), palavra da lacuna, observação |
| Verbo | tempo verbal com as formas | idem estrutura |
| Erro corrigido | frase errada do aluno e a forma certa | frase errada, resposta (forma certa), pergunta (sentido), observação |
| Pronúncia | som ou palavra a pronunciar | pergunta, resposta, observação |

**Status:** pendente (a professora ainda confere), aprovado (vale para estudar e entra no Récap), cortado (descartado, nunca volta).

**De onde vêm:** rotina da madrugada (tarefa agendada, 01:50), importação de arquivo, ou digitado à mão.
A rotina **só insere**: nunca edita, corta nem aprova item existente. Entra como **pendente** quando tem "Para conferir", é conteúdo sensível, é linha `[pessoal]`,
tem sugestão de edição, ou a geração automática está desligada; item limpo entra **aprovado** (e já vira cartão se o aluno tem conta ou Turma; senão fica aprovado sem cartão).

## 3. Do item ao exercício do aluno (site)

O tipo de cartão é decidido por `rbCardMode` (`shared/review-bank-model.js`):

| Item | Cartão | O que o aluno vê |
|---|---|---|
| Erro corrigido | **Digite a resposta** | "Corrija: [frase errada]" (com a pergunta entre parênteses); digita a forma certa |
| Estrutura ou Verbo, com palavra de lacuna que aparece literal numa frase de 3 palavras ou mais | **Completar (cloze)** | a frase com a lacuna; digita a palavra |
| Estrutura ou Verbo sem lacuna aproveitável | Normal | pergunta; "ver a resposta"; nota própria (Errei, Difícil, Bom, Fácil) |
| Vocabulário | Normal | idem |
| Pronúncia | Normal | idem (nunca vira "digitar") |

- A **Observação** da professora aparece **depois** de responder, nunca antes.
- Os dois tipos que pedem digitação (Digite a resposta e Completar) usam o **teclado de acentos** do francês. Nota: **Fácil** nunca sai de uma resposta digitada.
- Cartão de aluno de **mandarim** não é gerado automaticamente (precisa de pinyin).
- Item sensível, com dúvida ou com sugestão **nunca vira cartão sozinho**; a professora aprova à mão.
- Aluno sem conta vinculada e sem Turma: o item fica **aprovado sem cartão**. O cartão sai quando o aluno é vinculado ("Gerar cartões").

### Números reais da produção (2026-10-16)
| Situação | Alunos | Itens aprovados | Com cartão | Pendentes |
|---|---|---|---|---|
| Francês, com conta vinculada | 8 | 725 | **725** | 18 |
| Francês, sem conta | 3 | 195 | 0 | 7 |
| Português, ativos (sem conta, ainda não existe o app) | 11 | 1058 | 0 | 144 |

Cartões gerados por tipo: erro 89 (Digite a resposta), estrutura 140 (cloze) + 78 (normal), verbo 19 (cloze) + 48 (normal), vocabulário 317 (normal), pronúncia 34 (normal).
Nenhum item de pronúncia vira "Digite a resposta" no site.

## 4. Os três jeitos de estudar

### A. Modo aula (a professora, tela cheia)
Para cada item: mostra a pergunta, a professora clica em "Mostrar resposta" e marca **Acertou**, **Com ajuda** ou **Errou** (e o motivo, se errou).
Não tem digitação nem múltipla escolha. Só entram itens **aprovados**, de qualquer tipo, tenha o aluno conta ou não.

| Aba | Quais itens | Observações |
|---|---|---|
| **Récap** | Até **8** itens aprovados que "vencem" até a data da próxima aula (ou nunca revisados). Ordem: os que erraram na última vez, os mais atrasados, os de nível mais baixo, os mais recentes | O Récap é gravado por aula (um por aluno e data). A rotina cria o de hoje na madrugada; a tela também cria sob demanda |
| **Última aula** | **Todos** os itens aprovados da data de aula mais recente | Pode ser longa (uma aula inteira) |
| **Erros** | Até **30** itens aprovados cuja última resposta no Modo aula foi **Errou**, do mais recente para o mais antigo | Só conta o que foi marcado no Modo aula |

**Agendamento do Modo aula** (da professora, independente do aluno): cada item tem um nível de 0 a 9; intervalos de 1, 3, 7, 14, 30, 60, 90, 120, 180, 270 dias.
Acertou sobe um nível; Com ajuda repete o nível; Errou volta ao nível 0 (amanhã).

### B. Aluno > Revisão (site, com conta vinculada)
Menu **Aluno > Revisão**: botão "Estudar N" abre a mesma sessão de flashcards da Revisão, só com os cartões da professora.
Usa o **FSRS do aluno** e dá **XP** (Errei 0, Difícil 2, Bom 4, Fácil 8). Resposta digitada: certa = Bom, "quase" (só faltou acento, ou uma letra a mais ou a menos em palavra de 5 letras ou mais) = Difícil, errada = Errei.
O que a professora marca no Modo aula também chega ao FSRS do aluno quando ele abre o app (Acertou = Bom, Com ajuda = Difícil, Errou = Errei), **sem XP**.

### C. Área do aluno do artifact (com código de acesso)
Para quem ainda não tem conta. Três abas: **Revisão do dia** (até 14 itens: até 8 vencidos + novos), **Corrija a frase** (10 itens de erro corrigido, ao acaso) e **Tudo que vimos** (lista com busca).
Três modos que o aluno escolhe: **Ver a resposta**, **Múltipla escolha**, **Digitar a resposta**. No modo Digitar:
erro corrigido vira "Corrija a frase"; item com lacuna vira completar (60% das vezes); **todo o resto vira "escrever a resposta inteira"**.
O progresso fica **só no navegador** do aluno (caixas de 0, 1, 3, 7, 14 e 30 dias), não vai para o site, não dá XP e a professora não vê.
"Quase" (só acento) conta como certo.

## 5. Modo aula x aluno sozinho

| | Modo aula | Aluno > Revisão (site) | Artifact (código) |
|---|---|---|---|
| Quem usa | a professora, com o aluno | o aluno | o aluno |
| Precisa de conta | não | sim, vinculada | não |
| Itens | aprovados (Récap, Última aula, Erros) | cartões gerados | todos os aprovados |
| Formato | pergunta, mostrar, 3 botões | Normal, cloze ou Digite a resposta | Ver, múltipla escolha ou digitar |
| Agendamento | níveis da professora (0 a 9) | FSRS do aluno | caixas no navegador |
| XP no Ranking | não | **sim** | não |
| Aparece nas estatísticas do Banco | **sim** | não | não |
| Teclado de acentos | não se aplica | sim (francês) | não tinha (ajuste pronto, aguarda publicação) |

## 6. Achados e riscos

1. **Português: nada do que está aprovado chega ao aluno.** 11 alunos, 1058 itens aprovados e 144 pendentes, **0 cartões**: ainda não existe o app `pt` e nenhum está vinculado. Eles dependem do artifact.
2. **3 alunos de francês sem conta** têm 195 itens aprovados sem cartão (mesmo caso).
3. **Estudo sozinho não alimenta o Banco.** O Récap usa só os níveis do Modo aula, então pode trazer de volta item que o aluno já domina sozinho, e a "Visão geral" não mostra o que ele estudou.
4. **Digitar não permite Fácil.** Em Digite a resposta e Completar o máximo é Bom (4 XP); só o cartão Normal chega a Fácil (8 XP).
5. **Artifact × site são diferentes:** no artifact, vocabulário e pronúncia podem virar "digitar"; no site, vocabulário e pronúncia são sempre cartão Normal.
6. **Português no site novo vai precisar do teclado de acentos do português.** O teclado hoje é só do francês; o módulo da família latina já aceita grupos de teclas por idioma.
7. **Cartão não carrega áudio gravado** (só campos de texto). Se o botão de voz aparece no cartão depende do idioma estudado (não conferi).
8. **Mandarim fica fora da geração automática** (pinyin). Hoje nenhum aluno de mandarim está no Banco.

## 7. Ajustes pedidos nesta auditoria
- **Acentos nos exercícios de digitar:** no site já existem (francês); faltavam no artifact. Teclado do idioma do aluno (francês ou português) adicionado numa cópia do artifact, **testado, ainda não publicado**.
- **Tirar "Digitar a resposta" da Pronúncia:** no site isso nunca acontece; no artifact acontecia. Na cópia, Pronúncia no modo Digitar vira cartão (ver a resposta), como no site. **Ainda não publicado.**
