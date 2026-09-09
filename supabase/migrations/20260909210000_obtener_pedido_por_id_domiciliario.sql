-- Ronda 11 — "Mis pedidos" del Domiciliario (Historial) era de solo
-- lectura sin detalle: tocar un pedido entregado/cancelado no llevaba
-- a ningún lado. `obtener_pedido_activo_domiciliario` no sirve para
-- esto porque filtra por estado "en curso" y hace `limit 1` (un solo
-- pedido a la vez); acá hace falta el mismo shape pero por id
-- puntual y sin filtro de estado — cualquier pedido que ese
-- Domiciliario haya atendido alguna vez.

create or replace function app.obtener_pedido_por_id_domiciliario(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
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
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id;
$$;

revoke all on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) from public;
revoke all on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) from anon;
revoke all on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) to mediruta_app;
