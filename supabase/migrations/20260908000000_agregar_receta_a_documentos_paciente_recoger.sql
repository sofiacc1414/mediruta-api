-- HU-07/HU-09 — el modal "Documentos del paciente" que ve el
-- Domiciliario en la farmacia (`asignado_en_camino_farmacia`) solo
-- traía la cédula (ambos lados) — le faltaba la foto de la fórmula
-- médica del pedido, indispensable para retirar el medicamento
-- correcto. Mismo criterio de autorización (dueño del pedido, en el
-- paso exacto donde tiene sentido pedirla).

drop function if exists app.obtener_documentos_paciente_para_recoger(uuid, uuid);

create function app.obtener_documentos_paciente_para_recoger(
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
  select pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path, s.receta_path
  from public.solicitudes s
  join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and s.estado = 'asignado_en_camino_farmacia';
$$;

revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from public;
revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from anon;
revoke all on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) from authenticated;
grant execute on function app.obtener_documentos_paciente_para_recoger(uuid, uuid) to mediruta_app;
