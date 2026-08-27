-- Panel admin (ronda 2 de feedback) — administrar TODAS las cuentas
-- (Paciente/Domiciliario/Administrador), no solo las de tipo
-- Administrador, con bloqueo/desbloqueo administrativo.
--
-- `estado_cuenta` ya tenía 'bloqueada' en el CHECK desde el inicio,
-- pero ningún escritor lo usaba (solo 'activa'/'desactivada', esta
-- última exclusiva de `app.desactivar_cuenta`, autoservicio). Acá se
-- agrega el primer escritor de 'bloqueada', dejando 'desactivada'
-- reservada para cuando el propio usuario cierra su cuenta.

create table public.cambios_estado_cuenta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  admin_id uuid not null references public.usuarios(id),
  accion text not null check (accion in ('bloqueada', 'desbloqueada')),
  motivo text,
  creado_en timestamptz not null default now()
);

create index cambios_estado_cuenta_usuario_id_idx
  on public.cambios_estado_cuenta (usuario_id, creado_en desc);

-- Bloquear: ADMINISTRADOR puede bloquear PACIENTE/DOMICILIARIO; una
-- cuenta ADMINISTRADOR/ROOT solo la puede bloquear ROOT (mismo criterio
-- que "crear administrador es ROOT-only") — evita que un admin
-- deshabilite a otro admin o se autobloquee por error con menos
-- privilegio del necesario para revertirlo.
create function app.bloquear_cuenta(
  p_admin_id uuid,
  p_usuario_id uuid,
  p_motivo text
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_es_root boolean;
  v_estado_actual text;
  v_objetivo_privilegiado boolean;
begin
  if p_admin_id is null or p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  v_es_root := app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT');

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo in ('ADMINISTRADOR', 'ROOT')
  )
  into v_objetivo_privilegiado;

  if v_objetivo_privilegiado and not v_es_root then
    return query select 'no_autorizado'::text;
    return;
  end if;

  select estado_cuenta into v_estado_actual
  from public.usuarios
  where id = p_usuario_id
  for update;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  if v_estado_actual = 'bloqueada' then
    return query select 'ya_en_ese_estado'::text;
    return;
  end if;

  update public.usuarios
  set estado_cuenta = 'bloqueada', actualizado_en = now()
  where id = p_usuario_id;

  update public.sesiones
  set revocada = true, actualizado_en = now()
  where usuario_id = p_usuario_id
    and revocada = false;

  insert into public.cambios_estado_cuenta (usuario_id, admin_id, accion, motivo)
  values (p_usuario_id, p_admin_id, 'bloqueada', p_motivo);

  return query select 'bloqueada'::text;
end;
$$;

create function app.desbloquear_cuenta(
  p_admin_id uuid,
  p_usuario_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_es_root boolean;
  v_estado_actual text;
  v_objetivo_privilegiado boolean;
begin
  if p_admin_id is null or p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  v_es_root := app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT');

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo in ('ADMINISTRADOR', 'ROOT')
  )
  into v_objetivo_privilegiado;

  if v_objetivo_privilegiado and not v_es_root then
    return query select 'no_autorizado'::text;
    return;
  end if;

  select estado_cuenta into v_estado_actual
  from public.usuarios
  where id = p_usuario_id
  for update;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  if v_estado_actual <> 'bloqueada' then
    return query select 'ya_en_ese_estado'::text;
    return;
  end if;

  update public.usuarios
  set estado_cuenta = 'activa', actualizado_en = now()
  where id = p_usuario_id;

  insert into public.cambios_estado_cuenta (usuario_id, admin_id, accion)
  values (p_usuario_id, p_admin_id, 'desbloqueada');

  return query select 'desbloqueada'::text;
end;
$$;

