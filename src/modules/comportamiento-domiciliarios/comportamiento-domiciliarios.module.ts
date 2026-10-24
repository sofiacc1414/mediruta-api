import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ListarResumenComportamientoAdminUseCase } from './application/use-cases/listar-resumen-comportamiento-admin.use-case';
import { ObtenerDetalleComportamientoAdminUseCase } from './application/use-cases/obtener-detalle-comportamiento-admin.use-case';
import { ComportamientoDomiciliarioRepositoryPort } from './domain/ports/comportamiento-domiciliario.repository.port';
import { PostgresComportamientoDomiciliarioRepository } from './infrastructure/adapters/postgres-comportamiento-domiciliario.repository';
import { ComportamientoDomiciliariosAdminController } from './infrastructure/controllers/comportamiento-domiciliarios-admin.controller';

/** G01-G05 — supervisión de comportamiento operativo de domiciliarios
 * desde el panel admin. Solo lectura: el bloqueo/reactivación de la
 * cuenta (G04) lo sigue resolviendo `UsuariosModule`, este módulo solo
 * agrega las métricas que informan esa decisión. */
@Module({
  imports: [UsuariosModule],
  controllers: [ComportamientoDomiciliariosAdminController],
  providers: [
    ListarResumenComportamientoAdminUseCase,
    ObtenerDetalleComportamientoAdminUseCase,
    {
      provide: ComportamientoDomiciliarioRepositoryPort,
      useClass: PostgresComportamientoDomiciliarioRepository,
    },
  ],
})
export class ComportamientoDomiciliariosModule {}
