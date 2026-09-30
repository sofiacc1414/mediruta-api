import { Injectable } from '@nestjs/common';
import { ChatRepositoryPort, MensajeChat } from '../../domain/ports/chat.repository.port';

/** Auditoría del Admin — solo lectura, sin restricción de ownership
 * (el controller ya exige rol admin vía `@Roles`). */
@Injectable()
export class ListarMensajesChatAdminUseCase {
  constructor(private readonly chats: ChatRepositoryPort) {}

  execute(adminId: string, solicitudId: string): Promise<MensajeChat[]> {
    return this.chats.listarMensajesAdmin(adminId, solicitudId);
  }
}
