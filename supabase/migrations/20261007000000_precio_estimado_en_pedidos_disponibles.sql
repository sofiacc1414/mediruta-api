-- Bug real reportado: "Pedidos disponibles" del domiciliario mostraba
-- "$0" fijo (literal "Temporal: recompensa no disponible" del lado de
-- Flutter) — nunca trajo ningún dato de precio. Se agregan los
-- INGREDIENTES del precio (copago, distancia farmacia→entrega, tarifas
-- vigentes), no el total ya calculado — mismo criterio que
-- `listar_historial_pedidos_domiciliario`
-- (20260915020000_precio_en_historial_domiciliario.sql): el cálculo en
-- sí sigue viviendo en un solo lugar, `calcularPrecioDesdeParametros`
-- (TS), para no duplicar la fórmula en SQL.
--
-- `distancia_metros` (domiciliario→farmacia, para ordenar el pool) y
-- `distancia_entrega_metros` (farmacia→entrega, para el precio) son
-- deliberadamente dos columnas distintas — no es la misma distancia.

drop function if exists app.listar_pedidos_disponibles(uuid);

create function app.listar_pedidos_disponibles(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  direccion_farmacia text,
  direccion_entrega text,
  distancia_metros double precision,
  creado_en timestamptz,
  copago numeric,
  distancia_entrega_metros double precision,
  tarifa_base_domicilio numeric,
  tarifa_por_km numeric,
  distancia_incluida_km numeric,
  tarifa_por_km_excedente numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_ubicacion public.geography;
  v_disponible boolean;
  v_radio_metros constant double precision := 5000;
begin
  if p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select pd.ubicacion, pd.disponible
  into v_ubicacion, v_disponible
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_domiciliario_id;

  if not v_disponible or v_ubicacion is null
    or not app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO')
    or exists (
      select 1 from public.solicitudes
      where domiciliario_id = p_domiciliario_id
        and estado in (
          'asignado_en_camino_farmacia', 'medicamentos_recogidos',
          'en_camino_entrega', 'en_sitio'
        )
    )
  then
    return;
  end if;

  return query
    select
      s.id, s.codigo_pedido, s.direccion_farmacia, s.direccion_entrega,
      public.st_distance(s.farmacia_ubicacion, v_ubicacion), s.creado_en,
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
    where s.estado = 'en_asignacion'
      and s.farmacia_ubicacion is not null
      and public.st_dwithin(s.farmacia_ubicacion, v_ubicacion, v_radio_metros)
      and c.id = 1
    order by public.st_distance(s.farmacia_ubicacion, v_ubicacion) asc;
end;
$$;

revoke all on function app.listar_pedidos_disponibles(uuid) from public;
revoke all on function app.listar_pedidos_disponibles(uuid) from anon;
revoke all on function app.listar_pedidos_disponibles(uuid) from authenticated;
grant execute on function app.listar_pedidos_disponibles(uuid) to mediruta_app;
