-- El admin podía bloquear/desbloquear una cuenta, pero una cuenta
-- AUTOdesactivada (self-service, `desactivar_cuenta` — HU-05) no tenía
-- ninguna acción admin para volver a 'activa': `desbloquear_cuenta`
-- exigía `estado_cuenta = 'bloqueada'` puntualmente. Se amplía para
-- cubrir también 'desactivada' — misma función, mismo criterio de
-- autorización (privilegio sobre cuentas ADMINISTRADOR/ROOT), solo
-- cambia de qué estado puede partir.

alter table public.cambios_estado_cuenta drop constraint cambios_estado_cuenta_accion_check;
alter table public.cambios_estado_cuenta add constraint cambios_estado_cuenta_accion_check
  check (accion in ('bloqueada', 'desbloqueada', 'reactivada'));

create or replace function app.desbloquear_cuenta(
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
  v_accion text;
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

  if v_estado_actual not in ('bloqueada', 'desactivada') then
    return query select 'ya_en_ese_estado'::text;
    return;
  end if;

  v_accion := case when v_estado_actual = 'bloqueada' then 'desbloqueada' else 'reactivada' end;

  update public.usuarios
  set estado_cuenta = 'activa', actualizado_en = now()
  where id = p_usuario_id;

  insert into public.cambios_estado_cuenta (usuario_id, admin_id, accion)
  values (p_usuario_id, p_admin_id, v_accion);

  return query select v_accion;
end;
$$;

revoke all on function app.desbloquear_cuenta(uuid, uuid) from public;
revoke all on function app.desbloquear_cuenta(uuid, uuid) from anon;
revoke all on function app.desbloquear_cuenta(uuid, uuid) from authenticated;
grant execute on function app.desbloquear_cuenta(uuid, uuid) to mediruta_app;
