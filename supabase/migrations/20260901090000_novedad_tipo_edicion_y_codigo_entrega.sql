-- HU-07 (ronda 3) — clasifica las "novedades" del Paciente en 3 tipos:
--   'pregunta' (el mensaje directo de siempre, sin cambios),
--   'edicion'  (pide corregir direccion_entrega/direccion_farmacia de un
--              pedido ya enviado — el admin ve antes/después y aprueba
--              o rechaza, sin aplicar el cambio solo),
--   'codigo'   (no vio el codigo_entrega en su pantalla — el admin puede
--              regenerarlo o reenviarlo por correo).
-- Se queda en la misma tabla `novedad_solicitud` (no una entidad nueva)
-- porque sigue siendo "algo que el paciente reporta sobre su pedido y
-- el admin atiende" — el `tipo` es lo único que cambia el flujo.

alter table public.novedad_solicitud
  add column tipo text not null default 'pregunta'
    check (tipo in ('pregunta', 'edicion', 'codigo')),
  add column datos_actuales jsonb,
  add column datos_propuestos jsonb,
  add column accion_edicion text
    check (accion_edicion in ('aprobada', 'rechazada'));

alter table public.novedad_solicitud
  add constraint novedad_solicitud_edicion_tiene_propuesta_check check (
    (tipo = 'edicion') = (datos_propuestos is not null)
  ),
  add constraint novedad_solicitud_accion_solo_en_edicion_check check (
    accion_edicion is null or tipo = 'edicion'
  );

-- Cambian las columnas de salida → DROP previo (mismo criterio que
-- 20260827050000 al agregar `origen`).
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
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    n.id, n.solicitud_id, s.codigo_pedido, n.detalle, u.correo, n.origen,
    n.tipo, n.datos_actuales, n.datos_propuestos, s.codigo_entrega, n.creado_en
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
  tipo text,
  datos_actuales jsonb,
  datos_propuestos jsonb,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.detalle, n.origen, n.tipo, n.datos_actuales, n.datos_propuestos, n.creado_en
  from public.novedad_solicitud n
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

-- El Paciente pide corregir direccion_entrega/direccion_farmacia de un
-- pedido ya enviado (no admite Borrador/entregado/cancelada — Borrador
-- ya se edita directo con `actualizar()`, HU-03 G04). Guarda una foto de
-- los valores actuales (`datos_actuales`) junto a los propuestos, para
-- que el panel admin pinte el diff sin depender de que la solicitud no
-- haya cambiado entre el reporte y la revisión.
create function app.solicitar_edicion_pedido(
  p_paciente_id uuid,
  p_solicitud_id uuid,
  p_direccion_entrega text,
  p_direccion_farmacia text,
  p_detalle text
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
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if (p_direccion_entrega is null or length(btrim(p_direccion_entrega)) = 0)
    and (p_direccion_farmacia is null or length(btrim(p_direccion_farmacia)) = 0)
  then
    raise exception 'no hay cambios propuestos' using errcode = '22023';
  end if;

  select direccion_entrega, direccion_farmacia into v_actual
  from public.solicitudes
  where id = p_solicitud_id
    and paciente_id = p_paciente_id
    and estado not in ('borrador', 'entregado', 'cancelada');

  if not found then
    return query select 'no_encontrado'::text, null::uuid;
    return;
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
    ),
    jsonb_build_object(
      'direccionEntrega', nullif(btrim(p_direccion_entrega), ''),
      'direccionFarmacia', nullif(btrim(p_direccion_farmacia), '')
    )
  )
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text) from public;
revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text) from anon;
revoke all on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text) from authenticated;
grant execute on function app.solicitar_edicion_pedido(uuid, uuid, text, text, text) to mediruta_app;

