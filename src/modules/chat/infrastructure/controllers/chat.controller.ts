import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { EnviarMensajeChatUseCase } from '../../application/use-cases/enviar-mensaje-chat.use-case';
import { ListarMensajesChatUseCase } from '../../application/use-cases/listar-mensajes-chat.use-case';
import { MarcarMensajesLeidosChatUseCase } from '../../application/use-cases/marcar-mensajes-leidos-chat.use-case';
import { ObtenerChatPedidoUseCase } from '../../application/use-cases/obtener-chat-pedido.use-case';
import { EnviarMensajeChatDto } from '../dtos/enviar-mensaje-chat.dto';

/** REST — histórico y envío por request normal (además del envío por
 * WebSocket, ver `ChatGateway`; ambos caminos pasan por el mismo
 * `EnviarMensajeChatUseCase`, así que quedan consistentes). Solo
 * Paciente/Domiciliario dueños del pedido — la auditoría del Admin
 * vive en `ChatAdminController`. */
@Controller('chat')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard)
export class ChatController {
  constructor(
    private readonly obtenerChat: ObtenerChatPedidoUseCase,
    private readonly listarMensajes: ListarMensajesChatUseCase,
    private readonly enviarMensaje: EnviarMensajeChatUseCase,
    private readonly marcarLeidos: MarcarMensajesLeidosChatUseCase,
  ) {}

  @Get('pedido/:solicitudId')
  @HttpCode(HttpStatus.OK)
  async obtener(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('solicitudId', ParseUUIDPipe) solicitudId: string,
  ) {
    const chat = await this.obtenerChat.execute(identidad.usuarioId, solicitudId);
    const mensajes = await this.listarMensajes.execute(
      identidad.usuarioId,
      chat.chatId,
    );
    return {
      chatId: chat.chatId,
      soloLectura: chat.soloLectura,
      mensajes,
    };
  }

  @Post(':chatId/mensajes')
  @HttpCode(HttpStatus.CREATED)
  enviar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() dto: EnviarMensajeChatDto,
  ) {
    return this.enviarMensaje.execute(identidad.usuarioId, chatId, dto.contenido);
  }

  @Post(':chatId/marcar-leido')
  @HttpCode(HttpStatus.OK)
  async marcarLeido(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    await this.marcarLeidos.execute(identidad.usuarioId, chatId);
    return { marcado: true };
  }
}
