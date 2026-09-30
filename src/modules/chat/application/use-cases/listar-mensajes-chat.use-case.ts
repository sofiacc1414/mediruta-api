import { Injectable } from '@nestjs/common';
import { ChatRepositoryPort, MensajeChat } from '../../domain/ports/chat.repository.port';

/** El controller/gateway llama primero a `ObtenerChatPedidoUseCase`
 * (valida ownership y arma el `chatId`) — este caso de uso solo lista,
 * asume que `chatId` ya es válido para `usuarioId`. */
@Injectable()
export class ListarMensajesChatUseCase {
  constructor(private readonly chats: ChatRepositoryPort) {}

  execute(usuarioId: string, chatId: string): Promise<MensajeChat[]> {
    return this.chats.listarMensajes(usuarioId, chatId);
  }
}
