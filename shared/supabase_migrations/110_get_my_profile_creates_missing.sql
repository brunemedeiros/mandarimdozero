-- 110 -- get_my_profile cria o perfil que faltar (2026-10-16).
--
-- Problema (produção, 2026-10-16): conta nova sem linha em profiles. O site chama get_my_profile(); sem linha ele
-- devolvia null, o site caía na leitura direta da tabela (fechada pela 080: 403) e parava ali, sem chamar
-- ensure_my_profile(). Resultado: conta sem @ e sem nome (não aparece na busca, Perfil sem edição, "Aluno(a)" no
-- Ranking) e "Aceitar convite" falhando (o aviso para a professora sai com o nome vazio: body null em notifications).
-- 21 contas estavam assim na produção.
-- Correção: get_my_profile() passa a criar a linha (ensure_my_profile, a mesma de sempre: username sorteado pelo
-- gatilho, display_name do metadado de login) quando ela não existe. Vale também para quem está com o site antigo
-- em cache. Deixa de ser STABLE (agora grava), por isso plpgsql VOLATILE. Mesma assinatura e mesmos grants.
-- Sem DROP. Grátis x Premium: não se aplica (conta).
-- ROLLBACK: recriar a versão da 080: language sql stable, select to_jsonb(p) from profiles p where p.user_id = auth.uid().

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if auth.uid() is null then return null; end if;
  select to_jsonb(p) into v from public.profiles p where p.user_id = auth.uid();
  if v is null then
    begin
      perform public.ensure_my_profile();
    exception when others then
      return null;
    end;
    select to_jsonb(p) into v from public.profiles p where p.user_id = auth.uid();
  end if;
  return v;
end;
$$;
