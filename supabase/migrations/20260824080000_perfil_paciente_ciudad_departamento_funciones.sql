-- HU-09 — expone departamento/ciudad del Paciente (columnas agregadas
-- en 20260824020000) a través de las funciones de perfil que ya
-- existían. `obtener_perfil` cambia su RETURNS TABLE → DROP previo
-- (mismo criterio que el resto). `upsert_perfil_paciente` los pide
-- como obligatorios, igual que ya exige dirección/fecha de
-- nacimiento — sin esto no se puede geocodificar ni la dirección de
-- entrega ni la de farmacia de sus pedidos.
drop function if exists app.obtener_perfil(uuid);

create function app.obtener_perfil(p_usuario_id uuid)
returns table (
  nombre_completo text,
  telefono text,
  foto_perfil_path text,
  pac_direccion text,
  pac_fecha_nacimiento date,
  pac_foto_cedula_path text,
  pac_departamento text,
  pac_ciudad text,
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
    pp.departamento,
    pp.ciudad,
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

drop function if exists app.upsert_perfil_paciente(uuid, text, date);

create or replace function app.upsert_perfil_paciente(
  p_usuario_id uuid,
  p_direccion text,
  p_fecha_nacimiento date,
  p_departamento text,
  p_ciudad text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_direccion is null or length(btrim(p_direccion)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_fecha_nacimiento is null or p_fecha_nacimiento >= current_date then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_departamento is null or length(btrim(p_departamento)) = 0
    or p_ciudad is null or length(btrim(p_ciudad)) = 0
  then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'PACIENTE'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_paciente (
    usuario_id, direccion, fecha_nacimiento, departamento, ciudad
  )
  values (p_usuario_id, p_direccion, p_fecha_nacimiento, p_departamento, p_ciudad)
  on conflict (usuario_id) do update
  set
    direccion = excluded.direccion,
    fecha_nacimiento = excluded.fecha_nacimiento,
    departamento = excluded.departamento,
    ciudad = excluded.ciudad,
    actualizado_en = now();

  return true;
end;
$$;

revoke all on function app.upsert_perfil_paciente(uuid, text, date, text, text) from public;
revoke all on function app.upsert_perfil_paciente(uuid, text, date, text, text) from anon;
revoke all on function app.upsert_perfil_paciente(uuid, text, date, text, text) from authenticated;
grant execute on function app.upsert_perfil_paciente(uuid, text, date, text, text) to mediruta_app;
