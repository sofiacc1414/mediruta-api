-- HU-09/HU-07 — al enviar, el pedido ya no se queda esperando en
-- 'pendiente_revision' (nadie lo revisa todavía, HU-06 no existe): pasa
-- directo a 'en_asignacion' para que el pool de domiciliarios lo vea. La
-- fila de historial en 'pendiente_revision' se sigue insertando igual
-- que antes ("Pedido generado" queda registrado en la línea de tiempo),
-- solo que ahora la sigue una segunda fila en 'en_asignacion' en el
-- mismo momento — no son dos pasos que el paciente tenga que esperar
-- por separado, es la misma acción de enviar.
--
-- Gana 2 parámetros nuevos, ambos con default (alcanza `create or
-- replace`, sin DROP — mismo `returns table` que la versión vigente de
-- 20260823080000_add_direccion_farmacia.sql): la ubicación ya
-- geocodificada de la farmacia (la geocodifica el caso de uso en TS, vía
-- NominatimGeocodificacionAdapter, nunca desde SQL) — si viene null (no
-- se pudo geocodificar esa dirección), el pedido igual se envía, solo
-- que sin `farmacia_ubicacion` — por ahora no bloquea, aunque tampoco
-- va a aparecer ordenado por distancia hasta que se resuelva
-- (`listar_pedidos_disponibles` filtra farmacia_ubicacion is not null).
--
-- Genera también `codigo_entrega` (6 caracteres, sin 0/O/1/I/L para que
-- no se confundan al leerlo/tipearlo) — el domiciliario lo pide al
-- entregar (`app.entregar_pedido`) y el paciente lo consulta en su
-- pedido para dárselo en la puerta.
--
-- OJO: agregar parámetros con default vía `create or replace` NO
-- reemplaza la función existente — Postgres identifica la función por
-- su lista de tipos completa, así que `(uuid, uuid)` y `(uuid, uuid,
-- double precision, double precision)` son dos funciones DISTINTAS.
-- Sin el DROP de abajo quedaba la versión vieja (2 parámetros) todavía
-- viva con el comportamiento anterior (sin codigo_entrega, sin
-- en_asignacion) — comprobado en vivo contra la base real.
drop function if exists app.enviar_solicitud(uuid, uuid);

create or replace function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_farmacia_lat double precision default null,
  p_farmacia_lng double precision default null
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
  i integer;
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

  update public.solicitudes
  set
    estado = 'en_asignacion',
    enviado_en = now(),
    actualizado_en = now(),
    codigo_pedido = v_codigo,
    codigo_entrega = v_codigo_entrega,
    farmacia_ubicacion = case when p_farmacia_lat is not null and p_farmacia_lng is not null
      then public.st_setsrid(public.st_makepoint(p_farmacia_lng, p_farmacia_lat), 4326)::public.geography
      else null
    end
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'pendiente_revision');
  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_asignacion');

  return query select 'enviada'::text, array[]::text[], v_codigo;
end;
$$;

revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision) from public;
revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid, double precision, double precision) to mediruta_app;
