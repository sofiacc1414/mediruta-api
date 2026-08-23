-- HU-02 — puertas internas app.* para gestión de perfil. Mismo patrón
-- que el resto de la API: SECURITY DEFINER, search_path vacío, sin SQL
-- dinámico, EXECUTE solo para mediruta_app, REVOKE ALL de PUBLIC/anon/
-- authenticated. App/Web nunca llaman estas funciones directamente.
--
-- mediruta_app no tiene SELECT/INSERT/UPDATE directo sobre
-- perfil_paciente, perfil_domiciliario ni sobre las columnas nuevas de
-- usuarios — todo pasa por acá, igual que password_hash.

-- G02 — consulta el perfil completo (comunes + paciente + domiciliario
-- si aplican). Un usuario multirrol ve ambos bloques a la vez.
create or replace function app.obtener_perfil(p_usuario_id uuid)
returns table (
  nombre_completo text,
  telefono text,
  pac_direccion text,
  pac_fecha_nacimiento date,
  pac_foto_cedula_path text,
  dom_direccion text,
  dom_vehiculo_tipo text,
  dom_vehiculo_placa text,
  dom_cedula_path text,
  dom_licencia_path text,
  dom_soat_path text,
  dom_tecnicomecanica_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.nombre_completo,
    u.telefono,
    pp.direccion,
    pp.fecha_nacimiento,
    pp.foto_cedula_path,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_path,
    pd.licencia_path,
    pd.soat_path,
    pd.tecnicomecanica_path
  from public.usuarios u
  left join public.perfil_paciente pp on pp.usuario_id = u.id
  left join public.perfil_domiciliario pd on pd.usuario_id = u.id
  where u.id = p_usuario_id
    and u.estado_cuenta = 'activa';
$$;

-- G03/G04 — datos comunes (nombre, teléfono). Ambos obligatorios juntos:
-- es una sola acción de negocio, no dos.
create or replace function app.actualizar_datos_comunes(
  p_usuario_id uuid,
  p_nombre_completo text,
  p_telefono text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_nombre_completo is null or length(btrim(p_nombre_completo)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_telefono is null or length(btrim(p_telefono)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.usuarios
  set
    nombre_completo = p_nombre_completo,
    telefono = p_telefono,
    actualizado_en = now()
  where id = p_usuario_id
    and estado_cuenta = 'activa';

  return found;
end;
$$;

-- G01/G03 — dirección + fecha de nacimiento del Paciente. Exige que la
-- cuenta tenga el rol PACIENTE (usuario_roles), sin importar el estado
-- de esa asignación (a diferencia de DOMICILIARIO, PACIENTE siempre
-- nace 'habilitado' en el registro — HU-01).
create or replace function app.upsert_perfil_paciente(
  p_usuario_id uuid,
  p_direccion text,
  p_fecha_nacimiento date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_direccion is null or length(btrim(p_direccion)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_fecha_nacimiento is null or p_fecha_nacimiento >= current_date then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'PACIENTE'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_paciente (usuario_id, direccion, fecha_nacimiento)
  values (p_usuario_id, p_direccion, p_fecha_nacimiento)
  on conflict (usuario_id) do update
  set
    direccion = excluded.direccion,
    fecha_nacimiento = excluded.fecha_nacimiento,
    actualizado_en = now();

  return true;
end;
$$;

-- G01/G03 — foto de cédula del Paciente. Separada de
-- upsert_perfil_paciente porque la sube la API después de subir el
-- archivo a Storage (dos pasos: subir bytes, luego persistir el path) —
-- no depende de que ya exista fila (upsert), para no forzar un orden de
-- llenado del perfil.
create or replace function app.actualizar_foto_cedula_paciente(
  p_usuario_id uuid,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'PACIENTE'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_paciente (usuario_id, foto_cedula_path)
  values (p_usuario_id, p_path)
  on conflict (usuario_id) do update
  set
    foto_cedula_path = excluded.foto_cedula_path,
    actualizado_en = now();

  return true;
end;
$$;

-- G01/G03 — dirección + vehículo del Domiciliario. Exige rol
-- DOMICILIARIO (aunque esté 'pendiente_validacion' — completar el
-- perfil es justamente lo que HU-08 va a revisar después).
create or replace function app.upsert_perfil_domiciliario(
  p_usuario_id uuid,
  p_direccion text,
  p_vehiculo_tipo text,
  p_vehiculo_placa text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_direccion is null or length(btrim(p_direccion)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_vehiculo_tipo is null or length(btrim(p_vehiculo_tipo)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_vehiculo_placa is null or length(btrim(p_vehiculo_placa)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'DOMICILIARIO'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_domiciliario (usuario_id, direccion, vehiculo_tipo, vehiculo_placa)
  values (p_usuario_id, p_direccion, p_vehiculo_tipo, p_vehiculo_placa)
  on conflict (usuario_id) do update
  set
    direccion = excluded.direccion,
    vehiculo_tipo = excluded.vehiculo_tipo,
    vehiculo_placa = excluded.vehiculo_placa,
    actualizado_en = now();

  return true;
end;
$$;

-- G01/G03 — documentos del Domiciliario (cédula/licencia/SOAT/
-- tecnicomecánica). p_tipo fijo a 4 valores válidos, resuelto con CASE
-- (no SQL dinámico) para poder tener una sola función en vez de 4
-- casi idénticas.
create or replace function app.actualizar_documento_domiciliario(
  p_usuario_id uuid,
  p_tipo text,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
  v_tipo text;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  v_tipo := lower(btrim(coalesce(p_tipo, '')));
  if v_tipo not in ('cedula', 'licencia', 'soat', 'tecnicomecanica') then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'DOMICILIARIO'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_domiciliario (usuario_id)
  values (p_usuario_id)
  on conflict (usuario_id) do nothing;

  update public.perfil_domiciliario
  set
    cedula_path = case when v_tipo = 'cedula' then p_path else cedula_path end,
    licencia_path = case when v_tipo = 'licencia' then p_path else licencia_path end,
    soat_path = case when v_tipo = 'soat' then p_path else soat_path end,
    tecnicomecanica_path = case
      when v_tipo = 'tecnicomecanica' then p_path
      else tecnicomecanica_path
    end,
    actualizado_en = now()
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

-- G05 — desactivar cuenta. Cambia estado_cuenta (nunca borra filas,
-- "conservar la información para trazabilidad") y revoca TODAS las
-- sesiones (a diferencia de app.revocar_sesion, que solo cierra la
-- actual) — desactivar la cuenta debe cerrar todo, no solo esta sesión.
create or replace function app.desactivar_cuenta(
  p_usuario_id uuid,
  p_sid uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_usuario_id is null or p_sid is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  perform 1
  from public.usuarios
  where id = p_usuario_id
    and estado_cuenta = 'activa'
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from public.sesiones
  where id = p_sid
    and usuario_id = p_usuario_id
    and revocada = false
    and expira_en > now()
  for update;

  if not found then
    return false;
  end if;

  update public.usuarios
  set
    estado_cuenta = 'desactivada',
    actualizado_en = now()
  where id = p_usuario_id;

  update public.sesiones
  set
    revocada = true,
    actualizado_en = now()
  where usuario_id = p_usuario_id
    and revocada = false;

  return true;
end;
$$;

revoke all on function app.obtener_perfil(uuid) from public;
revoke all on function app.obtener_perfil(uuid) from anon;
revoke all on function app.obtener_perfil(uuid) from authenticated;
grant execute on function app.obtener_perfil(uuid) to mediruta_app;

revoke all on function app.actualizar_datos_comunes(uuid, text, text) from public;
revoke all on function app.actualizar_datos_comunes(uuid, text, text) from anon;
revoke all on function app.actualizar_datos_comunes(uuid, text, text) from authenticated;
grant execute on function app.actualizar_datos_comunes(uuid, text, text) to mediruta_app;

revoke all on function app.upsert_perfil_paciente(uuid, text, date) from public;
revoke all on function app.upsert_perfil_paciente(uuid, text, date) from anon;
revoke all on function app.upsert_perfil_paciente(uuid, text, date) from authenticated;
grant execute on function app.upsert_perfil_paciente(uuid, text, date) to mediruta_app;

revoke all on function app.actualizar_foto_cedula_paciente(uuid, text) from public;
revoke all on function app.actualizar_foto_cedula_paciente(uuid, text) from anon;
revoke all on function app.actualizar_foto_cedula_paciente(uuid, text) from authenticated;
grant execute on function app.actualizar_foto_cedula_paciente(uuid, text) to mediruta_app;

revoke all on function app.upsert_perfil_domiciliario(uuid, text, text, text) from public;
revoke all on function app.upsert_perfil_domiciliario(uuid, text, text, text) from anon;
revoke all on function app.upsert_perfil_domiciliario(uuid, text, text, text) from authenticated;
grant execute on function app.upsert_perfil_domiciliario(uuid, text, text, text) to mediruta_app;

revoke all on function app.actualizar_documento_domiciliario(uuid, text, text) from public;
revoke all on function app.actualizar_documento_domiciliario(uuid, text, text) from anon;
revoke all on function app.actualizar_documento_domiciliario(uuid, text, text) from authenticated;
grant execute on function app.actualizar_documento_domiciliario(uuid, text, text) to mediruta_app;

revoke all on function app.desactivar_cuenta(uuid, uuid) from public;
revoke all on function app.desactivar_cuenta(uuid, uuid) from anon;
revoke all on function app.desactivar_cuenta(uuid, uuid) from authenticated;
grant execute on function app.desactivar_cuenta(uuid, uuid) to mediruta_app;
