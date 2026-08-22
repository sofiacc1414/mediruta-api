-- Identidad, credenciales y estado de cuenta (HU-01).
-- Ver context.md, Parte B, sección 4.1 — Modelo multirrol.
--
-- usuarios no tiene columna rol ni datos de perfil.
-- Las asignaciones de rol irán en usuario_roles (migración posterior).
-- La identidad en RLS es app.current_user_id(); nunca auth.uid().
-- INSERT/UPDATE/DELETE sensibles se controlan desde la API (sin policies de escritura).

create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  password_hash text not null,
  estado_cuenta text not null default 'activa',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint usuarios_correo_key unique (correo),
  constraint usuarios_correo_canonico_check check (
    correo = lower(btrim(correo))
  ),
  constraint usuarios_correo_no_vacio_check check (
    length(correo) > 0
  ),
  constraint usuarios_estado_cuenta_check check (
    estado_cuenta in ('activa', 'bloqueada', 'desactivada')
  )
);

alter table public.usuarios enable row level security;
alter table public.usuarios force row level security;

create policy "usuario_lee_su_cuenta"
  on public.usuarios
  for select
  using (id = app.current_user_id());

-- PostgREST (anon / authenticated): esta tabla no se expone por la Data API.
-- No se hace REVOKE sobre el schema public ni GRANT a mediruta_app (aún no existe).
revoke all on table public.usuarios from anon;
revoke all on table public.usuarios from authenticated;