-- El Paciente reporta que el código de entrega no se generó / no lo ve
-- en su pantalla. Mismo guard de "pedido propio y todavía activo" que
-- `reportar_novedad_paciente` — sin datos_propuestos, el admin actúa
-- directo sobre el pedido (regenerar/reenviar), no hay nada que aprobar.
create function app.reportar_codigo_no_generado(
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
  v_detalle text;
begin
  if p_paciente_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and paciente_id = p_paciente_id
      and estado not in ('borrador', 'entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::uuid;
    return;
  end if;

  v_detalle := coalesce(
    nullif(btrim(p_detalle), ''),
    'El código de entrega no se generó o no es visible en la app.'
  );

  insert into public.novedad_solicitud (solicitud_id, reportada_por, detalle, origen, tipo)
  values (p_solicitud_id, p_paciente_id, v_detalle, 'paciente', 'codigo')
  returning novedad_solicitud.id into v_id;

  return query select 'reportada'::text, v_id;
end;
$$;

revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from public;
revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from anon;
revoke all on function app.reportar_codigo_no_generado(uuid, uuid, text) from authenticated;
grant execute on function app.reportar_codigo_no_generado(uuid, uuid, text) to mediruta_app;

-- El Administrador aprueba una novedad de tipo 'edicion': aplica
-- datos_propuestos (solo los campos no nulos — el paciente puede haber
-- pedido corregir uno solo de los dos) a la solicitud, y cierra la
-- novedad dejando registrado que fue aprobada.
create function app.aprobar_edicion_pedido_admin(
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
    actualizado_en = now()
  where id = v_novedad.solicitud_id;

  update public.novedad_solicitud
  set resuelta_en = now(), resuelta_por = p_admin_id, accion_edicion = 'aprobada'
  where id = p_novedad_id;

  return query select 'aprobada'::text;
end;
$$;

revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid) from public;
revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid) from anon;
revoke all on function app.aprobar_edicion_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.aprobar_edicion_pedido_admin(uuid, uuid) to mediruta_app;

-- El Administrador rechaza una novedad de tipo 'edicion': no toca el
-- pedido, solo cierra la novedad dejando registrado que fue rechazada.
create function app.rechazar_edicion_pedido_admin(
  p_admin_id uuid,
  p_novedad_id uuid
)
returns table (resultado text)
language plpgsql
security definer
set search_path = ''
as $$
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

  update public.novedad_solicitud
  set resuelta_en = now(), resuelta_por = p_admin_id, accion_edicion = 'rechazada'
  where id = p_novedad_id
    and tipo = 'edicion'
    and resuelta_en is null;

  if not found then
    return query select 'no_encontrado'::text;
    return;
  end if;

  return query select 'rechazada'::text;
end;
$$;

revoke all on function app.rechazar_edicion_pedido_admin(uuid, uuid) from public;
revoke all on function app.rechazar_edicion_pedido_admin(uuid, uuid) from anon;
revoke all on function app.rechazar_edicion_pedido_admin(uuid, uuid) from authenticated;
grant execute on function app.rechazar_edicion_pedido_admin(uuid, uuid) to mediruta_app;

-- El Administrador regenera codigo_entrega cuando el Paciente reporta
-- que no lo vio — mismo algoritmo (6 caracteres, sin 0/O/1/I/L) que
-- `app.enviar` usa al generarlo por primera vez. No aplica sobre pedidos
-- ya entregados/cancelados (el código ya cumplió su función o ya no
-- aplica) ni sobre los que todavía no tienen codigo_pedido (Borrador).
create function app.regenerar_codigo_entrega_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (resultado text, codigo_entrega text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo_entrega text;
  v_charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if p_admin_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::text;
    return;
  end if;

  if not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and codigo_pedido is not null
      and estado not in ('entregado', 'cancelada')
  ) then
    return query select 'no_encontrado'::text, null::text;
    return;
  end if;

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

  update public.solicitudes
  set codigo_entrega = v_codigo_entrega, actualizado_en = now()
  where id = p_solicitud_id;

  return query select 'regenerado'::text, v_codigo_entrega;
end;
$$;

revoke all on function app.regenerar_codigo_entrega_admin(uuid, uuid) from public;
revoke all on function app.regenerar_codigo_entrega_admin(uuid, uuid) from anon;
revoke all on function app.regenerar_codigo_entrega_admin(uuid, uuid) from authenticated;
grant execute on function app.regenerar_codigo_entrega_admin(uuid, uuid) to mediruta_app;

-- Datos que la API necesita para reenviar codigo_entrega por correo
-- (el envío en sí lo hace la API vía Resend, no esta función) —
-- SECURITY DEFINER porque mediruta_app no tiene SELECT directo sobre
-- usuarios.correo/nombre_completo (igual que app.obtener_perfil).
create function app.obtener_codigo_entrega_para_correo_admin(
  p_admin_id uuid,
  p_solicitud_id uuid
)
returns table (
  resultado text,
  codigo_entrega text,
  codigo_pedido text,
  paciente_correo text,
  paciente_nombre text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if p_admin_id is null or p_solicitud_id is null then
    raise exception 'parámetro inválido' using errcode = '22023';
  end if;

  if not (
    app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
    or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
  ) then
    return query select 'no_autorizado'::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  select s.codigo_entrega, s.codigo_pedido, u.correo, u.nombre_completo
  into v_row
  from public.solicitudes s
  join public.usuarios u on u.id = s.paciente_id
  where s.id = p_solicitud_id;

  if not found or v_row.codigo_entrega is null then
    return query select 'no_encontrado'::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  return query select
    'ok'::text, v_row.codigo_entrega, v_row.codigo_pedido, v_row.correo, v_row.nombre_completo;
end;
$$;

revoke all on function app.obtener_codigo_entrega_para_correo_admin(uuid, uuid) from public;
revoke all on function app.obtener_codigo_entrega_para_correo_admin(uuid, uuid) from anon;
revoke all on function app.obtener_codigo_entrega_para_correo_admin(uuid, uuid) from authenticated;
grant execute on function app.obtener_codigo_entrega_para_correo_admin(uuid, uuid) to mediruta_app;
