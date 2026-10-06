# Roadmap: idioma do site (interface + conteúdo) nos sites de estudo

Data: 2026-10-04 (atualizado com as suas decisões). Só planejamento: nenhum código de produto muda por causa deste documento.

## 1. O objetivo

Quem estuda escolhe **o idioma que quer estudar** (o site: `/fr`, `/zh`, no futuro `/ptbr`) e, separadamente, **o idioma do site**: botões, menus, avisos, traduções, explicações, respostas, tudo que aparece para o aluno.

- Um aluno americano estuda francês com o site em inglês.
- Um aluno russo, que não fala português mas fala inglês, estuda francês escolhendo "English".
- O site `/ptbr` ensina português para falantes de inglês (segundo público, além dos brasileiros que aprendem francês e mandarim).

**Simplificação decidida por você:** não existe "L1" separada. O idioma do site (interface) **é** a língua pela qual o aluno aprende. Uma escolha só.

## 2. Arquitetura: dois eixos

| Eixo | O que é | Exemplo | Onde vive | Estado |
|---|---|---|---|---|
| **Idioma estudado** | O que a pessoa aprende | francês, mandarim; depois português | `APP_KEY`, `Field.lang`, `progress.data[idioma]` | Pronto e independente |
| **Idioma do site** | Interface **e** conteúdo (traduções, explicações, exercícios) | português do Brasil hoje; inglês a seguir | `uiLanguage` | Interface: núcleo pronto, ~53 chaves em inglês. Conteúdo: ainda não existe |

Regras que valem sempre:
- Os dois eixos nunca derivam um do outro por código.
- Português do Brasil é a fonte de verdade e **não muda byte a byte** (regra de ouro, testada por regressão). Mudança de texto em português só quando você aprovar (como a de hoje, "apague").
- Falta de tradução cai em português, nunca em tela vazia (fallback já existe na interface; para conteúdo, ver decisão A abaixo).
- Novos idiomas estudados **entram no ar já com todos os idiomas de site disponíveis** (decisão sua). Espanhol segue congelado.

### Modelo de dados (sem migration)
- `progress.data._meta.uiLanguage`: `pt-BR` | `en`. Guardado na conta (decisão sua: sim). Navegador/convidado: `localStorage['ui-language']`. Leitura: conta > navegador > `pt-BR`.
- Nunca dentro de `serializeState()` (isso seria por idioma estudado). Escrita reaproveita o helper de merge de `shared/language-pref.js` e só depois de o progresso estar carregado, com leitura fresca da linha (evita corrida com o salvar do progresso).

### Camadas de código
1. **Interface**: `t()`, `tp()`, `fmtDate()`, `applyDomI18n()` + catálogos por idioma. Existe.
2. **Conteúdo curto** (novo): acessor `tr(item)` lê `item.t_en` quando o site está em inglês e cai em `item.t`. Cobre os ~25 pontos que hoje leem `.t`, `.goal`, `.title`, `back_trans`.
3. **Conteúdo de aula por idioma** (novo): gramática, notas de realidade e cultura, verdadeiro/falso. É autoria: notas que comparam com o português ("ser/estar", "meu = mon/ma/mes") são **reescritas** em função do inglês, não traduzidas.
4. **Lógica por idioma do site** (novo): comparador de "Ouça e traduza", traduções de referência dos desafios, áudio de introdução dos ditados.
5. **Servidor**: templates de notificação, e-mails, badges, manifest PWA.

## 3. Fases

### Concluídas
| Fase | Entrega | Evidência |
|---|---|---|
| 0 | Método de tradução: Claude + DeepL gratuito, confiança alta/média/baixa, Reverso só para conferência manual | `ferramentas-de-traducao.md` |
| 1 | Auditoria de textos (~590 no HTML, ~1.530 no JS, ~1.500 de conteúdo) | `auditoria-textos.md` |
| 2 | Núcleo i18n + modal "Reportar problema" | `b49d444` |
| 3 | Tradução piloto da unidade A1-1 (51 itens, EN) | `piloto-A1-1.md/.json` |
| 4 | 3 modais pequenos + seletor "Idioma da interface" (só navegador) | `701f158` |
| 4b | Aviso de limite diz "apague" (PT e EN) e "administrator" no aviso Premium | `fc3f383`, `91c0813` |

