import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EnviarMensajeChatUseCase } from './application/use-cases/enviar-mensaje-chat.use-case';
import { ListarMensajesChatAdminUseCase } from './application/use-cases/listar-mensajes-chat-admin.use-case';
import { ListarMensajesChatUseCase } from './application/use-cases/listar-mensajes-chat.use-case';
import { MarcarMensajesLeidosChatUseCase } from './application/use-cases/marcar-mensajes-leidos-chat.use-case';
import { ObtenerChatPedidoUseCase } from './application/use-cases/obtener-chat-pedido.use-case';
import { ChatRepositoryPort } from './domain/ports/chat.repository.port';
import { PostgresChatRepository } from './infrastructure/adapters/postgres-chat.repository';
import { ChatAdminController } from './infrastructure/controllers/chat-admin.controller';
import { ChatController } from './infrastructure/controllers/chat.controller';
import { ChatGateway } from './infrastructure/websockets/chat.gateway';

/** Chat en tiempo real Paciente↔Domiciliario por pedido, con
 * auditoría de solo-lectura para el Admin. Importa `UsuariosModule`
 * (guards/`AccessAuthGuard`, y `AccessTokenPort`/`SesionRepositoryPort`
 * para el gateway) y `NotificacionesModule` (para avisar por push
 * cuando llega un mensaje nuevo). No importa `SolicitudesModule` — el
 * ownership de un chat se valida contra `public.solicitudes` directo
 * desde las funciones SQL (`app.obtener_o_crear_chat_pedido`, etc.),
 * sin pasar por `SolicitudRepositoryPort` — evita un acoplamiento
 * entre módulos que no hace falta. */
@Module({
  imports: [UsuariosModule, NotificacionesModule],
  controllers: [ChatController, ChatAdminController],
  providers: [
    ObtenerChatPedidoUseCase,
    EnviarMensajeChatUseCase,
    ListarMensajesChatUseCase,
    MarcarMensajesLeidosChatUseCase,
    ListarMensajesChatAdminUseCase,
    ChatGateway,
    {
      provide: ChatRepositoryPort,
      useClass: PostgresChatRepository,
    },
  ],
})
export class ChatModule {}
