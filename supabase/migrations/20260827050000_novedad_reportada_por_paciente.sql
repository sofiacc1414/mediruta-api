-- HU-07 (ronda 2 de feedback) — hoy solo el Domiciliario puede reportar
-- una novedad sobre el pedido; el Paciente también debe poder hacerlo
-- (ej. "el domiciliario no contesta", "la dirección está mal"). La
-- tabla ya era genérica (`reportada_por` es cualquier `usuarios.id`) —
-- lo único que faltaba era una función de escritura análoga guardada
-- contra `paciente_id` en vez de `domiciliario_id`, y una columna
-- `origen` para que el panel distinga quién la reportó.

alter table public.novedad_solicitud
  add column origen text not null default 'domiciliario'
  check (origen in ('domiciliario', 'paciente'));

create function app.reportar_novedad_paciente(
  p_paciente_id uuid,
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
  if p_paciente_id is null or p_solicitud_id is null
    or p_detalle is null or length(btrim(p_detalle)) = 0
  then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.solicitudes
    where solicitudes.id = p_solicitud_id
      and solicitudes.paciente_id = p_paciente_id
      and solicitudes.estado not in ('entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  insert into public.novedad_solicitud (solicitud_id, reportada_por, detalle, origen)
  values (p_solicitud_id, p_paciente_id, btrim(p_detalle), 'paciente')
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

revoke all on function app.reportar_novedad_paciente(uuid, uuid, text) from public;
revoke all on function app.reportar_novedad_paciente(uuid, uuid, text) from anon;
revoke all on function app.reportar_novedad_paciente(uuid, uuid, text) from authenticated;
grant execute on function app.reportar_novedad_paciente(uuid, uuid, text) to mediruta_app;

-- Ambas cambian sus columnas de salida (agregan `origen`) → DROP previo.
drop function if exists app.listar_novedades_abiertas(uuid);

create function app.listar_novedades_abiertas(p_admin_id uuid)
returns table (
  id uuid,
  solicitud_id uuid,
  codigo_pedido text,
  detalle text,
  reportada_por_correo text,
  origen text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.solicitud_id, s.codigo_pedido, n.detalle, u.correo, n.origen, n.creado_en
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

revoke all on function app.listar_novedades_abiertas(uuid) from public;
revoke all on function app.listar_novedades_abiertas(uuid) from anon;
revoke all on function app.listar_novedades_abiertas(uuid) from authenticated;
grant execute on function app.listar_novedades_abiertas(uuid) to mediruta_app;

drop function if exists app.obtener_novedad_abierta_pedido_admin(uuid, uuid);

create function app.obtener_novedad_abierta_pedido_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  detalle text,
  origen text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.detalle, n.origen, n.creado_en
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where n.solicitud_id = p_solicitud_id
    and n.resuelta_en is null
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
  order by n.creado_en desc
  limit 1;
$$;

revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from public;
revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from anon;
revoke all on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_novedad_abierta_pedido_admin(uuid, uuid) to mediruta_app;
