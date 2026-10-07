# Relatório do piloto automático — 2026-10-05

## 1. Resumo
Executei as fases 5, 6 (primeiro lote) e 7 do roadmap de idioma do site. O idioma do site agora é gravado na conta, as telas Configurações e menu do avatar usam o catálogo i18n (PT e EN), e o português que funcionava como lógica (Anki, idioma da tradução de cartão legado) foi desatado sem mudar nada visível. Verificação independente aprovou as três fases. Nenhum PR foi aberto.

## 2. Decisões que tomei por você
- **Ordem de leitura do idioma:** conta, depois navegador (localStorage), depois pt-BR. Não usei o idioma do navegador (navigator.language), para não trocar para inglês quem hoje vê português. Reverter: ajustar `getAccountUiLanguage` em `shared/language-pref.js`.
- **Conta sem idioma gravado:** vale o do navegador e nada é gravado sozinho; só uma troca explícita no seletor grava. 
- **Idioma da tradução de cartão legado:** continua português por padrão (`legacyTranslationLang`), não segue o idioma do site, porque a tradução pertence ao dado.
- **Títulos de Course Deck:** o banco NÃO foi alterado. A RPC `ensure_course_decks` renomeia o deck para todas as contas se o título enviado mudar, então o cliente continuará enviando português e a exibição usará `courseDeckDisplayName` (já criada, ainda não ligada). 
- **`kind` do report ("problema"/"sugestao"):** deixado como está; é identificador gravado no banco, não texto de tela.
- **Nomes de campo do Anki:** reconhecimento por posição com lista fechada de apelidos (Caractere/Character/Hanzi..., Tradução/Translation...). Reverter: commit 7afba26.

## 3. Pendências que precisam de você
- Aprovar as 30 traduções EN novas (`docs/i18n/traducoes-en-pendentes.md`, status needs_review; 25 confiança alta, 5 média).
- Nenhuma decisão irreversível foi tomada; nada foi enviado a alunos, nem alterado em produção.
- Ainda sem teste dedicado de byte-igualdade do .apkg exportado (recomendação do verificador).

## 4. O que foi alterado
Commits na branch `claude/confident-brahmagupta-8v7rg0`:
- `949d840` Fase 6 lote 1: `fr/index.html`, `zh/index.html`, `shared/i18n/pt-BR.js`, `en.js`, tabela de traduções.
- `21bd172` Fase 5: `shared/language-pref.js`, `shared/auth.js`, `shared/i18n/i18n.js`, `tests/i18n/test_ui_language_persistence.js`.
- `7afba26` Fase 7: `shared/flashcard-model.js`, `anki-import.js`, `anki-export.js`, `deck-engine.js`, `tests/i18n/test_fase7_logic_unit.js`.
Sem migrations nem mudança no banco.

## 5. Problemas encontrados
- Os três subagentes pararam por limite semanal da API; retomei do início (nada tinha sido alterado) e concluíram.
- Riscos baixos: gravação do idioma na conta sem trava (mesma janela que já existia para o idioma estudado); falha ao gravar só aparece no console; login com conta só testado no Node (Supabase bloqueado no ambiente).
- `shared/flashcard-native-persistence.js` ainda tem `'pt-BR'` fixo em 4 lugares (conversão de cartão legado).

## 6. Divisão do trabalho
- opus: fase 5 (persistência na conta).
- sonnet: fase 6 lote 1 (Configurações e menu).
- opus: fase 7 (português como lógica).
- sonnet: verificação independente.

## Próximos passos sugeridos
Fase 6 restante (toasts, topbar, Meus Cartões, Decks, Revisão, trilha, Admin), depois fase 8 (conteúdo do francês em inglês).

