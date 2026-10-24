-- Módulo 4 — decisión del dueño del producto: un admin no puede
-- revisar miles de comprobantes de transferencia a mano, así que se
-- asume que la pasarela existe y comprueba el pago automáticamente,
-- igual que tarjeta (`SimuladoPagoTransferenciaAdapter`, resuelto en
-- TS ANTES de llamar a esta función). Transferencia ya no sube
-- comprobante ni pasa por `pendiente_revision` — publica directo a
-- `en_asignacion`, como efectivo y tarjeta.

drop function if exists app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision, text, numeric, numeric, numeric, text);

create or replace function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_farmacia_lat double precision default null,
  p_farmacia_lng double precision default null,
  p_entrega_lat double precision default null,
  p_entrega_lng double precision default null,
  p_metodo_pago text default 'efectivo',
  p_copago_cobrado numeric default null,
  p_domicilio_cobrado numeric default null,
  p_comision_app_porcentaje numeric default null,
  p_comprobante_pago_path text default null
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
  v_codigo_entrega text;
  v_charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_estado_final text;
  i integer;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_metodo_pago not in ('efectivo', 'tarjeta', 'transferencia') then
    raise exception 'método de pago inválido' using errcode = '22023';
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

  loop
    v_codigo_entrega := '';
    for i in 1..6 loop
      v_codigo_entrega := v_codigo_entrega
        || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.solicitudes where codigo_entrega = v_codigo_entrega
    );
  end loop;

  -- Efectivo, tarjeta y ahora transferencia publican de inmediato — los
  -- 3 medios ya se resuelven/cobran en TS antes de llegar acá.
  v_estado_final := 'en_asignacion';

  update public.solicitudes
  set
    estado = v_estado_final,
    enviado_en = now(),
    actualizado_en = now(),
    codigo_pedido = v_codigo,
    codigo_entrega = v_codigo_entrega,
    metodo_pago = p_metodo_pago,
    comprobante_pago_path = p_comprobante_pago_path,
    copago_cobrado = p_copago_cobrado,
    domicilio_cobrado = p_domicilio_cobrado,
    comision_app_porcentaje_cobrada = p_comision_app_porcentaje,
    farmacia_ubicacion = case when p_farmacia_lat is not null and p_farmacia_lng is not null
      then public.st_setsrid(public.st_makepoint(p_farmacia_lng, p_farmacia_lat), 4326)::public.geography
      else null
    end,
    entrega_ubicacion = case when p_entrega_lat is not null and p_entrega_lng is not null
      then public.st_setsrid(public.st_makepoint(p_entrega_lng, p_entrega_lat), 4326)::public.geography
      else null
    end
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_asignacion');

  return query select 'enviada'::text, array[]::text[], v_codigo;
end;
$$;

revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision, text, numeric, numeric, numeric, text) to mediruta_app;

-- Con transferencia aprobándose sola en TS, ya nunca va a existir una
-- solicitud en `pendiente_revision` generada por transferencia — no
-- queda nada que el admin tenga que aprobar/rechazar/listar a mano.
drop function if exists app.listar_pagos_pendientes_admin(uuid);
drop function if exists app.aprobar_pago_transferencia_admin(uuid, uuid);
drop function if exists app.rechazar_pago_transferencia_admin(uuid, uuid);
