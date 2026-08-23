-- HU-02/HU-01 (corrección) — al pedir el rol que falta, se reusan los
-- datos que ya se cargaron para el otro rol en vez de pedirlos de
-- nuevo: `direccion` (misma columna en ambas tablas de perfil) y la
-- foto de cédula (`perfil_paciente.foto_cedula_path` <->
-- `perfil_domiciliario.cedula_path`, mismo documento con dos nombres
-- de columna distintos).
--
-- Domiciliario -> solicita Paciente: copia direccion + foto de cédula
-- desde perfil_domiciliario. El paciente queda con esos dos datos
-- listos (le falta solo la fecha de nacimiento, que el domiciliario
-- nunca carga).
--
-- Paciente -> solicita Domiciliario: copia direccion + foto de cédula
-- desde perfil_paciente hacia perfil_domiciliario. Vehículo (tipo,
-- placa) y los otros 3 documentos (licencia, SOAT, tecnomecánica)
-- quedan sin cargar a propósito — esos sí hay que agregarlos para
-- poder enviar la solicitud de validación, no hay de dónde copiarlos.
--
-- Ninguna de las dos copias sobreescribe un perfil que ya existiera
-- (ON CONFLICT DO NOTHING) — solo aplica la primera vez que se gana el
-- rol, con lo que ya había cargado del otro.

create or replace function app.solicitar_rol_paciente(
  p_usuario_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol_id uuid;
  v_ya_lo_tenia boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select r.id
  into v_rol_id
  from public.roles as r
  where r.codigo = 'PACIENTE';

  select exists (
    select 1 from public.usuario_roles
    where usuario_id = p_usuario_id and rol_id = v_rol_id
  )
  into v_ya_lo_tenia;

  if v_ya_lo_tenia then
    return 'ya_lo_tenia';
  end if;

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (p_usuario_id, v_rol_id, 'habilitado');

  insert into public.perfil_paciente (usuario_id, direccion, foto_cedula_path)
  select pd.usuario_id, pd.direccion, pd.cedula_path
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_usuario_id
    and (pd.direccion is not null or pd.cedula_path is not null)
  on conflict (usuario_id) do nothing;

  return 'agregado';
end;
$$;

-- Agrega el rol DOMICILIARIO a una cuenta que todavía no lo tiene, en
-- pendiente_validacion — mismo estado inicial que el registro directo
-- como DOMICILIARIO. De ahí en más usa el flujo ya existente de HU-02
-- (completar perfil/documentos) y HU-08 (aprobación del admin) sin
-- cambios: ambos solo exigen que la fila en usuario_roles exista, no
-- que esté habilitada.
create or replace function app.solicitar_rol_domiciliario(
  p_usuario_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol_id uuid;
  v_ya_lo_tenia boolean;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select r.id
  into v_rol_id
  from public.roles as r
  where r.codigo = 'DOMICILIARIO';

  select exists (
    select 1 from public.usuario_roles
    where usuario_id = p_usuario_id and rol_id = v_rol_id
  )
  into v_ya_lo_tenia;

  if v_ya_lo_tenia then
    return 'ya_lo_tenia';
  end if;

  insert into public.usuario_roles (usuario_id, rol_id, estado)
  values (p_usuario_id, v_rol_id, 'pendiente_validacion');

  insert into public.perfil_domiciliario (usuario_id, direccion, cedula_path)
  select pp.usuario_id, pp.direccion, pp.foto_cedula_path
  from public.perfil_paciente pp
  where pp.usuario_id = p_usuario_id
    and (pp.direccion is not null or pp.foto_cedula_path is not null)
  on conflict (usuario_id) do nothing;

  return 'agregado';
end;
$$;

revoke all on function app.solicitar_rol_paciente(uuid) from public;
revoke all on function app.solicitar_rol_paciente(uuid) from anon;
revoke all on function app.solicitar_rol_paciente(uuid) from authenticated;
grant execute on function app.solicitar_rol_paciente(uuid) to mediruta_app;

revoke all on function app.solicitar_rol_domiciliario(uuid) from public;
revoke all on function app.solicitar_rol_domiciliario(uuid) from anon;
revoke all on function app.solicitar_rol_domiciliario(uuid) from authenticated;
grant execute on function app.solicitar_rol_domiciliario(uuid) to mediruta_app;