## Atualização — Fase 6, lote 2 (commit a9ba114)
Migrados: toasts, Revisão, chrome da Trilha, Meus Cartões, Decks, notificações (shared/*.js, fr/app.js, zh/app.js). 314 chaves novas (pt-BR byte a byte conferido por script; EN needs_review, 19+ de confiança média, 0 baixa), todas em `traducoes-en-pendentes.md`. Verificador independente: aprovado, 0 bloqueantes.
Pendências: aprovar as traduções do lote 2; nota menor: tp() formata n>=1000 como "1.000" (sem impacto prático hoje).
Faltam na Fase 6: passos da lição, Conceito, exercícios, Estatísticas/Conjugação/Perfil/Histórias, painel de Hanzi, rótulos de Card Type, intervalos de shared/fsrs.js e Painel de Admin (por último). Feedback de correção fica para a fase 9.

## Atualização — Fase 6, lote 3 (commit c872cb8)
Migrados: passos da lição, tela de Conceito (rótulos/banners), missões do dia, exercícios (rótulos, dicas), Estatísticas/Progresso, painel de Hanzi (zh), perfil, ranking, login, editores de campo e gravador de áudio, intervalos do FSRS, wizard (fr/app.js, zh/app.js, 15 arquivos shared/*.js). 592 chaves novas (pt-BR conferido por script; EN em `traducoes-en-pendentes.md`). Verificador independente: aprovado, 0 bloqueantes; ?ui=en sem chaves cruas em fr e zh.
Única diferença no português: intervalo não inteiro (ex.: 1,4 dia) antes saía "1 dias", agora "1 dia". Inteiros idênticos.
Pendências para você: aprovar as traduções do lote 3 (média: concept.banner.reality.colloquialGrammar, concept.banner.culture.custom, fr.moduleDone.nowYouKnow, fr.challenges.cat.listenTranslate.subtitle, fr.challenges.lockedPremiumBtn, wizard.tier.1/2.label, entre outras; ver coluna Confiança).
Faltam na Fase 6: Painel de Admin e teacher-*.js (último), BADGES (nomes/descrições vão ao servidor, fase 11), mensagens de correção (fase 9), tela de seleção de Conjugação (index.html), mensagens de validação de flashcard-model/anki (fase de lógica). 4 falhas pré-existentes em tests/desafios-modulo (pageerror 'duration'), não relacionadas.

## Atualização — Fase 6, lote 4: Painel de Admin (commits d3e3642, b5f161c)
Migrados: analytics, badges, notificações, reports, alunos, flashcards, aulas, material de apoio, premium, desafios (admin), Admin Mode, abas e modais de preview no HTML (fr e zh). 649 chaves novas; pt-BR conferido por script contra 02ada4c (incluindo frases montadas para 0/1/N alunos); dados do banco (badges, templates, reports) não passam por t(). Verificador independente: aprovado, 0 problemas. Os 4 testes 'duration' de desafios-modulo falham igual no commit anterior.
Pendência para você: aprovar as traduções do lote 4 (`traducoes-en-pendentes.md`, seções Admin A/B/C; média: rótulos "Re-engagement — N day(s) inactive" e "guest"). O estado vazio dos Flashcards em inglês foi reescrito ("No cards yet -- select a student first.").
Fase 6 concluída, exceto itens deliberadamente fora: mensagens de correção e comparadores (fase 9), nomes/descrições de BADGES e textos de notificação (fase 11), validações de flashcard-model/anki e nomes de campo (fase 7 em diante), tela de seleção de Conjugação (index.html), lista de decks da aba Exportar. Próxima: fase 8 (conteúdo do francês em inglês, módulo a módulo, A1-1 primeiro).

## Atualização — Fase 8: conteúdo do francês em inglês (A1 completo)
Mecanismo: `shared/content-i18n.js` (overlay por idioma do site, carregado sob demanda de `fr/content.en.js`; o português continua sendo a fonte e volta byte a byte ao trocar de idioma; unidade sem tradução fica em português com o aviso "This lesson isn't available in English yet. Showing Portuguese."). Fonte das traduções: `docs/i18n/content-en/<unidade>.json` (+ `_meta.json` com módulos/níveis); `scripts/build-content-overlay.js` gera o arquivo do app; `scripts/validate-content-overlay.js` confere dimensões, campos vazios e tags HTML.
Traduzidas: as 20 unidades comunicativas (A1-1 do piloto, A1-2 a A1-20) e as 10 de gramática (A1-g1 a g10), com títulos de módulo, nível e teste de nível. Cartões da trilha mostram o inglês sem mexer em id/FSRS. Francês e respostas dos exercícios intactos.
Testes: tests/i18n/test_content_en.js (26), i18n unit 1711, lint OK, Playwright i18n 209, fases E/H unit ok.
Pendência para você: aprovar as traduções em `traducoes-en-pendentes.md` (seções "Fase 8"): ~180 itens de confiança média e 3 de baixa (A1-3 "They're so big!", A1-16 posição do adjetivo reescrita para comparar com o inglês, e adaptações de comparação PT→EN nas gramáticas). Decisões editoriais para você: EN-US x EN-GB ("first floor", "check/bill", "dad/mom"), "autumn / fall", "metro / subway".
Ainda em português dentro do A1 (fase 9): feedback de correção, "Ouça e traduza", ditados, desafios, conjugação, teste de nível/pontos de verificação (perguntas), histórias. Próximo: fase 9.

## Atualização — Fase 9: lógica por idioma do site (commits 11936c5..)
Feito: (1) `shared/translation-compare.js`: comparador do "Ouça e traduza" por idioma (pt-BR idêntico ao código antigo, provado por teste diferencial em milhares de comparações; inglês novo, com contrações e checagem conservadora de concordância be/have/do, sem avisar em perguntas). Desafio sem referências em inglês cai em português. (2) Desafios (206) e ditados (21) em inglês: `docs/i18n/challenges-en.json` e `dictations-en.json`, gerados em `fr/challenges.en.js`, carregados sob demanda junto do conteúdo. (3) 124 chaves de interface restantes (feedback de correção, player de Desafios, níveis, lembretes, textos estáticos de fr/zh index.html) + Estudo/Desafios/Perfil/"dias seguidos". (4) Áudio dos ditados em inglês preparado, NÃO gerado: Action "Áudio TTS" > modo `ditados-en` cria `dictation-<id>-guided.en.mp3` (instruções em inglês, voz en-US-Chirp3-HD-Achernar); depois mude `DICTATION_AUDIO_EN_READY` para true em `fr/dictations.js`. Enquanto isso, o site em inglês toca a locução em português.
Verificador independente: aprovado com ressalvas; o bloqueante condicional (falso erro de concordância em perguntas em inglês) foi corrigido. Testes: i18n unit, Playwright i18n/E/H, comparador (18), conteúdo (30).
Pendências para você: aprovar as traduções "Fase 9" em `traducoes-en-pendentes.md` (≈42 itens média/baixa dos desafios; frases de elogio/combo e avisos da interface); rodar a Action `ditados-en` (precisa do Secret GCP_TTS_KEY; a voz en-US-Chirp3-HD-Achernar nunca foi testada aqui); decidir se o aviso de concordância em inglês deve reprovar ou só avisar (hoje reprova, como no português). Ainda em português no site em inglês: nomes das conquistas (BADGES, fase 11) e conteúdo do mandarim (fase 10). Duplicata antiga: expr-lote2-012 e 018 têm o mesmo sentido.

## Atualização — Fase 10: conteúdo do mandarim em inglês
Mecanismo: o mesmo overlay do francês (`shared/content-i18n.js`), agora também para histórias e banco de hanzi; `zh/content.en.js` é gerado por `node scripts/build-content-overlay.js en zh` a partir de `docs/i18n/content-zh-en/` (18 unidades, `_stories.json`, `_hanzi.json`, `_meta.json`); `SITE=zh node scripts/validate-content-overlay.js en` valida. Traduzidos: 18 unidades HSK1 (títulos, objetivos, lições, vocabulário, frases, diálogos, conceitos/notas, verdadeiro/falso), 4 histórias (83 linhas, 12 perguntas) e 198 hanzi (significados, radicais, 7 mnemônicos). Chinês, pinyin e ordem das respostas intactos; unidade sem tradução cai em português com aviso. Correção de um defeito antigo: o progresso salvo trazia o texto do idioma em que foi salvo e sobrescrevia o atual ao carregar; agora os cartões (fr e zh, vocabulário e hanzi) são atualizados de novo depois de carregar.
Testes: `tests/i18n/test_content_zh_en.js` (16: pt-BR idêntico, en, aviso, progresso salvo, volta ao português byte a byte), fr 30, i18n unit 1833, lint OK, Playwright i18n 209, fases E/H ok.
Pendência para você: aprovar as traduções em `traducoes-en-pendentes.md` (seção "Fase 10"): 208 itens de confiança média e 12 de baixa, incluindo comparações com o português reescritas para o inglês, nota cultural de pechinchar e etimologia de "chá" mantidas como no português sem conferência, e o radical de 冷. Erro no original em português: a unidade 16 (hao-vs-ri) diz que 日 aparece em 今天/明天, mas ali é 天 (o inglês mantém só 星期日); decida se corrijo o português também.
Ainda em português no site em inglês: nomes de conquistas e textos de notificação (fase 11, servidor), "Ouça e traduza" não existe no zh. Próximas: 11 (servidor), 12 (/ptbr), 13 (planos).


## Fase 11 -- servidor (notificações, e-mails, conquistas)

- Migration 056 (aplicada ao vivo): `notification_templates.ui_language` (padrão pt-BR) + 78 templates em inglês, **inativos** até aprovação.
- `notification-cron` v19 (deploy ao vivo): escolhe o template pelo idioma do site da conta (`progress.data._meta.uiLanguage`); sem variante ativa no idioma, cai no português. Rodapé do e-mail, título padrão do push e lista de alunas do alerta da professora também seguem o idioma de quem recebe.
- Cliente (`shared/notifications.js`): mesma regra para notificações imediatas.
- Conquistas: nomes/descrições viram chaves i18n (`badge.*`); as do catálogo do banco usam tradução se existir, senão o texto do banco.
- Testes: i18n unit 1869, Playwright i18n 209, conquistas 12 (pt-BR idêntico ao commit anterior), lint, fases E/F/G/H.
- Fora desta fase: nomes de campo do Anki e mensagens de validação de cartões (ainda em português).
