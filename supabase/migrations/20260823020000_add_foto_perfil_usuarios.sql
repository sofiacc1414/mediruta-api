-- HU-02 — foto de perfil (avatar), común a cualquier rol (a diferencia
-- de foto_cedula_path/cedula_path, que son documentos de verificación
-- específicos de Paciente/Domiciliario). Vive en `usuarios` por el mismo
-- motivo que nombre_completo/telefono: aplica a la cuenta, no a un rol.
--
-- Solo el path dentro del bucket privado `perfiles` — nunca la imagen ni
-- una URL pública. mediruta_app no gana SELECT/UPDATE directo (mismo
-- patrón que password_hash/nombre_completo/telefono): todo el acceso
-- pasa por app.obtener_perfil / app.actualizar_foto_perfil.

alter table public.usuarios
  add column foto_perfil_path text,
  add constraint usuarios_foto_perfil_path_no_vacio_check check (
    foto_perfil_path is null or length(btrim(foto_perfil_path)) > 0
  );
