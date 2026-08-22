-- Catálogo de roles del sistema (modelo multirrol).
-- Ver context.md, Parte B, sección 4.1 — Modelo multirrol.
--
-- No existe usuarios.rol. Esta tabla es la fuente única de códigos
-- PACIENTE, DOMICILIARIO, ADMINISTRADOR y ROOT.
-- La identidad en RLS es app.current_user_id(); nunca auth.uid().
-- INSERT/UPDATE/DELETE del catálogo solo por migraciones (sin policies de escritura).

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descripcion text,
  creado_en timestamptz not null default now(),
  constraint roles_codigo_key unique (codigo),
  constraint roles_codigo_check check (
    codigo in ('PACIENTE', 'DOMICILIARIO', 'ADMINISTRADOR', 'ROOT')
  )
);

insert into public.roles (codigo, descripcion)
values
  ('PACIENTE', 'Solicita y recibe entregas de medicamentos.'),
  ('DOMICILIARIO', 'Realiza entregas a domicilio. Requiere validación administrativa.'),
  ('ADMINISTRADOR', 'Gestiona la plataforma desde el panel web.'),
  ('ROOT', 'Cuenta técnica interna con privilegios administrativos. No es un actor público.');

alter table public.roles enable row level security;
alter table public.roles force row level security;

create policy "autenticado_lee_catalogo_roles"
  on public.roles
  for select
  using (app.current_user_id() is not null);

-- PostgREST (anon / authenticated): esta tabla no se expone por la Data API.
-- No se hace REVOKE sobre el schema public ni GRANT a mediruta_app (aún no existe).
revoke all on table public.roles from anon;
revoke all on table public.roles from authenticated;
