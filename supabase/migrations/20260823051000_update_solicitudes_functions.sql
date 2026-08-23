-- HU-03 (rework) — actualiza las funciones app.* de solicitudes para el
-- nuevo modelo: medicamentos como array (tabla solicitud_medicamentos),
-- receta como foto (receta_path) + fecha de expedición, y un chequeo
-- nuevo en crear_solicitud: no se puede crear una solicitud si el
-- paciente todavía no cargó la foto de su cédula en el perfil (HU-02).
--
-- Postgres no permite CREATE OR REPLACE cuando cambia la lista de
-- parámetros o el RETURNS TABLE — por eso el DROP FUNCTION previo en las
-- que cambian (mismo criterio que obtener_perfil en HU-02).

drop function if exists app.crear_solicitud(
  uuid, text, text, text, text, text, text, text, text, date, text
);
drop function if exists app.actualizar_solicitud(
  uuid, uuid, text, text, text, text, text, text, text, text, date, text
);
drop function if exists app.obtener_solicitud(uuid, uuid);
drop function if exists app.listar_solicitudes(uuid);

-- G01 — crea la solicitud en Borrador con su lista de medicamentos.
-- `resultado`:
--   'creada'        — se creó, `id` trae el uuid nuevo.
--   'no_autorizado' — la cuenta no tiene rol PACIENTE.
--   'sin_cedula'    — el paciente todavía no tiene foto_cedula_path en
--                      su perfil (HU-02) — no se puede ni empezar una
--                      solicitud sin eso.
-- `p_medicamentos` es un array JSON (puede venir vacío — un Borrador
-- puede no tener medicamentos cargados todavía):
--   [{"nombre":..., "concentracion":..., "formaFarmaceutica":...,
--     "cantidad":..., "posologia":...}, ...]
create or replace function app.crear_solicitud(
  p_paciente_id uuid,
  p_medicamentos jsonb,
  p_receta_path text,
  p_receta_fecha_expedicion date,
  p_direccion_entrega text
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
  v_cedula_path text;
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

  select foto_cedula_path
  into v_cedula_path
  from public.perfil_paciente
  where usuario_id = p_paciente_id;

  if v_cedula_path is null then
    return query select 'sin_cedula'::text, null::uuid;
    return;
  end if;

  insert into public.solicitudes (
    paciente_id, receta_path, receta_fecha_expedicion, direccion_entrega
  )
  values (
    p_paciente_id, p_receta_path, p_receta_fecha_expedicion, p_direccion_entrega
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

-- G02 — "Mis solicitudes". Ya no trae medicamento_nombre (columna
-- eliminada) — la lista solo distingue id/estado/fecha, el detalle
-- (G03) trae los medicamentos completos.
create or replace function app.listar_solicitudes(p_paciente_id uuid)
returns table (
  id uuid,
  estado text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.estado, s.creado_en
  from public.solicitudes s
  where s.paciente_id = p_paciente_id
  order by s.creado_en desc;
$$;

-- G04 — editar. Solo si sigue en Borrador y es del dueño. Reemplaza
-- todos los medicamentos por los del array recibido (la App siempre
-- reenvía la lista completa, no hace un diff línea por línea).
create or replace function app.actualizar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_medicamentos jsonb,
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
    receta_fecha_expedicion = p_receta_fecha_expedicion,
    direccion_entrega = p_direccion_entrega,
    actualizado_en = now()
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  if not found then
    return false;
  end if;

  delete from public.solicitud_medicamentos where solicitud_id = p_solicitud_id;

  insert into public.solicitud_medicamentos (
    solicitud_id, nombre, concentracion, forma_farmaceutica, cantidad, posologia
  )
  select
    p_solicitud_id, m.nombre, m.concentracion, m."formaFarmaceutica", m.cantidad,
    m.posologia
  from jsonb_to_recordset(coalesce(p_medicamentos, '[]'::jsonb)) as m(
    nombre text, concentracion text, "formaFarmaceutica" text, cantidad text,
    posologia text
  );

  return true;
end;
$$;

-- Sube/reemplaza la foto de la receta — aparte de actualizar_solicitud
-- porque la sube la API después de subir el archivo a Storage (dos
-- pasos, mismo patrón que actualizar_foto_cedula_paciente de HU-02).
create or replace function app.actualizar_receta_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_path text
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

  if p_path is null or length(btrim(p_path)) = 0 then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.solicitudes
  set receta_path = p_path, actualizado_en = now()
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado = 'borrador';

  return found;
end;
$$;

-- G03 — detalle. `cedula_path` es una referencia viva a
-- perfil_paciente.foto_cedula_path (HU-02) — nunca se copia, no es un
-- campo propio de la solicitud.
create or replace function app.obtener_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  estado text,
  receta_path text,
  receta_fecha_expedicion date,
  direccion_entrega text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz,
  cedula_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.estado, s.receta_path, s.receta_fecha_expedicion, s.direccion_entrega,
    s.creado_en, s.enviado_en, s.cancelado_en, pp.foto_cedula_path
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

-- G03 — medicamentos de una solicitud, en el orden en que se cargaron.
create or replace function app.listar_medicamentos_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  nombre text,
  concentracion text,
  forma_farmaceutica text,
  cantidad text,
  posologia text
)
language sql
security definer
set search_path = ''
stable
as $$
  select m.nombre, m.concentracion, m.forma_farmaceutica, m.cantidad, m.posologia
  from public.solicitud_medicamentos m
  join public.solicitudes s on s.id = m.solicitud_id
  where m.solicitud_id = p_solicitud_id
    and s.paciente_id = p_paciente_id
  order by m.creado_en asc;
$$;

-- G05 — enviar a revisión. `faltantes` ahora exige: al menos un
-- medicamento y que cada uno tenga sus 5 campos completos, foto de
-- receta, fecha de expedición y dirección. La cédula NO se revisa acá
-- — ya se exigió en crear_solicitud, así que si la solicitud existe es
-- porque el paciente ya la tenía.
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
  v_medicamentos_incompletos boolean;
  v_cantidad_medicamentos integer;
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

  select count(*) into v_cantidad_medicamentos
  from public.solicitud_medicamentos
  where solicitud_id = p_solicitud_id;

  select exists (
    select 1
    from public.solicitud_medicamentos
    where solicitud_id = p_solicitud_id
      and (
        nombre is null or length(btrim(nombre)) = 0
        or concentracion is null or length(btrim(concentracion)) = 0
        or forma_farmaceutica is null or length(btrim(forma_farmaceutica)) = 0
        or cantidad is null or length(btrim(cantidad)) = 0
        or posologia is null or length(btrim(posologia)) = 0
      )
  )
  into v_medicamentos_incompletos;

  v_faltantes := array_remove(array[
    case when v_cantidad_medicamentos = 0 then 'Al menos un medicamento' end,
    case when v_cantidad_medicamentos > 0 and v_medicamentos_incompletos
      then 'Completar todos los campos de cada medicamento' end,
    case when v_solicitud.receta_path is null then 'Foto de la receta' end,
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

revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text) from public;
revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text) from anon;
revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text) from authenticated;
grant execute on function app.crear_solicitud(uuid, jsonb, text, date, text) to mediruta_app;

revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text) from public;
revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text) from anon;
revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text) from authenticated;
grant execute on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text) to mediruta_app;

revoke all on function app.actualizar_receta_solicitud(uuid, uuid, text) from public;
revoke all on function app.actualizar_receta_solicitud(uuid, uuid, text) from anon;
revoke all on function app.actualizar_receta_solicitud(uuid, uuid, text) from authenticated;
grant execute on function app.actualizar_receta_solicitud(uuid, uuid, text) to mediruta_app;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.listar_medicamentos_solicitud(uuid, uuid) from public;
revoke all on function app.listar_medicamentos_solicitud(uuid, uuid) from anon;
revoke all on function app.listar_medicamentos_solicitud(uuid, uuid) from authenticated;
grant execute on function app.listar_medicamentos_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.enviar_solicitud(uuid, uuid) from public;
revoke all on function app.enviar_solicitud(uuid, uuid) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.listar_solicitudes(uuid) from public;
revoke all on function app.listar_solicitudes(uuid) from anon;
revoke all on function app.listar_solicitudes(uuid) from authenticated;
grant execute on function app.listar_solicitudes(uuid) to mediruta_app;
