-- Sesiones propias de MediRuta (HU-01). Autenticación JWT + refresh opaco.
-- Ver context.md, Parte B, sección 4.1.
--
-- sesiones.id es el claim sid del access token.
-- Solo se persiste refresh_token_hash; nunca el refresh token original.
-- No se usa Supabase Auth, auth.users ni auth.uid().
-- RLS activo y FORCE, sin policies: App/Web no leen esta tabla.
-- Crear/validar/rotar/revocar sesión lo hará la API (migración posterior).

create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  refresh_token_hash text not null,
  revocada boolean not null default false,
  expira_en timestamptz not null,
  user_agent text,
  ip inet,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint sesiones_usuario_id_fkey
    foreign key (usuario_id) references public.usuarios (id) on delete cascade,
  constraint sesiones_refresh_token_hash_key unique (refresh_token_hash),
  constraint sesiones_refresh_token_hash_no_vacio_check check (
    length(btrim(refresh_token_hash)) > 0
  ),
  constraint sesiones_expira_en_posterior_check check (
    expira_en > creado_en
  )
);

alter table public.sesiones enable row level security;
alter table public.sesiones force row level security;

-- PostgREST (anon / authenticated): esta tabla no se expone por la Data API.
-- No se hace REVOKE sobre el schema public ni sobre otras tablas.
-- No se crea mediruta_app ni GRANT a ese rol (migración posterior).
revoke all on table public.sesiones from anon;
revoke all on table public.sesiones from authenticated;
