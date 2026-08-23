-- HU-03 (rework tras revisión en vivo) — dos cambios de fondo:
--
-- 1. Los medicamentos pasan a su propia tabla (solicitud_medicamentos,
--    siguiente migración): una fórmula puede traer varios, no uno solo.
-- 2. La receta ya no se tipea (médico/registro/IPS) — se sube como foto
--    del documento completo (receta_path, mismo patrón de Storage que
--    HU-02/HU-08). Solo se conserva receta_fecha_expedicion (tipeada)
--    para poder detectar recetas vencidas sin abrir la foto.
--
-- Esta migración ALTERA lo creado en 20260823040000 — no se reescribe
-- esa migración porque ya corrió contra el Supabase real (mismo
-- criterio que foto_perfil_path en HU-02).

alter table public.solicitudes
  drop column medicamento_nombre,
  drop column medicamento_concentracion,
  drop column medicamento_forma_farmaceutica,
  drop column medicamento_cantidad,
  drop column medicamento_posologia,
  drop column receta_medico_nombre,
  drop column receta_medico_registro,
  drop column receta_ips,
  add column receta_path text;
