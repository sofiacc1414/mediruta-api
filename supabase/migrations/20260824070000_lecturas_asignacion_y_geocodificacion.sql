-- HU-09/HU-07 — 3 lecturas que faltaban para que la capa TS pueda hacer
-- su trabajo (la geocodificación en sí vive en TS, vía
-- NominatimGeocodificacionAdapter — acá solo se exponen los datos que
-- necesita antes/después de llamarla).

-- `app.obtener_solicitud` amplía su RETURNS TABLE con `codigo_entrega`
-- — el paciente lo necesita visible en el detalle de su pedido para
-- dárselo al domiciliario. Cambia la lista de columnas → DROP previo
-- (mismo criterio que el resto del proyecto).
drop function if exists app.obtener_solicitud(uuid, uuid);

create or replace function app.obtener_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  codigo_pedido text,
  estado text,
  receta_path text,
  receta_fecha_vencimiento date,
  direccion_entrega text,
  direccion_farmacia text,
  creado_en timestamptz,
  enviado_en timestamptz,
  cancelado_en timestamptz,
  cedula_path text,
  codigo_entrega text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id, s.codigo_pedido, s.estado, s.receta_path, s.receta_fecha_vencimiento,
    s.direccion_entrega, s.direccion_farmacia, s.creado_en, s.enviado_en,
    s.cancelado_en, pp.foto_cedula_path, s.codigo_entrega
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.obtener_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_solicitud(uuid, uuid) to mediruta_app;

-- Lo que el caso de uso de "enviar" necesita ANTES de llamar a
-- Nominatim: la dirección de farmacia recién tipeada + ciudad/
-- departamento del perfil del paciente (el contexto que hace que la
-- geocodificación sea confiable). Mismo criterio que `crear_solicitud`
-- ya usaba (leer perfil_paciente cruzado, sin tabla/endpoint aparte).
create or replace function app.obtener_datos_geocodificacion_farmacia(
  p_paciente_id uuid,
  p_solicitud_id uuid
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
  select s.direccion_farmacia, pp.ciudad, pp.departamento
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from public;
revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from anon;
revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from authenticated;
grant execute on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) to mediruta_app;

-- El paciente necesita ver si SU pedido tiene una novedad abierta sin
-- ser Administrador — `listar_novedades_abiertas` (HU-09) exige rol
-- admin a propósito, esto es la versión acotada al dueño del pedido.
create or replace function app.obtener_novedad_abierta_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  detalle text,
  creado_en timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.detalle, n.creado_en
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where n.solicitud_id = p_solicitud_id
    and s.paciente_id = p_paciente_id
    and n.resuelta_en is null
  order by n.creado_en desc
  limit 1;
$$;

revoke all on function app.obtener_novedad_abierta_solicitud(uuid, uuid) from public;
revoke all on function app.obtener_novedad_abierta_solicitud(uuid, uuid) from anon;
revoke all on function app.obtener_novedad_abierta_solicitud(uuid, uuid) from authenticated;
grant execute on function app.obtener_novedad_abierta_solicitud(uuid, uuid) to mediruta_app;
