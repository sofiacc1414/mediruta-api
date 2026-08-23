-- HU-08 — puertas internas app.* para que el Administrador valide
-- domiciliarios. Mismo patrón que el resto de la API: SECURITY DEFINER,
-- search_path vacío, sin SQL dinámico, EXECUTE solo para mediruta_app,
-- REVOKE ALL de PUBLIC/anon/authenticated. Web nunca llama estas
-- funciones directamente.
--
-- No crean una tabla de documentos paralela: leen perfil_domiciliario,
-- ya creada en HU-02. Lo nuevo acá es la decisión (validaciones_domiciliario)
-- y el cambio de usuario_roles.estado.

-- Helper reutilizable: ¿esta cuenta tiene el rol dado, habilitado?
-- Se usa como chequeo de "defensa en profundidad" dentro de cada función
-- de este archivo — la autorización real ya la exige el RolesGuard de la
-- API antes de llegar acá, esto es un segundo cinturón de seguridad.
create or replace function app.usuario_tiene_rol_habilitado(
  p_usuario_id uuid,
  p_codigo_rol text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = p_codigo_rol
      and ur.estado = 'habilitado'
  );
$$;

-- G01 — domiciliarios con validación pendiente. Vacío (no un error) si
-- p_admin_id no es Administrador/Root — el RolesGuard de la API es la
-- autorización real, esto es solo defensa en profundidad para una
-- lectura, no hace falta distinguir el motivo del vacío.
create or replace function app.listar_domiciliarios_pendientes(p_admin_id uuid)
returns table (
  usuario_id uuid,
  nombre_completo text,
  telefono text,
  solicitado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id,
    u.nombre_completo,
    u.telefono,
    ur.creado_en
  from public.usuario_roles ur
  join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  where r.codigo = 'DOMICILIARIO'
    and ur.estado = 'pendiente_validacion'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by ur.creado_en asc;
$$;

-- G02 — detalle de un domiciliario: datos comunes + perfil_domiciliario
-- completo + estado actual. Misma defensa en profundidad que arriba.
create or replace function app.obtener_detalle_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid
)
returns table (
  nombre_completo text,
  telefono text,
  estado text,
  solicitado_en timestamptz,
  direccion text,
  vehiculo_tipo text,
  vehiculo_placa text,
  cedula_path text,
  licencia_path text,
  soat_path text,
  tecnicomecanica_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.nombre_completo,
    u.telefono,
    ur.estado,
    ur.creado_en,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_path,
    pd.licencia_path,
    pd.soat_path,
    pd.tecnicomecanica_path
  from public.usuario_roles ur
  join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  left join public.perfil_domiciliario pd on pd.usuario_id = ur.usuario_id
  where ur.usuario_id = p_domiciliario_id
    and r.codigo = 'DOMICILIARIO'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

-- G06 — historial de decisiones sobre un domiciliario (más reciente
-- primero). Se consulta aparte de obtener_detalle_domiciliario porque
-- es 0..N filas, no una sola (evita agregación JSON, no se usa en
-- ningún otro lado de este esquema).
create or replace function app.listar_validaciones_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid
)
returns table (
  decision text,
  motivo text,
  creado_en timestamptz,
  admin_correo text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    v.decision,
    v.motivo,
    v.creado_en,
    a.correo
  from public.validaciones_domiciliario v
  join public.usuarios a on a.id = v.admin_id
  where v.domiciliario_id = p_domiciliario_id
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by v.creado_en desc;
$$;

-- G03/G05 — aprobar. `resultado`:
--   'aprobado'      — se aprobó, usuario_roles.estado -> habilitado.
--   'incompleto'    — faltan documentos/datos obligatorios (G05), nada
--                      se modifica, `faltantes` trae qué falta.
--   'no_encontrado' — el usuario no tiene DOMICILIARIO pendiente
--                      (ya fue decidido antes, o no existe esa cuenta).
--   'no_autorizado' — p_admin_id no es Administrador/Root habilitado.
create or replace function app.aprobar_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid
)
returns table (
  resultado text,
  faltantes text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pendiente boolean;
  v_faltantes text[];
begin
  if p_admin_id is null or p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::text[];
    return;
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_domiciliario_id
      and r.codigo = 'DOMICILIARIO'
      and ur.estado = 'pendiente_validacion'
  )
  into v_pendiente;

  if not v_pendiente then
    return query select 'no_encontrado'::text, null::text[];
    return;
  end if;

  select array_remove(array[
    case when pd.direccion is null or length(btrim(pd.direccion)) = 0
      then 'Dirección de residencia' end,
    case when pd.vehiculo_tipo is null or length(btrim(pd.vehiculo_tipo)) = 0
      then 'Tipo de vehículo' end,
    case when pd.vehiculo_placa is null or length(btrim(pd.vehiculo_placa)) = 0
      then 'Placa' end,
    case when pd.cedula_path is null then 'Cédula' end,
    case when pd.licencia_path is null then 'Licencia de conducción' end,
    case when pd.soat_path is null then 'SOAT' end,
    case when pd.tecnicomecanica_path is null then 'Tecnomecánica' end
  ], null)
  into v_faltantes
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_domiciliario_id;

  -- Sin fila en perfil_domiciliario todavía: falta todo.
  if v_faltantes is null then
    v_faltantes := array[
      'Dirección de residencia', 'Tipo de vehículo', 'Placa',
      'Cédula', 'Licencia de conducción', 'SOAT', 'Tecnomecánica'
    ];
  end if;

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleto'::text, v_faltantes;
    return;
  end if;

  update public.usuario_roles
  set estado = 'habilitado', actualizado_en = now()
  where usuario_id = p_domiciliario_id
    and rol_id = (select id from public.roles where codigo = 'DOMICILIARIO');

  insert into public.validaciones_domiciliario (domiciliario_id, admin_id, decision)
  values (p_domiciliario_id, p_admin_id, 'aprobado');

  return query select 'aprobado'::text, array[]::text[];
