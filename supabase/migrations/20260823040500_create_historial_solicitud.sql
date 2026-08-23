-- HU-03 (G03 — "historial de estados disponible") — insert-only, mismo
-- espíritu que validaciones_domiciliario de HU-08: cada cambio de estado
-- inserta una fila acá, nunca se actualiza ninguna. Va a seguir
-- creciendo con HU-06/HU-09/HU-10/HU-11 sin cambiar de forma (siempre es
-- "esta solicitud pasó a este estado en este momento").

create table public.historial_solicitud (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null,
  estado text not null,
  creado_en timestamptz not null default now(),
  constraint historial_solicitud_solicitud_id_fkey
    foreign key (solicitud_id) references public.solicitudes (id) on delete cascade
);

create index historial_solicitud_solicitud_id_idx
  on public.historial_solicitud (solicitud_id, creado_en asc);

alter table public.historial_solicitud enable row level security;
alter table public.historial_solicitud force row level security;

revoke all on table public.historial_solicitud from anon;
revoke all on table public.historial_solicitud from authenticated;
