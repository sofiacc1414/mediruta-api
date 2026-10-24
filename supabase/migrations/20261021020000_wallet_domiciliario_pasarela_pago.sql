-- Módulos 3 (Wallet del domiciliario) y 4 (Pasarela de pago simulada).
--
-- Decisiones de diseño (confirmadas con el usuario):
-- - El costo del domicilio que YA se le cobra al paciente (tarifa base
--   + por km, ver CalcularPrecioPedidoUseCase) ES la comisión bruta
--   del domiciliario — no se inventa un nuevo concepto de tarifa, se
--   reutiliza el ya existente. Lo único nuevo es el % que la empresa
--   le descuenta de ESA comisión (`comision_app_porcentaje`).
-- - Ningún precio se persistía en `solicitudes` hasta ahora (todo se
--   recalculaba en vivo desde `configuracion_admin`/`niveles_copago`
--   — confirmado leyendo `obtener_datos_precio_pedido` y
--   `listar_pedidos_disponibles`). Para la billetera SÍ hace falta un
--   valor estable: si la tarifa cambia entre que se envía el pedido y
--   se entrega, la plata que se le cobra al domiciliario no puede
--   moverse sola. Se agrega una foto del precio en `solicitudes` al
--   momento de enviar (`copago_cobrado`, `domicilio_cobrado`,
--   `comision_app_porcentaje_cobrada`).
-- - `pendiente_revision` ya existía en el estado de `solicitudes` pero
--   nunca se usaba como estado de reposo (`enviar_solicitud` saltaba
--   directo a `en_asignacion`) — se reutiliza tal cual para
--   "transferencia esperando que el admin apruebe el comprobante", en
--   vez de inventar un estado nuevo y tocar el check constraint.
-- - La simulación de tarjeta (aprobada/rechazada) se resuelve en
--   TypeScript ANTES de llamar a `enviar_solicitud` — si se rechaza,
--   la solicitud ni se toca (sigue en borrador). La función SQL nunca
--   necesita saber de números de tarjeta de prueba.

-- ===== configuracion_admin: comisión de la app + tope + medios de pago =====

alter table public.configuracion_admin
  add column if not exists comision_app_porcentaje numeric not null default 0.20
    check (comision_app_porcentaje >= 0 and comision_app_porcentaje <= 1),
  add column if not exists tope_recaudo_efectivo numeric not null default 200000
    check (tope_recaudo_efectivo > 0),
  add column if not exists pago_efectivo_habilitado boolean not null default true,
  add column if not exists pago_tarjeta_habilitado boolean not null default false,
  add column if not exists pago_transferencia_habilitado boolean not null default false;

-- ===== solicitudes: método de pago + foto del precio al enviar =====

alter table public.solicitudes
  add column if not exists metodo_pago text not null default 'efectivo'
    check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia')),
  add column if not exists comprobante_pago_path text,
  add column if not exists copago_cobrado numeric,
  add column if not exists domicilio_cobrado numeric,
  add column if not exists comision_app_porcentaje_cobrada numeric;

-- ===== wallet_domiciliario — 1:1 con usuarios, mismo patrón que
-- perfil_domiciliario/perfil_paciente =====

create table public.wallet_domiciliario (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  comision_acumulada numeric not null default 0 check (comision_acumulada >= 0),
  saldo_disponible numeric not null default 0 check (saldo_disponible >= 0),
  deuda_efectivo numeric not null default 0 check (deuda_efectivo >= 0),
  bloqueado_por_tope boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.wallet_domiciliario enable row level security;
alter table public.wallet_domiciliario force row level security;

revoke all on table public.wallet_domiciliario from anon;
revoke all on table public.wallet_domiciliario from authenticated;

-- ===== liquidacion_domiciliario — historial de pagos de deuda
-- aprobados por el admin (auditoría, insert-only) =====

create table public.liquidacion_domiciliario (
  id uuid primary key default gen_random_uuid(),
  domiciliario_id uuid not null references public.usuarios (id),
  monto numeric not null check (monto > 0),
  aprobada_por uuid not null references public.usuarios (id),
  creado_en timestamptz not null default now()
);

create index liquidacion_domiciliario_domiciliario_id_idx
  on public.liquidacion_domiciliario (domiciliario_id, creado_en desc);

alter table public.liquidacion_domiciliario enable row level security;
alter table public.liquidacion_domiciliario force row level security;

revoke all on table public.liquidacion_domiciliario from anon;
revoke all on table public.liquidacion_domiciliario from authenticated;

-- ===== obtener_configuracion_admin / actualizar_configuracion_admin —
-- agregan comisión de la app, tope y medios de pago =====

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
  tarifa_por_km_excedente numeric,
  comision_app_porcentaje numeric,
  tope_recaudo_efectivo numeric,
  pago_efectivo_habilitado boolean,
  pago_tarjeta_habilitado boolean,
  pago_transferencia_habilitado boolean
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
    c.distancia_incluida_km, c.tarifa_por_km_excedente,
    c.comision_app_porcentaje, c.tope_recaudo_efectivo,
    c.pago_efectivo_habilitado, c.pago_tarjeta_habilitado, c.pago_transferencia_habilitado
  from public.configuracion_admin c
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  );
$$;

