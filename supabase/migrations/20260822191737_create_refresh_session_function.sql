-- Rotación atómica de sesión (HU-01). Autenticación propia, no Supabase Auth.
-- Ver context.md, Parte B, sección 4.1.
--
-- app.rotar_sesion: consume el refresh actual y crea una sesión nueva en
-- UNA sola sentencia (CTEs modificadores). PostgreSQL solo recibe hashes.
-- mediruta_app no tiene UPDATE/INSERT/SELECT directo sobre sesiones.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman esta función.
-- POST /auth/refrescar se implementará después en NestJS.

create or replace function app.rotar_sesion(
  p_refresh_token_hash_actual text,
  p_nuevo_refresh_token_hash text,
  p_nueva_expira_en timestamptz,
  p_user_agent text,
  p_ip inet
)
returns table (
  usuario_id uuid,
  sid uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_refresh_token_hash_actual is null
     or length(btrim(p_refresh_token_hash_actual)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_nuevo_refresh_token_hash is null
     or length(btrim(p_nuevo_refresh_token_hash)) = 0 then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  if p_nueva_expira_en is null or p_nueva_expira_en <= now() then
    raise exception 'parámetro inválido'
      using errcode = '22023';
  end if;

  return query
  with sesion_consumida as (
    update public.sesiones as s
    set
      revocada = true,
      actualizado_en = now()
    from public.usuarios as u
    where s.usuario_id = u.id
      and s.refresh_token_hash = p_refresh_token_hash_actual
      and s.revocada = false
      and s.expira_en > now()
      and u.estado_cuenta = 'activa'
    returning s.usuario_id as usuario_consumido_id
  ),
  sesion_nueva as (
    insert into public.sesiones (
      usuario_id,
      refresh_token_hash,
      revocada,
      expira_en,
      user_agent,
      ip
    )
    select
      sc.usuario_consumido_id,
      p_nuevo_refresh_token_hash,
      false,
      p_nueva_expira_en,
      p_user_agent,
      p_ip
    from sesion_consumida as sc
    returning
      public.sesiones.usuario_id as nuevo_usuario_id,
      public.sesiones.id as nuevo_sid
  )
  select
    sn.nuevo_usuario_id,
    sn.nuevo_sid
  from sesion_nueva as sn;
end;
$$;

revoke all on function app.rotar_sesion(text, text, timestamptz, text, inet) from public;
revoke all on function app.rotar_sesion(text, text, timestamptz, text, inet) from anon;
revoke all on function app.rotar_sesion(text, text, timestamptz, text, inet) from authenticated;

grant execute on function app.rotar_sesion(text, text, timestamptz, text, inet)
to mediruta_app;
