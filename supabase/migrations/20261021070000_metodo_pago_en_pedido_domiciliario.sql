-- Módulo 4 — el Domiciliario necesita saber el método de pago del
-- pedido activo para decidir el flujo al entregar: si ya está pagado
-- (tarjeta/transferencia) el código de entrega finaliza directo
-- ("ya pagado"); si es efectivo, abre la pantalla de cobro antes de
-- finalizar. Se agrega `metodo_pago` a ambas lecturas sin tocar nada
-- más de su forma.

drop function if exists app.obtener_pedido_activo_domiciliario(uuid);

create function app.obtener_pedido_activo_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  metodo_pago text
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia,
    s.creado_en, s.metodo_pago
  from public.solicitudes s
  where s.domiciliario_id = p_domiciliario_id
    and s.estado in (
      'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
      'en_camino_entrega', 'en_sitio'
    )
  order by s.creado_en desc
  limit 1;
$$;

drop function if exists app.obtener_pedido_por_id_domiciliario(uuid, uuid);

create function app.obtener_pedido_por_id_domiciliario(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  metodo_pago text
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia,
    s.creado_en, s.metodo_pago
  from public.solicitudes s
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id;
$$;

revoke all on function app.obtener_pedido_activo_domiciliario(uuid) from public, anon, authenticated;
grant execute on function app.obtener_pedido_activo_domiciliario(uuid) to mediruta_app;

revoke all on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) from public, anon, authenticated;
grant execute on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) to mediruta_app;
