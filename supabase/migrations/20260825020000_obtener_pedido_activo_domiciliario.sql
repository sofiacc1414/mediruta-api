-- HU-09/HU-07 — el Domiciliario no tenía ninguna forma de recuperar el
-- pedido que tiene en curso: `listar_pedidos_disponibles` deja de
-- incluirlo apenas lo acepta (pasa de `en_asignacion` a
-- `asignado_en_camino_farmacia`), y `obtener_solicitud`/
-- `listar_historial_solicitud`/`obtener_novedad_abierta_solicitud`
-- están acotados a `paciente_id`, no a `domiciliario_id` — un
-- Domiciliario que cierra la app a mitad de una entrega no tenía cómo
-- volver a ver "su" pedido. Hacen falta las 3 lecturas equivalentes,
-- acotadas por dueño real (`domiciliario_id`).
--
-- A propósito NO se expone `codigo_entrega` acá: el paciente se lo
-- dicta al Domiciliario recién al momento de la entrega — mostrárselo
-- de antemano en "Mi pedido activo" rompería el propósito del código.

create or replace function app.obtener_pedido_activo_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia, s.creado_en
  from public.solicitudes s
  where s.domiciliario_id = p_domiciliario_id
    and s.estado in (
      'asignado_en_camino_farmacia', 'medicamentos_recogidos',
      'en_camino_entrega', 'en_sitio'
    )
  order by s.creado_en desc
  limit 1;
$$;

revoke all on function app.obtener_pedido_activo_domiciliario(uuid) from public;
revoke all on function app.obtener_pedido_activo_domiciliario(uuid) from anon;
revoke all on function app.obtener_pedido_activo_domiciliario(uuid) from authenticated;
grant execute on function app.obtener_pedido_activo_domiciliario(uuid) to mediruta_app;

-- Historial del pedido activo — mismo shape que
-- `listar_historial_solicitud`, acotado por `domiciliario_id` en vez
-- de `paciente_id`.
create or replace function app.listar_historial_pedido_domiciliario(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  estado text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select h.estado, h.creado_en
  from public.historial_solicitud h
  join public.solicitudes s on s.id = h.solicitud_id
  where h.solicitud_id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
  order by h.creado_en asc;
$$;

revoke all on function app.listar_historial_pedido_domiciliario(uuid, uuid) from public;
revoke all on function app.listar_historial_pedido_domiciliario(uuid, uuid) from anon;
revoke all on function app.listar_historial_pedido_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.listar_historial_pedido_domiciliario(uuid, uuid) to mediruta_app;

-- Si el propio Domiciliario ya reportó una novedad sobre este pedido y
-- sigue sin resolver — evita ofrecerle "Reportar novedad" de nuevo en
-- "Mi pedido activo".
create or replace function app.obtener_novedad_propia_abierta(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  detalle text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.detalle, n.creado_en
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where n.solicitud_id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and n.resuelta_en is null
  order by n.creado_en desc
  limit 1;
$$;

revoke all on function app.obtener_novedad_propia_abierta(uuid, uuid) from public;
revoke all on function app.obtener_novedad_propia_abierta(uuid, uuid) from anon;
revoke all on function app.obtener_novedad_propia_abierta(uuid, uuid) from authenticated;
grant execute on function app.obtener_novedad_propia_abierta(uuid, uuid) to mediruta_app;
