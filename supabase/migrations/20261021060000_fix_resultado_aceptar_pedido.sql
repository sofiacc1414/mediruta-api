-- Bug real introducido en la migración anterior
-- (wallet_domiciliario_pasarela_pago): al reescribir `aceptar_pedido`
-- para agregar el guard de `bloqueado_por_tope`, el `return` final se
-- copió mal y quedó en 'asignado'::text en vez de 'aceptado'::text —
-- el valor que la API (`ResultadoAceptarPedido`/`AceptarPedidoUseCase`)
-- siempre esperó. Con el valor equivocado, un aceptar exitoso no
-- calzaba con ningún `case` del switch en TS (caía indefinido en vez
-- de devolver el mensaje de éxito), aunque el `update` sí se aplicaba
-- bien en la base.
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
