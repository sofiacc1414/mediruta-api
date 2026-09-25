import { Injectable } from '@nestjs/common';
import { NotificacionRepositoryPort } from '../../domain/ports/notificacion.repository.port';

@Injectable()
export class RegistrarDispositivoPushUseCase {
  constructor(private readonly notificaciones: NotificacionRepositoryPort) {}

  execute(usuarioId: string, token: string, plataforma: string): Promise<void> {
    return this.notificaciones.registrarDispositivo(usuarioId, token, plataforma);
  }
}
