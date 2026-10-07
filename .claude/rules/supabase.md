---
paths:
  - "supabase/**"
  - "shared/supabase_migrations/**"
  - "fr/scripts/supabase_migrations/**"
  - "shared/supabase-client.js"
  - "shared/auth.js"
  - "shared/roles.js"
---

# Supabase (banco, RLS, Edge Functions)

Procedimento de aplicar migration: skill `migration-supabase`.

- Projetos: produção `eigjocalzwamisgqilhg`, Staging `ilfjzizjfcmhibkhwber`. Conferir `get_project` antes de escrever.
- Migration = arquivo novo numerado em `shared/supabase_migrations/` (desafios: `fr/scripts/supabase_migrations/`);
  nunca editar migration já aplicada; nunca editar `supabase_migrations.schema_migrations` à mão.
- Padrões do schema: ids `bigint generated always as identity`; donos `uuid references auth.users`; enum como
  `text check (col in (...))`; funções com `security definer` sempre com `set search_path = public`, checagem de
  autorização DENTRO da função, `revoke` de `public` e `anon` explícito (o Supabase dá grant direto a `anon`).
- Comparação com `auth.jwt()->>'email'` sempre com `coalesce(..., '')` (NULL nunca pode virar "é admin").
- Admin por e-mail `brunemed1310@gmail.com`; `teacher_flashcards` só o admin escreve (RLS 026, intencional).
- `profiles` é de leitura pública: dado pessoal (gênero etc.) vai em `profile_private` (RLS só do dono).
- Edge Functions: `verify_jwt:true`, CORS (OPTIONS + cabeçalhos) em toda resposta, nunca logar segredo.
  Mudou o código → novo `deploy_edge_function`. Secrets: `TTS_PROVIDER_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- Resend ativo (domínio `profbrune.com.br`). Só a faixa de reengajamento tem e-mail; outros eventos só `in_app`.
- Testes de banco: transação + `ROLLBACK`, hash/contagem antes e depois, zero resíduo.
