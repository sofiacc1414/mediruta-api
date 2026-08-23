-- HU-01 (corrección) — política de sesión única: un usuario solo puede
-- tener una sesión activa a la vez. Al iniciar sesión en un dispositivo
-- nuevo, se revocan todas las sesiones previas de esa cuenta que
-- siguieran activas.
--
-- No hace falta tocar nada más: `app.validar_sesion` ya se llama en
-- CADA request autenticado (AccessAuthGuard) y ya exige `revocada =
-- false` — apenas se revoca la sesión vieja acá, el dispositivo viejo
-- queda deslogueado en su próximo request, no recién cuando expire su
-- access token. Si en ese momento intenta refrescar en vez de hacer un
-- request normal, `app.rotar_sesion` tampoco encuentra una fila con
-- `revocada = false` que coincida con su refresh token y también falla
-- — mismo resultado. El caso "refresh token ya no sirve" ya existe
-- desde HU-01 (revocado/expirado/consumido) y la App ya lo maneja
-- (limpia tokens locales, fuerza login) — no hace falta un mensaje
-- especial para distinguir "te desconectaron desde otro dispositivo" de
-- cualquier otro refresh inválido.
--
-- `rotar_sesion` (renovación silenciosa del mismo dispositivo) NO se
-- toca — no es un login nuevo, es continuar la misma sesión.

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

  -- Sesión única por usuario: cualquier sesión activa previa de esta
  -- cuenta queda revocada antes de crear la nueva.
  update public.sesiones
  set revocada = true, actualizado_en = now()
  where usuario_id = p_usuario_id
    and revocada = false;

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

revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from public;
revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from anon;
revoke all on function app.crear_sesion(uuid, text, timestamptz, text, inet) from authenticated;
grant execute on function app.crear_sesion(uuid, text, timestamptz, text, inet) to mediruta_app;
