-- Correção da 091: se o aviso à função falhasse (extensão pg_net ausente, segredo faltando), o gatilho engolia o erro sem deixar rastro e a linha
-- ficava "pendente" sem explicação (achado no teste do Staging, que não tinha pg_net). Agora o motivo vai para a coluna `error` da linha
-- (o cron de reserva continua reenviando; ao processar com sucesso a função limpa o erro) e `_rb_agent_post` recusa em vez de ignorar quando falta segredo.
-- Aditiva e idempotente (create or replace); nenhum DROP.
create or replace function public._rb_agent_post(p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text := public._rb_agent_secret('rb_agent_url');
  v_anon text := public._rb_agent_secret('rb_agent_anon');
  v_token text := public._rb_agent_secret('rb_agent_token');
begin
  if coalesce(v_url, '') = '' or coalesce(v_anon, '') = '' or coalesce(v_token, '') = '' then
    raise exception 'rb_agent_nao_configurado: faltam segredos no Vault (rb_agent_url, rb_agent_anon, rb_agent_token)';
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon, 'x-agent-token', v_token),
    body := p_body,
    timeout_milliseconds := 60000);
end;
$$;
revoke execute on function public._rb_agent_post(jsonb) from public, anon, authenticated;

create or replace function public._rb_agent_inbox_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public._rb_agent_post(jsonb_build_object('action', 'process_inbox', 'inbox_id', new.id));
  exception when others then
    update public.review_bank_agent_inbox set error = left('envio: ' || sqlerrm, 300) where id = new.id;
  end;
  return new;
end;
$$;
revoke execute on function public._rb_agent_inbox_after_insert() from public, anon, authenticated;
