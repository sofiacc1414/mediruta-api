-- Estado intermedio "en_farmacia": el domiciliario ya llegó, y solo
-- ahí puede ver la cédula. Recoger el pedido sale de este estado, no
-- de "en camino a la farmacia".

alter table public.solicitudes drop constraint solicitudes_estado_check;
alter table public.solicitudes add constraint solicitudes_estado_check check (
  estado in (
    'borrador', 'pendiente_revision', 'en_asignacion',
    'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
    'en_camino_entrega', 'en_sitio', 'entregado', 'cancelada'
  )
);

create or replace function app.marcar_en_farmacia(
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
  set estado = 'en_farmacia', actualizado_en = now()
  where id = p_solicitud_id
    and domiciliario_id = p_domiciliario_id
    and estado = 'asignado_en_camino_farmacia';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'en_farmacia');

  return query select 'actualizado'::text;
end;
$$;

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
    and estado = 'en_farmacia';

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  insert into public.historial_solicitud (solicitud_id, estado)
  values (p_solicitud_id, 'medicamentos_recogidos');

  return query select 'actualizado'::text;
end;
$$;

create or replace function app.obtener_documentos_paciente_para_recoger(
  p_domiciliario_id uuid,
  p_solicitud_id uuid
)
returns table (
  cedula_frente_path text,
  cedula_reverso_path text,
  receta_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path, null::text
  from public.solicitudes s
  join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and s.estado = 'en_farmacia';
$$;

create or replace function app.obtener_pedido_activo_domiciliario(p_domiciliario_id uuid)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.id, s.codigo_pedido, s.estado, s.direccion_entrega, s.direccion_farmacia, s.creado_en
  from public.solicitudes s
  where s.domiciliario_id = p_domiciliario_id
    and s.estado in (
      'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
      'en_camino_entrega', 'en_sitio'
    )
  order by s.creado_en desc
  limit 1;
$$;

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
        'asignado_en_camino_farmacia', 'en_farmacia', 'medicamentos_recogidos',
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

revoke all on function app.marcar_en_farmacia(uuid, uuid) from public, anon, authenticated;
grant execute on function app.marcar_en_farmacia(uuid, uuid) to mediruta_app;
