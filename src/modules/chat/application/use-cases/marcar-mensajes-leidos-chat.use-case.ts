import { Injectable } from '@nestjs/common';
import { ChatRepositoryPort } from '../../domain/ports/chat.repository.port';

@Injectable()
export class MarcarMensajesLeidosChatUseCase {
  constructor(private readonly chats: ChatRepositoryPort) {}

  execute(usuarioId: string, chatId: string): Promise<void> {
    return this.chats.marcarMensajesLeidos(usuarioId, chatId);
  }
}
