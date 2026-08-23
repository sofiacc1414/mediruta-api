-- HU-03 — puertas internas app.* para gestión de solicitudes. Mismo
-- patrón del resto de la API: SECURITY DEFINER, search_path vacío, sin
-- SQL dinámico, EXECUTE solo para mediruta_app, REVOKE ALL de
-- PUBLIC/anon/authenticated. App nunca las llama directamente.
--
-- crear/actualizar aceptan campos vacíos a propósito: un Borrador puede
-- estar incompleto por diseño (el paciente lo completa de a poco) — la
-- validación de "todo obligatorio completo" solo ocurre al enviar
-- (app.enviar_solicitud, G05).

-- G01 — crea la solicitud en Borrador. NULL si la cuenta no tiene rol
-- PACIENTE (el caso de uso lo traduce a error de dominio).
create or replace function app.crear_solicitud(
  p_paciente_id uuid,
  p_medicamento_nombre text,
  p_medicamento_concentracion text,
  p_medicamento_forma_farmaceutica text,
  p_medicamento_cantidad text,
  p_medicamento_posologia text,
  p_receta_medico_nombre text,
  p_receta_medico_registro text,
  p_receta_ips text,
  p_receta_fecha_expedicion date,
  p_direccion_entrega text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tiene_rol boolean;
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
    return null;
  end if;

  insert into public.solicitudes (
    paciente_id, medicamento_nombre, medicamento_concentracion,
    medicamento_forma_farmaceutica, medicamento_cantidad, medicamento_posologia,
    receta_medico_nombre, receta_medico_registro, receta_ips, receta_fecha_expedicion,
    direccion_entrega
  )
  values (
    p_paciente_id, p_medicamento_nombre, p_medicamento_concentracion,
    p_medicamento_forma_farmaceutica, p_medicamento_cantidad, p_medicamento_posologia,
    p_receta_medico_nombre, p_receta_medico_registro, p_receta_ips,
    p_receta_fecha_expedicion, p_direccion_entrega
  )
  returning id into v_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (v_id, 'borrador');

  return v_id;
end;
$$;

-- G02 — "Mis solicitudes". Ya viene intrínsecamente acotada al dueño
-- (p_paciente_id es siempre identidad.usuarioId del JWT, nunca un id que
-- mande el cliente) — mismo nivel de confianza que app.obtener_perfil.
create or replace function app.listar_solicitudes(p_paciente_id uuid)
returns table (
  id uuid,
  medicamento_nombre text,
  estado text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.medicamento_nombre, s.estado, s.creado_en
  from public.solicitudes s
  where s.paciente_id = p_paciente_id
  order by s.creado_en desc;
$$;

-- G03 — detalle. El WHERE paciente_id = p_paciente_id es la verificación
-- de dueño: si la solicitud es de otra cuenta, devuelve 0 filas.
create or replace function app.obtener_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  estado text,
  medicamento_nombre text,
  medicamento_concentracion text,
  medicamento_forma_farmaceutica text,
  medicamento_cantidad text,
  medicamento_posologia text,
  receta_medico_nombre text,
  receta_medico_registro text,
  receta_ips text,
  receta_fecha_expedicion date,
  direccion_entrega text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.estado, s.medicamento_nombre, s.medicamento_concentracion,
    s.medicamento_forma_farmaceutica, s.medicamento_cantidad, s.medicamento_posologia,
    s.receta_medico_nombre, s.receta_medico_registro, s.receta_ips,
    s.receta_fecha_expedicion, s.direccion_entrega, s.creado_en, s.enviado_en,
    s.cancelado_en
  from public.solicitudes s
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

-- G03 — historial de estados de una solicitud, más antiguo primero
-- (línea de tiempo). Mismo chequeo de dueño que obtener_solicitud.
create or replace function app.listar_historial_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  estado text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select h.estado, h.creado_en
  from public.historial_solicitud h
  join public.solicitudes s on s.id = h.solicitud_id
  where h.solicitud_id = p_solicitud_id
    and s.paciente_id = p_paciente_id
  order by h.creado_en asc;
$$;

-- G04 — editar. Solo en Borrador y solo el dueño.
create or replace function app.actualizar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_medicamento_nombre text,
  p_medicamento_concentracion text,
  p_medicamento_forma_farmaceutica text,
  p_medicamento_cantidad text,
  p_medicamento_posologia text,
  p_receta_medico_nombre text,
  p_receta_medico_registro text,
  p_receta_ips text,
  p_receta_fecha_expedicion date,
  p_direccion_entrega text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.solicitudes
  set
    medicamento_nombre = p_medicamento_nombre,
    medicamento_concentracion = p_medicamento_concentracion,
    medicamento_forma_farmaceutica = p_medicamento_forma_farmaceutica,
    medicamento_cantidad = p_medicamento_cantidad,
    medicamento_posologia = p_medicamento_posologia,
    receta_medico_nombre = p_receta_medico_nombre,
    receta_medico_registro = p_receta_medico_registro,
    receta_ips = p_receta_ips,
    receta_fecha_expedicion = p_receta_fecha_expedicion,
    direccion_entrega = p_direccion_entrega,
    actualizado_en = now()
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  return found;
end;
$$;

-- G05 — enviar a revisión. `resultado`:
--   'enviada'       — se envió, estado -> pendiente_revision.
--   'incompleta'    — faltan campos obligatorios, nada se modifica,
--                      `faltantes` trae qué falta.
--   'no_encontrada' — no existe una solicitud propia en Borrador con ese id.
create or replace function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
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
  v_solicitud record;
  v_faltantes text[];
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select *
  into v_solicitud
  from public.solicitudes
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  if not found then
    return query select 'no_encontrada'::text, null::text[];
    return;
  end if;

  v_faltantes := array_remove(array[
    case when v_solicitud.medicamento_nombre is null
      or length(btrim(v_solicitud.medicamento_nombre)) = 0
      then 'Nombre del medicamento' end,
    case when v_solicitud.medicamento_concentracion is null
      or length(btrim(v_solicitud.medicamento_concentracion)) = 0
      then 'Concentración/dosis' end,
    case when v_solicitud.medicamento_forma_farmaceutica is null
      or length(btrim(v_solicitud.medicamento_forma_farmaceutica)) = 0
      then 'Forma farmacéutica' end,
    case when v_solicitud.medicamento_cantidad is null
      or length(btrim(v_solicitud.medicamento_cantidad)) = 0
      then 'Cantidad solicitada' end,
    case when v_solicitud.medicamento_posologia is null
      or length(btrim(v_solicitud.medicamento_posologia)) = 0
      then 'Posología' end,
    case when v_solicitud.receta_medico_nombre is null
      or length(btrim(v_solicitud.receta_medico_nombre)) = 0
      then 'Nombre del médico' end,
    case when v_solicitud.receta_medico_registro is null
      or length(btrim(v_solicitud.receta_medico_registro)) = 0
      then 'Registro médico' end,
    case when v_solicitud.receta_ips is null
      or length(btrim(v_solicitud.receta_ips)) = 0
      then 'IPS' end,
    case when v_solicitud.receta_fecha_expedicion is null
      then 'Fecha de expedición de la receta' end,
    case when v_solicitud.direccion_entrega is null
      or length(btrim(v_solicitud.direccion_entrega)) = 0
      then 'Dirección de entrega' end
  ], null);

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleta'::text, v_faltantes;
    return;
  end if;

  update public.solicitudes
  set estado = 'pendiente_revision', enviado_en = now(), actualizado_en = now()
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'pendiente_revision');

  return query select 'enviada'::text, array[]::text[];
end;
$$;

-- G06 — cancelar. Todavía no existe un estado de "ya recogida por un
-- domiciliario" (eso lo trae HU-09/10) — por ahora alcanza con exigir
-- que no esté ya cancelada; cuando exista ese estado, se agrega acá.
create or replace function app.cancelar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.solicitudes
  set estado = 'cancelada', cancelado_en = now(), actualizado_en = now()
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado != 'cancelada';

  if not found then
    return 'no_encontrada';
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'cancelada');

  return 'cancelada';