end;
$$;

-- G04 — rechazar. `resultado`: 'rechazado' | 'no_encontrado' | 'no_autorizado'
-- (mismo significado que en aprobar_domiciliario).
create or replace function app.rechazar_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid,
  p_motivo text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pendiente boolean;
begin
  if p_admin_id is null or p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return 'no_autorizado';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_domiciliario_id
      and r.codigo = 'DOMICILIARIO'
      and ur.estado = 'pendiente_validacion'
  )
  into v_pendiente;

  if not v_pendiente then
    return 'no_encontrado';
  end if;

  update public.usuario_roles
  set estado = 'rechazado', actualizado_en = now()
  where usuario_id = p_domiciliario_id
    and rol_id = (select id from public.roles where codigo = 'DOMICILIARIO');

  insert into public.validaciones_domiciliario (domiciliario_id, admin_id, decision, motivo)
  values (p_domiciliario_id, p_admin_id, 'rechazado', p_motivo);

  return 'rechazado';
end;
$$;

revoke all on function app.usuario_tiene_rol_habilitado(uuid, text) from public;
revoke all on function app.usuario_tiene_rol_habilitado(uuid, text) from anon;
revoke all on function app.usuario_tiene_rol_habilitado(uuid, text) from authenticated;
grant execute on function app.usuario_tiene_rol_habilitado(uuid, text) to mediruta_app;

revoke all on function app.listar_domiciliarios_pendientes(uuid) from public;
revoke all on function app.listar_domiciliarios_pendientes(uuid) from anon;
revoke all on function app.listar_domiciliarios_pendientes(uuid) from authenticated;
grant execute on function app.listar_domiciliarios_pendientes(uuid) to mediruta_app;

revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from public;
revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from anon;
revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.obtener_detalle_domiciliario(uuid, uuid) to mediruta_app;

revoke all on function app.listar_validaciones_domiciliario(uuid, uuid) from public;
revoke all on function app.listar_validaciones_domiciliario(uuid, uuid) from anon;
revoke all on function app.listar_validaciones_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.listar_validaciones_domiciliario(uuid, uuid) to mediruta_app;

revoke all on function app.aprobar_domiciliario(uuid, uuid) from public;
revoke all on function app.aprobar_domiciliario(uuid, uuid) from anon;
revoke all on function app.aprobar_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.aprobar_domiciliario(uuid, uuid) to mediruta_app;

revoke all on function app.rechazar_domiciliario(uuid, uuid, text) from public;
revoke all on function app.rechazar_domiciliario(uuid, uuid, text) from anon;
revoke all on function app.rechazar_domiciliario(uuid, uuid, text) from authenticated;
grant execute on function app.rechazar_domiciliario(uuid, uuid, text) to mediruta_app;
