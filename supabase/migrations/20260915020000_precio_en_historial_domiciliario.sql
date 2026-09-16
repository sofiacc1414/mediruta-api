-- Bug real reportado: "el histórico de los domiciliarios no muestra el
-- valor del pedido, este dato es de interés para él" — `listar_
-- historial_pedidos_domiciliario` no traía ningún dato de precio.
--
-- Se agregan los INGREDIENTES del precio (copago, distancia, tarifas
-- vigentes), no el total ya calculado — el cálculo en sí sigue viviendo
-- en un solo lugar, `calcularPrecioDesdeParametros` (TS, ver
-- calcular-precio-pedido.use-case.ts), la misma función que ya usan el
-- precio real y el estimado en vivo. Mismas columnas/mismo criterio que
-- `app.obtener_datos_precio_pedido`, solo que para N filas en vez de 1.

drop function if exists app.listar_historial_pedidos_domiciliario(uuid);

create function app.listar_historial_pedidos_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  creado_en timestamptz,
  copago numeric,
  distancia_metros double precision,
  tarifa_base_domicilio numeric,
  tarifa_por_km numeric,
  distancia_incluida_km numeric,
  tarifa_por_km_excedente numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.creado_en,
    nc.copago,
    case when s.farmacia_ubicacion is not null and s.entrega_ubicacion is not null
      then public.st_distance(s.farmacia_ubicacion, s.entrega_ubicacion)
      else null
    end,
    c.tarifa_base_domicilio, c.tarifa_por_km,
    c.distancia_incluida_km, c.tarifa_por_km_excedente
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  left join public.niveles_copago nc on nc.id = pp.nivel_copago_id
  cross join public.configuracion_admin c
  where s.domiciliario_id = p_domiciliario_id
    and c.id = 1
  order by s.creado_en desc;
$$;

revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from public;
revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from anon;
revoke all on function app.listar_historial_pedidos_domiciliario(uuid) from authenticated;
grant execute on function app.listar_historial_pedidos_domiciliario(uuid) to mediruta_app;
