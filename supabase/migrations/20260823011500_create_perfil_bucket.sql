-- HU-02 — bucket privado de Supabase Storage para fotos/documentos de
-- perfil (cédula de paciente; cédula/licencia/SOAT/tecnicomecánica de
-- domiciliario). Ver context.md, Parte B, sección 3: "Almacenamiento de
-- archivos: Supabase Storage. Buckets con políticas de acceso
-- equivalentes a RLS".
--
-- `public = false`: privado. Sin políticas sobre storage.objects a
-- propósito — la API es la única que toca este bucket, con la service
-- role key (igual que DATABASE_URL es la conexión administrativa a
-- Postgres). App/Web nunca hablan con Supabase Storage directamente;
-- la API sube el archivo y devuelve URLs firmadas de corta duración
-- cuando hace falta mostrarlo.

insert into storage.buckets (id, name, public)
values ('perfiles', 'perfiles', false)
on conflict (id) do nothing;
