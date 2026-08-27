-- Panel admin (corrección) — 2 cosas que faltaban:
-- 1) Detalle completo de un pedido (no solo el listado): datos +
--    medicamentos + tracking (historial) + novedad abierta + cédula
--    del paciente (para que el admin pueda ver el mismo documento que
--    ya usó para pedir el medicamento).
-- 2) Administrar las cuentas ADMINISTRADOR ya creadas: listar + ver
--    la ficha de cada una (antes solo se podían crear, no verlas).

-- 1a) Datos principales del pedido — mismo criterio que
-- app.obtener_solicitud (Paciente) pero sin restricción de dueño,
-- solo exige rol admin.
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
  domiciliario_telefono text
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
    ud.nombre_completo, ud.correo, ud.telefono
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

revoke all on function app.obtener_pedido_admin(uuid, uuid) from public;
revoke all on function app.obtener_pedido_admin(uuid, uuid) from anon;
revoke all on function app.obtener_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_pedido_admin(uuid, uuid) to mediruta_app;

-- 1b) Medicamentos.
create function app.listar_medicamentos_pedido_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (
  nombre text,
  concentracion text,
  forma_farmaceutica text,
  cantidad text,
  posologia text
)
language sql
security definer
set search_path = ''
stable
as $$
  select m.nombre, m.concentracion, m.forma_farmaceutica, m.cantidad, m.posologia
  from public.solicitud_medicamentos m
  join public.solicitudes s on s.id = m.solicitud_id
  where m.solicitud_id = p_solicitud_id
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by m.creado_en asc;
$$;

revoke all on function app.listar_medicamentos_pedido_admin(uuid, uuid) from public;
revoke all on function app.listar_medicamentos_pedido_admin(uuid, uuid) from anon;
revoke all on function app.listar_medicamentos_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.listar_medicamentos_pedido_admin(uuid, uuid) to mediruta_app;

-- 1c) Tracking (historial de estados).
create function app.listar_historial_pedido_admin(
  p_admin_id uuid,
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
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by h.creado_en asc;
$$;

revoke all on function app.listar_historial_pedido_admin(uuid, uuid) from public;
revoke all on function app.listar_historial_pedido_admin(uuid, uuid) from anon;
revoke all on function app.listar_historial_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.listar_historial_pedido_admin(uuid, uuid) to mediruta_app;

-- 1d) Novedad abierta (si hay alguna sin resolver).
create function app.obtener_novedad_abierta_pedido_admin(
  p_admin_id uuid,
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
    and n.resuelta_en is null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by n.creado_en desc
  limit 1;
$$;

revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from public;
revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from anon;
revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) to mediruta_app;

-- 2a) Listar administradores — visible para Administrador/Root (crear
-- sigue siendo solo ROOT, ver app.crear_administrador).
create function app.listar_administradores(p_admin_id uuid)
returns table (
  id uuid,
  correo text,
  nombre_completo text,
  telefono text,
  estado_cuenta text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select u.id, u.correo, u.nombre_completo, u.telefono, u.estado_cuenta, u.creado_en
  from public.usuarios u
  join public.usuario_roles ur on ur.usuario_id = u.id
  join public.roles r on r.id = ur.rol_id
  where r.codigo = 'ADMINISTRADOR'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by u.creado_en desc;
$$;

revoke all on function app.listar_administradores(uuid) from public;
revoke all on function app.listar_administradores(uuid) from anon;
revoke all on function app.listar_administradores(uuid) from authenticated;
grant execute on function app.listar_administradores(uuid) to mediruta_app;

-- 2b) Ficha de un administrador puntual.
create function app.obtener_administrador(p_admin_id uuid, p_usuario_id uuid)
returns table (
  id uuid,
  correo text,
  nombre_completo text,
  telefono text,
  estado_cuenta text,
  foto_perfil_path text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select u.id, u.correo, u.nombre_completo, u.telefono, u.estado_cuenta, u.foto_perfil_path, u.creado_en
  from public.usuarios u
  join public.usuario_roles ur on ur.usuario_id = u.id
  join public.roles r on r.id = ur.rol_id
  where u.id = p_usuario_id
    and r.codigo = 'ADMINISTRADOR'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

revoke all on function app.obtener_administrador(uuid, uuid) from public;
revoke all on function app.obtener_administrador(uuid, uuid) from anon;
revoke all on function app.obtener_administrador(uuid, uuid) from authenticated;
grant execute on function app.obtener_administrador(uuid, uuid) to mediruta_app;
