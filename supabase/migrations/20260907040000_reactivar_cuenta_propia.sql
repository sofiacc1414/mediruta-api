-- HU-05 (ronda 9) — autoservicio: quien desactivó su propia cuenta
-- puede reactivarla volviendo a loguearse con las mismas credenciales
-- (la contraseña ya se verifica en TS antes de llamar a esto, mismo
-- criterio que el resto del flujo de login — ver
-- `ReactivarCuentaPropiaUseCase`). No toca `cambios_estado_cuenta`
-- (esa tabla es de acciones del admin, `admin_id` no admite null) —
-- mismo criterio que `desactivar_cuenta`, que tampoco audita ahí.

create function app.reactivar_cuenta_propia(
  p_usuario_id uuid
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

  update public.usuarios
  set estado_cuenta = 'activa', actualizado_en = now()
  where id = p_usuario_id
    and estado_cuenta = 'desactivada';

  return found;
end;
$$;

revoke all on function app.reactivar_cuenta_propia(uuid) from public;
revoke all on function app.reactivar_cuenta_propia(uuid) from anon;
revoke all on function app.reactivar_cuenta_propia(uuid) from authenticated;
grant execute on function app.reactivar_cuenta_propia(uuid) to mediruta_app;
