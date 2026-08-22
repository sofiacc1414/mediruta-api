-- Asignación de roles a cuentas (modelo multirrol, HU-01).
-- Ver context.md, Parte B, sección 4.1 — Modelo multirrol.
--
-- No existe usuarios.rol. Una cuenta puede tener varios roles.
-- Las combinaciones de registro (PACIENTE habilitado; DOMICILIARIO
-- pendiente_validacion) las crea la API en una transacción, no esta migración.
-- La identidad en RLS es app.current_user_id(); nunca auth.uid().
-- INSERT/UPDATE/DELETE se controlan desde la API (sin policies de escritura).

create table public.usuario_roles (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  rol_id uuid not null,
  estado text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint usuario_roles_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios (id) on delete cascade,
  constraint usuario_roles_rol_id_fkey
    foreign key (rol_id) references public.roles (id),
  constraint usuario_roles_usuario_rol_key unique (usuario_id, rol_id),
  constraint usuario_roles_estado_check check (
    estado in ('habilitado', 'pendiente_validacion', 'rechazado')
  )
);

alter table public.usuario_roles enable row level security;
alter table public.usuario_roles force row level security;

create policy "usuario_lee_sus_roles"
  on public.usuario_roles
  for select
  using (usuario_id = app.current_user_id());

-- PostgREST (anon / authenticated): esta tabla no se expone por la Data API.
-- No se hace REVOKE sobre el schema public ni sobre otras tablas.
revoke all on table public.usuario_roles from anon;
revoke all on table public.usuario_roles from authenticated;
