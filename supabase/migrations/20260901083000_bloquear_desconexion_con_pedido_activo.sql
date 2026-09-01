-- HU-09 — un Domiciliario no puede apagar "Disponible para recibir
-- pedidos" mientras tiene un pedido activo en curso (mismos 4 estados
-- que app.obtener_pedido_activo_domiciliario). Antes, apagar
-- disponibilidad no validaba nada — quedaba un pedido "colgado" sin
-- que nadie más pudiera reasignarlo. Al activar sigue sin haber
-- restricción (no aplica: recién ahí entra al pool).
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

  if not p_disponible and exists (
    select 1 from public.solicitudes s
    where s.domiciliario_id = p_domiciliario_id
      and s.estado in (
        'asignado_en_camino_farmacia', 'medicamentos_recogidos',
        'en_camino_entrega', 'en_sitio'
      )
  ) then
    return query select 'tiene_pedido_activo'::text;
    return;
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

revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from public;
revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from anon;
revoke all on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) from authenticated;
grant execute on function app.actualizar_disponibilidad_domiciliario(uuid, boolean, double precision, double precision) to mediruta_app;
