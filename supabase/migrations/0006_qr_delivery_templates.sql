alter table public.events
  add column if not exists qr_config jsonb not null default jsonb_build_object(
    'mode', 'digital',
    'template_url', null,
    'width_mm', 85.6,
    'height_mm', 54,
    'qr_x', 68,
    'qr_y', 50,
    'qr_size', 22
  );

alter table public.events
  drop constraint if exists events_qr_config_object_check;

alter table public.events
  add constraint events_qr_config_object_check check (jsonb_typeof(qr_config) = 'object');

create index if not exists events_qr_config_mode_idx
  on public.events ((qr_config->>'mode'));
