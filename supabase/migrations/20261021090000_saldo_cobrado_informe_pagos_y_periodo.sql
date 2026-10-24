-- Módulo 3 — ajuste de modelo pedido por el usuario: `saldo_disponible`
-- en realidad es plata que la EMPRESA le debe al domiciliario (tarjeta/
-- transferencia ya cobrados por la empresa, pendientes de pagarle) — no
-- es "disponible" en el sentido de que el domiciliario ya la tenga. Se
-- agrega `saldo_cobrado`: lo que el domiciliario YA tiene en mano
-- (ganancia neta de efectivo, que siempre queda en su bolsillo de
-- inmediato, + lo que ya le liquidaron de tarjeta/transferencia). La
-- API expone `saldo_disponible` como "saldo pendiente de liquidar" —
-- el nombre de columna no cambia (evita romper todo lo que ya lo usa),
-- el significado expuesto sí.
--
-- También: liquidación en lote, informe global tipo "Z" (por pagar/por
-- cobrar/saldado en un periodo) y wallet por rango de fechas.

alter table public.wallet_domiciliario
  add column saldo_cobrado numeric not null default 0;

alter table public.liquidacion_domiciliario
  add column tipo text not null default 'deuda_efectivo'
    check (tipo in ('deuda_efectivo', 'saldo_pendiente'));

-- ===== entregar_pedido — efectivo también acredita `saldo_cobrado`
-- (antes solo movía `comision_acumulada`/`deuda_efectivo`, pero esa no
-- es la plata que el domiciliario ya tiene en mano neta) =====

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

  if v_domicilio_cobrado is not null and v_comision_app_pct is not null then
    v_comision_app := v_domicilio_cobrado * v_comision_app_pct;
    v_ganancia_neta := v_domicilio_cobrado - v_comision_app;

    insert into public.wallet_domiciliario (usuario_id)
    values (p_domiciliario_id)
    on conflict (usuario_id) do nothing;

    if v_metodo_pago = 'efectivo' then
      -- El efectivo lo cobra el propio domiciliario de mano del
      -- paciente, ya en el momento de la entrega — la ganancia neta
      -- queda en su bolsillo de inmediato (lo que debe devolver a la
      -- empresa es `deuda_efectivo`, no esta ganancia).
      update public.wallet_domiciliario
      set
        comision_acumulada = comision_acumulada + v_domicilio_cobrado,
        saldo_cobrado = saldo_cobrado + v_ganancia_neta,
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
      -- Tarjeta/transferencia: la plata la tiene la empresa, no el
      -- domiciliario — queda como saldo PENDIENTE de que la empresa se
      -- lo liquide (ver `app.liquidar_saldo_domiciliario_admin`).
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

-- ===== liquidar_deuda_domiciliario_admin — ahora registra `tipo` =====

create or replace function app.liquidar_deuda_domiciliario_admin(p_admin_id uuid, p_domiciliario_id uuid)
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

  insert into public.liquidacion_domiciliario (domiciliario_id, monto, aprobada_por, tipo)
  values (p_domiciliario_id, v_deuda, p_admin_id, 'deuda_efectivo');

  update public.wallet_domiciliario
  set deuda_efectivo = 0, bloqueado_por_tope = false, actualizado_en = now()
  where usuario_id = p_domiciliario_id;

  return query select 'liquidado'::text;
end;
$$;

-- ===== liquidar_saldo_domiciliario_admin — nueva: la empresa le paga
-- al domiciliario lo que le debe por tarjeta/transferencia =====

