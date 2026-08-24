-- HU-09/HU-07 — el pedido gana a quién está asignado, dónde queda la
-- farmacia (para el cálculo de distancia) y el código de entrega de 6
-- caracteres que el paciente le dicta al domiciliario en la puerta.
-- Además amplía los estados: hoy solo llega a 'pendiente_revision' y ahí
-- se queda — de acá en más recorre la asignación y la entrega completa.
--
-- Los estados nuevos, en orden ('pendiente_revision' y 'cancelada' ya
-- existían, no se tocan):
--   en_asignacion                → pool visible para domiciliarios
--   asignado_en_camino_farmacia  → alguien lo aceptó del pool
--   medicamentos_recogidos       → retiró en la farmacia
--   en_camino_entrega            → va para la dirección del paciente
--   en_sitio                     → llegó
--   entregado                    → confirmado con el código de 6
--
-- "Novedad en pedido" NO es un estado más — es una bandera aparte
-- (tabla `novedad_solicitud`, migración siguiente) que convive con
-- cualquiera de estos estados sin perder en qué paso del flujo estaba
-- el pedido — decisión tomada con el equipo.
alter table public.solicitudes add column if not exists
  domiciliario_id uuid references public.usuarios (id);
alter table public.solicitudes add column if not exists
  farmacia_ubicacion geography(Point, 4326);
alter table public.solicitudes add column if not exists
  codigo_entrega text;

create index if not exists solicitudes_domiciliario_id_idx
  on public.solicitudes (domiciliario_id);

alter table public.solicitudes drop constraint solicitudes_estado_check;
alter table public.solicitudes add constraint solicitudes_estado_check check (
  estado in (
    'borrador', 'pendiente_revision', 'en_asignacion',
    'asignado_en_camino_farmacia', 'medicamentos_recogidos',
    'en_camino_entrega', 'en_sitio', 'entregado', 'cancelada'
  )
);
