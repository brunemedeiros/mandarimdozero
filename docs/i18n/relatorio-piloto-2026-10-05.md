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
