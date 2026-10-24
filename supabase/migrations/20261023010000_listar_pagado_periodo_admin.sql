-- Módulo 3 — columna "Pagado en el periodo" en la tabla de billeteras
-- del panel admin: cuánto se le liquidó de saldo pendiente (tarjeta/
-- transferencia) a cada domiciliario dentro del rango de fechas
-- elegido, que es exactamente lo que incrementó su `saldo_cobrado` en
-- ese periodo (ver `app.liquidar_saldo_domiciliario_admin`, que hace
-- `saldo_cobrado = saldo_cobrado + v_saldo` al liquidar).
--
-- Función aparte de `app.listar_wallets_admin` (no se le agregan
-- parámetros de fecha) para no romper su contrato ya usado en el
-- listado principal — esta es solo para el overlay por periodo.

create function app.listar_pagado_periodo_admin(
  p_admin_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  domiciliario_id uuid,
  pagado_en_periodo numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select l.domiciliario_id, sum(l.monto)
  from public.liquidacion_domiciliario l
  where l.tipo = 'saldo_pendiente'
    and l.creado_en::date between p_desde and p_hasta
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  group by l.domiciliario_id;
$$;

revoke all on function app.listar_pagado_periodo_admin(uuid, date, date) from public, anon, authenticated;
grant execute on function app.listar_pagado_periodo_admin(uuid, date, date) to mediruta_app;
