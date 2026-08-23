-- HU-02 — perfil específico del rol PACIENTE (dirección de entrega,
-- fecha de nacimiento, foto de cédula). Un usuario puede tener a la vez
-- perfil_paciente y perfil_domiciliario (modelo multirrol, context.md
-- Parte B sección 4.1) — por eso es tabla aparte de usuarios, no columnas
-- ahí: un Domiciliario que también es Paciente necesita ambos juegos de
-- datos simultáneamente, no uno u otro.
--
-- foto_cedula_path es solo la ruta dentro del bucket privado `perfiles`
-- de Supabase Storage (migración posterior) — nunca la imagen ni una URL
-- pública. La API genera URLs firmadas de corta duración cuando hace falta
-- mostrarla.
--
-- RLS activo y FORCE, sin policies: mismo patrón que sesiones/
-- recuperaciones_contrasena — todo el acceso pasa por funciones app.*
-- (migración posterior), nunca DML directo de mediruta_app.

create table public.perfil_paciente (
  usuario_id uuid primary key
    references public.usuarios (id) on delete cascade,
  direccion text,
  fecha_nacimiento date,
  foto_cedula_path text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint perfil_paciente_direccion_no_vacia_check check (
    direccion is null or length(btrim(direccion)) > 0
  ),
  constraint perfil_paciente_fecha_nacimiento_pasada_check check (
    fecha_nacimiento is null or fecha_nacimiento < current_date
  )
);

alter table public.perfil_paciente enable row level security;
alter table public.perfil_paciente force row level security;

revoke all on table public.perfil_paciente from anon;
revoke all on table public.perfil_paciente from authenticated;
