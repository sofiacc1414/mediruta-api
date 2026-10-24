-- `EnviarSolicitudUseCase` necesita `comision_app_porcentaje` para
-- armar la foto del precio que se persiste en `solicitudes` al enviar
-- (ver migración anterior, `wallet_domiciliario_pasarela_pago`) — se
-- agrega como un ingrediente más a la función que ya trae copago y
-- tarifas, mismo criterio que el resto de esos campos.

drop function if exists app.obtener_datos_precio_pedido(uuid, uuid);

create function app.obtener_datos_precio_pedido(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  copago numeric,
  distancia_metros double precision,
  tarifa_base_domicilio numeric,
  tarifa_por_km numeric,
  tarifa_por_minuto numeric,
  tiempo_base_farmacia_min int,
  velocidad_promedio_kmh numeric,
  distancia_incluida_km numeric,
  tarifa_por_km_excedente numeric,
  comision_app_porcentaje numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    nc.copago,
    case when s.farmacia_ubicacion is not null and s.entrega_ubicacion is not null
      then public.st_distance(s.farmacia_ubicacion, s.entrega_ubicacion)
      else null
    end,
    c.tarifa_base_domicilio, c.tarifa_por_km, c.tarifa_por_minuto,
    c.tiempo_base_farmacia_min, c.velocidad_promedio_kmh,
    c.distancia_incluida_km, c.tarifa_por_km_excedente,
    c.comision_app_porcentaje
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  left join public.niveles_copago nc on nc.id = pp.nivel_copago_id
  cross join public.configuracion_admin c
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id
    and c.id = 1;
$$;

revoke all on function app.obtener_datos_precio_pedido(uuid, uuid) from public, anon, authenticated;
grant execute on function app.obtener_datos_precio_pedido(uuid, uuid) to mediruta_app;
