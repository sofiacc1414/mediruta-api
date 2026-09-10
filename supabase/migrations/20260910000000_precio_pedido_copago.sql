-- Modelo de precio del pedido (copago + domicilio) — HU-03/HU-07.
--
-- El copago real de EPS es un % de una tarifa privada EPS-IPS que
-- MediRuta no tiene forma de conocer (Acuerdo 260, topes en SMLMV) —
-- no se replica. En su lugar, MediRuta tiene sus propios "niveles de
-- copago" (catálogo simple: nombre + valor fijo en COP), que el
-- paciente autodeclara en su perfil sin aprobación (decisión de
-- negocio, no HU formal).
--
-- El precio total = copago del nivel + costo de domicilio, donde el
-- domicilio se calcula server-side (no en el cliente, para no duplicar
-- la fórmula en App/Web) a partir de:
--   - distancia real farmacia→entrega (requiere geocodificar TAMBIÉN
--     la dirección de entrega, algo que antes no se hacía — solo la
--     farmacia estaba geocodificada, ver `enviar_solicitud`).
--   - parámetros configurables por el admin (misma tabla singleton que
--     ya existe para el umbral de demora de asignación).
-- El cálculo aritmético en sí vive en TypeScript
-- (`CalcularPrecioPedidoUseCase`), no acá — esta función solo entrega
-- los ingredientes crudos (copago, distancia, parámetros).

-- ===== Niveles de copago =====

create table public.niveles_copago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  copago numeric not null check (copago >= 0),
  orden int not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

insert into public.niveles_copago (nombre, copago, orden) values
  ('Nivel 1', 8000, 1),
  ('Nivel 2', 15000, 2),
  ('Nivel 3', 25000, 3);

alter table public.niveles_copago enable row level security;
alter table public.niveles_copago force row level security;

-- Catálogo de referencia — cualquier usuario autenticado lo puede leer
-- (el paciente lo necesita para elegir su nivel; no tiene datos
-- sensibles, no hace falta acotar por rol).
create policy "usuario_autenticado_lee_niveles_copago"
  on public.niveles_copago
  for select
  using (app.current_user_id() is not null);

revoke all on table public.niveles_copago from anon;
revoke all on table public.niveles_copago from authenticated;

-- ===== Nivel autodeclarado en el perfil del paciente =====

alter table public.perfil_paciente add column if not exists
  nivel_copago_id uuid references public.niveles_copago(id);

-- ===== Ubicación de entrega (antes solo se geocodificaba la farmacia) =====

alter table public.solicitudes add column if not exists
  entrega_ubicacion geography(Point, 4326);

-- ===== Parámetros de domicilio, en la config singleton ya existente =====

alter table public.configuracion_admin add column if not exists
  tarifa_base_domicilio numeric not null default 7000;
alter table public.configuracion_admin add column if not exists
  tarifa_por_km numeric not null default 800;
alter table public.configuracion_admin add column if not exists
  tarifa_por_minuto numeric not null default 150;
alter table public.configuracion_admin add column if not exists
  tiempo_base_farmacia_min int not null default 10;
alter table public.configuracion_admin add column if not exists
  velocidad_promedio_kmh numeric not null default 20;
alter table public.configuracion_admin add column if not exists
  distancia_incluida_km numeric not null default 15;
alter table public.configuracion_admin add column if not exists
  tarifa_por_km_excedente numeric not null default 1600;

-- ===== Geocodificar también la dirección de entrega al enviar =====

-- Cambia sus columnas de salida (agrega direccion_entrega) → DROP previo.
drop function if exists app.obtener_datos_geocodificacion_farmacia(uuid, uuid);

create function app.obtener_datos_geocodificacion_farmacia(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  direccion_farmacia text,
  direccion_entrega text,
  ciudad text,
  departamento text
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.direccion_farmacia, s.direccion_entrega, pp.ciudad, pp.departamento
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from public;
revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from anon;
revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from authenticated;
grant execute on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) to mediruta_app;

-- Cambia sus parámetros (agrega entrega lat/lng) → DROP previo.
drop function if exists app.enviar_solicitud(uuid, uuid, double precision, double precision);

create function app.enviar_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_farmacia_lat double precision default null,
  p_farmacia_lng double precision default null,
  p_entrega_lat double precision default null,
  p_entrega_lng double precision default null
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
    end,
    entrega_ubicacion = case when p_entrega_lat is not null and p_entrega_lng is not null
      then public.st_setsrid(public.st_makepoint(p_entrega_lng, p_entrega_lat), 4326)::public.geography
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

revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision) from public;
revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision) from anon;
revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision) from authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision) to mediruta_app;

-- ===== Catálogo de niveles (lectura, cualquier usuario) =====

