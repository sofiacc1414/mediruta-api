-- HU-07 (ronda 5) — el Paciente hoy solo ve si tiene UNA novedad
-- abierta (`app.obtener_novedad_abierta_solicitud`, `resuelta_en is
-- null limit 1`) y nunca se entera del resultado de una ya resuelta
-- (aprobada/rechazada) — la fila simplemente desaparece de esa lectura.
-- Además, si llega a tener 2+ novedades abiertas a la vez (nada en la
-- base lo impide — confirmado: ningún `solicitar_edicion_pedido`/
-- `reportar_codigo_no_generado`/`reportar_novedad_paciente` chequea
-- "ya tiene una abierta"), esa función solo le muestra la más
-- reciente. Esta función nueva no reemplaza esa — la complementa: trae
-- TODAS las novedades de la solicitud, resueltas o no.

create function app.listar_novedades_solicitud(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  id uuid,
  tipo text,
  detalle text,
  origen text,
  creado_en timestamptz,
  resuelta_en timestamptz,
  accion_edicion text,
  datos_propuestos jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select n.id, n.tipo, n.detalle, n.origen, n.creado_en, n.resuelta_en,
    n.accion_edicion, n.datos_propuestos
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  where n.solicitud_id = p_solicitud_id
    and s.paciente_id = p_paciente_id
  order by n.creado_en desc;
$$;

revoke all on function app.listar_novedades_solicitud(uuid, uuid) from public;
revoke all on function app.listar_novedades_solicitud(uuid, uuid) from anon;
revoke all on function app.listar_novedades_solicitud(uuid, uuid) from authenticated;
grant execute on function app.listar_novedades_solicitud(uuid, uuid) to mediruta_app;
