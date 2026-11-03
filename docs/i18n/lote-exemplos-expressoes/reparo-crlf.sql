-- Só se o texto colado no editor do navegador trocar \n por \r\n (aconteceu no Staging em 2026-10-29, 24 linhas de diálogo).
-- O aplicar-lote-exemplos.sql atual não tem quebra de linha dentro do texto (usa chr(10)), então isso não deve mais ser preciso.
update public.challenges set data = replace(data::text, E'\\r\\n', E'\\n')::jsonb where id like 'expr-%' and position(E'\\r\\n' in data::text) > 0 returning id;
