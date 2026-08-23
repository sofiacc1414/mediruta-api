-- HU-08 (corrección) — la validación de domiciliario no tenía ningún
-- paso de "enviar solicitud": apenas se otorgaba el rol (registro o
-- `solicitar_rol_domiciliario`) ya quedaba `pendiente_validacion`, así
-- que el admin lo veía en su lista incluso sin haber cargado ni un
-- dato. Se agrega un estado nuevo, `borrador` — mismo espíritu que las
-- solicitudes médicas de HU-03 (crear ≠ enviar): el domiciliario carga
-- sus datos en `borrador` (invisible para el admin) y recién pasa a
-- `pendiente_validacion` (visible) cuando confirma con
-- `app.enviar_solicitud_domiciliario`, que exige los mismos 7 campos
-- que ya exigía `aprobar_domiciliario` para poder aprobar — ahora se
-- exigen antes, al enviar, no recién cuando el admin intenta aprobar.

alter table public.usuario_roles drop constraint usuario_roles_estado_check;
alter table public.usuario_roles add constraint usuario_roles_estado_check check (
  estado in ('borrador', 'habilitado', 'pendiente_validacion', 'rechazado')
);

-- Registro público: el domiciliario nuevo arranca en borrador, no en
-- pendiente_validacion — todavía no cargó ningún dato de HU-02.
create or replace function app.registrar_usuario(
  p_correo text,
  p_password_hash text,
  p_tipo_registro text,
  p_alta_paciente boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_password_hash text;
  v_tipo text;
  v_usuario_id uuid;
  v_rol_paciente_id uuid;
  v_rol_domiciliario_id uuid;
begin
  v_correo := lower(btrim(p_correo));
  v_password_hash := btrim(p_password_hash);
  v_tipo := upper(btrim(coalesce(p_tipo_registro, '')));

  if v_correo is null or length(v_correo) = 0 then
    raise exception 'correo inválido'
      using errcode = '22023';
  end if;

  if v_password_hash is null or length(v_password_hash) = 0 then
    raise exception 'password_hash inválido'
      using errcode = '22023';
  end if;

  if v_tipo is distinct from 'PACIENTE' and v_tipo is distinct from 'DOMICILIARIO' then
    raise exception 'tipo de registro inválido'
      using errcode = '22023';
  end if;

  insert into public.usuarios (correo, password_hash, estado_cuenta)
  values (v_correo, v_password_hash, 'activa')
  returning id into v_usuario_id;

  select r.id
  into v_rol_paciente_id
  from public.roles as r
  where r.codigo = 'PACIENTE';

  if not found then
    raise exception 'rol PACIENTE no encontrado en el catálogo'
      using errcode = '22023';
  end if;

  if v_tipo = 'PACIENTE' or p_alta_paciente then
    insert into public.usuario_roles (usuario_id, rol_id, estado)
    values (v_usuario_id, v_rol_paciente_id, 'habilitado');
  end if;

  if v_tipo = 'DOMICILIARIO' then
    select r.id
    into v_rol_domiciliario_id
    from public.roles as r
    where r.codigo = 'DOMICILIARIO';

    if not found then
      raise exception 'rol DOMICILIARIO no encontrado en el catálogo'
        using errcode = '22023';
    end if;

    insert into public.usuario_roles (usuario_id, rol_id, estado)
    values (v_usuario_id, v_rol_domiciliario_id, 'borrador');
  end if;

  return v_usuario_id;
end;
$$;

-- Solicitar el rol después de un registro: mismo criterio, arranca en
-- borrador (con los datos ya copiados del perfil paciente si había).
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
  values (p_usuario_id, v_rol_id, 'borrador');

  insert into public.perfil_domiciliario (usuario_id, direccion, cedula_path)
  select pp.usuario_id, pp.direccion, pp.foto_cedula_path
  from public.perfil_paciente pp
  where pp.usuario_id = p_usuario_id
    and (pp.direccion is not null or pp.foto_cedula_path is not null)
  on conflict (usuario_id) do nothing;

  return 'agregado';
end;
$$;

-- G01 — envía la solicitud de validación: borrador -> pendiente_validacion.
-- Mismos 7 campos obligatorios que ya exigía aprobar_domiciliario (ahora
-- se piden acá, no recién al aprobar). `resultado`:
--   'enviada'       — pasó a pendiente_validacion, ya es visible para el admin.
--   'incompleta'    — falta algún dato, `faltantes` trae qué.
--   'no_encontrada' — no hay DOMICILIARIO en borrador para esta cuenta
--                      (no tiene el rol, o ya lo había enviado antes).
create or replace function app.enviar_solicitud_domiciliario(
  p_usuario_id uuid
)
returns table (
  resultado text,
  faltantes text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_en_borrador boolean;
  v_faltantes text[];
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'DOMICILIARIO'
      and ur.estado = 'borrador'
  )
  into v_en_borrador;

  if not v_en_borrador then
    return query select 'no_encontrada'::text, null::text[];
    return;
  end if;

  select array_remove(array[
    case when pd.direccion is null or length(btrim(pd.direccion)) = 0
      then 'Dirección de residencia' end,
    case when pd.vehiculo_tipo is null or length(btrim(pd.vehiculo_tipo)) = 0
      then 'Tipo de vehículo' end,
    case when pd.vehiculo_placa is null or length(btrim(pd.vehiculo_placa)) = 0
      then 'Placa' end,
    case when pd.cedula_path is null then 'Cédula' end,
    case when pd.licencia_path is null then 'Licencia de conducción' end,
    case when pd.soat_path is null then 'SOAT' end,
    case when pd.tecnicomecanica_path is null then 'Tecnomecánica' end
  ], null)
  into v_faltantes
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_usuario_id;

  if v_faltantes is null then
    v_faltantes := array[
      'Dirección de residencia', 'Tipo de vehículo', 'Placa',
      'Cédula', 'Licencia de conducción', 'SOAT', 'Tecnomecánica'
    ];
  end if;

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleta'::text, v_faltantes;
    return;
  end if;

  update public.usuario_roles
  set estado = 'pendiente_validacion', actualizado_en = now()
  where usuario_id = p_usuario_id
    and rol_id = (select id from public.roles where codigo = 'DOMICILIARIO');

  return query select 'enviada'::text, array[]::text[];
end;
$$;

revoke all on function app.registrar_usuario(text, text, text, boolean) from public;
revoke all on function app.registrar_usuario(text, text, text, boolean) from anon;
revoke all on function app.registrar_usuario(text, text, text, boolean) from authenticated;
grant execute on function app.registrar_usuario(text, text, text, boolean) to mediruta_app;

revoke all on function app.solicitar_rol_domiciliario(uuid) from public;
revoke all on function app.solicitar_rol_domiciliario(uuid) from anon;
revoke all on function app.solicitar_rol_domiciliario(uuid) from authenticated;
grant execute on function app.solicitar_rol_domiciliario(uuid) to mediruta_app;

revoke all on function app.enviar_solicitud_domiciliario(uuid) from public;
revoke all on function app.enviar_solicitud_domiciliario(uuid) from anon;
revoke all on function app.enviar_solicitud_domiciliario(uuid) from authenticated;
grant execute on function app.enviar_solicitud_domiciliario(uuid) to mediruta_app;
