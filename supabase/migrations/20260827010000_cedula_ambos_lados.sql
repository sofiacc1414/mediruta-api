-- HU-02/HU-09 (corrección) — la cédula colombiana trae información
-- necesaria en las dos caras (frente: foto y datos básicos; reverso:
-- huella, fecha de vencimiento, etc.), así que tanto el Paciente como
-- el Domiciliario deben subir ambos lados, no uno solo. Renombra las
-- columnas existentes a "_frente" (conservan lo ya subido) y agrega
-- "_reverso" al lado de cada una.

alter table public.perfil_paciente
  rename column foto_cedula_path to foto_cedula_frente_path;
alter table public.perfil_paciente
  add column foto_cedula_reverso_path text;

alter table public.perfil_domiciliario
  rename column cedula_path to cedula_frente_path;
alter table public.perfil_domiciliario
  add column cedula_reverso_path text;

-- Postgres no permite cambiar las columnas de un RETURNS TABLE vía
-- CREATE OR REPLACE — DROP previo en las que cambian (mismo criterio
-- que el resto del proyecto).
drop function if exists app.obtener_perfil(uuid);

create function app.obtener_perfil(p_usuario_id uuid)
returns table (
  nombre_completo text,
  telefono text,
  foto_perfil_path text,
  pac_direccion text,
  pac_fecha_nacimiento date,
  pac_foto_cedula_frente_path text,
  pac_foto_cedula_reverso_path text,
  pac_departamento text,
  pac_ciudad text,
  dom_direccion text,
  dom_vehiculo_tipo text,
  dom_vehiculo_placa text,
  dom_cedula_frente_path text,
  dom_cedula_reverso_path text,
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
    pp.foto_cedula_frente_path,
    pp.foto_cedula_reverso_path,
    pp.departamento,
    pp.ciudad,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_frente_path,
    pd.cedula_reverso_path,
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

-- `actualizar_foto_cedula_paciente` suma `p_lado` ('frente'|'reverso')
-- — cambia la lista de parámetros → DROP previo.
drop function if exists app.actualizar_foto_cedula_paciente(uuid, text);

create function app.actualizar_foto_cedula_paciente(
  p_usuario_id uuid,
  p_lado text,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
  v_lado text;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  v_lado := lower(btrim(coalesce(p_lado, '')));
  if v_lado not in ('frente', 'reverso') then
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

  insert into public.perfil_paciente (usuario_id)
  values (p_usuario_id)
  on conflict (usuario_id) do nothing;

  update public.perfil_paciente
  set
    foto_cedula_frente_path = case
      when v_lado = 'frente' then p_path else foto_cedula_frente_path
    end,
    foto_cedula_reverso_path = case
      when v_lado = 'reverso' then p_path else foto_cedula_reverso_path
    end,
    actualizado_en = now()
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

revoke all on function app.actualizar_foto_cedula_paciente(uuid, text, text) from public;
revoke all on function app.actualizar_foto_cedula_paciente(uuid, text, text) from anon;
revoke all on function app.actualizar_foto_cedula_paciente(uuid, text, text) from authenticated;
grant execute on function app.actualizar_foto_cedula_paciente(uuid, text, text) to mediruta_app;

-- `actualizar_documento_domiciliario` mantiene su firma — solo cambia
-- qué valores acepta `p_tipo` ('cedula' -> 'cedula_frente'/
-- 'cedula_reverso') y a qué columna escribe cada uno.
create or replace function app.actualizar_documento_domiciliario(
  p_usuario_id uuid,
  p_tipo text,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
  v_tipo text;
begin
  if p_usuario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  v_tipo := lower(btrim(coalesce(p_tipo, '')));
  if v_tipo not in (
    'cedula_frente', 'cedula_reverso', 'licencia', 'soat', 'tecnicomecanica'
  ) then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_usuario_id
      and r.codigo = 'DOMICILIARIO'
  )
  into v_tiene_rol;

  if not v_tiene_rol then
    return false;
  end if;

  insert into public.perfil_domiciliario (usuario_id)
  values (p_usuario_id)
  on conflict (usuario_id) do nothing;

  update public.perfil_domiciliario
  set
    cedula_frente_path = case
      when v_tipo = 'cedula_frente' then p_path else cedula_frente_path
    end,
    cedula_reverso_path = case
      when v_tipo = 'cedula_reverso' then p_path else cedula_reverso_path
    end,
    licencia_path = case when v_tipo = 'licencia' then p_path else licencia_path end,
    soat_path = case when v_tipo = 'soat' then p_path else soat_path end,
    tecnicomecanica_path = case
      when v_tipo = 'tecnicomecanica' then p_path
      else tecnicomecanica_path
    end,
    actualizado_en = now()
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

-- `obtener_detalle_domiciliario` (panel admin) cambia sus columnas de
-- salida → DROP previo.
drop function if exists app.obtener_detalle_domiciliario(uuid, uuid);

create function app.obtener_detalle_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid
)
returns table (
  nombre_completo text,
  telefono text,
  estado text,
  solicitado_en timestamptz,
  direccion text,
  vehiculo_tipo text,
  vehiculo_placa text,
  cedula_frente_path text,
  cedula_reverso_path text,
  licencia_path text,
  soat_path text,
  tecnicomecanica_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.nombre_completo,
    u.telefono,
    ur.estado,
    ur.creado_en,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_frente_path,
    pd.cedula_reverso_path,
    pd.licencia_path,
    pd.soat_path,
    pd.tecnicomecanica_path
  from public.usuario_roles ur
  join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  left join public.perfil_domiciliario pd on pd.usuario_id = ur.usuario_id
  where ur.usuario_id = p_domiciliario_id
    and r.codigo = 'DOMICILIARIO'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from public;
revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from anon;
revoke all on function app.obtener_detalle_domiciliario(uuid, uuid) from authenticated;
grant execute on function app.obtener_detalle_domiciliario(uuid, uuid) to mediruta_app;

-- `aprobar_domiciliario` mantiene firma y columnas de salida — solo
-- cambia la lista de "faltantes" (cédula pasa a contar 2 lados).
create or replace function app.aprobar_domiciliario(
  p_admin_id uuid,
  p_domiciliario_id uuid
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
  v_pendiente boolean;
  v_faltantes text[];
begin
  if p_admin_id is null or p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::text[];
    return;
  end if;

  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = p_domiciliario_id
      and r.codigo = 'DOMICILIARIO'
      and ur.estado = 'pendiente_validacion'
  )
  into v_pendiente;

  if not v_pendiente then
    return query select 'no_encontrado'::text, null::text[];
    return;
  end if;

  select array_remove(array[
    case when pd.direccion is null or length(btrim(pd.direccion)) = 0
      then 'Dirección de residencia' end,
    case when pd.vehiculo_tipo is null or length(btrim(pd.vehiculo_tipo)) = 0
      then 'Tipo de vehículo' end,
    case when pd.vehiculo_placa is null or length(btrim(pd.vehiculo_placa)) = 0
      then 'Placa' end,
    case when pd.cedula_frente_path is null then 'Cédula (frente)' end,
    case when pd.cedula_reverso_path is null then 'Cédula (reverso)' end,
    case when pd.licencia_path is null then 'Licencia de conducción' end,
    case when pd.soat_path is null then 'SOAT' end,
    case when pd.tecnicomecanica_path is null then 'Tecnomecánica' end
  ], null)
  into v_faltantes
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_domiciliario_id;

  if v_faltantes is null then
    v_faltantes := array[
      'Dirección de residencia', 'Tipo de vehículo', 'Placa',
      'Cédula (frente)', 'Cédula (reverso)', 'Licencia de conducción',
      'SOAT', 'Tecnomecánica'
    ];
  end if;

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleto'::text, v_faltantes;
    return;
  end if;

  update public.usuario_roles
  set estado = 'habilitado', actualizado_en = now()
  where usuario_id = p_domiciliario_id
    and rol_id = (select id from public.roles where codigo = 'DOMICILIARIO');

  insert into public.validaciones_domiciliario (
    domiciliario_id, admin_id, decision
  )
  values (p_domiciliario_id, p_admin_id, 'aprobado');

  return query select 'aprobado'::text, array[]::text[];
end;
$$;

-- `enviar_solicitud_domiciliario` — misma corrección de "faltantes".
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
    case when pd.cedula_frente_path is null then 'Cédula (frente)' end,
    case when pd.cedula_reverso_path is null then 'Cédula (reverso)' end,
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
      'Cédula (frente)', 'Cédula (reverso)', 'Licencia de conducción',
      'SOAT', 'Tecnomecánica'
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

-- `solicitar_rol_domiciliario`/`solicitar_rol_paciente` — la reutilización
-- de datos al agregar el segundo rol ahora copia los 2 lados de cédula.
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

  insert into public.perfil_domiciliario (
    usuario_id, direccion, cedula_frente_path, cedula_reverso_path
  )
  select pp.usuario_id, pp.direccion, pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path
  from public.perfil_paciente pp
  where pp.usuario_id = p_usuario_id
    and (
      pp.direccion is not null
      or pp.foto_cedula_frente_path is not null
      or pp.foto_cedula_reverso_path is not null
    )
  on conflict (usuario_id) do nothing;

  return 'agregado';
end;
$$;

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

  insert into public.perfil_paciente (
    usuario_id, direccion, foto_cedula_frente_path, foto_cedula_reverso_path
  )
  select pd.usuario_id, pd.direccion, pd.cedula_frente_path, pd.cedula_reverso_path
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_usuario_id
    and (
      pd.direccion is not null
      or pd.cedula_frente_path is not null
      or pd.cedula_reverso_path is not null
    )
  on conflict (usuario_id) do nothing;

  return 'agregado';
end;
$$;

-- `crear_solicitud` exige los 2 lados de cédula del Paciente antes de
-- permitir crear una solicitud (mismo criterio que antes exigía solo
-- 1 lado) — firma y RETURNS TABLE sin cambios, solo el chequeo.
create or replace function app.crear_solicitud(
  p_paciente_id uuid,
  p_medicamentos jsonb,
  p_receta_path text,
  p_receta_fecha_vencimiento date,
  p_direccion_entrega text,
  p_direccion_farmacia text
)
returns table (
  resultado text,
  id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
  v_cedula_frente_path text;
  v_cedula_reverso_path text;
  v_id uuid;
begin
  if p_paciente_id is null then
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
    return query select 'no_autorizado'::text, null::uuid;
    return;
  end if;

  select foto_cedula_frente_path, foto_cedula_reverso_path
  into v_cedula_frente_path, v_cedula_reverso_path
  from public.perfil_paciente
  where usuario_id = p_paciente_id;

  if v_cedula_frente_path is null or v_cedula_reverso_path is null then
    return query select 'sin_cedula'::text, null::uuid;
    return;
  end if;

  insert into public.solicitudes (
    paciente_id, receta_path, receta_fecha_vencimiento, direccion_entrega,
    direccion_farmacia
  )
  values (
    p_paciente_id, p_receta_path, p_receta_fecha_vencimiento, p_direccion_entrega,
    p_direccion_farmacia
  )
  returning solicitudes.id into v_id;

  insert into public.solicitud_medicamentos (
    solicitud_id, nombre, concentracion, forma_farmaceutica, cantidad, posologia
  )
  select
    v_id, m.nombre, m.concentracion, m."formaFarmaceutica", m.cantidad, m.posologia
  from jsonb_to_recordset(coalesce(p_medicamentos, '[]'::jsonb)) as m(
    nombre text, concentracion text, "formaFarmaceutica" text, cantidad text,
    posologia text
  );

  insert into public.historial_solicitud (solicitud_id, estado)
  values (v_id, 'borrador');

  return query select 'creada'::text, v_id;
end;
$$;

-- `obtener_solicitud` (detalle propio del Paciente) suma el reverso de
-- su cédula → cambia columnas de salida → DROP previo.
drop function if exists app.obtener_solicitud(uuid, uuid);

create function app.obtener_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  receta_path text,
  receta_fecha_vencimiento date,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz,
  cedula_frente_path text,
  cedula_reverso_path text,
  codigo_entrega text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.receta_path, s.receta_fecha_vencimiento,
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en,
    s.cancelado_en, pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path,
    s.codigo_entrega
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;

-- HU-07/HU-09 (nuevo) — "documentos del paciente para reclamar en
-- farmacia": el Domiciliario necesita mostrar la cédula del Paciente
-- (ambos lados) en la farmacia para retirar el medicamento a su
-- nombre. Por seguridad/privacidad solo se expone mientras el pedido
-- está en 'asignado_en_camino_farmacia' (ya aceptado, todavía no
-- marcó "medicamentos recogidos") — antes o después de esa ventana no
-- hay ningún motivo legítimo para que el Domiciliario vea esta
-- cédula, así que la función devuelve 0 filas fuera de ese estado.
create function app.obtener_documentos_paciente_para_recoger(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  cedula_frente_path text,
  cedula_reverso_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path
  from public.solicitudes s
  join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and s.estado = 'asignado_en_camino_farmacia';
$$;

revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from public;
revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from anon;
revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from authenticated;
grant execute on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) to mediruta_app;
