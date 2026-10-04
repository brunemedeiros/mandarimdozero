# Roadmap: idioma da interface e L1 nos sites /fr e /zh

Data: 2026-10-04. Só planejamento: nenhum código foi alterado ao escrever este documento.

## 1. Os três eixos (a arquitetura em uma tabela)

Hoje o app mistura, na prática, três coisas diferentes. O projeto inteiro é separá-las.

| Eixo | O que é | Exemplo hoje | Onde vive | Estado |
|---|---|---|---|---|
| **L2** (idioma estudado) | O que a pessoa aprende | francês (`/fr`), mandarim (`/zh`) | `APP_KEY`, `Field.lang`, namespace `progress.data[idioma]` | Pronto, já independente |
| **Interface** | Menus, botões, avisos, toasts | português do Brasil | `shared/i18n/*` (`t()`, catálogos) | Núcleo pronto; inglês em ~53 chaves; só no navegador |
| **L1** (língua pela qual aprende) | Traduções, explicações, exemplos, correção de respostas | português (campo `t` dos dados) | espalhado em `content.js`, validadores, banco | **Não existe como conceito no código** |

Regras que valem para os três:
- Eixos nunca derivam um do outro por código (decisão já travada: nada de `APP_KEY` decidir idioma de interface).
- Português do Brasil continua sendo a fonte de verdade e **não muda byte a byte** (regra de ouro, testada por regressão).
- Falta de tradução cai sempre em português (inglês -> pt-BR -> a própria chave), nunca em tela vazia.

### Modelo de dados proposto (sem migration)
Dentro de `progress.data._meta` (mesma linha e RLS que já guarda `currentLearningLanguage`):
- `uiLanguage`: `pt-BR` | `en` (es congelado).
- `l1Language`: `pt-BR` | `en`. **Padrão: igual a `uiLanguage` até a pessoa escolher outro.**
- Navegador e convidado: `localStorage['ui-language']` e `['l1-language']`. Ordem de leitura: conta > navegador > `pt-BR`.
- Nunca dentro de `serializeState()` (isso seria por idioma estudado). Escritas reaproveitam o helper de merge de `shared/language-pref.js` e só ocorrem depois do progresso estar carregado (evita sobrescrever progresso).

### Camadas de código
1. **Interface**: `t()`/`tp()`/`fmtDate()`/`applyDomI18n()` + catálogos. Já existe.
2. **Acessor de L1** (novo): `tr(item, campo)` lê `item.t_en` quando L1 = inglês e cai em `item.t`. Cobre os ~25 pontos que hoje leem `.t`, `.goal`, `.title`, `back_trans`.
3. **Pacotes de conteúdo por L1** (novo): textos de aula longos (gramática, notas de realidade e cultura, verdadeiro/falso). São autoria, não tradução palavra a palavra.
4. **Lógica por L1** (novo): comparador de "Ouça e traduza", traduções de referência dos desafios, áudio de introdução dos ditados.
5. **Servidor**: `notification_templates` com `ui_language`, Edge Functions, e-mails, manifest PWA.

## 2. Fases

### Concluídas
| Fase | Entrega | Evidência |
|---|---|---|
| 0 | Método de tradução: Claude + DeepL gratuito, confiança alta/média/baixa, Reverso só como conferência manual; DeepL Pro descartado | `ferramentas-de-traducao.md` |
| 1 | Auditoria só-leitura de textos fixos (~590 no HTML, ~1.530 no JS, ~1.500 de conteúdo) | `auditoria-textos.md` |
| 2 | Núcleo i18n + modal "Reportar problema" (fr+zh) | `b49d444`, `etapa2-notas.md` |
| 3 | Tradução piloto da unidade A1-1 (51 itens, EN) com níveis de confiança | `piloto-A1-1.md/.json` |
| 4 | 3 modais pequenos + seletor "Idioma da interface" (só navegador), verificado de forma independente | `701f158` |

Testes atuais: 126 unitários, 209 de navegador (fr e zh), lint de chaves, regressões das fases F e H.

### Em andamento (fase 4b, aguardando a sua decisão)
- Texto do aviso de limite de cartões: o português ainda diz "arquive" e o app não arquiva mais. A ação real é **apagar** (🗑, definitivo). Opções: "apague um cartão que você não usa mais (isso é definitivo)" ou tirar a frase e deixar só a opção de pedir vínculo à professora.
- Ajustes de inglês aprovados: "contact the administrator"; "student(s)" = alunos **vinculados** a uma professora (não o usuário comum).
- Itens do inglês ainda em `needs_review` (cerca de 17 de confiança média no piloto e 6 textos de modal).

