-- HU-02 — foto de perfil: extiende app.obtener_perfil para incluir
-- foto_perfil_path y agrega app.actualizar_foto_perfil. Mismo patrón de
-- seguridad que el resto (SECURITY DEFINER, search_path vacío, sin SQL
-- dinámico, EXECUTE solo mediruta_app).
--
-- `create or replace function` con un `returns table` distinto exige
-- borrar la función anterior primero (Postgres no permite cambiar la
-- lista de columnas de retorno con REPLACE).
drop function if exists app.obtener_perfil(uuid);

create function app.obtener_perfil(p_usuario_id uuid)
returns table (
  nombre_completo text,
  telefono text,
  foto_perfil_path text,
  pac_direccion text,
  pac_fecha_nacimiento date,
  pac_foto_cedula_path text,
  dom_direccion text,
  dom_vehiculo_tipo text,
  dom_vehiculo_placa text,
  dom_cedula_path text,
  dom_licencia_path text,
  dom_soat_path text,
  dom_tecnicomecanica_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.nombre_completo,
    u.telefono,
    u.foto_perfil_path,
    pp.direccion,
    pp.fecha_nacimiento,
    pp.foto_cedula_path,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_path,
    pd.licencia_path,
    pd.soat_path,
    pd.tecnicomecanica_path
  from public.usuarios u
  left join public.perfil_paciente pp on pp.usuario_id = u.id
  left join public.perfil_domiciliario pd on pd.usuario_id = u.id
  where u.id = p_usuario_id
    and u.estado_cuenta = 'activa';
$$;

revoke all on function app.obtener_perfil(uuid) from public;
revoke all on function app.obtener_perfil(uuid) from anon;
revoke all on function app.obtener_perfil(uuid) from authenticated;
grant execute on function app.obtener_perfil(uuid) to mediruta_app;

-- Foto de perfil — común a cualquier rol, no exige rol específico
-- (a diferencia de actualizar_foto_cedula_paciente/documento_domiciliario).
create or replace function app.actualizar_foto_perfil(
  p_usuario_id uuid,
  p_path text
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

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.usuarios
  set
    foto_perfil_path = p_path,
    actualizado_en = now()
  where id = p_usuario_id
    and estado_cuenta = 'activa';

  return found;
end;
$$;

revoke all on function app.actualizar_foto_perfil(uuid, text) from public;
revoke all on function app.actualizar_foto_perfil(uuid, text) from anon;
revoke all on function app.actualizar_foto_perfil(uuid, text) from authenticated;
grant execute on function app.actualizar_foto_perfil(uuid, text) to mediruta_app;
