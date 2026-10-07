-- Bug real reportado: la fórmula médica (receta) nunca llegaba a la
-- hoja "Documentos del paciente" que ve el domiciliario en la farmacia
-- — solo cédula frente/reverso. Rastro del problema: la migración
-- 20260924020000_estado_en_farmacia.sql reescribió esta función (para
-- el nuevo estado "en_farmacia") y, al hacerlo, dejó receta_path en
-- `null::text` en vez de `s.receta_path` como estaba antes de
-- 20260908000000_agregar_receta_a_documentos_paciente_recoger.sql —
-- probablemente un descuido al copiar la función para el refactor, no
-- algo intencional (no hay ningún comentario que lo explique).

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
  select pp.foto_cedula_frente_path, pp.foto_cedula_reverso_path, s.receta_path
  from public.solicitudes s
  join public.perfil_paciente pp on pp.usuario_id = s.paciente_id
  where s.id = p_solicitud_id
    and s.domiciliario_id = p_domiciliario_id
    and s.estado = 'en_farmacia';
$$;
