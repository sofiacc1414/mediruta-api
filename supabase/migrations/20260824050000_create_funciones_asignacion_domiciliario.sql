-- HU-09/HU-07 — puertas internas app.* para la asignación por cercanía y
-- el recorrido de estados del pedido. Mismo patrón que el resto de la
-- API: SECURITY DEFINER, search_path vacío, sin SQL dinámico, EXECUTE
-- solo para mediruta_app, REVOKE ALL de PUBLIC/anon/authenticated.
--
-- Reutiliza app.usuario_tiene_rol_habilitado (HU-08) como defensa en
-- profundidad — el RolesGuard de la API ya es la autorización real.

-- G01 — prende/apaga "Disponible para recibir pedidos" y guarda la
-- ubicación como una foto instantánea de ese momento (no tracking
-- continuo). Solo guarda lat/lng si p_disponible = true — al apagar
-- "Disponible" se deja la última ubicación conocida sin tocar (no
-- importa, disponible = false ya lo saca del pool).
create or replace function app.actualizar_disponibilidad_domiciliario(
  p_domiciliario_id uuid,
  p_disponible boolean,
  p_lat double precision,
  p_lng double precision
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_domiciliario_id is null or p_disponible is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO') then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if p_disponible and (p_lat is null or p_lng is null) then
    raise exception 'ubicación requerida para activar disponibilidad' using errcode = '22023';
  end if;

  update public.perfil_domiciliario
  set
    disponible = p_disponible,
    ubicacion = case when p_disponible
      then public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography
      else ubicacion
    end,
    ubicacion_actualizada_en = case when p_disponible then now() else ubicacion_actualizada_en end,
    actualizado_en = now()
  where usuario_id = p_domiciliario_id;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'actualizado'::text;
end;
$$;

-- G02 — pedidos en 'en_asignacion' ordenados por distancia real
-- (ST_Distance, metros) entre la farmacia de cada pedido y la última
-- ubicación guardada de este domiciliario. Vacío (no error) si no está
-- disponible o no tiene ubicación todavía — mismo criterio "vacío en vez
-- de excepción" que el resto de las listas de este proyecto.
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
    order by public.st_distance(s.farmacia_ubicacion, v_ubicacion) asc;
end;
$$;

-- G03 — acepta un pedido del pool. El WHERE con domiciliario_id is null
-- Y estado='en_asignacion' es el guard atómico: si dos domiciliarios
-- aceptan al mismo tiempo, el segundo UPDATE no afecta ninguna fila
-- (`found` = false) y recibe 'ya_asignado' en vez de pisarse.
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

-- G04/G05/G06 — las 3 transiciones manuales que van de "aceptado" a
-- "llegó a la dirección del paciente". Mismo cuerpo, solo cambia el
-- estado origen/destino — no se generaliza en una sola función
-- parametrizada por estado porque cada paso tiene su propio nombre en
-- el dominio (HU-07 los pidió como pasos explícitos, no como un genérico
-- "avanzar_estado").
create or replace function app.marcar_medicamentos_recogidos(
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

  update public.solicitudes
  set estado = 'medicamentos_recogidos', actualizado_en = now()
  where id = p_solicitud_id
    and domiciliario_id = p_domiciliario_id
    and estado = 'asignado_en_camino_farmacia';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'medicamentos_recogidos');

  return query select 'actualizado'::text;
end;
$$;

create or replace function app.iniciar_entrega(
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

  update public.solicitudes
  set estado = 'en_camino_entrega', actualizado_en = now()
  where id = p_solicitud_id
    and domiciliario_id = p_domiciliario_id
    and estado = 'medicamentos_recogidos';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_camino_entrega');

  return query select 'actualizado'::text;
end;
$$;

create or replace function app.marcar_en_sitio(
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

  update public.solicitudes
  set estado = 'en_sitio', actualizado_en = now()
  where id = p_solicitud_id
    and domiciliario_id = p_domiciliario_id
    and estado = 'en_camino_entrega';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_sitio');

  return query select 'actualizado'::text;
end;
$$;

-- G07 — cierra el pedido, pero solo si el código de 6 que dice el
-- domiciliario coincide con el que se generó al enviar la solicitud
-- (comparación case-insensitive: son letras/dígitos, no tiene sentido
-- que la mayúscula importe al tipearlo a mano).
create or replace function app.entregar_pedido(
  p_domiciliario_id uuid,
  p_solicitud_id uuid,
  p_codigo text
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo_esperado text;
begin
  if p_domiciliario_id is null or p_solicitud_id is null or p_codigo is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select codigo_entrega
  into v_codigo_esperado
  from public.solicitudes
  where id = p_solicitud_id
    and domiciliario_id = p_domiciliario_id
    and estado = 'en_sitio';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  if upper(btrim(p_codigo)) is distinct from upper(v_codigo_esperado) then
    return query select 'codigo_incorrecto'::text;
    return;
  end if;

  update public.solicitudes
  set estado = 'entregado', actualizado_en = now()
  where id = p_solicitud_id;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'entregado');

  return query select 'entregado'::text;
end;
$$;

-- G08 — el domiciliario reporta un incidente. No toca `estado`: el
-- pedido sigue mostrando dónde va de verdad (ej. "en camino a la
-- farmacia"), la novedad se ve superpuesta en vez de perder el paso en
-- el que estaba (decisión tomada con el equipo).
create or replace function app.reportar_novedad(
  p_domiciliario_id uuid,
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
begin
  if p_domiciliario_id is null or p_solicitud_id is null
    or p_detalle is null or length(btrim(p_detalle)) = 0
  then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  -- Ojo: esta función tiene `id uuid` como columna de salida (RETURNS
  -- TABLE) — sin calificar `solicitudes.id` acá, plpgsql lo confunde con
  -- esa variable de salida en vez del id de la tabla (detectado en el
  -- smoke test contra la base real).
  if not exists (
    select 1 from public.solicitudes
    where solicitudes.id = p_solicitud_id
      and solicitudes.domiciliario_id = p_domiciliario_id
      and solicitudes.estado not in ('entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  insert into public.novedad_solicitud (solicitud_id, reportada_por, detalle)
  values (p_solicitud_id, p_domiciliario_id, btrim(p_detalle))
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

-- G09 — el admin marca una novedad como resuelta. No reabre ni cambia
-- `estado` del pedido — el pedido sigue su curso solo, esto es
-- exclusivamente sobre la novedad en sí.
create or replace function app.resolver_novedad(
  p_admin_id uuid,
  p_novedad_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_novedad_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  update public.novedad_solicitud
  set resuelta_en = now(), resuelta_por = p_admin_id
  where id = p_novedad_id
    and resuelta_en is null;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'resuelta'::text;
end;
$$;

-- G10 — lista de novedades abiertas para el panel Web del admin.
create or replace function app.listar_novedades_abiertas(p_admin_id uuid)
returns table (
  id uuid,
  solicitud_id uuid,
  codigo_pedido text,
  detalle text,
  reportada_por_correo text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.solicitud_id, s.codigo_pedido, n.detalle, u.correo, n.creado_en
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  join public.usuarios u on u.id = n.reportada_por
  where n.resuelta_en is null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by n.creado_en asc;
$$;

revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from public;
revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from anon;
revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from authenticated;
grant execute on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) to mediruta_app;

revoke all on function app.listar_pedidos_disponibles(uuid) from public;
revoke all on function app.listar_pedidos_disponibles(uuid) from anon;
revoke all on function app.listar_pedidos_disponibles(uuid) from authenticated;
grant execute on function app.listar_pedidos_disponibles(uuid) to mediruta_app;

revoke all on function app.aceptar_pedido(uuid, uuid) from public;
revoke all on function app.aceptar_pedido(uuid, uuid) from anon;
revoke all on function app.aceptar_pedido(uuid, uuid) from authenticated;
grant execute on function app.aceptar_pedido(uuid, uuid) to mediruta_app;

revoke all on function app.marcar_medicamentos_recogidos(uuid, uuid) from public;
revoke all on function app.marcar_medicamentos_recogidos(uuid, uuid) from anon;
revoke all on function app.marcar_medicamentos_recogidos(uuid, uuid) from authenticated;
grant execute on function app.marcar_medicamentos_recogidos(uuid, uuid) to mediruta_app;

revoke all on function app.iniciar_entrega(uuid, uuid) from public;
revoke all on function app.iniciar_entrega(uuid, uuid) from anon;
revoke all on function app.iniciar_entrega(uuid, uuid) from authenticated;
grant execute on function app.iniciar_entrega(uuid, uuid) to mediruta_app;

revoke all on function app.marcar_en_sitio(uuid, uuid) from public;
revoke all on function app.marcar_en_sitio(uuid, uuid) from anon;
revoke all on function app.marcar_en_sitio(uuid, uuid) from authenticated;
grant execute on function app.marcar_en_sitio(uuid, uuid) to mediruta_app;

revoke all on function app.entregar_pedido(uuid, uuid, text) from public;
revoke all on function app.entregar_pedido(uuid, uuid, text) from anon;
revoke all on function app.entregar_pedido(uuid, uuid, text) from authenticated;
grant execute on function app.entregar_pedido(uuid, uuid, text) to mediruta_app;

revoke all on function app.reportar_novedad(uuid, uuid, text) from public;
revoke all on function app.reportar_novedad(uuid, uuid, text) from anon;
revoke all on function app.reportar_novedad(uuid, uuid, text) from authenticated;
grant execute on function app.reportar_novedad(uuid, uuid, text) to mediruta_app;

revoke all on function app.resolver_novedad(uuid, uuid) from public;
revoke all on function app.resolver_novedad(uuid, uuid) from anon;
revoke all on function app.resolver_novedad(uuid, uuid) from authenticated;
grant execute on function app.resolver_novedad(uuid, uuid) to mediruta_app;

revoke all on function app.listar_novedades_abiertas(uuid) from public;
revoke all on function app.listar_novedades_abiertas(uuid) from anon;
revoke all on function app.listar_novedades_abiertas(uuid) from authenticated;
grant execute on function app.listar_novedades_abiertas(uuid) to mediruta_app;
