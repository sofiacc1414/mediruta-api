-- Bug real reportado: "la selección del copago debe estar habilitada al
-- momento de completar el perfil, actualmente dice que el usuario no
-- tiene rol" — y, relacionado, la selección visual "se perdía" al elegir
-- un nivel. Causa real: `actualizar_nivel_copago_perfil` hacía un
-- UPDATE puro sobre `perfil_paciente`; si el Paciente todavía no había
-- guardado ningún dato de perfil (fila inexistente), el UPDATE no
-- afectaba ninguna fila y la App reportaba el error genérico de rol —
-- la selección nunca llegaba a aplicarse, por eso "se perdía" apenas se
-- tocaba.
--
-- Se cambia a INSERT ... ON CONFLICT (upsert), igual que ya hace
-- `upsert_perfil_paciente` para el resto del perfil — `direccion` y
-- `fecha_nacimiento` son nullable en la tabla (ver
-- 20260823010500_create_perfil_paciente.sql), así que crear la fila
-- solo con `nivel_copago_id` es válido: el Paciente puede elegir su
-- nivel de copago ANTES de terminar de completar el resto del perfil.

drop function if exists app.actualizar_nivel_copago_perfil(uuid, uuid);

create function app.actualizar_nivel_copago_perfil(
  p_paciente_id uuid,
  p_nivel_copago_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
begin
  if p_paciente_id is null or p_nivel_copago_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_paciente_id
      and r.codigo = 'PACIENTE'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if not exists (select 1 from public.niveles_copago where id = p_nivel_copago_id) then
    return query select 'nivel_no_encontrado'::text;
    return;
  end if;

  insert into public.perfil_paciente (usuario_id, nivel_copago_id)
  values (p_paciente_id, p_nivel_copago_id)
  on conflict (usuario_id) do update
    set nivel_copago_id = excluded.nivel_copago_id, actualizado_en = now();

  return query select 'actualizado'::text;
end;
$$;

revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from public;
revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from anon;
revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from authenticated;
grant execute on function app.actualizar_nivel_copago_perfil(uuid, uuid) to mediruta_app;