-- Listar TODAS las cuentas (cualquier rol), filtrando opcionalmente
-- por rol/estado/búsqueda — reemplaza la necesidad de una pantalla
-- separada por cada tipo de cuenta.
create function app.listar_cuentas_admin(
  p_admin_id uuid,
  p_rol text default null,
  p_estado text default null,
  p_busqueda text default null
)
returns table (
  id uuid,
  correo text,
  nombre_completo text,
  telefono text,
  estado_cuenta text,
  creado_en timestamptz,
  roles text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id, u.correo, u.nombre_completo, u.telefono, u.estado_cuenta, u.creado_en,
    (
      select array_agg(r2.codigo order by r2.codigo)
      from public.usuario_roles ur2
      join public.roles r2 on r2.id = ur2.rol_id
      where ur2.usuario_id = u.id
    ) as roles
  from public.usuarios u
  where (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
    and (
      p_rol is null or exists (
        select 1
        from public.usuario_roles ur3
        join public.roles r3 on r3.id = ur3.rol_id
        where ur3.usuario_id = u.id and r3.codigo = p_rol
      )
    )
    and (p_estado is null or u.estado_cuenta = p_estado)
    and (
      p_busqueda is null or length(btrim(p_busqueda)) = 0
      or u.nombre_completo ilike '%' || p_busqueda || '%'
      or u.correo ilike '%' || p_busqueda || '%'
    )
  order by u.creado_en desc
  limit 200;
$$;

-- Ficha unificada de una cuenta: datos comunes + roles + los campos
-- específicos de perfil_paciente/perfil_domiciliario que apliquen
-- (vienen null si la cuenta no tiene ese rol).
create function app.obtener_cuenta_admin(
  p_admin_id uuid,
  p_usuario_id uuid
)
returns table (
  id uuid,
  correo text,
  nombre_completo text,
  telefono text,
  estado_cuenta text,
  foto_perfil_path text,
  creado_en timestamptz,
  roles text[],
  pac_direccion text,
  pac_foto_cedula_frente_path text,
  pac_foto_cedula_reverso_path text,
  dom_direccion text,
  dom_vehiculo_tipo text,
  dom_vehiculo_placa text,
  dom_cedula_frente_path text,
  dom_cedula_reverso_path text,
  dom_licencia_path text,
  dom_soat_path text,
  dom_tecnicomecanica_path text,
  dom_disponible boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.id, u.correo, u.nombre_completo, u.telefono, u.estado_cuenta,
    u.foto_perfil_path, u.creado_en,
    (
      select array_agg(r2.codigo order by r2.codigo)
      from public.usuario_roles ur2
      join public.roles r2 on r2.id = ur2.rol_id
      where ur2.usuario_id = u.id
    ) as roles,
    pp.direccion, pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path,
    pd.direccion, pd.vehiculo_tipo, pd.vehiculo_placa,
    pd.cedula_frente_path, pd.cedula_reverso_path, pd.licencia_path,
    pd.soat_path, pd.tecnicomecanica_path, pd.disponible
  from public.usuarios u
  left join public.perfil_paciente pp on pp.usuario_id = u.id
  left join public.perfil_domiciliario pd on pd.usuario_id = u.id
  where u.id = p_usuario_id
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

revoke all on function app.bloquear_cuenta(uuid, uuid, text) from public;
revoke all on function app.bloquear_cuenta(uuid, uuid, text) from anon;
revoke all on function app.bloquear_cuenta(uuid, uuid, text) from authenticated;
grant execute on function app.bloquear_cuenta(uuid, uuid, text) to mediruta_app;

revoke all on function app.desbloquear_cuenta(uuid, uuid) from public;
revoke all on function app.desbloquear_cuenta(uuid, uuid) from anon;
revoke all on function app.desbloquear_cuenta(uuid, uuid) from authenticated;
grant execute on function app.desbloquear_cuenta(uuid, uuid) to mediruta_app;

revoke all on function app.listar_cuentas_admin(uuid, text, text, text) from public;
revoke all on function app.listar_cuentas_admin(uuid, text, text, text) from anon;
revoke all on function app.listar_cuentas_admin(uuid, text, text, text) from authenticated;
grant execute on function app.listar_cuentas_admin(uuid, text, text, text) to mediruta_app;

revoke all on function app.obtener_cuenta_admin(uuid, uuid) from public;
revoke all on function app.obtener_cuenta_admin(uuid, uuid) from anon;
revoke all on function app.obtener_cuenta_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_cuenta_admin(uuid, uuid) to mediruta_app;
