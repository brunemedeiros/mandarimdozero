-- 065 -- Paridade de GRANTs de tabela com a produção (anon / authenticated / service_role).
--
-- Por quê: as migrations 001..064 criam tabelas, RLS e policies, mas nunca emitem GRANT. Na produção
-- (projeto antigo) o Supabase aplicava, por padrão, SELECT/INSERT/UPDATE/DELETE a esses três papéis em
-- toda tabela criada em `public`, e a RLS decidia o acesso. Em projetos novos (staging, dev, recuperação)
-- o padrão é restritivo (o `postgres` só concede TRUNCATE/REFERENCES/TRIGGER/MAINTAIN): a API devolve
-- `permission denied for table ...` mesmo com RLS e policies corretas. Medido em 2026-10-02 (somente leitura):
--   produção : anon/authenticated/service_role = DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--   staging  : anon/authenticated/service_role =        MAINTAIN,REFERENCES,TRIGGER,TRUNCATE  (sem DML)
--
-- Escopo MÍNIMO (não é cópia cega da produção):
--   * só os 4 privilégios DML (SELECT, INSERT, UPDATE, DELETE) nas tabelas de `public`; o resto já existe;
--   * NÃO toca funções: a superfície de EXECUTE do staging é igual ou mais restrita que a da produção
--     (as migrations revogam PUBLIC/anon de propósito) e continua assim;
--   * NÃO toca sequências: as colunas são `generated ... as identity` e o INSERT em coluna identity não
--     exige privilégio na sequência;
--   * NÃO altera RLS, policies, triggers nem dados: continuam sendo a autoridade (a 063 e a 066 tratam
--     das regras de plano/role; esta migration não "resolve" nenhuma delas).
-- Os defaults de função/sequência da produção NÃO são replicados (dariam EXECUTE a anon em funções
-- futuras), só o default de TABELA, que é o que mantém tabelas futuras alinhadas.
--
-- Idempotente: GRANT repetido é no-op. Na produção é no-op estrito (os privilégios já existem).

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

-- Tabelas criadas depois (por `postgres`, o papel que roda as migrations) nascem com o mesmo padrão
-- da produção. Não afeta objetos existentes.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- rollback (NUNCA na produção): revoke select, insert, update, delete on all tables in schema public
--   from anon, authenticated, service_role;
