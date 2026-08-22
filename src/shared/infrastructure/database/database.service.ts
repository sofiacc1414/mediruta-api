import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

/**
 * Acceso directo a Postgres (no se usa el SDK de Supabase ni PostgREST).
 * Ver DOCS/context.md, Parte B, secciones 3 y 4.1.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({
      connectionString: this.config.getOrThrow<string>('DATABASE_URL'),
    });
  }

  /**
   * Ejecuta `callback` dentro de una transacción con la variable de sesión
   * `app.current_user_id` fijada, para que las políticas RLS identifiquen
   * al usuario autenticado vía `app.current_user_id()` (nunca `auth.uid()`,
   * que pertenece a Supabase Auth y no se usa en este proyecto).
   *
   * Uso típico dentro de un adaptador de infraestructura:
   *   return this.db.withUserContext(userId, (client) =>
   *     client.query('select * from solicitudes where paciente_id = $1', [userId]),
   *   );
   */
  async withUserContext<T>(
    userId: string,
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Para operaciones internas/administrativas sin usuario autenticado (usar con criterio). */
  async withoutUserContext<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
