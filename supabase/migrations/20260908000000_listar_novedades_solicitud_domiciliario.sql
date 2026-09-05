-- HU-07/HU-09 (ronda 7) — el Domiciliario va a tener, igual que el
-- Paciente, un tab "Novedades" en su pantalla de pedido activo donde
-- reporta y consulta el estado de lo reportado sobre ese pedido. Hoy
-- solo existe `app.obtener_novedad_propia_abierta` (la última sin
-- resolver, sin `tipo` ni resultado). Se agrega el equivalente de
-- `app.listar_novedades_solicitud` (paciente) para el Domiciliario:
-- todas las novedades del pedido, resueltas o no, más nuevas primero.
-- Mismo criterio de ownership que `obtener_novedad_propia_abierta`:
-- por `s.domiciliario_id`, no por quién la reportó — así el
-- Domiciliario ve cualquier novedad sobre SU pedido (la haya
-- reportado el Paciente o él mismo), no solo las suyas.

create function app.listar_novedades_solicitud_domiciliario(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  tipo text,
  detalle text,
  origen text,
  creado_en timestamptz,
  resuelta_en timestamptz,
  accion_edicion text,
  datos_propuestos jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.tipo, n.detalle, n.origen, n.creado_en, n.resuelta_en,
    n.accion_edicion, n.datos_propuestos
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where n.solicitud_id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
  order by n.creado_en desc;
$$;

revoke all on function app.listar_novedades_solicitud_domiciliario(uuid, uuid) from public;
revoke all on function app.listar_novedades_solicitud_domiciliario(uuid, uuid) from anon;
revoke all on function app.listar_novedades_solicitud_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.listar_novedades_solicitud_domiciliario(uuid, uuid) to mediruta_app;
