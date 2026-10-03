# Relatório do piloto automático — 2026-10-03

Tarefa: fazer as 3 etapas (auditoria, estrutura i18n, tradução do conteúdo), escolher a melhor ferramenta de tradução, separar traduções confiáveis das duvidosas, marcar tudo para aprovação manual e indicar variações. Você citou o Reverso Context por mostrar a frequência de cada tradução.

Interpretação adotada: "fazer as etapas" = auditoria completa, núcleo i18n com **um piloto pequeno** (nada de migrar o site inteiro numa noite) e tradução do conteúdo com **uma unidade piloto** (A1-1, francês para inglês e espanhol).

## 1. Resumo

- **Etapa 0, ferramenta:** método de duas máquinas independentes (Claude + DeepL) e nível de confiança pela concordância. Reverso entra só como link de conferência manual.
- **Etapa 1, auditoria:** cerca de 305 textos fixos no HTML, 1.500 na interface em JS e 1.500 de conteúdo pedagógico em PT-BR. Nenhum código alterado.
- **Etapa 2, estrutura:** núcleo `shared/i18n/` criado e o modal "Reportar problema" migrado (40 chaves, PT/EN/ES). **Em português nada mudou** (comprovado por testes).
- **Etapa 3, tradução piloto:** unidade A1-1 inteira, 51 itens em EN e ES. Confiança EN: 31 alta, 17 média, 3 baixa. ES: 28 alta, 19 média, 4 baixa. Tudo `needs_review`.
- **Verificação independente:** nenhum problema bloqueante ou importante.

## 2. Decisões que tomei por você

| Pergunta | Escolha | Motivo | Como reverter |
|---|---|---|---|
| Qual ferramenta de tradução? | Claude como tradutor principal e DeepL como segunda opinião | Os dois erram em itens diferentes; a divergência vira o sinal de confiança | Trocar o método em `docs/i18n/ferramentas-de-traducao.md` |
| Usar o Reverso automaticamente? | **Não.** Só links de conferência manual | Não encontrei API oficial e os termos de uso provavelmente restringem acesso automatizado (não verifiquei). Raspar seria arriscado | Se os termos permitirem, dá para automatizar depois |
| Traduzir do francês ou do português? | Do francês, usando o português só como pista; explicações partem do português | Do português o DeepL traduziu "tudo bem" como "All right" / "No pasa nada" | Mudar a instrução do lote |
| Quanto migrar na Etapa 2? | Só o modal "Reportar problema" (40 chaves) | Autocontido, usado em fr e zh, risco baixo | Reverter o commit `b49d444` |
| Onde guardar o idioma de interface? | Só `?ui=en` na URL e `localStorage`. **Não** gravei na conta (Supabase) | Gravar na conta é mudança de dado; a proposta (`progress.data._meta.uiLanguage`) está documentada | Implementar depois, conforme `docs/i18n/etapa2-notas.md` |
| Padrão do inglês e do espanhol? | EN-US e espanhol da América Latina, com variações (EN-GB, Espanha) anotadas | Seu público é brasileiro | Mudar o padrão e retraduzir o lote |
| Fazer PR? | Não. Tudo na branch `claude/confident-brahmagupta-8v7rg0` | Você não pediu | Abrir o PR quando quiser |

## 3. Pendências que precisam de você

1. **Revisar a tradução piloto:** `docs/i18n/piloto-A1-1.md`, seção "Perguntas para a professora" (9 perguntas, entre elas: tu/vous em inglês, tom do "tudo bem", espanhol da Espanha ou da América Latina, adaptar as notas sobre a bise e o "un café"). Os 20 itens de confiança média ou baixa têm link do Reverso Context.
2. **Ajustes de tradução que o verificador sugeriu** (ainda não aplicados, todos já estão em `needs_review`):
   - `vocab.bonsoir` (ES): "buenas noches (saludo)" soa como despedida; preferir "buenas tardes/noches (saludo)".
   - `vocab.bonjour` (EN): "hello / good morning" repete a falsa equivalência que a nota critica; talvez só "hello".
3. **DeepL Pro (pago)?** O plano gratuito não aceita glossário nem contexto. Só compensa se o volume crescer.
4. **Reverso:** se quiser automatizar, conferir antes os termos de uso do site.
5. **Seletor "Idioma da interface"** (na tela Configurações) e gravação na conta: não feitos; precisam da sua decisão de produto.
6. **Conteúdo em EN/ES (`t_en`/`t_es`)** no currículo inteiro é um projeto à parte (≈865 strings no fr e ≈644 no zh).
7. **Regra Free x Premium:** não avaliei se o idioma de interface ou a tradução do conteúdo seria diferenciado por plano. Fica como pergunta em aberto.

## 4. O que foi alterado

Tudo na branch `claude/confident-brahmagupta-8v7rg0`, enviado ao remoto:

- `6ad0645`: `docs/i18n/ferramentas-de-traducao.md`
- `e88fabb`: `docs/i18n/auditoria-textos.md`, `piloto-A1-1.md`, `piloto-A1-1.json`
- `b49d444`: `shared/i18n/i18n.js`, `pt-BR.js`, `en.js`, `es.js`; `scripts/i18n-lint.js`; `tests/i18n/*`; `docs/i18n/etapa2-notas.md`; ligação em `shared/reports.js`, `fr/index.html`, `zh/index.html`
- Este relatório e a correção de uma frase sobre o Reverso em `ferramentas-de-traducao.md`.

Não toquei: `CLAUDE.md`, `content.js`, `fr/app.js`, `zh/app.js`, banco de dados, migrations, flashcards, FSRS.

## 5. Problemas encontrados

- **DeepL Free recusa `context`/glossário/instruções.** Contornei removendo esses parâmetros.
- **Armadilha de lógica (auditoria):** `shared/anki-import.js:186,200-203` usa os nomes de campo "Caractere" e "Tradução" como chave de lógica. Traduzir esses nomes quebraria a importação de `.apkg` exportado pelo próprio app. Antes de traduzir a interface do Anki, é preciso trocar isso por um identificador interno.
- **Plural e gênero embutidos em PT** (por exemplo "aluno/aluna", "Criar cartão pra N alunos"): cerca de 30 plurais montados à mão.
- **Painel de Admin:** `shared/admin-reports.js` ainda lê o rótulo em português das categorias; por isso mantive o rótulo PT e acrescentei `labelKey`.
- **Menores (documentados):** `?ui=en` fica gravado para sempre no navegador; ao trocar o idioma com o botão mostrando "Enviando...", ele volta a "Enviar".
- **Falhas que já existiam:** `tests/desafios-modulo/test_playwright.js` dá 71/75 (4 falhas "reading 'duration'"). Os subagentes confirmaram que elas acontecem igual sem as mudanças desta noite. Não corrigi.
- **Limite do que eu mesmo executei:** só a comparação com o DeepL foi feita por mim. Auditoria, implementação e testes foram dos subagentes; o verificador reexecutou os testes (101/101 unitários, 148/148 Playwright i18n, 68/68 regressão) e conferiu 3 números da auditoria.

## 6. Divisão do trabalho

- **Eu (orquestrador):** plano, teste do DeepL com amostras reais, documento da Etapa 0, commits e este relatório.
- **Subagente sonnet:** auditoria somente leitura dos textos fixos (Etapa 1).
- **Subagente opus:** tradução piloto A1-1, duas traduções independentes, confiança e variações (Etapa 3).
- **Subagente opus:** núcleo i18n e migração do modal, com testes (Etapa 2).
- **Subagente sonnet:** verificação independente do conjunto, sem editar nada.
