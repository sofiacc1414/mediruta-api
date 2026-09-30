import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ListarNotificacionesUseCase } from './application/use-cases/listar-notificaciones.use-case';
import { MarcarNotificacionLeidaUseCase } from './application/use-cases/marcar-notificacion-leida.use-case';
import { NotificarCambioPedidoUseCase } from './application/use-cases/notificar-cambio-pedido.use-case';
import { NotificarValidacionCuentaUseCase } from './application/use-cases/notificar-validacion-cuenta.use-case';
import { RegistrarDispositivoPushUseCase } from './application/use-cases/registrar-dispositivo-push.use-case';
import { RegistrarNotificacionUseCase } from './application/use-cases/registrar-notificacion.use-case';
import { NotificacionRepositoryPort } from './domain/ports/notificacion.repository.port';
import { PushNotificacionPort } from './domain/ports/push-notificacion.port';
import { FcmPushAdapter } from './infrastructure/adapters/fcm-push.adapter';
import { PostgresNotificacionRepository } from './infrastructure/adapters/postgres-notificacion.repository';
import { NotificacionesController } from './infrastructure/controllers/notificaciones.controller';

@Module({
  imports: [UsuariosModule],
  controllers: [NotificacionesController],
  providers: [
    RegistrarNotificacionUseCase,
    NotificarCambioPedidoUseCase,
    NotificarValidacionCuentaUseCase,
    ListarNotificacionesUseCase,
    MarcarNotificacionLeidaUseCase,
    RegistrarDispositivoPushUseCase,
    {
      provide: NotificacionRepositoryPort,
      useClass: PostgresNotificacionRepository,
    },
    {
      provide: PushNotificacionPort,
      useClass: FcmPushAdapter,
    },
  ],
  exports: [
    NotificarCambioPedidoUseCase,
    NotificarValidacionCuentaUseCase,
    RegistrarNotificacionUseCase,
  ],
})
export class NotificacionesModule {}
