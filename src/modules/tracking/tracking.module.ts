import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ActualizarPosicionEnVivoUseCase } from './application/use-cases/actualizar-posicion-en-vivo.use-case';
import { ObtenerPosicionEnVivoUseCase } from './application/use-cases/obtener-posicion-en-vivo.use-case';
import { TrackingRepositoryPort } from './domain/ports/tracking.repository.port';
import { PostgresTrackingRepository } from './infrastructure/adapters/postgres-tracking.repository';
import { TrackingGateway } from './infrastructure/websockets/tracking.gateway';

/** Seguimiento GPS en vivo — solo WebSocket, sin controller REST (todo
 * pasa por `tracking:suscribir`/`tracking:enviar_posicion`, ver
 * `TrackingGateway`). Importa `UsuariosModule` por `AccessTokenPort`/
 * `SesionRepositoryPort`, igual que el resto de los gateways. */
@Module({
  imports: [UsuariosModule],
  providers: [
    ObtenerPosicionEnVivoUseCase,
    ActualizarPosicionEnVivoUseCase,
    TrackingGateway,
    {
      provide: TrackingRepositoryPort,
      useClass: PostgresTrackingRepository,
    },
  ],
})
export class TrackingModule {}
