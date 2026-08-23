-- HU-02 (G01/G03) — datos de perfil comunes a cualquier rol.
-- Ver context.md, Parte B — el perfil no vivía en usuarios hasta ahora
-- (ESQUEMA.md: "usuarios... No contiene información de perfil").
--
-- Nullable: se completan después del registro (HU-01 no los pide).
-- mediruta_app no gana SELECT/UPDATE directo sobre estas columnas — todo
-- el acceso pasa por app.obtener_perfil / app.actualizar_datos_comunes
-- (migración posterior), mismo patrón que password_hash.

alter table public.usuarios
  add column nombre_completo text,
  add column telefono text,
  add constraint usuarios_nombre_completo_no_vacio_check check (
    nombre_completo is null or length(btrim(nombre_completo)) > 0
  ),
  add constraint usuarios_telefono_no_vacio_check check (
    telefono is null or length(btrim(telefono)) > 0
  );
