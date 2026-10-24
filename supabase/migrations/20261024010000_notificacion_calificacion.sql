-- Nuevo tipo de notificación: avisarle al paciente que puede calificar
-- la entrega apenas el pedido pasa a `entregado` — hoy no había ningún
-- disparo automático, el paciente tenía que entrar solo a buscarlo.

alter table public.notificaciones drop constraint notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in ('cambio_estado', 'asignacion', 'validacion_cuenta', 'mensaje_chat', 'calificacion')
);
