-- HU-08 — historial de decisiones del Administrador sobre domiciliarios.
-- Insert-only (mismo espíritu que `sesiones`): nunca se actualiza ni se
-- borra una fila, así queda trazabilidad completa (G06) aunque un
-- domiciliario sea rechazado y vuelto a evaluar más adelante. El estado
-- "actual" sigue viviendo en usuario_roles.estado (ya existe desde
-- HU-01) — esta tabla es el log de cómo se llegó ahí, no un duplicado.
--
-- No es una tabla de documentos paralela: los documentos siguen en
-- perfil_domiciliario (HU-02). Esta tabla solo registra la decisión.

create table public.validaciones_domiciliario (
  id uuid primary key default gen_random_uuid(),
  domiciliario_id uuid not null,
  admin_id uuid not null,
  decision text not null,
  motivo text,
  creado_en timestamptz not null default now(),
  constraint validaciones_domiciliario_domiciliario_id_fkey
    foreign key (domiciliario_id) references public.usuarios (id) on delete cascade,
  constraint validaciones_domiciliario_admin_id_fkey
    foreign key (admin_id) references public.usuarios (id) on delete restrict,
  constraint validaciones_domiciliario_decision_check check (
    decision in ('aprobado', 'rechazado')
  )
);

create index validaciones_domiciliario_domiciliario_id_idx
  on public.validaciones_domiciliario (domiciliario_id, creado_en desc);

alter table public.validaciones_domiciliario enable row level security;
alter table public.validaciones_domiciliario force row level security;

-- Mismo patrón que sesiones/recuperaciones_contrasena: sin policies, todo
-- el acceso (lectura del historial incluida) pasa por funciones app.*
-- porque un admin necesita ver el historial de CUALQUIER domiciliario,
-- no solo el propio — una policy de "usuario_id = current_user_id()" no
-- alcanzaría para ese caso de uso.
revoke all on table public.validaciones_domiciliario from anon;
revoke all on table public.validaciones_domiciliario from authenticated;
