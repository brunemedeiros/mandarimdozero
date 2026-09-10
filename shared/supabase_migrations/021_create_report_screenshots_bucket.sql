-- Bucket de screenshots opcionais anexados a um report (ver 020,
-- shared/reports.js) -- mesmo padrão de `avatars` (004), com duas
-- diferenças deliberadas:
--   1. Sem "upsert": cada report é um arquivo novo (nome com timestamp +
--      componente aleatório), nunca sobrescreve -- diferente do avatar,
--      que tem path fixo por conta.
--   2. Escrita liberada pra `anon` também (convidados podem reportar, ver
--      020) -- sem verificação de pasta pelo auth.uid() (quem não tem
--      sessão não tem uid pra verificar contra). O path aleatório já é a
--      proteção prática (mesmo raciocínio de avatars ser público: link
--      direto não é listável, só quem já tem a URL -- que só a admin vê,
--      via o report na tabela `reports`, RLS-protegida -- consegue abrir).
insert into storage.buckets (id, name, public)
values ('report-screenshots', 'report-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "report_screenshots_public_read" on storage.objects;
create policy "report_screenshots_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'report-screenshots');

drop policy if exists "report_screenshots_public_insert" on storage.objects;
create policy "report_screenshots_public_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'report-screenshots');
