-- HU-09 — 2 ajustes confirmados con el equipo tras revisar el flujo:
--
-- 1. Un domiciliario solo puede tener UN pedido activo a la vez — no
--    puede aceptar uno nuevo mientras tenga otro en curso (evita que
--    se sature o deje colgado un pedido por tomar otro). Mientras
--    tenga uno activo, tampoco aparece nada en su pool — no tiene
--    sentido ofrecerle algo que no puede aceptar.
-- 2. El pool tiene un radio máximo — un pedido a 40km no le sirve a
--    nadie. 15km por defecto (fácil de ajustar después, es una
--    constante en las dos funciones).
--
-- "Activo" = ya aceptado pero todavía no entregado/cancelado:
-- asignado_en_camino_farmacia, medicamentos_recogidos,
-- en_camino_entrega, en_sitio.

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
  v_radio_metros constant double precision := 15000;
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

-- G03 — mismo guard atómico de antes, más el chequeo de "ya tiene un
-- pedido activo". Se hace ANTES del UPDATE (no dentro del WHERE) para
-- poder distinguir el motivo exacto en la respuesta.
create or replace function app.aceptar_pedido(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_domiciliario_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO') then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if exists (
    select 1 from public.solicitudes
    where domiciliario_id = p_domiciliario_id
      and estado in (
        'asignado_en_camino_farmacia', 'medicamentos_recogidos',
        'en_camino_entrega', 'en_sitio'
      )
  ) then
    return query select 'ya_tiene_pedido_activo'::text;
    return;
  end if;

  update public.solicitudes
  set
    estado = 'asignado_en_camino_farmacia',
    domiciliario_id = p_domiciliario_id,
    actualizado_en = now()
  where id = p_solicitud_id
    and estado = 'en_asignacion'
    and domiciliario_id is null;

  if not found then
    if exists (select 1 from public.solicitudes where id = p_solicitud_id) then
      return query select 'ya_asignado'::text;
    else
      return query select 'no_encontrado'::text;
    end if;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'asignado_en_camino_farmacia');

  return query select 'aceptado'::text;
end;
$$;
