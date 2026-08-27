-- Panel admin (ronda 2 de feedback) — 3 cosas relacionadas con
-- "atender pedidos demorados":
-- 1) Filtrar pedidos por paciente/domiciliario (búsqueda de texto,
--    mismo criterio que el filtro de búsqueda general ya existente).
-- 2) Umbral de demora CONFIGURABLE por el admin (no fijo en código) —
--    tabla singleton + función para leerlo/actualizarlo. El front
--    calcula "está demorado" comparando contra `en_asignacion_desde`,
--    que ahora exponen listar/obtener pedido — sin hornear el número
--    en SQL.
-- 3) Asignación manual: domiciliarios disponibles más cercanos a la
--    farmacia del pedido + acción para asignar directo, misma
--    transición de estado que `app.aceptar_pedido` (el domiciliario
--    aceptando su propio pedido), pero disparada por el admin.

create table public.configuracion_admin (
  id smallint primary key default 1 check (id = 1),
  umbral_demora_asignacion_minutos int not null default 15,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.usuarios(id)
);

insert into public.configuracion_admin (id) values (1);

create function app.obtener_configuracion_admin(p_admin_id uuid)
returns table (umbral_demora_asignacion_minutos int)
language sql
security definer
set search_path = ''
stable
as $$
  select c.umbral_demora_asignacion_minutos
  from public.configuracion_admin c
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  );
$$;

create function app.actualizar_configuracion_admin(
  p_admin_id uuid,
  p_umbral_minutos int
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if p_umbral_minutos is null or p_umbral_minutos < 1 then
    return query select 'invalido'::text;
    return;
  end if;

  update public.configuracion_admin
  set
    umbral_demora_asignacion_minutos = p_umbral_minutos,
    actualizado_en = now(),
    actualizado_por = p_admin_id
  where id = 1;

  return query select 'actualizado'::text;
end;
$$;

-- Cambia sus parámetros (agrega búsqueda por paciente/domiciliario) y
-- sus columnas de salida (agrega en_asignacion_desde) → DROP previo.
drop function if exists app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text);

