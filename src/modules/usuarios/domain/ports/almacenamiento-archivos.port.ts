/**
 * Puerto de almacenamiento de archivos (Supabase Storage, bucket
 * privado `perfiles` — HU-02). El dominio no sabe que existe Supabase;
 * solo conoce este contrato. Nunca recibe/expone URLs públicas, solo
 * paths internos y URLs firmadas de corta duración.
 */
export abstract class AlmacenamientoArchivosPort {
  abstract subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string>;

  abstract obtenerUrlFirmada(
    bucket: string,
    path: string,
    expiraSegundos: number,
  ): Promise<string>;
}
