-- HU-03 (corrección) — faltaba un dato del pedido: la dirección de la
-- farmacia donde el domiciliario retira el medicamento. Es distinta de
-- `direccion_entrega` (dónde se lo lleva al paciente) — dos puntos
-- distintos de un mismo pedido, no un duplicado.

alter table public.solicitudes add column if not exists direccion_farmacia text;

-- Postgres no permite cambiar la lista de parámetros ni las columnas de
-- un RETURNS TABLE vía CREATE OR REPLACE — DROP previo en las que
-- cambian (mismo criterio que en migraciones anteriores).
drop function if exists app.crear_solicitud(uuid, jsonb, text, date, text);
drop function if exists app.actualizar_solicitud(uuid, uuid, jsonb, date, text);
drop function if exists app.obtener_solicitud(uuid, uuid);
drop function if exists app.enviar_solicitud(uuid, uuid);

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

create or replace function app.actualizar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_medicamentos jsonb,
  p_receta_fecha_vencimiento date,
  p_direccion_entrega text,
  p_direccion_farmacia text
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
    receta_fecha_vencimiento = p_receta_fecha_vencimiento,
    direccion_entrega = p_direccion_entrega,
    direccion_farmacia = p_direccion_farmacia,
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

create or replace function app.obtener_solicitud(
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
  cedula_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.receta_path, s.receta_fecha_vencimiento,
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en,
    s.cancelado_en, pp.foto_cedula_path
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

-- G05 — agrega 'Dirección de la farmacia' a los faltantes.
create or replace function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  faltantes text[],
  codigo_pedido text
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
  v_codigo text;
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
    return query select 'no_encontrada'::text, null::text[], null::text;
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
    case when v_solicitud.receta_fecha_vencimiento is null
      then 'Fecha de vencimiento de la receta' end,
    case when v_solicitud.receta_fecha_vencimiento is not null
      and v_solicitud.receta_fecha_vencimiento < current_date
      then 'La receta está vencida — sube una foto de una receta vigente' end,
    case when v_solicitud.direccion_farmacia is null
      or length(btrim(v_solicitud.direccion_farmacia)) = 0
      then 'Dirección de la farmacia' end,
    case when v_solicitud.direccion_entrega is null
      or length(btrim(v_solicitud.direccion_entrega)) = 0
      then 'Dirección de entrega' end
  ], null);

  if array_length(v_faltantes, 1) > 0 then
    return query select 'incompleta'::text, v_faltantes, null::text;
    return;
  end if;

  v_codigo := 'MR-' || lpad(nextval('public.solicitudes_codigo_pedido_seq')::text, 6, '0');

  update public.solicitudes
  set estado = 'pendiente_revision', enviado_en = now(), actualizado_en = now(),
    codigo_pedido = v_codigo
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'pendiente_revision');

  return query select 'enviada'::text, array[]::text[], v_codigo;
end;
$$;

revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text, text) from public;
revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text, text) from anon;
revoke all on function app.crear_solicitud(uuid, jsonb, text, date, text, text) from authenticated;
grant execute on function app.crear_solicitud(uuid, jsonb, text, date, text, text) to mediruta_app;

revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text, text) from public;
revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text, text) from anon;
revoke all on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text, text) from authenticated;
grant execute on function app.actualizar_solicitud(uuid, uuid, jsonb, date, text, text) to mediruta_app;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;

revoke all on function app.enviar_solicitud(uuid, uuid) from public;
revoke all on function app.enviar_solicitud(uuid, uuid) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid) to mediruta_app;
