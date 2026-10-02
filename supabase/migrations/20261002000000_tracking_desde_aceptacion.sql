-- Bug real reportado: el Paciente pedía ver el seguimiento en vivo desde
-- que el domiciliario ACEPTA el pedido, no solo en el último tramo
-- (`en_camino_entrega`). Amplía la ventana de tracking a todos los
-- estados activos de la entrega — la app (mi_pedido_activo_screen.dart)
-- ya documentaba la restricción anterior como "PRD 2.2, bajo demanda";
-- se actualiza ese criterio acá y del lado del cliente.

create or replace function app.actualizar_ubicacion_en_vivo(
  p_domiciliario_id uuid,
  p_solicitud_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_encontrado boolean;
begin
  if p_domiciliario_id is null or p_solicitud_id is null or p_lat is null or p_lng is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;
  if p_domiciliario_id is distinct from app.current_user_id() then
    return query select 'no_autorizado'::text;
    return;
  end if;

  select exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and domiciliario_id = p_domiciliario_id
      and estado in (
        'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
        'en_camino_entrega', 'en_sitio'
      )
  ) into v_encontrado;

  if not v_encontrado then
    return query select 'pedido_no_en_camino'::text;
    return;
  end if;

  update public.perfil_domiciliario
  set ubicacion = public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326),
      ubicacion_actualizada_en = now()
  where usuario_id = p_domiciliario_id;

  return query select 'ok'::text;
end;
$$;

create or replace function app.obtener_posicion_en_vivo(
  p_usuario_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  estado text,
  domiciliario_lat double precision,
  domiciliario_lng double precision,
  ubicacion_actualizada_en timestamptz,
  farmacia_lat double precision,
  farmacia_lng double precision,
  entrega_lat double precision,
  entrega_lng double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitud record;
  v_autorizado boolean;
begin
  if p_usuario_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;
  if p_usuario_id is distinct from app.current_user_id() then
    return query select 'no_autorizado'::text, null::text, null::double precision, null::double precision,
      null::timestamptz, null::double precision, null::double precision, null::double precision, null::double precision;
    return;
  end if;

  select * into v_solicitud from public.solicitudes where id = p_solicitud_id;
  if v_solicitud is null then
    return query select 'pedido_no_encontrado'::text, null::text, null::double precision, null::double precision,
      null::timestamptz, null::double precision, null::double precision, null::double precision, null::double precision;
    return;
  end if;

  v_autorizado := v_solicitud.paciente_id = p_usuario_id
    or v_solicitud.domiciliario_id = p_usuario_id
    or app.usuario_tiene_rol_habilitado(p_usuario_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_usuario_id, 'ROOT');

  if not v_autorizado then
    return query select 'no_autorizado'::text, null::text, null::double precision, null::double precision,
      null::timestamptz, null::double precision, null::double precision, null::double precision, null::double precision;
    return;
  end if;

  -- Ventana de tracking ampliada: cualquier estado activo desde que el
  -- domiciliario acepta, o recién entregado/cancelado (2 min de margen
  -- para no cortar el mapa en seco justo al llegar).
  if v_solicitud.estado not in (
       'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
       'en_camino_entrega', 'en_sitio'
     )
     and not (
       v_solicitud.estado in ('entregado', 'cancelada')
       and v_solicitud.actualizado_en > now() - interval '2 minutes'
     )
  then
    return query select 'sin_tracking_disponible'::text, v_solicitud.estado, null::double precision, null::double precision,
      null::timestamptz, null::double precision, null::double precision, null::double precision, null::double precision;
    return;
  end if;

  return query
  select
    'ok'::text,
    v_solicitud.estado,
    public.st_y(pd.ubicacion::public.geometry),
    public.st_x(pd.ubicacion::public.geometry),
    pd.ubicacion_actualizada_en,
    public.st_y(v_solicitud.farmacia_ubicacion::public.geometry),
    public.st_x(v_solicitud.farmacia_ubicacion::public.geometry),
    public.st_y(v_solicitud.entrega_ubicacion::public.geometry),
    public.st_x(v_solicitud.entrega_ubicacion::public.geometry)
  from public.perfil_domiciliario pd
  where pd.usuario_id = v_solicitud.domiciliario_id;
end;
$$;

revoke all on function app.actualizar_ubicacion_en_vivo(uuid, uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function app.actualizar_ubicacion_en_vivo(uuid, uuid, double precision, double precision) to mediruta_app;

revoke all on function app.obtener_posicion_en_vivo(uuid, uuid) from public, anon, authenticated;
grant execute on function app.obtener_posicion_en_vivo(uuid, uuid) to mediruta_app;
