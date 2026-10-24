-- Supervisión de comportamiento de domiciliarios (G01-G05) — vista de
-- panel admin para detectar patrones inusuales (entregas, cancelaciones,
-- incidentes/novedades y calificaciones por domiciliario, con filtro de
-- periodo) y decidir si bloquear/reactivar la cuenta.
--
-- IMPORTANTE: no existe en el sistema un evento de "domiciliario
-- rechaza un pedido ofrecido" — el modelo de asignación es por aceptar
-- primero (app.aceptar_pedido), sin oferta explícita que se pueda
-- rechazar. Por eso estas funciones NO devuelven una columna de
-- "rechazos": agregarla requeriría primero diseñar ese evento en el
-- flujo de asignación, fuera del alcance de esta historia. La UI debe
-- mostrar ese dato como "no disponible", no como cero.

-- G01/G03 — resumen agregado por domiciliario, recalculado para el
-- rango de fechas pedido. Solo cuentas con rol DOMICILIARIO habilitado
-- (igual que app.listar_domiciliarios_pendientes).
create function app.listar_resumen_comportamiento_domiciliarios(
  p_admin_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  domiciliario_id uuid,
  nombre_completo text,
  correo text,
  estado_cuenta text,
  entregas_realizadas bigint,
  cancelaciones bigint,
  incidentes_reportados bigint,
  incidentes_abiertos bigint,
  calificacion_promedio numeric,
  calificaciones_cantidad bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id,
    u.nombre_completo,
    u.correo,
    u.estado_cuenta,
    coalesce((
      select count(*)
      from public.historial_solicitud hs
      join public.solicitudes s on s.id = hs.solicitud_id
      where s.domiciliario_id = u.id
        and hs.estado = 'entregado'
        and hs.creado_en::date between p_desde and p_hasta
    ), 0),
    coalesce((
      select count(*)
      from public.historial_solicitud hs
      join public.solicitudes s on s.id = hs.solicitud_id
      where s.domiciliario_id = u.id
        and hs.estado = 'cancelada'
        and hs.creado_en::date between p_desde and p_hasta
    ), 0),
    coalesce((
      select count(*)
      from public.novedad_solicitud n
      join public.solicitudes s on s.id = n.solicitud_id
      where s.domiciliario_id = u.id
        and n.creado_en::date between p_desde and p_hasta
    ), 0),
    coalesce((
      select count(*)
      from public.novedad_solicitud n
      join public.solicitudes s on s.id = n.solicitud_id
      where s.domiciliario_id = u.id
        and n.resuelta_en is null
        and n.creado_en::date between p_desde and p_hasta
    ), 0),
    (
      select avg(c.puntuacion)
      from public.calificaciones c
      join public.solicitudes s on s.id = c.solicitud_id
      where s.domiciliario_id = u.id
        and c.estado = 'activa'
        and c.creado_en::date between p_desde and p_hasta
    ),
    coalesce((
      select count(*)
      from public.calificaciones c
      join public.solicitudes s on s.id = c.solicitud_id
      where s.domiciliario_id = u.id
        and c.estado = 'activa'
        and c.creado_en::date between p_desde and p_hasta
    ), 0)
  from public.usuario_roles ur
  join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  where r.codigo = 'DOMICILIARIO'
    and ur.estado = 'habilitado'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by u.nombre_completo;
$$;

revoke all on function app.listar_resumen_comportamiento_domiciliarios(uuid, date, date) from public, anon, authenticated;
grant execute on function app.listar_resumen_comportamiento_domiciliarios(uuid, date, date) to mediruta_app;

-- G02 — mismo resumen pero para un solo domiciliario (vacío si no
-- existe, no tiene el rol habilitado, o p_admin_id no es admin/root —
-- el controller distingue "vacío" de "no encontrado").
create function app.obtener_resumen_comportamiento_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  domiciliario_id uuid,
  nombre_completo text,
  correo text,
  estado_cuenta text,
  entregas_realizadas bigint,
  cancelaciones bigint,
  incidentes_reportados bigint,
  incidentes_abiertos bigint,
  calificacion_promedio numeric,
  calificaciones_cantidad bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select *
  from app.listar_resumen_comportamiento_domiciliarios(p_admin_id, p_desde, p_hasta)
  where domiciliario_id = p_domiciliario_id;
$$;

revoke all on function app.obtener_resumen_comportamiento_domiciliario(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function app.obtener_resumen_comportamiento_domiciliario(uuid, uuid, date, date) to mediruta_app;

-- G02 — línea de tiempo de eventos de un domiciliario dentro del
-- periodo, para el detalle. `detalle`/`puntuacion`/`resuelto` quedan
-- NULL en los tipos que no aplican (entrega/cancelación no tienen
-- texto ni puntuación).
create function app.listar_eventos_comportamiento_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  tipo text,
  solicitud_id uuid,
  codigo_pedido text,
  detalle text,
  puntuacion smallint,
  resuelto boolean,
  fecha timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select 'entrega', s.id, s.codigo_pedido, null::text, null::smallint, null::boolean,
    hs.creado_en as fecha
  from public.historial_solicitud hs
  join public.solicitudes s on s.id = hs.solicitud_id
  where s.domiciliario_id = p_domiciliario_id
    and hs.estado = 'entregado'
    and hs.creado_en::date between p_desde and p_hasta
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )

  union all

  select 'cancelacion', s.id, s.codigo_pedido, null::text, null::smallint, null::boolean, hs.creado_en
  from public.historial_solicitud hs
  join public.solicitudes s on s.id = hs.solicitud_id
  where s.domiciliario_id = p_domiciliario_id
    and hs.estado = 'cancelada'
    and hs.creado_en::date between p_desde and p_hasta
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )

  union all

  select 'incidente', s.id, s.codigo_pedido, n.detalle, null::smallint,
    (n.resuelta_en is not null), n.creado_en
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where s.domiciliario_id = p_domiciliario_id
    and n.creado_en::date between p_desde and p_hasta
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )

  union all

  select 'calificacion', s.id, s.codigo_pedido, c.comentario, c.puntuacion,
    null::boolean, c.creado_en
  from public.calificaciones c
  join public.solicitudes s on s.id = c.solicitud_id
  where s.domiciliario_id = p_domiciliario_id
    and c.estado = 'activa'
    and c.creado_en::date between p_desde and p_hasta
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )

  order by fecha desc;
$$;

revoke all on function app.listar_eventos_comportamiento_domiciliario(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function app.listar_eventos_comportamiento_domiciliario(uuid, uuid, date, date) to mediruta_app;
