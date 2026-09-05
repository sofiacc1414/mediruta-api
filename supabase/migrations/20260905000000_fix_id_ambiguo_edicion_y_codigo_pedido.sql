-- Fix: `app.solicitar_edicion_pedido` y `app.reportar_codigo_no_generado`
-- (20260901090000) referenciaban la columna `id` de `public.solicitudes`
-- sin calificar en su WHERE — pero `RETURNS TABLE (resultado text, id
-- uuid)` declara `id` como variable de salida dentro del cuerpo de la
-- función en PL/pgSQL, así que esa `id` sin calificar queda ambigua
-- entre la columna y la variable. Postgres lo rechaza en tiempo de
-- ejecución con "column reference \"id\" is ambiguous" — las dos
-- funciones fallaban siempre, para cualquier llamada real.
-- CREATE OR REPLACE porque la firma (parámetros y columnas de salida)
-- no cambia — no hace falta el DROP previo que sí exige un cambio de
-- columnas.

create or replace function app.solicitar_edicion_pedido(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_direccion_entrega text,
  p_direccion_farmacia text,
  p_detalle text
)
returns table (resultado text, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_actual record;
  v_detalle text;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if (p_direccion_entrega is null or length(btrim(p_direccion_entrega)) = 0)
    and (p_direccion_farmacia is null or length(btrim(p_direccion_farmacia)) = 0)
  then
    raise exception 'no hay cambios propuestos' using errcode = '22023';
  end if;

  select direccion_entrega, direccion_farmacia into v_actual
  from public.solicitudes
  where public.solicitudes.id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado not in ('borrador', 'entregado', 'cancelada');

  if not found then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  v_detalle := coalesce(
    nullif(btrim(p_detalle), ''),
    'Solicitud de corrección de datos del pedido.'
  );

  insert into public.novedad_solicitud (
    solicitud_id, reportada_por, detalle, origen, tipo, datos_actuales, datos_propuestos
  )
  values (
    p_solicitud_id, p_paciente_id, v_detalle, 'paciente', 'edicion',
    jsonb_build_object(
      'direccionEntrega', v_actual.direccion_entrega,
      'direccionFarmacia', v_actual.direccion_farmacia
    ),
    jsonb_build_object(
      'direccionEntrega', nullif(btrim(p_direccion_entrega), ''),
      'direccionFarmacia', nullif(btrim(p_direccion_farmacia), '')
    )
  )
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

create or replace function app.reportar_codigo_no_generado(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_detalle text
)
returns table (resultado text, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_detalle text;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.solicitudes
    where public.solicitudes.id = p_solicitud_id
      and paciente_id = p_paciente_id
      and estado not in ('borrador', 'entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  v_detalle := coalesce(
    nullif(btrim(p_detalle), ''),
    'El código de entrega no se generó o no es visible en la app.'
  );

  insert into public.novedad_solicitud (solicitud_id, reportada_por, detalle, origen, tipo)
  values (p_solicitud_id, p_paciente_id, v_detalle, 'paciente', 'codigo')
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;
