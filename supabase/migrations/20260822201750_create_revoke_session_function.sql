-- Revocación de la sesión actual (HU-01). Autenticación propia, no Supabase Auth.
-- Ver context.md, Parte B, sección 4.1.
--
-- app.revocar_sesion: marca revocada = true en EXACTAMENTE una sesión
-- (id + usuario_id). No borra la fila. No toca otras sesiones.
-- No exige expiración ni estado_cuenta: es invalidación, no autorización.
-- mediruta_app no tiene UPDATE directo sobre sesiones.
-- SECURITY DEFINER + search_path vacío. Sin SQL dinámico.
-- EXECUTE solo para mediruta_app. App/Web no llaman esta función.
-- POST /auth/logout se implementará después en NestJS.

create or replace function app.revocar_sesion(
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
    return false;
  end if;

  update public.sesiones as s
  set
    revocada = true,
    actualizado_en = now()
  where s.id = p_sid
    and s.usuario_id = p_usuario_id
    and s.revocada = false;

  return found;
end;
$$;

revoke all on function app.revocar_sesion(uuid, uuid) from public;
revoke all on function app.revocar_sesion(uuid, uuid) from anon;
revoke all on function app.revocar_sesion(uuid, uuid) from authenticated;

grant execute on function app.revocar_sesion(uuid, uuid)
to mediruta_app;
