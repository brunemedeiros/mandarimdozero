-- Stubs para testar a 091 no Postgres local: Vault e pg_net não existem aqui.
create schema if not exists vault;
create table if not exists vault.decrypted_secrets (name text primary key, decrypted_secret text);
create schema if not exists net;
create table if not exists net.calls (id bigserial primary key, url text, headers jsonb, body jsonb);
create or replace function net.http_post(url text, headers jsonb default '{}'::jsonb, body jsonb default '{}'::jsonb, timeout_milliseconds integer default 1000)
returns bigint language plpgsql as $$ declare v bigint; begin insert into net.calls(url, headers, body) values (url, headers, body) returning id into v; return v; end $$;
