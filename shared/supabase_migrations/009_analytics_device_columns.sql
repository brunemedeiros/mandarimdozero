-- Analytics Fase 4: colunas de dispositivo em usage_events, pra segmentar
-- (item 8, "dispositivo") e alimentar a aba Dispositivos. Calculadas uma
-- vez por sessão em shared/analytics.js (analyticsDetectDevice(), a partir
-- de navigator.userAgent -- heurística simples, sem biblioteca) e anexadas
-- a cada evento gravado dali em diante. Eventos gravados ANTES desta
-- migration ficam com essas colunas null -- não há como preencher
-- retroativamente (o dado nunca existiu), então a agregação por
-- dispositivo trata null como "desconhecido", nunca inventa um valor.
--
-- Nenhuma policy nova: usage_events já tem INSERT (dono) e SELECT (admin)
-- cobrindo qualquer coluna da tabela, incluindo estas três.
alter table public.usage_events
  add column if not exists device_type text; -- 'mobile' | 'tablet' | 'desktop'
alter table public.usage_events
  add column if not exists browser text;     -- 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Opera' | 'outro'
alter table public.usage_events
  add column if not exists os text;          -- 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'outro'

create index if not exists usage_events_device_type_idx on public.usage_events (device_type);
