# Checklist de paridade — migração pra plataforma multilíngue

Congelado antes de qualquer refatoração (etapa 1 da migração). Cada item marcado
`[ ]` precisa ser reverificado manualmente nos dois idiomas depois que a
funcionalidade for extraída pra `shared/` — só marca `[x]` quando confirmado
funcionando nos dois, não quando o código só "parece certo".

## Compartilhado (hoje duplicado entre os dois `app.js`, alvo de `shared/`)

- [ ] Autenticação: Google OAuth
- [ ] Autenticação: e-mail/senha (login + cadastro + esqueci a senha)
- [ ] Modo convidado
- [ ] Logout
- [ ] Persistência de progresso (tabela `progress`, isolada por idioma)
- [x] Tema claro/escuro (persistido, sem piscar no load) — extraído pra `shared/theme.js`, testado nos dois idiomas (2025-09-01)
- [x] PWA: registro do service worker — extraído pra `shared/pwa.js` (2025-09-01). Manifest e o service worker em si continuam por idioma (cache list diferente), como esperado.
- [ ] Wizard de plano de estudo (meta diária)
- [ ] Motor de repetição espaçada (Revisão: Errei/Difícil/Bom/Fácil)
- [ ] Export pra Anki (.apkg via JSZip + sql.js)
- [x] Toast (erros e confirmações, ex: falha ao salvar progresso, +XP) — extraído pra `shared/toast.js`, testado nos dois idiomas (2025-09-01)
- [ ] Bandeira de link cruzado pro outro idioma (topbar)
- [ ] Pills de estatística (streak, XP)
- [ ] Navegação por abas

## Específico do francês (fica em `languages/fr/`)

- [ ] Aba Conjugação (motor de conjugação verbal)
- [ ] Aba Ditados
- [ ] Desafios: Expressões (pergunta/feedback, 2 exemplos com áudio, microatividade)
- [ ] Desafios: Ouça e traduza (heurística de concordância de pessoa gramatical)
- [ ] Desafios: Acentuação
- [ ] Fila de exercício único por nível (Ouça e traduza / Acentuação)
- [ ] Seções colapsáveis por nível A1/A2/B1/B2 (Expressões)
- [ ] Painel admin: revisão, edição, aprovação, publicação, despublicação
- [ ] Painel admin: pré-visualização "versão do aluno"
- [ ] Painel admin: busca, filtros (categoria/nível), paginação
- [ ] Painel admin: aprovação em lote
- [ ] Painel admin: importação via JSON
- [ ] Checklist de qualidade antes de aprovar
- [ ] Curadoria de recursos externos (artigo/YouGlish/dicionário)
- [ ] TTS offline (pipeline Python: Vertex AI + Google TTS + STT de validação)
- [ ] Skip link + labels de acessibilidade + contraste AA

## Específico do chinês (fica em `languages/zh/`)

- [ ] Aba 汉字 (Hanzi) com `hanzi-writer` (ordem de traços)
- [ ] Pinyin e tons
- [ ] Pool de metas diárias (fácil / revisão de hanzi / geral)
- [ ] Exercício "digite o que ouviu" embutido
- [ ] TTS ao vivo via Web Speech API do navegador

## Troca de idioma (teste específico da unificação, não existe hoje)

- [ ] Trocar Français → 中文 → Français sem recarregar a sessão
- [ ] Conteúdo do idioma errado nunca aparece durante/depois da troca
- [ ] Áudio de um idioma nunca toca associado a um exercício do outro
- [ ] Progresso/streak/XP de cada idioma permanece isolado
- [ ] URL reflete o idioma ativo e é compartilhável
