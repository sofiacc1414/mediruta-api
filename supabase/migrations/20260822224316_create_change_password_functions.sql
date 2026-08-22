-- Cambio autenticado de contraseña (HU-01 / G06).
-- Autenticación propia, no Supabase Auth / GoTrue.
-- Ver context.md, Parte B, sección 4.1.
--
-- Distinto de G05 (app.restablecer_contrasena):
--   G05 revoca TODAS las sesiones (el usuario debe volver a iniciar sesión).
--   G06 mantiene la sesión actual (p_sid) y revoca las demás.
--
-- PostgreSQL nunca recibe la contraseña en claro. bcrypt lo hace NestJS.
-- app.obtener_password_hash_cambio_contrasena: lee el hash solo si
-- usuarioId + sid siguen válidos (cuenta activa, sesión no revocada/no expirada).
-- app.cambiar_contrasena_autenticada: control optimista con el hash actual
-- esperado, actualiza password_hash y revoca las otras sesiones.
-- mediruta_app no tiene SELECT de password_hash ni UPDATE directo.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman estas funciones.
-- POST /auth/cambiar-contrasena se implementará después en NestJS.

create or replace function app.obtener_password_hash_cambio_contrasena(
  p_usuario_id uuid,
  p_sid uuid
)
returns table (
  password_hash text
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.password_hash
  from public.usuarios as u
  inner join public.sesiones as s
    on s.usuario_id = u.id
  where u.id = p_usuario_id
    and u.estado_cuenta = 'activa'
    and s.id = p_sid
    and s.usuario_id = p_usuario_id
    and s.revocada = false
    and s.expira_en > now();
$$;

create or replace function app.cambiar_contrasena_autenticada(
  p_usuario_id uuid,
  p_sid uuid,
  p_password_hash_actual_esperado text,
  p_nuevo_password_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_password_hash text;
  v_sid uuid;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_sid is null then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_password_hash_actual_esperado is null
     or length(btrim(p_password_hash_actual_esperado)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_nuevo_password_hash is null
     or length(btrim(p_nuevo_password_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  select u.password_hash
  into v_password_hash
  from public.usuarios as u
  where u.id = p_usuario_id
    and u.estado_cuenta = 'activa'
  for update;

  if not found then
    return false;
  end if;

  select s.id
  into v_sid
  from public.sesiones as s
  where s.id = p_sid
    and s.usuario_id = p_usuario_id
    and s.revocada = false
    and s.expira_en > now()
  for update;

  if not found then
    return false;
  end if;

  if v_password_hash is distinct from p_password_hash_actual_esperado then
    return false;
  end if;

  update public.usuarios as u
  set
    password_hash = p_nuevo_password_hash,
    actualizado_en = now()
  where u.id = p_usuario_id;

  update public.sesiones as s
  set
    revocada = true,
    actualizado_en = now()
  where s.usuario_id = p_usuario_id
    and s.id <> p_sid
    and s.revocada = false;

  return true;
end;
$$;

revoke all on function app.obtener_password_hash_cambio_contrasena(uuid, uuid) from public;
revoke all on function app.obtener_password_hash_cambio_contrasena(uuid, uuid) from anon;
revoke all on function app.obtener_password_hash_cambio_contrasena(uuid, uuid) from authenticated;

grant execute on function app.obtener_password_hash_cambio_contrasena(uuid, uuid)
to mediruta_app;

revoke all on function app.cambiar_contrasena_autenticada(uuid, uuid, text, text) from public;
revoke all on function app.cambiar_contrasena_autenticada(uuid, uuid, text, text) from anon;
revoke all on function app.cambiar_contrasena_autenticada(uuid, uuid, text, text) from authenticated;

grant execute on function app.cambiar_contrasena_autenticada(uuid, uuid, text, text)
to mediruta_app;
