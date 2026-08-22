import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global para que cualquier módulo de entidad (usuarios, solicitudes, ...)
 * pueda inyectar DatabaseService sin re-importar este módulo cada vez.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
