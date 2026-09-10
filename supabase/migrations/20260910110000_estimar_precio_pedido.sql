-- El precio recién se podía ver DESPUÉS de enviar el pedido: el
-- cálculo depende de farmacia_ubicacion/entrega_ubicacion, y esas
-- columnas solo se llenan en `enviar_solicitud` (ver migración
-- precio_pedido_copago). El paciente armaba todo el pedido a ciegas y
-- se enteraba del costo recién al final.
--
-- Esta función alimenta un estimado en vivo mientras arma el borrador
-- (App: NuevaSolicitudScreen) — no depende de que exista una
-- solicitud, solo del paciente (para su nivel de copago) y su
-- ciudad/departamento (para darle contexto a Nominatim al geocodificar
-- las direcciones que va escribiendo, igual que al enviar). La
-- distancia entre las dos direcciones la calcula la capa TS después de
-- geocodificar ambas con Nominatim (no hay filas de `solicitudes`
-- todavía de las que sacar farmacia_ubicacion/entrega_ubicacion).
create function app.obtener_parametros_estimacion_precio(
  p_paciente_id uuid
)
returns table (
  copago numeric,
  ciudad text,
  departamento text,
  tarifa_base_domicilio numeric,
  tarifa_por_km numeric,
  tarifa_por_minuto numeric,
  tiempo_base_farmacia_min int,
  velocidad_promedio_kmh numeric,
  distancia_incluida_km numeric,
  tarifa_por_km_excedente numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    nc.copago,
    pp.ciudad, pp.departamento,
    c.tarifa_base_domicilio, c.tarifa_por_km, c.tarifa_por_minuto,
    c.tiempo_base_farmacia_min, c.velocidad_promedio_kmh,
    c.distancia_incluida_km, c.tarifa_por_km_excedente
  from public.perfil_paciente pp
  left join public.niveles_copago nc on nc.id = pp.nivel_copago_id
  cross join public.configuracion_admin c
  where pp.usuario_id = p_paciente_id
    and c.id = 1;
$$;

revoke all on function app.obtener_parametros_estimacion_precio(uuid) from public;
revoke all on function app.obtener_parametros_estimacion_precio(uuid) from anon;
revoke all on function app.obtener_parametros_estimacion_precio(uuid) from authenticated;
grant execute on function app.obtener_parametros_estimacion_precio(uuid) to mediruta_app;
