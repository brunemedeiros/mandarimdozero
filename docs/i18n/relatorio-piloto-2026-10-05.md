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
