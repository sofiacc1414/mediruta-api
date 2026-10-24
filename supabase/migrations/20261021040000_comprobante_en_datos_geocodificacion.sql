-- `EnviarSolicitudUseCase` ya lee este "paquete de datos" de la
-- solicitud antes de geocodificar — se le suma el path del
-- comprobante de transferencia (subido antes, mismo patrón que la
-- foto de la receta) para poder pasarlo tal cual a `app.enviar_solicitud`
-- sin una lectura aparte.

drop function if exists app.obtener_datos_geocodificacion_farmacia(uuid, uuid);

create function app.obtener_datos_geocodificacion_farmacia(
  p_paciente_id uuid,
  p_solicitud_id uuid
)
returns table (
  direccion_farmacia text,
  direccion_entrega text,
  ciudad text,
  departamento text,
  comprobante_pago_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select s.direccion_farmacia, s.direccion_entrega, pp.ciudad, pp.departamento,
    s.comprobante_pago_path
  from public.solicitudes s
  left join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.paciente_id = p_paciente_id;
$$;

revoke all on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) from public, anon, authenticated;
grant execute on function app.obtener_datos_geocodificacion_farmacia(uuid, uuid) to mediruta_app;
