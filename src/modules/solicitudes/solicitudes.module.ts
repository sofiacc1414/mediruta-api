import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ActualizarSolicitudUseCase } from './application/use-cases/actualizar-solicitud.use-case';
import { CancelarSolicitudUseCase } from './application/use-cases/cancelar-solicitud.use-case';
import { CrearSolicitudUseCase } from './application/use-cases/crear-solicitud.use-case';
import { EnviarSolicitudUseCase } from './application/use-cases/enviar-solicitud.use-case';
import { ListarSolicitudesUseCase } from './application/use-cases/listar-solicitudes.use-case';
import { ObtenerSolicitudUseCase } from './application/use-cases/obtener-solicitud.use-case';
import { SubirRecetaUseCase } from './application/use-cases/subir-receta.use-case';
import { SolicitudRepositoryPort } from './domain/ports/solicitud.repository.port';
import { PostgresSolicitudRepository } from './infrastructure/adapters/postgres-solicitud.repository';
import { SolicitudesController } from './infrastructure/controllers/solicitudes.controller';

/** HU-03 — casos de uso del Paciente sobre sus propias solicitudes.
 * Importa UsuariosModule para reutilizar AccessAuthGuard/RolesGuard
 * (@Roles('PACIENTE'), mismo mecanismo construido en HU-08). */
@Module({
  imports: [UsuariosModule],
  controllers: [SolicitudesController],
  providers: [
    CrearSolicitudUseCase,
    ListarSolicitudesUseCase,
    ObtenerSolicitudUseCase,
    ActualizarSolicitudUseCase,
    SubirRecetaUseCase,
    EnviarSolicitudUseCase,
    CancelarSolicitudUseCase,
    {
      provide: SolicitudRepositoryPort,
      useClass: PostgresSolicitudRepository,
    },
  ],
})
export class SolicitudesModule {}
