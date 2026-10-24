-- Módulo 4 — la pantalla de cobro del Domiciliario (efectivo) necesita
-- mostrar cuánto cobrar. Se usa la foto del precio ya persistida al
-- enviar (`copago_cobrado`/`domicilio_cobrado`, ver migración
-- `wallet_domiciliario_pasarela_pago`) — estable, no depende de que la
-- tarifa configurada hoy siga siendo la misma que cuando se envió el
-- pedido.

drop function if exists app.obtener_pedido_activo_domiciliario(uuid);

create function app.obtener_pedido_activo_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  metodo_pago text,
  monto_a_cobrar numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia,
    s.creado_en, s.metodo_pago,
    coalesce(s.copago_cobrado, 0) + coalesce(s.domicilio_cobrado, 0)
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
  metodo_pago text,
  monto_a_cobrar numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia,
    s.creado_en, s.metodo_pago,
    coalesce(s.copago_cobrado, 0) + coalesce(s.domicilio_cobrado, 0)
  from public.solicitudes s
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id;
$$;

revoke all on function app.obtener_pedido_activo_domiciliario(uuid) from public, anon, authenticated;
grant execute on function app.obtener_pedido_activo_domiciliario(uuid) to mediruta_app;

revoke all on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) from public, anon, authenticated;
grant execute on function app.obtener_pedido_por_id_domiciliario(uuid, uuid) to mediruta_app;
