import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { SolicitudNoEncontradaError } from '../../../solicitudes/domain/errors/solicitud-no-encontrada.error';
import { ChatSinDomiciliarioAsignadoError } from '../../domain/errors/chat-sin-domiciliario-asignado.error';
import {
  ChatPedido,
  ChatRepositoryPort,
} from '../../domain/ports/chat.repository.port';

/** El Paciente o Domiciliario entra al chat de su pedido — lo crea la
 * primera vez que alguno de los dos lo abre. Reusado también por
 * `ChatGateway` al unirse a la room, para validar ownership antes de
 * dejar entrar al socket. */
@Injectable()
export class ObtenerChatPedidoUseCase {
  constructor(private readonly chats: ChatRepositoryPort) {}

  async execute(usuarioId: string, solicitudId: string): Promise<ChatPedido> {
    const resultado = await this.chats.obtenerOCrearChat(usuarioId, solicitudId);
    switch (resultado.resultado) {
      case 'ok':
        return resultado.chat;
      case 'pedido_no_encontrado':
        throw new SolicitudNoEncontradaError();
      case 'sin_domiciliario_asignado':
        throw new ChatSinDomiciliarioAsignadoError();
      case 'no_autorizado':
        throw new NoAutorizadoError();
    }
  }
}
