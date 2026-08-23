-- HU-02 — perfil específico del rol DOMICILIARIO (dirección, datos de
-- vehículo, documentos de validación). Esta es la misma tabla que
-- HU-08 (Validación de domiciliarios, futura) usará para revisar/aprobar
-- — HU-02 la crea y el propio Domiciliario sube aquí sus documentos;
-- HU-08 agrega el flujo de aprobación del administrador sobre estas
-- mismas filas, no una tabla paralela.
--
-- cedula_path/licencia_path/soat_path/tecnicomecanica_path son solo
-- rutas dentro del bucket privado `perfiles` de Supabase Storage
-- (migración posterior) — nunca las imágenes ni URLs públicas.
--
-- RLS activo y FORCE, sin policies (mismo patrón que perfil_paciente):
-- todo el acceso pasa por funciones app.* (migración posterior).

create table public.perfil_domiciliario (
  usuario_id uuid primary key
    references public.usuarios (id) on delete cascade,
  direccion text,
  vehiculo_tipo text,
  vehiculo_placa text,
  cedula_path text,
  licencia_path text,
  soat_path text,
  tecnicomecanica_path text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint perfil_domiciliario_direccion_no_vacia_check check (
    direccion is null or length(btrim(direccion)) > 0
  ),
  constraint perfil_domiciliario_vehiculo_tipo_no_vacio_check check (
    vehiculo_tipo is null or length(btrim(vehiculo_tipo)) > 0
  ),
  constraint perfil_domiciliario_vehiculo_placa_no_vacia_check check (
    vehiculo_placa is null or length(btrim(vehiculo_placa)) > 0
  )
);

alter table public.perfil_domiciliario enable row level security;
alter table public.perfil_domiciliario force row level security;

revoke all on table public.perfil_domiciliario from anon;
revoke all on table public.perfil_domiciliario from authenticated;
