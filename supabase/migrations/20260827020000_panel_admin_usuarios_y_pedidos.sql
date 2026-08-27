-- Panel admin (rediseño) — 2 funciones nuevas:
-- 1) app.crear_administrador — solo ROOT crea cuentas ADMINISTRADOR
--    directas (habilitadas de una, sin registro público ni validación).
-- 2) app.listar_pedidos_admin — "ver y filtrar pedidos" del admin.

create function app.crear_administrador(
  p_correo text,
  p_password_hash text,
  p_nombre_completo text,
  p_telefono text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_password_hash text;
  v_usuario_id uuid;
  v_rol_id uuid;
begin
  v_correo := lower(btrim(p_correo));
  v_password_hash := btrim(p_password_hash);

  if v_correo is null or length(v_correo) = 0 then
    raise exception 'correo inválido' using errcode = '22023';
  end if;

  if v_password_hash is null or length(v_password_hash) = 0 then
    raise exception 'password_hash inválido' using errcode = '22023';
  end if;

  insert into public.usuarios (correo, password_hash, estado_cuenta, nombre_completo, telefono)
  values (v_correo, v_password_hash, 'activa', nullif(btrim(p_nombre_completo), ''), nullif(btrim(p_telefono), ''))
  returning id into v_usuario_id;

  select r.id
  into v_rol_id
  from public.roles as r
  where r.codigo = 'ADMINISTRADOR';

  if not found then
    raise exception 'rol ADMINISTRADOR no encontrado en el catálogo' using errcode = '22023';
  end if;

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (v_usuario_id, v_rol_id, 'habilitado');

  return v_usuario_id;
end;
$$;

revoke all on function app.crear_administrador(text, text, text, text) from public;
revoke all on function app.crear_administrador(text, text, text, text) from anon;
revoke all on function app.crear_administrador(text, text, text, text) from authenticated;
grant execute on function app.crear_administrador(text, text, text, text) to mediruta_app;

-- "Ver y filtrar pedidos" — solo pedidos reales (codigo_pedido no
-- nulo, ya enviados); los borradores nunca aparecen acá. Todos los
-- filtros son opcionales (null = sin ese filtro). Tope de 200 filas,
-- más recientes primero — sin paginación todavía.
create function app.listar_pedidos_admin(
  p_admin_id uuid,
  p_estado text default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_busqueda text default null
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
  enviado_en timestamptz
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
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en
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
  order by s.creado_en desc
  limit 200;
$$;

revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text) from public;
revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text) from anon;
revoke all on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text) from authenticated;
grant execute on function app.listar_pedidos_admin(uuid, text, timestamptz, timestamptz, text) to mediruta_app;