create function app.listar_niveles_copago(p_usuario_id uuid)
returns table (
  id uuid,
  nombre text,
  copago numeric,
  orden int
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.nombre, n.copago, n.orden
  from public.niveles_copago n
  where p_usuario_id is not null
  order by n.orden asc;
$$;

revoke all on function app.listar_niveles_copago(uuid) from public;
revoke all on function app.listar_niveles_copago(uuid) from anon;
revoke all on function app.listar_niveles_copago(uuid) from authenticated;
grant execute on function app.listar_niveles_copago(uuid) to mediruta_app;

-- ===== El paciente autodeclara su nivel =====

create function app.actualizar_nivel_copago_perfil(
  p_paciente_id uuid,
  p_nivel_copago_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_paciente_id is null or p_nivel_copago_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not exists (select 1 from public.niveles_copago where id = p_nivel_copago_id) then
    return query select 'nivel_no_encontrado'::text;
    return;
  end if;

  update public.perfil_paciente
  set nivel_copago_id = p_nivel_copago_id
  where usuario_id = p_paciente_id;

  if not found then
    return query select 'perfil_no_encontrado'::text;
    return;
  end if;

  return query select 'actualizado'::text;
end;
$$;

revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from public;
revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from anon;
revoke all on function app.actualizar_nivel_copago_perfil(uuid, uuid) from authenticated;
grant execute on function app.actualizar_nivel_copago_perfil(uuid, uuid) to mediruta_app;

-- ===== Ingredientes crudos para calcular el precio (el cálculo en sí,
-- en TypeScript — ver CalcularPrecioPedidoUseCase) =====

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
  tarifa_por_km_excedente numeric
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
    c.distancia_incluida_km, c.tarifa_por_km_excedente
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  left join public.niveles_copago nc on nc.id = pp.nivel_copago_id
  cross join public.configuracion_admin c
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id
    and c.id = 1;
$$;

revoke all on function app.obtener_datos_precio_pedido(uuid, uuid) from public;
revoke all on function app.obtener_datos_precio_pedido(uuid, uuid) from anon;
revoke all on function app.obtener_datos_precio_pedido(uuid, uuid) from authenticated;
grant execute on function app.obtener_datos_precio_pedido(uuid, uuid) to mediruta_app;

-- ===== Admin: CRUD de niveles de copago =====

create function app.listar_niveles_copago_admin(p_admin_id uuid)
returns table (
  id uuid,
  nombre text,
  copago numeric,
  orden int
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.nombre, n.copago, n.orden
  from public.niveles_copago n
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  )
  order by n.orden asc;
$$;

revoke all on function app.listar_niveles_copago_admin(uuid) from public;
revoke all on function app.listar_niveles_copago_admin(uuid) from anon;
revoke all on function app.listar_niveles_copago_admin(uuid) from authenticated;
grant execute on function app.listar_niveles_copago_admin(uuid) to mediruta_app;

create function app.guardar_nivel_copago_admin(
  p_admin_id uuid,
  p_id uuid,
  p_nombre text,
  p_copago numeric,
  p_orden int
)
returns table (resultado text, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_admin_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::uuid;
    return;
  end if;

  if p_nombre is null or length(btrim(p_nombre)) = 0 or p_copago is null or p_copago < 0 then
    return query select 'invalido'::text, null::uuid;
    return;
  end if;

  if p_id is null then
    insert into public.niveles_copago (nombre, copago, orden)
    values (btrim(p_nombre), p_copago, coalesce(p_orden, 0))
    returning niveles_copago.id into v_id;
  else
    update public.niveles_copago
    set nombre = btrim(p_nombre), copago = p_copago,
      orden = coalesce(p_orden, niveles_copago.orden),
      actualizado_en = now()
    where niveles_copago.id = p_id
    returning niveles_copago.id into v_id;

    if v_id is null then
      return query select 'no_encontrado'::text, null::uuid;
      return;
    end if;
  end if;

  return query select 'guardado'::text, v_id;
end;
$$;

revoke all on function app.guardar_nivel_copago_admin(uuid, uuid, text, numeric, int) from public;
revoke all on function app.guardar_nivel_copago_admin(uuid, uuid, text, numeric, int) from anon;
revoke all on function app.guardar_nivel_copago_admin(uuid, uuid, text, numeric, int) from authenticated;
grant execute on function app.guardar_nivel_copago_admin(uuid, uuid, text, numeric, int) to mediruta_app;

create function app.eliminar_nivel_copago_admin(
  p_admin_id uuid,
  p_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  -- No se borra si algún paciente lo tiene declarado — se desvincula
  -- primero el catálogo (dejar sin nivel) antes de poder eliminarlo,
  -- así nunca queda un perfil apuntando a un nivel fantasma.
  if exists (select 1 from public.perfil_paciente where nivel_copago_id = p_id) then
    return query select 'en_uso'::text;
    return;
  end if;

  delete from public.niveles_copago where niveles_copago.id = p_id;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'eliminado'::text;
end;
$$;

revoke all on function app.eliminar_nivel_copago_admin(uuid, uuid) from public;
revoke all on function app.eliminar_nivel_copago_admin(uuid, uuid) from anon;
revoke all on function app.eliminar_nivel_copago_admin(uuid, uuid) from authenticated;
grant execute on function app.eliminar_nivel_copago_admin(uuid, uuid) to mediruta_app;

-- ===== Admin: parámetros de precio en la config singleton =====

-- Cambia sus columnas de salida (agrega los 7 parámetros de precio) →
-- DROP previo.
drop function if exists app.obtener_configuracion_admin(uuid);

create function app.obtener_configuracion_admin(p_admin_id uuid)
returns table (
  umbral_demora_asignacion_minutos int,
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
    c.umbral_demora_asignacion_minutos,
    c.tarifa_base_domicilio, c.tarifa_por_km, c.tarifa_por_minuto,
    c.tiempo_base_farmacia_min, c.velocidad_promedio_kmh,
    c.distancia_incluida_km, c.tarifa_por_km_excedente
  from public.configuracion_admin c
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  );
$$;

revoke all on function app.obtener_configuracion_admin(uuid) from public;
revoke all on function app.obtener_configuracion_admin(uuid) from anon;
revoke all on function app.obtener_configuracion_admin(uuid) from authenticated;
grant execute on function app.obtener_configuracion_admin(uuid) to mediruta_app;

-- Cambia sus parámetros (agrega los 7 de precio) → DROP previo.
drop function if exists app.actualizar_configuracion_admin(uuid, int);

create function app.actualizar_configuracion_admin(
  p_admin_id uuid,
  p_umbral_minutos int,
  p_tarifa_base_domicilio numeric,
  p_tarifa_por_km numeric,
  p_tarifa_por_minuto numeric,
  p_tiempo_base_farmacia_min int,
  p_velocidad_promedio_kmh numeric,
  p_distancia_incluida_km numeric,
  p_tarifa_por_km_excedente numeric
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  if p_umbral_minutos is null or p_umbral_minutos < 1
    or p_tarifa_base_domicilio is null or p_tarifa_base_domicilio < 0
    or p_tarifa_por_km is null or p_tarifa_por_km < 0
    or p_tarifa_por_minuto is null or p_tarifa_por_minuto < 0
    or p_tiempo_base_farmacia_min is null or p_tiempo_base_farmacia_min < 0
    or p_velocidad_promedio_kmh is null or p_velocidad_promedio_kmh <= 0
    or p_distancia_incluida_km is null or p_distancia_incluida_km < 0
    or p_tarifa_por_km_excedente is null or p_tarifa_por_km_excedente < 0
  then
    return query select 'invalido'::text;
    return;
  end if;

  update public.configuracion_admin
  set
    umbral_demora_asignacion_minutos = p_umbral_minutos,
    tarifa_base_domicilio = p_tarifa_base_domicilio,
    tarifa_por_km = p_tarifa_por_km,
    tarifa_por_minuto = p_tarifa_por_minuto,
    tiempo_base_farmacia_min = p_tiempo_base_farmacia_min,
    velocidad_promedio_kmh = p_velocidad_promedio_kmh,
    distancia_incluida_km = p_distancia_incluida_km,
    tarifa_por_km_excedente = p_tarifa_por_km_excedente,
    actualizado_en = now(),
    actualizado_por = p_admin_id
  where id = 1;

  return query select 'actualizado'::text;
end;
$$;

revoke all on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric) from public;
revoke all on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric) from anon;
revoke all on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric) from authenticated;
grant execute on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric) to mediruta_app;

-- ===== app.obtener_perfil expone el nivel de copago declarado =====

-- Cambia sus columnas de salida (agrega pac_nivel_copago_id) → DROP previo.
drop function if exists app.obtener_perfil(uuid);

create function app.obtener_perfil(p_usuario_id uuid)
returns table (
  nombre_completo text,
  telefono text,
  foto_perfil_path text,
  pac_direccion text,
  pac_fecha_nacimiento date,
  pac_foto_cedula_frente_path text,
  pac_foto_cedula_reverso_path text,
  pac_departamento text,
  pac_ciudad text,
  pac_nivel_copago_id uuid,
  dom_direccion text,
  dom_vehiculo_tipo text,
  dom_vehiculo_placa text,
  dom_cedula_frente_path text,
  dom_cedula_reverso_path text,
  dom_licencia_path text,
  dom_soat_path text,
  dom_tecnicomecanica_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    u.nombre_completo,
    u.telefono,
    u.foto_perfil_path,
    pp.direccion,
    pp.fecha_nacimiento,
    pp.foto_cedula_frente_path,
    pp.foto_cedula_reverso_path,
    pp.departamento,
    pp.ciudad,
    pp.nivel_copago_id,
    pd.direccion,
    pd.vehiculo_tipo,
    pd.vehiculo_placa,
    pd.cedula_frente_path,
    pd.cedula_reverso_path,
    pd.licencia_path,
    pd.soat_path,
    pd.tecnicomecanica_path
  from public.usuarios u
  left join public.perfil_paciente pp on pp.usuario_id = u.id
  left join public.perfil_domiciliario pd on pd.usuario_id = u.id
  where u.id = p_usuario_id
    and u.estado_cuenta = 'activa';
$$;

revoke all on function app.obtener_perfil(uuid) from public;
revoke all on function app.obtener_perfil(uuid) from anon;
revoke all on function app.obtener_perfil(uuid) from authenticated;
grant execute on function app.obtener_perfil(uuid) to mediruta_app;
