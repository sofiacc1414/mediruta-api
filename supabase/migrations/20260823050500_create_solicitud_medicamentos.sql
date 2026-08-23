-- HU-03 (rework) — una solicitud puede traer varios medicamentos (una
-- fórmula real casi nunca trae uno solo). El orden de aparición se
-- resuelve ordenando por creado_en — no hace falta una columna `orden`
-- aparte, la App reenvía la lista completa en cada guardado
-- (app.actualizar_solicitud borra e inserta de nuevo, ver función).

create table public.solicitud_medicamentos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null,
  nombre text,
  concentracion text,
  forma_farmaceutica text,
  cantidad text,
  posologia text,
  creado_en timestamptz not null default now(),
  constraint solicitud_medicamentos_solicitud_id_fkey
    foreign key (solicitud_id) references public.solicitudes (id) on delete cascade
);

create index solicitud_medicamentos_solicitud_id_idx
  on public.solicitud_medicamentos (solicitud_id, creado_en asc);

alter table public.solicitud_medicamentos enable row level security;
alter table public.solicitud_medicamentos force row level security;

revoke all on table public.solicitud_medicamentos from anon;
revoke all on table public.solicitud_medicamentos from authenticated;
