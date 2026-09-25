import { Injectable } from '@nestjs/common';
import {
  NotificacionGuardada,
  NotificacionRepositoryPort,
} from '../../domain/ports/notificacion.repository.port';

@Injectable()
export class ListarNotificacionesUseCase {
  constructor(private readonly notificaciones: NotificacionRepositoryPort) {}

  execute(usuarioId: string): Promise<NotificacionGuardada[]> {
    return this.notificaciones.listar(usuarioId);
  }
}
