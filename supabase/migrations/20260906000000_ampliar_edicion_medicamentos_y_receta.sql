-- HU-07 (ronda 4) — amplía "solicitar edición de pedido" para admitir
-- también medicamentos y una foto de receta propuesta, no solo
-- direcciones. Decisión de negocio (confirmada con el equipo): el
-- control clínico pasa a ser la revisión humana del Administrador
-- sobre el diff completo en el panel (antes/después de cada campo,
-- incluida la foto), no una restricción de qué campos se pueden pedir
-- corregir. Si el admin rechaza un cambio de medicamentos/receta, el
-- panel Web sugiere cancelar el pedido y avisa del posible cobro por
-- desplazamiento — eso es solo texto en el panel, no hay lógica nueva
-- acá.

-- ============================================================
-- solicitar_edicion_pedido — suma p_medicamentos y p_incluye_receta
-- ============================================================
-- p_incluye_receta existe porque la foto viaja en una llamada aparte
-- (multipart, después de creada la novedad — ver
-- adjuntar_receta_propuesta_edicion más abajo): sin este flag, pedir
-- *solo* cambiar la foto fallaría la validación de "algún cambio
-- propuesto" al no venir todavía ningún campo.

drop function if exists app.solicitar_edicion_pedido(uuid, uuid, text, text, text);

create function app.solicitar_edicion_pedido(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_direccion_entrega text,
  p_direccion_farmacia text,
  p_detalle text,
  p_medicamentos jsonb default null,
  p_incluye_receta boolean default false
)
returns table (resultado text, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_actual record;
  v_detalle text;
  v_medicamentos_actuales jsonb;
  v_hay_medicamentos boolean := p_medicamentos is not null and jsonb_array_length(p_medicamentos) > 0;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if (p_direccion_entrega is null or length(btrim(p_direccion_entrega)) = 0)
    and (p_direccion_farmacia is null or length(btrim(p_direccion_farmacia)) = 0)
    and not v_hay_medicamentos
    and not p_incluye_receta
  then
    raise exception 'no hay cambios propuestos' using errcode = '22023';
  end if;

  select direccion_entrega, direccion_farmacia into v_actual
  from public.solicitudes
  where public.solicitudes.id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado not in ('borrador', 'entregado', 'cancelada');

  if not found then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  if v_hay_medicamentos then
    select coalesce(jsonb_agg(jsonb_build_object(
      'nombre', m.nombre, 'concentracion', m.concentracion,
      'formaFarmaceutica', m.forma_farmaceutica, 'cantidad', m.cantidad,
      'posologia', m.posologia
    )), '[]'::jsonb)
    into v_medicamentos_actuales
    from public.solicitud_medicamentos m
    where m.solicitud_id = p_solicitud_id;
  end if;

  v_detalle := coalesce(
    nullif(btrim(p_detalle), ''),
    'Solicitud de corrección de datos del pedido.'
  );

  insert into public.novedad_solicitud (
    solicitud_id, reportada_por, detalle, origen, tipo, datos_actuales, datos_propuestos
  )
  values (
    p_solicitud_id, p_paciente_id, v_detalle, 'paciente', 'edicion',
    jsonb_build_object(
      'direccionEntrega', v_actual.direccion_entrega,
      'direccionFarmacia', v_actual.direccion_farmacia
    ) || case when v_hay_medicamentos
      then jsonb_build_object('medicamentos', v_medicamentos_actuales)
      else '{}'::jsonb end,
    jsonb_build_object(
      'direccionEntrega', nullif(btrim(p_direccion_entrega), ''),
      'direccionFarmacia', nullif(btrim(p_direccion_farmacia), '')
    ) || case when v_hay_medicamentos
      then jsonb_build_object('medicamentos', p_medicamentos)
      else '{}'::jsonb end
  )
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text, jsonb, boolean) from public;
revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text, jsonb, boolean) from anon;
revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text, jsonb, boolean) from authenticated;
grant execute on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text, jsonb, boolean) to mediruta_app;

-- ============================================================
-- adjuntar_receta_propuesta_edicion — nueva
-- ============================================================
-- Adjunta una foto de receta "propuesta" a una novedad de edición ya
-- creada. NO toca solicitudes.receta_path — eso solo pasa si el admin
-- aprueba (ver aprobar_edicion_pedido_admin más abajo). El path en sí
-- (bucket privado `perfiles`, sufijo _propuesta) lo arma la API antes
-- de llamar acá, mismo criterio que ya usa subir-receta.use-case.ts
-- para la receta real.
create function app.adjuntar_receta_propuesta_edicion(
  p_paciente_id uuid,
  p_novedad_id uuid,
  p_receta_path text
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_paciente_id is null or p_novedad_id is null
    or p_receta_path is null or length(btrim(p_receta_path)) = 0
  then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  update public.novedad_solicitud
  set datos_propuestos = coalesce(datos_propuestos, '{}'::jsonb)
    || jsonb_build_object('recetaPath', p_receta_path)
  where id = p_novedad_id
    and reportada_por = p_paciente_id
    and tipo = 'edicion'
    and resuelta_en is null;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'actualizado'::text;
end;
$$;

revoke all on function app.adjuntar_receta_propuesta_edicion(uuid, uuid, text) from public;
revoke all on function app.adjuntar_receta_propuesta_edicion(uuid, uuid, text) from anon;
revoke all on function app.adjuntar_receta_propuesta_edicion(uuid, uuid, text) from authenticated;
grant execute on function app.adjuntar_receta_propuesta_edicion(uuid, uuid, text) to mediruta_app;

-- ============================================================
-- aprobar_edicion_pedido_admin — ahora también aplica medicamentos y
-- receta propuestos, no solo direcciones
-- ============================================================
create or replace function app.aprobar_edicion_pedido_admin(
  p_admin_id uuid,
  p_novedad_id uuid
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

-- ============================================================
-- listar_novedades_abiertas — suma receta_path actual de la solicitud
-- (para que la capa TS pueda firmar la URL "actual" además de la
-- "propuesta", que ya viaja dentro de datos_propuestos->>'recetaPath')
-- ============================================================
drop function if exists app.listar_novedades_abiertas(uuid);

create function app.listar_novedades_abiertas(p_admin_id uuid)
returns table (
  id uuid,
  solicitud_id uuid,
  codigo_pedido text,
  detalle text,
  reportada_por_correo text,
  origen text,
  tipo text,
  datos_actuales jsonb,
  datos_propuestos jsonb,
  codigo_entrega text,
  receta_path text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    n.id, n.solicitud_id, s.codigo_pedido, n.detalle, u.correo, n.origen,
    n.tipo, n.datos_actuales, n.datos_propuestos, s.codigo_entrega, s.receta_path,
    n.creado_en
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
