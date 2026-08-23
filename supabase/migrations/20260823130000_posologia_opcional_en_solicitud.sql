-- Posología deja de ser obligatoria en cada línea de medicamento — es
-- el único de los 5 campos que puede quedar en blanco (no toda
-- indicación de uso cabe en un campo corto, y muchas veces ya está en
-- la propia foto de la receta). El resto (nombre, concentración, forma
-- farmacéutica, cantidad) sigue siendo obligatorio.
--
-- `create or replace` alcanza acá: misma firma y mismo `returns table`
-- que la versión vigente (20260823080000_add_direccion_farmacia.sql,
-- la última que redefinió esta función — incluye `codigo_pedido`, no
-- la de 20260823051000).
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
