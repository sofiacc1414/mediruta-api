-- Solicitudes de recuperación de contraseña (HU-01). OTP de 6 dígitos.
-- Ver context.md, Parte B, sección 4.1.
--
-- Solo se persiste codigo_hash; nunca el OTP real ni una columna codigo.
-- El algoritmo de hash/HMAC y el pepper los define la API, no PostgreSQL.
-- No se usa Supabase Auth, auth.users, auth.uid() ni la recuperación de GoTrue.
-- RLS activo y FORCE, sin policies: App/Web no leen esta tabla.
-- Crear/validar/consumir recuperación lo hará la API (aún no en esta migración).

create table public.recuperaciones_contrasena (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  codigo_hash text not null,
  expira_en timestamptz not null,
  usado boolean not null default false,
  intentos integer not null default 0,
  creado_en timestamptz not null default now(),
  constraint recuperaciones_contrasena_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios (id) on delete cascade,
  constraint recuperaciones_contrasena_codigo_hash_no_vacio_check check (
    length(btrim(codigo_hash)) > 0
  ),
  constraint recuperaciones_contrasena_expira_en_posterior_check check (
    expira_en > creado_en
  ),
  constraint recuperaciones_contrasena_intentos_check check (
    intentos >= 0
  )
);

alter table public.recuperaciones_contrasena enable row level security;
alter table public.recuperaciones_contrasena force row level security;

-- PostgREST (anon / authenticated): esta tabla no se expone por la Data API.
-- No se hace REVOKE sobre el schema public ni sobre otras tablas.
-- No se crea mediruta_app ni GRANT a ese rol (migración posterior).
revoke all on table public.recuperaciones_contrasena from anon;
revoke all on table public.recuperaciones_contrasena from authenticated;