### Próximas (ordem sugerida)
| # | Fase | Conteúdo | Tamanho | Depende de |
|---|---|---|---|---|
| 5 | Fundação da interface | Gravar `uiLanguage` na conta; `<html lang>` e manifest; helpers de plural, data e número; regra de gênero ("aluno") | pequeno | decisão 3 abaixo |
| 6 | Migrar telas da interface | Ordem: Configurações, menu/topbar, toasts, Meus Cartões, Decks, Revisão, chrome da Trilha, Painel de admin por último. Cada tela: catálogo pt-BR idêntico, inglês com confiança, teste de regressão | grande (~1.250 strings únicas de JS + ~245 de HTML) | fase 5 |
| 7 | Desatar o português usado como lógica | Nomes de campo do Anki ("Caractere", "Tradução"), `unitTitle` no cartão, `kind` do report, títulos de Course Deck gravados em PT, `lang:'pt-BR'` fixo no modelo de flashcard | médio, **bloqueia** fases 8 e 9 | nenhuma |
| 8 | Camada L1 curta (`t_en`) | Acessor `tr()`, depois vocabulário, frases, diálogos, títulos e metas. Módulo a módulo, começando pelo A1-1 que já tem piloto. Fallback em português | grande (fr ~865 strings, zh ~644) | fase 7, decisão 1 |
| 9 | Pacotes de aula por L1 | Gramática, notas de realidade e cultura, verdadeiro/falso. Notas que comparam com o português (ex.: "ser/estar", "meu = mon/ma/mes") são reescritas, não traduzidas | muito grande, autoria | fase 8 |
| 10 | Lógica por L1 | Comparador de "Ouça e traduza" por L1 (hoje é gramática do português), `referenceTranslations` por L1 nos desafios e no banco, mp3 de introdução dos ditados por L1 (via GitHub Actions) | médio, **sem testes hoje** | fase 8 |
| 11 | Servidor | `notification_templates.ui_language`, escolha no `notification-cron` (exige novo deploy), e-mails, badges, manifest dinâmico ou por idioma | médio | fase 5 |
| 12 | Outros idiomas | Espanhol (congelado), português como L2 de aprendizado | adiado | decisão da dona |

Observação: as fases 5, 6 e 7 podem andar em paralelo com a 8, mas a 8 só abre depois da 7.

## 3. O que mais falta (resposta curta)
1. Persistir o idioma na conta e terminar de migrar a interface (fases 5 e 6). Hoje só ~53 chaves de ~2.800 candidatas estão migradas.
2. Tratar a L1 como conceito próprio. Hoje o português está **dentro** dos dados e da lógica, não só nas telas.
3. Reescrever, não traduzir, as notas que se apoiam no português.
4. Criar testes para o comparador de "Ouça e traduza", que hoje não tem nenhum.
5. Lado servidor: notificações, e-mails, mp3 de instrução em português, manifest.

## 4. Riscos conhecidos
- Só adicionar `t_en` **não basta** (a análise do código mostrou 7 pontos que quebram): textos longos de aula, comparador PT, `back_trans`/`lang:'pt-BR'` fixos em cartões do usuário, títulos de Course Deck em PT no banco, áudio de instrução em PT, comparações com o português, falta de testes.
- Condição de corrida ao gravar `_meta` junto com o salvar do progresso (último vence). Mitigação: mesmo helper de merge, leitura fresca, só após o progresso carregar.
- Mudar L1 sem mudar o conteúdo deixa o aluno com explicação em português por baixo de interface em inglês. Por isso a decisão 2.
- Qualidade da tradução: tudo entra como `needs_review` e vira publicado só com aprovação, com nível de confiança relatado.
- Edge Function: commit não basta, precisa de `deploy_edge_function`.

## 5. Decisões que dependem de você
1. **L1 separada ou junta da interface?** Recomendo: dois campos no dado, uma única escolha na tela no começo ("Idioma do app"); o campo "Traduções em" aparece só quando houver conteúdo em inglês suficiente. Reversível.
2. **Enquanto o conteúdo não tem inglês**: mostrar português nas traduções (padrão) ou avisar "conteúdo ainda em português" quando a pessoa escolher inglês?
3. **Persistir na conta já** (fase 5)? É mudança de dado, sem migration, reversível.
4. **Ordem do conteúdo**: recomendo A1 inteiro do francês antes do mandarim, módulo a módulo (o francês já tem o piloto A1-1 e a trilha organizada em 6 módulos; o mandarim tem 18 unidades soltas). Volume de gramática medido nos dados: fr 20 notas gramaticais em `concepts` + 41 blocos em unidades `grammar` (61); zh 57 notas gramaticais com 66 blocos. Ou seja, o volume é parecido; a contagem de strings (fr ~865, zh ~644) vem da auditoria.
5. **Free x Premium**: pergunta aberta. Provisório: idioma da interface e L1 grátis (sem custo marginal). Se um dia pacotes de L1 virarem produto, reavaliar.
6. **Quem revisa o inglês**: o fluxo atual (confiança por item + link do Reverso) continua?
7. **Espanhol**: continua congelado.

## 6. Critério de "pronto" deste planejamento
Todo o escopo definido e apresentado: eixos, arquitetura, fases feitas/em andamento/próximas, riscos e decisões pendentes. Nada do plano foi executado.
