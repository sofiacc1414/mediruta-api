import { Injectable } from '@nestjs/common';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';

export type CerrarSesionCommand = {
  usuarioId: string;
  sid: string;
};

@Injectable()
export class CerrarSesionUseCase {
  constructor(private readonly sesiones: SesionRepositoryPort) {}

  async execute(command: CerrarSesionCommand): Promise<void> {
    await this.sesiones.revocar({
      usuarioId: command.usuarioId,
      sid: command.sid,
    });
  }
}
