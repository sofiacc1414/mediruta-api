import { Injectable } from '@nestjs/common';
import { NotificacionRepositoryPort } from '../../domain/ports/notificacion.repository.port';

@Injectable()
export class MarcarNotificacionLeidaUseCase {
  constructor(private readonly notificaciones: NotificacionRepositoryPort) {}

  execute(usuarioId: string, notificacionId: string): Promise<boolean> {
    return this.notificaciones.marcarLeida(usuarioId, notificacionId);
  }
}