create function app.liquidar_saldo_domiciliario_admin(p_admin_id uuid, p_domiciliario_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo numeric;
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

  select saldo_disponible into v_saldo
  from public.wallet_domiciliario
  where usuario_id = p_domiciliario_id;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  if v_saldo <= 0 then
    return query select 'sin_saldo'::text;
    return;
  end if;

  insert into public.liquidacion_domiciliario (domiciliario_id, monto, aprobada_por, tipo)
  values (p_domiciliario_id, v_saldo, p_admin_id, 'saldo_pendiente');

  update public.wallet_domiciliario
  set saldo_disponible = 0, saldo_cobrado = saldo_cobrado + v_saldo, actualizado_en = now()
  where usuario_id = p_domiciliario_id;

  return query select 'liquidado'::text;
end;
$$;

revoke all on function app.liquidar_saldo_domiciliario_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function app.liquidar_saldo_domiciliario_admin(uuid, uuid) to mediruta_app;

-- ===== liquidar_lote_admin — misma acción (deuda o saldo) para varios
-- domiciliarios de una — CA pedido explícito: "liquidar en lote" =====

create function app.liquidar_lote_admin(
  p_admin_id uuid,
  p_tipo text,
  p_domiciliario_ids uuid[]
)
returns table (domiciliario_id uuid, monto_liquidado numeric, resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_monto numeric;
begin
  if p_admin_id is null or p_tipo is null or p_domiciliario_ids is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if p_tipo not in ('deuda_efectivo', 'saldo_pendiente') then
    raise exception 'tipo inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select null::uuid, null::numeric, 'no_autorizado'::text;
    return;
  end if;

  foreach v_id in array p_domiciliario_ids loop
    if p_tipo = 'deuda_efectivo' then
      select w.deuda_efectivo into v_monto from public.wallet_domiciliario w where w.usuario_id = v_id;
    else
      select w.saldo_disponible into v_monto from public.wallet_domiciliario w where w.usuario_id = v_id;
    end if;

    if v_monto is null then
      domiciliario_id := v_id;
      monto_liquidado := 0;
      resultado := 'no_encontrado';
      return next;
      continue;
    end if;

    if v_monto <= 0 then
      domiciliario_id := v_id;
      monto_liquidado := 0;
      resultado := case when p_tipo = 'deuda_efectivo' then 'sin_deuda' else 'sin_saldo' end;
      return next;
      continue;
    end if;

    insert into public.liquidacion_domiciliario (domiciliario_id, monto, aprobada_por, tipo)
    values (v_id, v_monto, p_admin_id, p_tipo);

    if p_tipo = 'deuda_efectivo' then
      update public.wallet_domiciliario
      set deuda_efectivo = 0, bloqueado_por_tope = false, actualizado_en = now()
      where usuario_id = v_id;
    else
      update public.wallet_domiciliario
      set saldo_disponible = 0, saldo_cobrado = saldo_cobrado + v_monto, actualizado_en = now()
      where usuario_id = v_id;
    end if;

    domiciliario_id := v_id;
    monto_liquidado := v_monto;
    resultado := 'liquidado';
    return next;
  end loop;
end;
$$;

revoke all on function app.liquidar_lote_admin(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function app.liquidar_lote_admin(uuid, text, uuid[]) to mediruta_app;

-- ===== obtener_wallet_domiciliario / listar_wallets_admin — agregan
-- saldo_cobrado =====

drop function if exists app.obtener_wallet_domiciliario(uuid);

create function app.obtener_wallet_domiciliario(p_domiciliario_id uuid)
returns table (
  comision_acumulada numeric,
  saldo_disponible numeric,
  saldo_cobrado numeric,
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
    coalesce(w.saldo_cobrado, 0),
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

drop function if exists app.listar_wallets_admin(uuid);

create function app.listar_wallets_admin(p_admin_id uuid)
returns table (
  domiciliario_id uuid,
  correo text,
  comision_acumulada numeric,
  saldo_disponible numeric,
  saldo_cobrado numeric,
  deuda_efectivo numeric,
  bloqueado_por_tope boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select w.usuario_id, u.correo, w.comision_acumulada, w.saldo_disponible,
    w.saldo_cobrado, w.deuda_efectivo, w.bloqueado_por_tope
  from public.wallet_domiciliario w
  join public.usuarios u on u.id = w.usuario_id
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  )
  order by (w.saldo_disponible + w.deuda_efectivo) desc, w.actualizado_en desc;
$$;

revoke all on function app.listar_wallets_admin(uuid) from public, anon, authenticated;
grant execute on function app.listar_wallets_admin(uuid) to mediruta_app;

-- ===== obtener_wallet_domiciliario_periodo — balance por rango de
-- fechas (recalculado desde `solicitudes`/`historial_solicitud`, no
-- desde el acumulado histórico de la billetera) =====

create function app.obtener_wallet_domiciliario_periodo(
  p_domiciliario_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  cobrado_efectivo_periodo numeric,
  pendiente_tarjeta_transferencia_periodo numeric,
  deuda_generada_efectivo_periodo numeric,
  liquidado_en_periodo numeric,
  balance_periodo numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  with entregas as (
    select s.metodo_pago, s.domicilio_cobrado, s.copago_cobrado, s.comision_app_porcentaje_cobrada,
      s.domicilio_cobrado * s.comision_app_porcentaje_cobrada as comision_app,
      s.domicilio_cobrado - (s.domicilio_cobrado * s.comision_app_porcentaje_cobrada) as ganancia_neta
    from public.solicitudes s
    join public.historial_solicitud h on h.solicitud_id = s.id and h.estado = 'entregado'
    where s.domiciliario_id = p_domiciliario_id
      and s.domicilio_cobrado is not null
      and s.comision_app_porcentaje_cobrada is not null
      and h.creado_en::date between p_desde and p_hasta
      and app.usuario_tiene_rol_habilitado(p_domiciliario_id, 'DOMICILIARIO')
  ),
  liquidaciones as (
    select coalesce(sum(monto), 0) as total
    from public.liquidacion_domiciliario
    where domiciliario_id = p_domiciliario_id
      and tipo = 'saldo_pendiente'
      and creado_en::date between p_desde and p_hasta
  )
  select
    coalesce(sum(ganancia_neta) filter (where metodo_pago = 'efectivo'), 0),
    coalesce(sum(ganancia_neta) filter (where metodo_pago in ('tarjeta', 'transferencia')), 0),
    coalesce(sum(coalesce(copago_cobrado, 0) + comision_app) filter (where metodo_pago = 'efectivo'), 0),
    (select total from liquidaciones),
    coalesce(sum(ganancia_neta), 0)
  from entregas;
$$;

revoke all on function app.obtener_wallet_domiciliario_periodo(uuid, date, date) from public, anon, authenticated;
grant execute on function app.obtener_wallet_domiciliario_periodo(uuid, date, date) to mediruta_app;

-- ===== obtener_informe_pagos_admin — resumen global tipo "Z": por
-- pagar / por cobrar (snapshot actual) + saldado en el periodo =====

create function app.obtener_informe_pagos_admin(
  p_admin_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  total_por_pagar numeric,
  total_por_cobrar numeric,
  total_liquidado_pagos_periodo numeric,
  total_liquidado_deudas_periodo numeric,
  domiciliarios_bloqueados int,
  domiciliarios_con_saldo_pendiente int
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    coalesce((select sum(saldo_disponible) from public.wallet_domiciliario), 0),
    coalesce((select sum(deuda_efectivo) from public.wallet_domiciliario), 0),
    coalesce((
      select sum(monto) from public.liquidacion_domiciliario
      where tipo = 'saldo_pendiente' and creado_en::date between p_desde and p_hasta
    ), 0),
    coalesce((
      select sum(monto) from public.liquidacion_domiciliario
      where tipo = 'deuda_efectivo' and creado_en::date between p_desde and p_hasta
    ), 0),
    (select count(*)::int from public.wallet_domiciliario where bloqueado_por_tope),
    (select count(*)::int from public.wallet_domiciliario where saldo_disponible > 0)
  where (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  );
$$;

revoke all on function app.obtener_informe_pagos_admin(uuid, date, date) from public, anon, authenticated;
grant execute on function app.obtener_informe_pagos_admin(uuid, date, date) to mediruta_app;
