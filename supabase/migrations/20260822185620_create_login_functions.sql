-- Funciones internas de login (HU-01). Autenticación propia, no Supabase Auth.
-- Ver context.md, Parte B, sección 4.1.
--
-- app.obtener_credenciales_login: única vía para leer password_hash.
-- app.crear_sesion: única vía para insertar en sesiones.
-- mediruta_app no recibe SELECT de password_hash ni INSERT directo en sesiones.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman estas funciones.

create or replace function app.obtener_credenciales_login(
  p_correo text
)
returns table (
  usuario_id uuid,
  correo text,
  password_hash text,
  estado_cuenta text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
begin
  v_correo := lower(btrim(p_correo));

  if v_correo is null or length(v_correo) = 0 then
    return;
  end if;

  return query
  select
    u.id,
    u.correo,
    u.password_hash,
    u.estado_cuenta
  from public.usuarios as u
  where u.correo = v_correo;
end;
$$;

create or replace function app.crear_sesion(
  p_usuario_id uuid,
  p_refresh_token_hash text,
  p_expira_en timestamptz,
  p_user_agent text,
  p_ip inet
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sesion_id uuid;
  v_estado_cuenta text;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_refresh_token_hash is null or length(btrim(p_refresh_token_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_expira_en is null or p_expira_en <= now() then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  select u.estado_cuenta
  into v_estado_cuenta
  from public.usuarios as u
  where u.id = p_usuario_id;

  if not found or v_estado_cuenta is distinct from 'activa' then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  insert into public.sesiones (
    usuario_id,
    refresh_token_hash,
    revocada,
    expira_en,
    user_agent,
    ip
  )
  values (
    p_usuario_id,
    p_refresh_token_hash,
    false,
    p_expira_en,
    p_user_agent,
    p_ip
  )
  returning id into v_sesion_id;

  return v_sesion_id;
end;
$$;

revoke all on function app.obtener_credenciales_login(text) from public;
revoke all on function app.obtener_credenciales_login(text) from anon;
revoke all on function app.obtener_credenciales_login(text) from authenticated;

grant execute on function app.obtener_credenciales_login(text)
to mediruta_app;

revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from public;
revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from anon;
revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from authenticated;

grant execute on function app.crear_sesion(uuid, text, timestamptz, text, inet)
to mediruta_app;
