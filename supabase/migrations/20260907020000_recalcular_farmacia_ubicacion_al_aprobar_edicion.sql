-- HU-07 — al aprobar una edición que cambia la dirección de la
-- farmacia, `direccion_farmacia` (texto) se actualizaba pero
-- `farmacia_ubicacion` (el punto geocodificado que usa
-- `listar_pedidos_disponibles` para calcular/filtrar por distancia)
-- se quedaba con las coordenadas viejas — el domiciliario seguía
-- viendo la distancia a la dirección anterior. Mismo patrón que ya
-- usa `enviar_solicitud` (HU-09): la geocodificación pasa por
-- Nominatim desde la capa TS, esta función solo aplica el punto ya
-- resuelto.

-- Admin necesita los mismos datos de contexto (ciudad/departamento del
-- paciente) que ya usa `obtener_datos_geocodificacion_farmacia`
-- (paciente-scoped) para geocodificar. `direccion_farmacia` viaja NULL
-- si la edición no toca la dirección de la farmacia — así la capa TS
-- se ahorra el llamado a Nominatim cuando no hace falta (ej. una
-- edición que solo cambia medicamentos).
create function app.obtener_datos_geocodificacion_novedad_admin(
  p_admin_id uuid,
  p_novedad_id uuid
)
returns table (
  direccion_farmacia text,
  ciudad text,
  departamento text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    n.datos_propuestos->>'direccionFarmacia',
    pp.ciudad,
    pp.departamento
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where n.id = p_novedad_id
    and n.tipo = 'edicion'
    and (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    );
$$;

revoke all on function app.obtener_datos_geocodificacion_novedad_admin(uuid, uuid) from public;
revoke all on function app.obtener_datos_geocodificacion_novedad_admin(uuid, uuid) from anon;
revoke all on function app.obtener_datos_geocodificacion_novedad_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_datos_geocodificacion_novedad_admin(uuid, uuid) to mediruta_app;

drop function if exists app.aprobar_edicion_pedido_admin(uuid, uuid);

create function app.aprobar_edicion_pedido_admin(
  p_admin_id uuid,
  p_novedad_id uuid,
  p_farmacia_lat double precision default null,
  p_farmacia_lng double precision default null
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novedad public.novedad_solicitud%rowtype;
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

  select * into v_novedad
  from public.novedad_solicitud
  where id = p_novedad_id
    and tipo = 'edicion'
    and resuelta_en is null
  for update;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  update public.solicitudes
  set
    direccion_entrega = coalesce(
      v_novedad.datos_propuestos->>'direccionEntrega', direccion_entrega
    ),
    direccion_farmacia = coalesce(
      v_novedad.datos_propuestos->>'direccionFarmacia', direccion_farmacia
    ),
    receta_path = coalesce(
      v_novedad.datos_propuestos->>'recetaPath', receta_path
    ),
    farmacia_ubicacion = case
      when v_novedad.datos_propuestos ? 'direccionFarmacia'
        and p_farmacia_lat is not null and p_farmacia_lng is not null
      then public.st_setsrid(public.st_makepoint(p_farmacia_lng, p_farmacia_lat), 4326)::public.geography
      else farmacia_ubicacion
    end,
    actualizado_en = now()
  where id = v_novedad.solicitud_id;

  if v_novedad.datos_propuestos ? 'medicamentos' then
    delete from public.solicitud_medicamentos where solicitud_id = v_novedad.solicitud_id;

    insert into public.solicitud_medicamentos (
      solicitud_id, nombre, concentracion, forma_farmaceutica, cantidad, posologia
    )
    select
      v_novedad.solicitud_id, m.nombre, m.concentracion, m."formaFarmaceutica",
      m.cantidad, m.posologia
    from jsonb_to_recordset(v_novedad.datos_propuestos->'medicamentos') as m(
      nombre text, concentracion text, "formaFarmaceutica" text, cantidad text,
      posologia text
    );
  end if;

  update public.novedad_solicitud
  set resuelta_en = now(), resuelta_por = p_admin_id, accion_edicion = 'aprobada'
  where id = p_novedad_id;

  return query select 'aprobada'::text;
end;
$$;

revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid, double precision, double precision) from public;
revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid, double precision, double precision) from anon;
revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid, double precision, double precision) from authenticated;
grant execute on function app.aprobar_edicion_pedido_admin(uuid, uuid, double precision, double precision) to mediruta_app;
