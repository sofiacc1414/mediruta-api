-- Validación de sesión para access JWT (HU-01). Autenticación propia, no Supabase Auth.
-- Ver context.md, Parte B, sección 4.1.
--
-- app.validar_sesion: comprueba que sid pertenece a sub, la sesión no está
-- revocada ni expirada y la cuenta sigue activa. Solo lectura.
-- PostgreSQL NO verifica la firma del JWT; eso lo hace NestJS.
-- mediruta_app no tiene SELECT directo sobre sesiones ni refresh_token_hash.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman esta función.
-- AuthGuard, GET /auth/me y logout se implementarán después en NestJS.

create or replace function app.validar_sesion(
  p_usuario_id uuid,
  p_sid uuid
)
returns table (
  usuario_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.sesiones as s
  inner join public.usuarios as u
    on u.id = s.usuario_id
  where s.id = p_sid
    and s.usuario_id = p_usuario_id
    and s.revocada = false
    and s.expira_en > now()
    and u.estado_cuenta = 'activa';
$$;

revoke all on function app.validar_sesion(uuid, uuid) from public;
revoke all on function app.validar_sesion(uuid, uuid) from anon;
revoke all on function app.validar_sesion(uuid, uuid) from authenticated;

grant execute on function app.validar_sesion(uuid, uuid)
to mediruta_app;
