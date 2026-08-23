import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export type DesactivarCuentaCommand = {
  usuarioId: string;
  sid: string;
};

/**
 * G05 — desactiva la cuenta (nunca la borra, "conservar la información
 * para trazabilidad") y revoca todas las sesiones. La sesión actual
 * queda inválida al terminar esta llamada — el controller responde y el
 * cliente debe tratarlo como logout inmediato.
 */
@Injectable()
export class DesactivarCuentaUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(command: DesactivarCuentaCommand): Promise<void> {
    const desactivada = await this.perfiles.desactivarCuenta(
      command.usuarioId,
      command.sid,
    );
    if (!desactivada) {
      throw new NoAutorizadoError();
    }
  }
}