create function app.listar_pedidos_admin(
  p_admin_id uuid,
  p_estado text default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_busqueda text default null,
  p_paciente_busqueda text default null,
  p_domiciliario_busqueda text default null
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  paciente_nombre text,
  paciente_correo text,
  domiciliario_nombre text,
  domiciliario_correo text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  enviado_en timestamptz,
  en_asignacion_desde timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado,
    up.nombre_completo, up.correo,
    ud.nombre_completo, ud.correo,
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en,
    (
      select h.creado_en
      from public.historial_solicitud h
      where h.solicitud_id = s.id and h.estado = 'en_asignacion'
      order by h.creado_en desc
      limit 1
    ) as en_asignacion_desde
  from public.solicitudes s
  join public.usuarios up on up.id = s.paciente_id
  left join public.usuarios ud on ud.id = s.domiciliario_id
  where s.codigo_pedido is not null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
    and (p_estado is null or s.estado = p_estado)
    and (p_desde is null or s.creado_en >= p_desde)
    and (p_hasta is null or s.creado_en <= p_hasta)
    and (
      p_busqueda is null or length(btrim(p_busqueda)) = 0
      or s.codigo_pedido ilike '%' || p_busqueda || '%'
      or up.nombre_completo ilike '%' || p_busqueda || '%'
      or up.correo ilike '%' || p_busqueda || '%'
    )
    and (
      p_paciente_busqueda is null or length(btrim(p_paciente_busqueda)) = 0
      or up.nombre_completo ilike '%' || p_paciente_busqueda || '%'
      or up.correo ilike '%' || p_paciente_busqueda || '%'
    )
    and (
      p_domiciliario_busqueda is null or length(btrim(p_domiciliario_busqueda)) = 0
      or ud.nombre_completo ilike '%' || p_domiciliario_busqueda || '%'
      or ud.correo ilike '%' || p_domiciliario_busqueda || '%'
    )
  order by s.creado_en desc
  limit 200;
$$;

-- Agrega en_asignacion_desde a sus columnas de salida → DROP previo.
drop function if exists app.obtener_pedido_admin(uuid, uuid);

create function app.obtener_pedido_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  receta_path text,
  receta_fecha_vencimiento date,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz,
  codigo_entrega text,
  paciente_nombre text,
  paciente_correo text,
  paciente_telefono text,
  paciente_cedula_frente_path text,
  paciente_cedula_reverso_path text,
  domiciliario_nombre text,
  domiciliario_correo text,
  domiciliario_telefono text,
  en_asignacion_desde timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.receta_path, s.receta_fecha_vencimiento,
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en,
    s.cancelado_en, s.codigo_entrega,
    up.nombre_completo, up.correo, up.telefono,
    pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path,
    ud.nombre_completo, ud.correo, ud.telefono,
    (
      select h.creado_en
      from public.historial_solicitud h
      where h.solicitud_id = s.id and h.estado = 'en_asignacion'
      order by h.creado_en desc
      limit 1
    ) as en_asignacion_desde
  from public.solicitudes s
  join public.usuarios up on up.id = s.paciente_id
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  left join public.usuarios ud on ud.id = s.domiciliario_id
  where s.id = p_solicitud_id
    and s.codigo_pedido is not null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

-- Domiciliarios disponibles ordenados por cercanía a la farmacia del
-- pedido — espejo de `listar_pedidos_disponibles`, pero desde la
-- farmacia hacia cada domiciliario en vez de al revés.
create function app.listar_domiciliarios_cercanos_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (
  usuario_id uuid,
  nombre_completo text,
  telefono text,
  distancia_metros double precision
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id, u.nombre_completo, u.telefono,
    public.st_distance(pd.ubicacion, s.farmacia_ubicacion)
  from public.solicitudes s
  join public.perfil_domiciliario pd on pd.disponible = true and pd.ubicacion is not null
  join public.usuarios u on u.id = pd.usuario_id
  where s.id = p_solicitud_id
    and s.farmacia_ubicacion is not null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
    and app.usuario_tiene_rol_habilitado(u.id, 'DOMICILIARIO')
    and not exists (
      select 1 from public.solicitudes activo
      where activo.domiciliario_id = u.id
        and activo.estado in (
          'asignado_en_camino_farmacia', 'medicamentos_recogidos',
          'en_camino_entrega', 'en_sitio'
        )
    )
  order by public.st_distance(pd.ubicacion, s.farmacia_ubicacion) asc
  limit 20;
$$;

create table public.asignaciones_admin (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id),
  admin_id uuid not null references public.usuarios(id),
  domiciliario_id uuid not null references public.usuarios(id),
  creado_en timestamptz not null default now()
);

-- Misma transición atómica que `app.aceptar_pedido` (el domiciliario
-- aceptando su propio pedido), pero con el domiciliario elegido por el
-- admin — para pedidos que llevan mucho tiempo sin nadie que los tome.
create function app.asignar_domiciliario_admin(
  p_admin_id uuid,
  p_solicitud_id uuid,
  p_domiciliario_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_solicitud_id is null or p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if not app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO') then
    return query select 'domiciliario_no_disponible'::text;
    return;
  end if;

  if not exists (
    select 1 from public.perfil_domiciliario
    where usuario_id = p_domiciliario_id and disponible = true
  ) then
    return query select 'domiciliario_no_disponible'::text;
    return;
  end if;

  if exists (
    select 1 from public.solicitudes
    where domiciliario_id = p_domiciliario_id
      and estado in (
        'asignado_en_camino_farmacia', 'medicamentos_recogidos',
        'en_camino_entrega', 'en_sitio'
      )
  ) then
    return query select 'domiciliario_no_disponible'::text;
    return;
  end if;

  update public.solicitudes
  set
    estado = 'asignado_en_camino_farmacia',
    domiciliario_id = p_domiciliario_id,
    actualizado_en = now()
  where id = p_solicitud_id
    and estado = 'en_asignacion'
    and domiciliario_id is null;

  if not found then
    if exists (select 1 from public.solicitudes where id = p_solicitud_id) then
      return query select 'ya_asignado'::text;
    else
      return query select 'no_encontrado'::text;
    end if;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'asignado_en_camino_farmacia');

  insert into public.asignaciones_admin (solicitud_id, admin_id, domiciliario_id)
  values (p_solicitud_id, p_admin_id, p_domiciliario_id);

  return query select 'asignado'::text;
end;
$$;

revoke all on function app.obtener_configuracion_admin(uuid) from public;
revoke all on function app.obtener_configuracion_admin(uuid) from anon;
revoke all on function app.obtener_configuracion_admin(uuid) from authenticated;
grant execute on function app.obtener_configuracion_admin(uuid) to mediruta_app;

revoke all on function app.actualizar_configuracion_admin(uuid, int) from public;
revoke all on function app.actualizar_configuracion_admin(uuid, int) from anon;
revoke all on function app.actualizar_configuracion_admin(uuid, int) from authenticated;
grant execute on function app.actualizar_configuracion_admin(uuid, int) to mediruta_app;

revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text, text, text) from public;
revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text, text, text) from anon;
revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text, text, text) from authenticated;
grant execute on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text, text, text) to mediruta_app;

revoke all on function app.obtener_pedido_admin(uuid, uuid) from public;
revoke all on function app.obtener_pedido_admin(uuid, uuid) from anon;
revoke all on function app.obtener_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_pedido_admin(uuid, uuid) to mediruta_app;

revoke all on function app.listar_domiciliarios_cercanos_admin(uuid, uuid) from public;
revoke all on function app.listar_domiciliarios_cercanos_admin(uuid, uuid) from anon;
revoke all on function app.listar_domiciliarios_cercanos_admin(uuid, uuid) from authenticated;
grant execute on function app.listar_domiciliarios_cercanos_admin(uuid, uuid) to mediruta_app;

revoke all on function app.asignar_domiciliario_admin(uuid, uuid, uuid) from public;
revoke all on function app.asignar_domiciliario_admin(uuid, uuid, uuid) from anon;
revoke all on function app.asignar_domiciliario_admin(uuid, uuid, uuid) from authenticated;
grant execute on function app.asignar_domiciliario_admin(uuid, uuid, uuid) to mediruta_app;