Testes: 126 unitários e 209 de navegador (fr e zh), lint de chaves.

### Próximas, em ordem
| # | Fase | Conteúdo | Tamanho | Depende de |
|---|---|---|---|---|
| 5 | Fundação | Gravar `uiLanguage` na conta; `<html lang>` e manifest; helpers de plural, data, número; regra de gênero ("aluno") | pequeno | — |
| 6 | Interface completa | Ordem: Configurações, menu/topbar, toasts, Meus Cartões, Decks, Revisão, chrome da Trilha, Painel de admin por último | grande (~1.250 strings únicas no JS + ~245 no HTML) | 5 |
| 7 | Desatar o português usado como lógica | Nomes de campo do Anki ("Caractere", "Tradução"), `unitTitle` no cartão, `kind` do report, títulos de Course Deck gravados em PT, `lang:'pt-BR'` fixo no modelo de flashcard | médio, **bloqueia 8 e 9** | — |
| 8 | Conteúdo do **francês inteiro** em inglês | Acessor `tr()`; vocabulário, frases, diálogos, títulos e metas; depois gramática, notas de realidade e cultura, verdadeiro/falso. Módulo a módulo (A1-1 primeiro, que já tem piloto). Tudo `needs_review` até aprovar, com confiança por item | muito grande (fr ~865 strings) | 7 |
| 9 | Lógica por idioma do site | Comparador de "Ouça e traduza" para inglês (hoje é gramática do português e **não tem teste**), `referenceTranslations` por idioma (arquivo e banco), mp3 de introdução dos ditados em inglês (GitHub Actions) | médio | 8 |
| 10 | Conteúdo do **mandarim** em inglês | Mesmo caminho da fase 8. Histórias (`stories.js`) e `hanzi-data.js` entram aqui | muito grande (zh ~644 strings + histórias e hanzi) | 8 e 9 |
| 11 | Servidor | `notification_templates.ui_language` (hoje escolhe por idioma estudado), `notification-cron` com novo deploy, e-mails, badges | médio | 5 |
| 12 | Site `/ptbr` (português para falantes de inglês) | Ver seção 4 | muito grande, projeto próprio | 5 a 11 |
| 13 | Planos por idioma estudado | Decisão futura (seção 5) | a definir | 12 |

As fases 5, 6 e 7 podem andar em paralelo. Espanhol e outros idiomas de site: adiados.

## 4. O que o site `/ptbr` exige (para dimensionar já)
É um **novo idioma estudado**, não só uma nova interface. Itens do checklist de idioma novo:
- Trilha completa autorada em inglês desde o início (níveis, módulos, unidades, vocabulário, diálogos, notas de realidade e cultura sobre o Brasil).
- Áudio em português do Brasil (já existe voz `pt-BR` no pipeline de áudio, usada hoje só nas instruções dos ditados).
- Validadores da língua-alvo para o português: acentuação, ditado, conjugação, tons/pronúncia.
- Course Decks do idioma, Anki (nome dos campos), desafios por categoria seguindo a regra de `shared/challenge-policy.js`.
- Notas sobre a pronúncia e os erros típicos de quem fala inglês.
- Todos os idiomas de site disponíveis no lançamento (hoje: pt-BR e en). Para `/ptbr`, oferecer pt-BR como idioma do site provavelmente não faz sentido (brasileiro não estuda português aqui); proponho oferecer só inglês. **Confirmar.**

## 5. Decisões

