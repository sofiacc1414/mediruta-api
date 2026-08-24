-- HU-07 — "Novedad en pedido": un incidente que el domiciliario reporta
-- a mitad de camino (no entregan, falta un medicamento, algo pasó) y que
-- el admin resuelve después. Es una bandera aparte del estado real del
-- pedido, no un estado más (ver migración anterior) — por eso vive en su
-- propia tabla en vez de columnas en `solicitudes`: un mismo pedido puede
-- tener más de una novedad a lo largo de su vida, y de acá sale directo
-- la lista de "novedades abiertas" para el admin (resuelta_en is null),
-- sin tener que reconstruirla de un historial genérico.
create table public.novedad_solicitud (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null
    references public.solicitudes (id) on delete cascade,
  reportada_por uuid not null references public.usuarios (id),
  detalle text not null,
  creado_en timestamptz not null default now(),
  resuelta_en timestamptz,
  resuelta_por uuid references public.usuarios (id),
  constraint novedad_solicitud_detalle_no_vacio_check check (
    length(btrim(detalle)) > 0
  ),
  constraint novedad_solicitud_resuelta_por_check check (
    (resuelta_en is null) = (resuelta_por is null)
  )
);

create index novedad_solicitud_solicitud_id_idx
  on public.novedad_solicitud (solicitud_id, creado_en desc);

-- Para la lista de "novedades abiertas" del admin (Web) — filtra por
-- resuelta_en is null, ordenada por más antigua primero.
create index novedad_solicitud_abiertas_idx
  on public.novedad_solicitud (creado_en)
  where resuelta_en is null;

alter table public.novedad_solicitud enable row level security;
alter table public.novedad_solicitud force row level security;

revoke all on table public.novedad_solicitud from anon;
revoke all on table public.novedad_solicitud from authenticated;
