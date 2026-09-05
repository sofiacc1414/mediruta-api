-- HU-07 (ronda 6) — el panel admin solo podía ver novedades abiertas
-- (`resuelta_en is null`), sin forma de repasar el historial (aprobadas,
-- rechazadas, resueltas) ni filtrar por estado. Se reemplaza
-- `app.listar_novedades_abiertas` por una versión con un parámetro de
-- estado (default 'abierta', para no romper a quien la llame sin
-- argumentos) y se agregan `resuelta_en`/`accion_edicion` al resultado.

drop function if exists app.listar_novedades_abiertas(uuid);

create function app.listar_novedades_abiertas(p_admin_id uuid, p_estado text default 'abierta')
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
  creado_en timestamptz,
  resuelta_en timestamptz,
  accion_edicion text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    n.id, n.solicitud_id, s.codigo_pedido, n.detalle, u.correo, n.origen,
    n.tipo, n.datos_actuales, n.datos_propuestos, s.codigo_entrega, s.receta_path,
    n.creado_en, n.resuelta_en, n.accion_edicion
  from public.novedad_solicitud n
  join public.solicitudes s on s.id = n.solicitud_id
  join public.usuarios u on u.id = n.reportada_por
  where (
      app.usuario_tiene_rol_habilitado(p_admin_id, 'ADMINISTRADOR')
      or app.usuario_tiene_rol_habilitado(p_admin_id, 'ROOT')
    )
    and (
      p_estado = 'todas'
      or (p_estado = 'abierta' and n.resuelta_en is null)
      or (p_estado = 'aprobada' and n.accion_edicion = 'aprobada')
      or (p_estado = 'rechazada' and n.accion_edicion = 'rechazada')
      or (p_estado = 'resuelta' and n.resuelta_en is not null and n.accion_edicion is null)
    )
  order by n.creado_en desc;
$$;

revoke all on function app.listar_novedades_abiertas(uuid, text) from public;
revoke all on function app.listar_novedades_abiertas(uuid, text) from anon;
revoke all on function app.listar_novedades_abiertas(uuid, text) from authenticated;
grant execute on function app.listar_novedades_abiertas(uuid, text) to mediruta_app;
