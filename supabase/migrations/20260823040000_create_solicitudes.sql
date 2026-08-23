-- HU-03 — solicitudes de medicamentos del Paciente. Campos definidos con
-- el equipo (el backlog solo decía "información obligatoria del
-- medicamento"): datos del medicamento + datos de la receta médica que
-- exige una fórmula válida en Colombia (médico, registro médico, IPS,
-- fecha). La foto/escaneo de la receta es HU-05 (documentos) y el OCR es
-- HU-04 — acá los datos se tipean, no se suben como imagen.
--
-- direccion_entrega se precarga en la API desde perfil_paciente.direccion
-- (HU-02) pero es un valor PROPIO de la solicitud, no una referencia viva
-- al perfil — si el paciente cambia su dirección de perfil después, las
-- solicitudes ya creadas conservan la que tenían.
--
-- estado solo cubre lo que HU-03 necesita. HU-06 (revisión del admin)
-- va a AMPLIAR este check con 'pendiente_correccion'/'aprobada'/
-- 'rechazada' sobre solicitudes ya enviadas — no se agregan ahora porque
-- todavía no existe quién los use.
--
-- RLS activo y FORCE, sin policies: mismo patrón que el resto — todo el
-- acceso pasa por funciones app.* (migración posterior).

create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null,
  estado text not null default 'borrador',
  medicamento_nombre text,
  medicamento_concentracion text,
  medicamento_forma_farmaceutica text,
  medicamento_cantidad text,
  medicamento_posologia text,
  receta_medico_nombre text,
  receta_medico_registro text,
  receta_ips text,
  receta_fecha_expedicion date,
  direccion_entrega text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  enviado_en timestamptz,
  cancelado_en timestamptz,
  constraint solicitudes_paciente_id_fkey
    foreign key (paciente_id) references public.usuarios (id) on delete cascade,
  constraint solicitudes_estado_check check (
    estado in ('borrador', 'pendiente_revision', 'cancelada')
  )
);

create index solicitudes_paciente_id_idx
  on public.solicitudes (paciente_id, creado_en desc);

alter table public.solicitudes enable row level security;
alter table public.solicitudes force row level security;

revoke all on table public.solicitudes from anon;
revoke all on table public.solicitudes from authenticated;