### Já tomadas por você
1. Idioma do site e L1 são a mesma coisa; uma escolha só.
2. Conteúdo também migra para o idioma do site.
3. Guardar na conta já.
4. Francês inteiro antes do mandarim. Idiomas novos entram com todos os idiomas de site.
5. **Trocar o idioma do site nunca será premium.**
6. Espanhol continua congelado.
7. Aviso de limite diz só "apague" (feito).

### Em aberto (com recomendação)
A. **Enquanto uma lição ainda não tem inglês:** recomendo mostrar o português daquela lição com um aviso em inglês ("This lesson isn't available in English yet. Showing Portuguese.") em vez de esconder a lição. A alternativa é só liberar o inglês no `/fr` quando a trilha toda estiver traduzida.
B. **Idiomas de site que cada site oferece:** `/fr` e `/zh`: pt-BR e en. `/ptbr`: só en (proposta acima).
C. **Quem revisa o inglês:** o fluxo atual (confiança por item, links do Reverso, você aprova) continua?
D. **Nomes das categorias de desafios** ("Listen and Translate", "Accents"): traduzir quando a aba Desafios for migrada (você aprovou a direção; o texto sai na fase 6).

### Futura (não decidir agora)
**Planos por idioma estudado**, a sua proposta: Free = 1 idioma de estudo; Basic = premium em 1 idioma; Pro = premium em todos. Hoje não há infraestrutura de assinatura/pagamento no código (só ativação manual no painel), então isso entra depois da fase 12.

## 6. Riscos
- Só adicionar `t_en` **não basta**. A análise do código achou 7 pontos que quebram: textos longos de aula, comparador PT, `back_trans` e `lang:'pt-BR'` fixos em cartões do usuário, títulos de Course Deck em PT no banco, áudio de instrução em PT, comparações com o português, falta de testes.
- Corrida ao gravar `_meta` junto com o salvar do progresso (mitigação na seção 2).
- Qualidade: tudo entra como `needs_review`; nada publicado sem sua aprovação.
- Edge Function: commit não basta, precisa de `deploy_edge_function`.
- Volume: a fase 8 sozinha tem ~865 strings; a 12 é um curso novo inteiro.
- Cada lote novo de conteúdo precisa passar pelo checklist de desafios (`shared/challenge-policy.js`) e relatar nível de confiança.

## 7. Critério de "pronto" deste planejamento
Escopo definido e apresentado: eixos, arquitetura, fases feitas e próximas, `/ptbr`, riscos e decisões. A execução começa pela fase 5, quando você mandar.

## Troca de idioma do site -- decisões aprovadas (2026-10-06)

1. **Idioma do site é preferência da conta** (Configurações > "Idioma da interface"), livre a qualquer momento e válida para todos os idiomas estudados. Progresso NÃO é separado por idioma do site (isso dobraria cartões e o teto de 20 do plano grátis).
2. **Aviso antes de trocar** (`#ui-language-confirm-modal`): o texto e as explicações mudam, o progresso continua salvo. Cancelar devolve o seletor.
3. **Progresso segue a palavra, não a posição** (`shared/card-variants.js`, `STATE.cardVariants`, salvo na conta): quando o idioma do site troca a palavra estudada de um slot (país do aluno; hanzi 巴/美), o histórico vai para uma gaveta por palavra e o da palavra nova é restaurado ou começa do zero. Ids não mudam; só cartões que trocam de palavra são afetados.
4. **Primeiro acesso de conta nova** (`#ui-language-first-modal`, `askUiLanguageOnFirstAccess` em `shared/auth.js`): pergunta o idioma, com o do navegador como sugestão. Não pergunta para conta que já tem progresso ou idioma salvo, nem com `?ui=` na URL, nem se o navegador já guardou uma escolha. Convidado não é perguntado.
5. Notificações em inglês ativadas no banco (78 templates `ui_language='en'`), escolhidas pelo idioma do site de cada conta.

Testes: `tests/i18n/test_card_variants.js`, `test_card_variants_browser.js`, `test_ui_language_confirm_browser.js`, `test_ui_language_first_access_browser.js`.
