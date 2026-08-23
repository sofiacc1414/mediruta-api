import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AprobarDomiciliarioUseCase } from './application/use-cases/aprobar-domiciliario.use-case';
import { ListarDomiciliariosPendientesUseCase } from './application/use-cases/listar-domiciliarios-pendientes.use-case';
import { ObtenerDetalleDomiciliarioUseCase } from './application/use-cases/obtener-detalle-domiciliario.use-case';
import { RechazarDomiciliarioUseCase } from './application/use-cases/rechazar-domiciliario.use-case';
import { ValidacionDomiciliarioRepositoryPort } from './domain/ports/validacion-domiciliario.repository.port';
import { PostgresValidacionDomiciliarioRepository } from './infrastructure/adapters/postgres-validacion-domiciliario.repository';
import { DomiciliariosAdminController } from './infrastructure/controllers/domiciliarios-admin.controller';

/** HU-08 — casos de uso del Administrador sobre cuentas Domiciliario
 * (validación), separado de `UsuariosModule` (que es sobre la propia
 * cuenta autenticada). Reutiliza de `UsuariosModule`: AccessAuthGuard,
 * RolesGuard (necesita UsuarioRepositoryPort), AlmacenamientoArchivosPort
 * (URLs firmadas de los documentos que ya sube HU-02). */
@Module({
  imports: [UsuariosModule],
  controllers: [DomiciliariosAdminController],
  providers: [
    ListarDomiciliariosPendientesUseCase,
    ObtenerDetalleDomiciliarioUseCase,
    AprobarDomiciliarioUseCase,
    RechazarDomiciliarioUseCase,
    {
      provide: ValidacionDomiciliarioRepositoryPort,
      useClass: PostgresValidacionDomiciliarioRepository,
    },
  ],
})
export class DomiciliariosModule {}
