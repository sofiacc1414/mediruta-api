-- HU-09/HU-07 — "Mis pedidos" del lado Domiciliario: hasta ahora no
-- existía ninguna forma de listar los pedidos que ya atendió (en
-- curso, entregados o cancelados) — solo estaba el pool
-- (`listar_pedidos_disponibles`, pedidos en_asignacion sin dueño
-- todavía) y el pedido activo puntual (`obtener_pedido_activo_
-- domiciliario`). Mismo criterio que `listar_solicitudes` del lado
-- Paciente: la API devuelve todo, el filtro Activas/Historial lo hace
-- la UI.

create or replace function app.listar_historial_pedidos_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.creado_en
  from public.solicitudes s
  where s.domiciliario_id = p_domiciliario_id
  order by s.creado_en desc;
$$;

revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from public;
revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from anon;
revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from authenticated;
grant execute on function app.listar_historial_pedidos_domiciliario(uuid) to mediruta_app;
