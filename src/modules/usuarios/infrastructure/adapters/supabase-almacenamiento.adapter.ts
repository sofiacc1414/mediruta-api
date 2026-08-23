import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';

/**
 * Adaptador de Supabase Storage — HU-02. Usa la service role key
 * (bypassea RLS, igual que DATABASE_URL es la conexión administrativa a
 * Postgres). App/Web nunca reciben esta key ni hablan con Storage
 * directamente; la API sube el archivo y devuelve URLs firmadas de
 * corta duración. No se usa Supabase Auth en ningún punto (solo Storage).
 */
@Injectable()
export class SupabaseAlmacenamientoAdapter extends AlmacenamientoArchivosPort {
  private readonly client: ReturnType<typeof createClient>;

  constructor(config: ConfigService) {
    super();
    const url = config.get<string>('SUPABASE_URL');
    if (!url) {
      throw new Error('Falta la variable de entorno SUPABASE_URL.');
    }

    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error(
        'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, contenido, { contentType, upsert: true });

    if (error) {
      throw new Error(`No fue posible subir el archivo: ${error.message}`);
    }

    return path;
  }

  async obtenerUrlFirmada(
    bucket: string,
    path: string,
    expiraSegundos: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiraSegundos);

    if (error || !data) {
      throw new Error(
        `No fue posible generar la URL firmada: ${error?.message ?? 'sin datos'}`,
      );
    }

    return data.signedUrl;
  }
}
