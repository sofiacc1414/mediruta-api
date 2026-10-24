-- Módulo 3 — "Ingresos de la empresa" en el informe de pagos admin: la
-- comisión que MediRuta se queda de cada domicilio entregado
-- (`domicilio_cobrado * comision_app_porcentaje_cobrada`, ver
-- `app.entregar_pedido`) nunca se sumaba ni se exponía en ningún lado
-- — solo se calculaba al vuelo para acreditarle al domiciliario su
-- ganancia neta, y se descartaba. `comision_acumulada` en
-- `wallet_domiciliario` NO es esto: es el bruto de `domicilio_cobrado`
-- (incluye la parte del domiciliario), no la comisión neta de la
-- empresa.

drop function if exists app.obtener_informe_pagos_admin(uuid, date, date);

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
  total_ingresos_empresa_periodo numeric,
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
    coalesce((
      select sum(s.domicilio_cobrado * s.comision_app_porcentaje_cobrada)
      from public.solicitudes s
      join public.historial_solicitud h on h.solicitud_id = s.id and h.estado = 'entregado'
      where s.domicilio_cobrado is not null
        and s.comision_app_porcentaje_cobrada is not null
        and h.creado_en::date between p_desde and p_hasta
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