revoke all on function app.obtener_configuracion_admin(uuid) from public, anon, authenticated;
grant execute on function app.obtener_configuracion_admin(uuid) to mediruta_app;

drop function if exists app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric);

create function app.actualizar_configuracion_admin(
  p_admin_id uuid,
  p_umbral_minutos int,
  p_tarifa_base_domicilio numeric,
  p_tarifa_por_km numeric,
  p_tarifa_por_minuto numeric,
  p_tiempo_base_farmacia_min int,
  p_velocidad_promedio_kmh numeric,
  p_distancia_incluida_km numeric,
  p_tarifa_por_km_excedente numeric,
  p_comision_app_porcentaje numeric,
  p_tope_recaudo_efectivo numeric,
  p_pago_efectivo_habilitado boolean,
  p_pago_tarjeta_habilitado boolean,
  p_pago_transferencia_habilitado boolean
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
    or p_comision_app_porcentaje is null or p_comision_app_porcentaje < 0 or p_comision_app_porcentaje > 1
    or p_tope_recaudo_efectivo is null or p_tope_recaudo_efectivo <= 0
    or p_pago_efectivo_habilitado is null
    or p_pago_tarjeta_habilitado is null
    or p_pago_transferencia_habilitado is null
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
    comision_app_porcentaje = p_comision_app_porcentaje,
    tope_recaudo_efectivo = p_tope_recaudo_efectivo,
    pago_efectivo_habilitado = p_pago_efectivo_habilitado,
    pago_tarjeta_habilitado = p_pago_tarjeta_habilitado,
    pago_transferencia_habilitado = p_pago_transferencia_habilitado,
    actualizado_en = now(),
    actualizado_por = p_admin_id
  where id = 1;

  return query select 'actualizado'::text;
end;
$$;

revoke all on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function app.actualizar_configuracion_admin(uuid, int, numeric, numeric, numeric, int, numeric, numeric, numeric, numeric, numeric, boolean, boolean, boolean) to mediruta_app;

-- Lectura pública (cualquier usuario autenticado) — el checkout del
-- Paciente necesita saber qué medios de pago están habilitados hoy,
-- sin ser admin.
create function app.obtener_medios_pago_habilitados(p_usuario_id uuid)
returns table (
  pago_efectivo_habilitado boolean,
  pago_tarjeta_habilitado boolean,
  pago_transferencia_habilitado boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select c.pago_efectivo_habilitado, c.pago_tarjeta_habilitado, c.pago_transferencia_habilitado
  from public.configuracion_admin c
  where p_usuario_id is not null and c.id = 1;
$$;

revoke all on function app.obtener_medios_pago_habilitados(uuid) from public, anon, authenticated;
grant execute on function app.obtener_medios_pago_habilitados(uuid) to mediruta_app;

-- ===== enviar_solicitud — agrega método de pago + foto del precio;
-- transferencia queda en pendiente_revision hasta que el admin
-- apruebe el comprobante (tarjeta ya se resolvió en TS antes de
-- llamar acá: si se rechazó, esta función ni se invoca) =====

drop function if exists app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision);

create function app.enviar_solicitud(
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
      then 'Dirección de entrega' end,
    case when p_metodo_pago = 'transferencia' and p_comprobante_pago_path is null
      then 'Comprobante de la transferencia' end
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

  -- Efectivo y tarjeta publican de inmediato (la tarjeta ya se cobró
  -- en TS antes de llegar acá). Transferencia queda esperando que el
  -- admin apruebe el comprobante — no se publica todavía.
  v_estado_final := case when p_metodo_pago = 'transferencia' then 'pendiente_revision' else 'en_asignacion' end;

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
  values (p_solicitud_id, 'pendiente_revision');
  if v_estado_final = 'en_asignacion' then
    insert into public.historial_solicitud (solicitud_id, estado)
    values (p_solicitud_id, 'en_asignacion');
  end if;

  return query select 'enviada'::text, array[]::text[], v_codigo;
end;
$$;

revoke all on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function app.enviar_solicitud(uuid, uuid, double precision, double precision, double precision, double precision, text, numeric, numeric, numeric, text) to mediruta_app;

-- ===== Admin: aprobar/rechazar el comprobante de transferencia =====

create function app.listar_pagos_pendientes_admin(p_admin_id uuid)
returns table (
  solicitud_id uuid,
  codigo_pedido text,
  paciente_correo text,
  comprobante_pago_path text,
  copago_cobrado numeric,
  domicilio_cobrado numeric,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, u.correo, s.comprobante_pago_path,
    s.copago_cobrado, s.domicilio_cobrado, s.creado_en
  from public.solicitudes s
  join public.usuarios u on u.id = s.paciente_id
  where s.estado = 'pendiente_revision'
    and s.metodo_pago = 'transferencia'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by s.creado_en asc;
$$;

revoke all on function app.listar_pagos_pendientes_admin(uuid) from public, anon, authenticated;
grant execute on function app.listar_pagos_pendientes_admin(uuid) to mediruta_app;

create function app.aprobar_pago_transferencia_admin(p_admin_id uuid, p_solicitud_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  update public.solicitudes
  set estado = 'en_asignacion', actualizado_en = now()
  where id = p_solicitud_id
    and estado = 'pendiente_revision'
    and metodo_pago = 'transferencia';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_asignacion');

  return query select 'aprobado'::text;
end;
$$;

revoke all on function app.aprobar_pago_transferencia_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function app.aprobar_pago_transferencia_admin(uuid, uuid) to mediruta_app;

create function app.rechazar_pago_transferencia_admin(p_admin_id uuid, p_solicitud_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  -- Vuelve a borrador (no cancelada) — el Paciente corrige el
  -- comprobante o cambia de medio de pago y reenvía, sin perder los
  -- medicamentos/direcciones que ya había cargado.
  update public.solicitudes
  set estado = 'borrador', comprobante_pago_path = null, actualizado_en = now()
  where id = p_solicitud_id
    and estado = 'pendiente_revision'
    and metodo_pago = 'transferencia';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'rechazado'::text;
end;
$$;

revoke all on function app.rechazar_pago_transferencia_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function app.rechazar_pago_transferencia_admin(uuid, uuid) to mediruta_app;

-- ===== entregar_pedido — ahora también liquida la billetera del
-- domiciliario según el método de pago =====

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
  v_metodo_pago text;
  v_copago_cobrado numeric;
  v_domicilio_cobrado numeric;
  v_comision_app_pct numeric;
  v_comision_app numeric;
  v_ganancia_neta numeric;
  v_tope numeric;
  v_deuda_nueva numeric;
begin
  if p_domiciliario_id is null or p_solicitud_id is null or p_codigo is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select codigo_entrega, metodo_pago, copago_cobrado, domicilio_cobrado, comision_app_porcentaje_cobrada
  into v_codigo_esperado, v_metodo_pago, v_copago_cobrado, v_domicilio_cobrado, v_comision_app_pct
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

  -- Fórmulas viejas (persistidas antes de este módulo) no tienen foto
  -- del precio — no rompe la entrega, solo no mueve plata en la
  -- billetera (nada que cobrar/liquidar si nunca se supo el monto).
  if v_domicilio_cobrado is not null and v_comision_app_pct is not null then
    v_comision_app := v_domicilio_cobrado * v_comision_app_pct;
    v_ganancia_neta := v_domicilio_cobrado - v_comision_app;

    insert into public.wallet_domiciliario (usuario_id)
    values (p_domiciliario_id)
    on conflict (usuario_id) do nothing;

    if v_metodo_pago = 'efectivo' then
      update public.wallet_domiciliario
      set
        comision_acumulada = comision_acumulada + v_domicilio_cobrado,
        deuda_efectivo = deuda_efectivo + coalesce(v_copago_cobrado, 0) + v_comision_app,
        actualizado_en = now()
      where usuario_id = p_domiciliario_id
      returning deuda_efectivo into v_deuda_nueva;

      select tope_recaudo_efectivo into v_tope from public.configuracion_admin where id = 1;

      if v_deuda_nueva >= v_tope then
        update public.wallet_domiciliario
        set bloqueado_por_tope = true
        where usuario_id = p_domiciliario_id;
      end if;
    else
      update public.wallet_domiciliario
      set
        comision_acumulada = comision_acumulada + v_domicilio_cobrado,
        saldo_disponible = saldo_disponible + v_ganancia_neta,
        actualizado_en = now()
      where usuario_id = p_domiciliario_id;
    end if;
  end if;

  return query select 'entregado'::text;
end;
$$;

-- ===== aceptar_pedido / listar_pedidos_disponibles — bloqueados por
-- tope no ven ni pueden aceptar nuevos pedidos (CA2) =====

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
    select 1 from public.wallet_domiciliario
    where usuario_id = p_domiciliario_id and bloqueado_por_tope
  ) then
    return query select 'bloqueado_por_tope'::text;
    return;
  end if;

  if exists (
    select 1 from public.solicitudes
    where domiciliario_id = p_domiciliario_id
      and estado in (
        'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
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
  v_bloqueado boolean;
  v_radio_metros constant double precision := 5000;
begin
  if p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  select pd.ubicacion, pd.disponible
  into v_ubicacion, v_disponible
  from public.perfil_domiciliario pd
  where pd.usuario_id = p_domiciliario_id;

  select coalesce(w.bloqueado_por_tope, false)
  into v_bloqueado
  from public.wallet_domiciliario w
  where w.usuario_id = p_domiciliario_id;

  if not v_disponible or v_ubicacion is null or coalesce(v_bloqueado, false)
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

revoke all on function app.listar_pedidos_disponibles(uuid) from public, anon, authenticated;
grant execute on function app.listar_pedidos_disponibles(uuid) to mediruta_app;

-- ===== Wallet: lectura propia (domiciliario) y admin =====

create function app.obtener_wallet_domiciliario(p_domiciliario_id uuid)
returns table (
  comision_acumulada numeric,
  saldo_disponible numeric,
  deuda_efectivo numeric,
  bloqueado_por_tope boolean,
  tope_recaudo_efectivo numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    coalesce(w.comision_acumulada, 0), coalesce(w.saldo_disponible, 0),
    coalesce(w.deuda_efectivo, 0), coalesce(w.bloqueado_por_tope, false),
    c.tope_recaudo_efectivo
  from public.configuracion_admin c
  left join public.wallet_domiciliario w on w.usuario_id = p_domiciliario_id
  where p_domiciliario_id is not null
    and app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO')
    and c.id = 1;
$$;

revoke all on function app.obtener_wallet_domiciliario(uuid) from public, anon, authenticated;
grant execute on function app.obtener_wallet_domiciliario(uuid) to mediruta_app;

create function app.listar_wallets_admin(p_admin_id uuid)
returns table (
  domiciliario_id uuid,
  correo text,
  comision_acumulada numeric,
  saldo_disponible numeric,
  deuda_efectivo numeric,
  bloqueado_por_tope boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select w.usuario_id, u.correo, w.comision_acumulada, w.saldo_disponible,
    w.deuda_efectivo, w.bloqueado_por_tope
  from public.wallet_domiciliario w
  join public.usuarios u on u.id = w.usuario_id
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  )
  order by w.deuda_efectivo desc, w.actualizado_en desc;
$$;

revoke all on function app.listar_wallets_admin(uuid) from public, anon, authenticated;
grant execute on function app.listar_wallets_admin(uuid) to mediruta_app;

-- CA3: el admin aprueba que el domiciliario consignó la deuda
-- completa — vuelve a $0 y se desbloquea.
create function app.liquidar_deuda_domiciliario_admin(p_admin_id uuid, p_domiciliario_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deuda numeric;
begin
  if p_admin_id is null or p_domiciliario_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text;
    return;
  end if;

  select deuda_efectivo into v_deuda
  from public.wallet_domiciliario
  where usuario_id = p_domiciliario_id;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  if v_deuda <= 0 then
    return query select 'sin_deuda'::text;
    return;
  end if;

  insert into public.liquidacion_domiciliario (domiciliario_id, monto, aprobada_por)
  values (p_domiciliario_id, v_deuda, p_admin_id);

  update public.wallet_domiciliario
  set deuda_efectivo = 0, bloqueado_por_tope = false, actualizado_en = now()
  where usuario_id = p_domiciliario_id;

  return query select 'liquidado'::text;
end;
$$;

revoke all on function app.liquidar_deuda_domiciliario_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function app.liquidar_deuda_domiciliario_admin(uuid, uuid) to mediruta_app;
