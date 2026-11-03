-- 125_etapa7_badge_catalog_site
-- Etapa 7 (vocabulário único), lote 1b, aprovado pela dona: o produto se chama "site"; "app" só para o instalado no celular.
-- Só UPDATE de texto em 2 linhas de badge_catalog (description). Nada de esquema, nada de progresso.
-- O site mostra a tradução do catálogo de i18n (badge.catalog.<id>.desc em shared/i18n/) quando ela existe, nos dois idiomas;
-- o texto do banco só aparece se a chave faltar. As chaves foram trocadas no mesmo lote (ver docs/i18n/etapa7-vocabulario-auditoria.md, seção 10).
--
-- Texto antigo (para desfazer):
--   update public.badge_catalog set description = 'Divulgou o aplicativo para outras pessoas'
--     where id = 'ambassador' and description = 'Divulgou o site para outras pessoas';
--   update public.badge_catalog set description = 'Primeiras pessoas a usar o app em sua fase inicial'
--     where id = 'pioneer' and description = 'Primeiras pessoas a usar o site em sua fase inicial';
--
-- Idempotente: só troca se o texto ainda for o antigo (no Staging essas 2 linhas não existem: 0 linhas afetadas).

update public.badge_catalog
   set description = 'Divulgou o site para outras pessoas'
 where id = 'ambassador'
   and description = 'Divulgou o aplicativo para outras pessoas';

update public.badge_catalog
   set description = 'Primeiras pessoas a usar o site em sua fase inicial'
 where id = 'pioneer'
   and description = 'Primeiras pessoas a usar o app em sua fase inicial';
