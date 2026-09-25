-- HU-16 — acceso temporal a documentos del paciente en la recogida.
-- Cada fila es un intento (permitido, rechazado o expirado). El
-- domiciliario solo puede leer los suyos. El alta la hace la API.

create table public.acceso_temporal (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null
    references public.solicitudes (id) on delete cascade,
  domiciliario_id uuid not null
    references public.usuarios (id) on delete cascade,
  creado_en timestamptz not null default now(),
  expira_en timestamptz,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  estado text not null,
  resultado text not null,
  constraint acceso_temporal_estado_check check (
    estado in ('activo', 'revocado', 'expirado', 'denegado')
  ),
  constraint acceso_temporal_resultado_check check (
    resultado in ('permitido', 'rechazado', 'expirado')
  ),
  constraint acceso_temporal_expira_si_permitido_check check (
    (resultado = 'permitido') = (expira_en is not null)
  )
);

create index acceso_temporal_domiciliario_idx
  on public.acceso_temporal (domiciliario_id, creado_en desc);

create index acceso_temporal_solicitud_activos_idx
  on public.acceso_temporal (solicitud_id)
  where estado = 'activo';

alter table public.acceso_temporal enable row level security;
alter table public.acceso_temporal force row level security;

revoke all on table public.acceso_temporal from anon;
revoke all on table public.acceso_temporal from authenticated;

create policy acceso_temporal_solo_propio
  on public.acceso_temporal
  for select
  to mediruta_app
  using (domiciliario_id = app.current_user_id());

-- Punto de la farmacia solo si el pedido es de este domiciliario.
-- No devuelve documentos.
create or replace function app.punto_farmacia_para_acceso(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  estado text,
  farmacia_lat double precision,
  farmacia_lng double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.estado,
    public.st_y(s.farmacia_ubicacion::public.geometry),
    public.st_x(s.farmacia_ubicacion::public.geometry)
  from public.solicitudes s
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and p_domiciliario_id is not distinct from app.current_user_id();
$$;

create or replace function app.listar_accesos_temporales(p_domiciliario_id uuid)
returns setof public.acceso_temporal
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_domiciliario_id is null
     or p_domiciliario_id is distinct from app.current_user_id() then
    return;
  end if;

  return query
  select *
  from public.acceso_temporal
  where domiciliario_id = p_domiciliario_id
  order by creado_en desc
  limit 50;
end;
$$;

revoke all on function app.punto_farmacia_para_acceso(uuid, uuid) from public;
revoke all on function app.punto_farmacia_para_acceso(uuid, uuid) from anon;
revoke all on function app.punto_farmacia_para_acceso(uuid, uuid) from authenticated;
grant execute on function app.punto_farmacia_para_acceso(uuid, uuid) to mediruta_app;

revoke all on function app.listar_accesos_temporales(uuid) from public;
grant execute on function app.listar_accesos_temporales(uuid) to mediruta_app;
