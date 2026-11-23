-- 130: Conectar Notion, trocar coluna/banco/data relê todas as linhas (correção da 128).
-- Problema: notion_save_source zerava o cursor, mas notion_ingest pula a linha cuja data de edição no Notion não mudou;
-- depois de trocar "Aluno/a" pela "Ficha do Aluno", as linhas antigas ficavam com o nome da coluna antiga (vazio = "Sem nome").
-- Correção: ao mudar o banco, as colunas ou o "trazer a partir de", esquece a data de edição guardada das linhas (UPDATE, sem DELETE).
-- Conserto único: linhas "sem aluno" já lidas são lidas de novo na próxima leitura (cursor zerado).

create or replace function public.notion_save_source(p_database_id text, p_title text, p_column_map jsonb, p_import_from date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_keys text[]; v_same boolean;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if not exists (select 1 from public.notion_connections where user_id = v_me and access_token <> '') then return jsonb_build_object('error', 'not_connected'); end if;
  if coalesce(p_database_id, '') !~ '^[0-9a-f-]{32,36}$' then return jsonb_build_object('error', 'invalid_database'); end if;
  if jsonb_typeof(p_column_map) <> 'object' or not (p_column_map ? 'date') or not (p_column_map ? 'student') then
    return jsonb_build_object('error', 'need_date_and_student');
  end if;
  select array_agg(k) into v_keys from jsonb_object_keys(p_column_map) k;
  if exists (select 1 from unnest(v_keys) k where k not in ('date', 'student', 'topic', 'homework', 'attendance', 'skills', 'language')) then
    return jsonb_build_object('error', 'invalid_column');
  end if;
  if p_import_from is null or p_import_from > v_today or p_import_from < v_today - 400 then
    return jsonb_build_object('error', 'invalid_date');
  end if;
  select exists (select 1 from public.notion_sources s where s.user_id = v_me and s.database_id = p_database_id
                 and s.column_map = p_column_map and s.import_from = p_import_from) into v_same;
  insert into public.notion_sources (user_id, database_id, title, column_map, import_from, linked_on)
  values (v_me, p_database_id, left(p_title, 200), p_column_map, p_import_from, v_today)
  on conflict (user_id) do update set
    -- trocar de banco ou de colunas faz ler tudo de novo (cursor zerado); o dia da ligação fica o primeiro
    cursor = case when notion_sources.database_id = excluded.database_id and notion_sources.column_map = excluded.column_map
                  and notion_sources.import_from = excluded.import_from then notion_sources.cursor end,
    database_id = excluded.database_id, title = excluded.title, column_map = excluded.column_map,
    import_from = excluded.import_from, enabled = true, updated_at = now();
  -- 130: com outro banco, outras colunas ou outra data, as linhas já lidas são lidas de novo mesmo sem mudança no Notion
  -- (antes elas eram puladas e ficavam com o valor da coluna antiga, ex.: "Sem nome" depois de trocar para a Ficha do Aluno).
  -- Aula já ligada continua igual: _notion_apply só regrava a aula quando a linha muda no Notion.
  if not v_same then
    update public.notion_pages set last_edited = null where user_id = v_me;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.notion_save_source(text, text, jsonb, date) from public, anon;
grant execute on function public.notion_save_source(text, text, jsonb, date) to authenticated;

update public.notion_pages set last_edited = null where match_state = 'review' and match_reason = 'sem aluno';
update public.notion_sources s set cursor = null
 where exists (select 1 from public.notion_pages p where p.user_id = s.user_id and p.last_edited is null);