end;
$$;

revoke all on function app.crear_solicitud(
  uuid, text, text, text, text, text, text, text, text, date, text
) from public;
revoke all on function app.crear_solicitud(
  uuid, text, text, text, text, text, text, text, text, date, text
) from anon;
revoke all on function app.crear_solicitud(
  uuid, text, text, text, text, text, text, text, text, date, text
) from authenticated;
grant execute on function app.crear_solicitud(
  uuid, text, text, text, text, text, text, text, text, date, text
) to mediruta_app;

revoke all on function app.listar_solicitudes(uuid) from public;
revoke all on function app.listar_solicitudes(uuid) from anon;
revoke all on function app.listar_solicitudes(uuid) from authenticated;
grant execute on function app.listar_solicitudes(uuid) to mediruta_app;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.listar_historial_solicitud(uuid, uuid) from public;
revoke all on function app.listar_historial_solicitud(uuid, uuid) from anon;
revoke all on function app.listar_historial_solicitud(uuid, uuid) from authenticated;
grant execute on function app.listar_historial_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.actualizar_solicitud(
  uuid, uuid, text, text, text, text, text, text, text, text, date, text
) from public;
revoke all on function app.actualizar_solicitud(
  uuid, uuid, text, text, text, text, text, text, text, text, date, text
) from anon;
revoke all on function app.actualizar_solicitud(
  uuid, uuid, text, text, text, text, text, text, text, text, date, text
) from authenticated;
grant execute on function app.actualizar_solicitud(
  uuid, uuid, text, text, text, text, text, text, text, text, date, text
) to mediruta_app;

revoke all on function app.enviar_solicitud(uuid, uuid) from public;
revoke all on function app.enviar_solicitud(uuid, uuid) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.cancelar_solicitud(uuid, uuid) from public;
revoke all on function app.cancelar_solicitud(uuid, uuid) from anon;
revoke all on function app.cancelar_solicitud(uuid, uuid) from authenticated;
grant execute on function app.cancelar_solicitud(uuid, uuid) to mediruta_app;
