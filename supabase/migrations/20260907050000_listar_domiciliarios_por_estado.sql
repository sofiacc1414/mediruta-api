-- HU-08 (ronda 9) — el panel admin solo podía listar domiciliarios
-- PENDIENTES de validación (`app.listar_domiciliarios_pendientes`); no
-- había forma de ver, como lista, los ya aceptados o rechazados (la
-- trazabilidad de quién/cuándo ya existía por domiciliario individual
-- via `app.listar_validaciones_domiciliario`/`detalle.historial`, pero
-- solo se llegaba ahí si ya se conocía el ID). Nueva función con filtro
-- de estado, mismo criterio que `listar_novedades_abiertas`/
-- `listar_cuentas_admin` en rondas anteriores — no reemplaza
-- `listar_domiciliarios_pendientes` (se deja tal cual, la sigue usando
-- el dashboard de pendientes).

create function app.listar_domiciliarios_admin(
  p_admin_id uuid,
  p_estado text default 'pendiente_validacion'
)
returns table (
  usuario_id uuid,
  nombre_completo text,
  correo text,
  telefono text,
  estado text,
  solicitado_en timestamptz,
  actualizado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id, u.nombre_completo, u.correo, u.telefono,
    ur.estado, ur.creado_en, ur.actualizado_en
  from public.usuario_roles ur
  join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  where r.codigo = 'DOMICILIARIO'
    and ur.estado <> 'borrador'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
    and (
      p_estado = 'todos'
      or ur.estado = p_estado
    )
  order by ur.actualizado_en desc;
$$;

revoke all on function app.listar_domiciliarios_admin(uuid, text) from public;
revoke all on function app.listar_domiciliarios_admin(uuid, text) from anon;
revoke all on function app.listar_domiciliarios_admin(uuid, text) from authenticated;
grant execute on function app.listar_domiciliarios_admin(uuid, text) to mediruta_app;
