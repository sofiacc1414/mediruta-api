-- Baja el radio máximo del pool de pedidos disponibles para un
-- domiciliario (distancia domiciliario <-> farmacia del pedido) de
-- 15km a 5km, a pedido del equipo. Misma función, mismo RETURNS TABLE
-- — solo cambia la constante `v_radio_metros`, por eso `create or
-- replace` en vez de drop+create (ver supabase/migrations/
-- 20260825010000_un_pedido_activo_y_radio_pool.sql, donde se dejó
-- documentado como "fácil de ajustar después").

create or replace function app.listar_pedidos_disponibles(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  direccion_farmacia text,
  direccion_entrega text,
  distancia_metros double precision,
  creado_en timestamptz
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
      public.st_distance(s.farmacia_ubicacion, v_ubicacion), s.creado_en
    from public.solicitudes s
    where s.estado = 'en_asignacion'
      and s.farmacia_ubicacion is not null
      and public.st_dwithin(s.farmacia_ubicacion, v_ubicacion, v_radio_metros)
    order by public.st_distance(s.farmacia_ubicacion, v_ubicacion) asc;
end;
$$;

revoke all on function app.listar_pedidos_disponibles(uuid) from public;
revoke all on function app.listar_pedidos_disponibles(uuid) from anon;
revoke all on function app.listar_pedidos_disponibles(uuid) from authenticated;
grant execute on function app.listar_pedidos_disponibles(uuid) to mediruta_app;
