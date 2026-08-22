-- Recuperación y restablecimiento de contraseña (HU-01 / G05).
-- Autenticación propia, no Supabase Auth / GoTrue.
-- Ver context.md, Parte B, sección 4.1.
--
-- PostgreSQL solo recibe codigo_hash y password_hash. Nunca el OTP real
-- ni la contraseña en claro. El OTP lo genera la API (6 dígitos, ~10 min,
-- HMAC-SHA256 + PASSWORD_RECOVERY_PEPPER).
-- mediruta_app no tiene DML directo sobre recuperaciones_contrasena,
-- usuarios.password_hash ni sesiones.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman estas funciones.
-- POST /auth/recuperar-contrasena y /auth/restablecer-contrasena
-- se implementarán después en NestJS.

create or replace function app.crear_recuperacion_contrasena(
  p_correo text,
  p_codigo_hash text,
  p_expira_en timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_usuario_id uuid;
begin
  v_correo := lower(btrim(p_correo));

  if v_correo is null or length(v_correo) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_codigo_hash is null or length(btrim(p_codigo_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_expira_en is null or p_expira_en <= now() then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  select u.id
  into v_usuario_id
  from public.usuarios as u
  where u.correo = v_correo
  for update;

  if not found then
    return false;
  end if;

  update public.recuperaciones_contrasena as r
  set usado = true
  where r.usuario_id = v_usuario_id
    and r.usado = false;

  insert into public.recuperaciones_contrasena (
    usuario_id,
    codigo_hash,
    expira_en,
    usado,
    intentos
  )
  values (
    v_usuario_id,
    p_codigo_hash,
    p_expira_en,
    false,
    0
  );

  return true;
end;
$$;

create or replace function app.restablecer_contrasena(
  p_correo text,
  p_codigo_hash text,
  p_nuevo_password_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_usuario_id uuid;
  v_recuperacion_id uuid;
  v_codigo_hash text;
  v_intentos integer;
begin
  v_correo := lower(btrim(p_correo));

  if v_correo is null or length(v_correo) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_codigo_hash is null or length(btrim(p_codigo_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_nuevo_password_hash is null or length(btrim(p_nuevo_password_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  select u.id
  into v_usuario_id
  from public.usuarios as u
  where u.correo = v_correo
  for update;

  if not found then
    return false;
  end if;

  select r.id, r.codigo_hash, r.intentos
  into v_recuperacion_id, v_codigo_hash, v_intentos
  from public.recuperaciones_contrasena as r
  where r.id = (
    select r2.id
    from public.recuperaciones_contrasena as r2
    where r2.usuario_id = v_usuario_id
      and r2.usado = false
      and r2.expira_en > now()
      and r2.intentos < 5
    order by r2.creado_en desc
    limit 1
  )
    and r.usado = false
    and r.expira_en > now()
    and r.intentos < 5
  for update;

  if not found then
    return false;
  end if;

  if v_codigo_hash is distinct from p_codigo_hash then
    v_intentos := v_intentos + 1;

    update public.recuperaciones_contrasena as r
    set
      intentos = v_intentos,
      usado = (v_intentos >= 5)
    where r.id = v_recuperacion_id;

    return false;
  end if;

  update public.recuperaciones_contrasena as r
  set usado = true
  where r.id = v_recuperacion_id;

  update public.usuarios as u
  set
    password_hash = p_nuevo_password_hash,
    actualizado_en = now()
  where u.id = v_usuario_id;

  update public.sesiones as s
  set
    revocada = true,
    actualizado_en = now()
  where s.usuario_id = v_usuario_id
    and s.revocada = false;

  update public.recuperaciones_contrasena as r
  set usado = true
  where r.usuario_id = v_usuario_id
    and r.usado = false;

  return true;
end;
$$;

revoke all on function app.crear_recuperacion_contrasena(text, text, timestamptz) from public;
revoke all on function app.crear_recuperacion_contrasena(text, text, timestamptz) from anon;
revoke all on function app.crear_recuperacion_contrasena(text, text, timestamptz) from authenticated;

grant execute on function app.crear_recuperacion_contrasena(text, text, timestamptz)
to mediruta_app;

revoke all on function app.restablecer_contrasena(text, text, text) from public;
revoke all on function app.restablecer_contrasena(text, text, text) from anon;
revoke all on function app.restablecer_contrasena(text, text, text) from authenticated;

grant execute on function app.restablecer_contrasena(text, text, text)
to mediruta_app;
