import { Injectable, Logger } from '@nestjs/common';
import {
  contenidoCuentaAprobada,
  contenidoCuentaRechazada,
} from '../../domain/contenido-notificacion';
import { RegistrarNotificacionUseCase } from './registrar-notificacion.use-case';

export type DecisionCuenta = 'aprobada' | 'rechazada';

/** G03 — el admin aprueba o rechaza el registro del domiciliario. */
@Injectable()
export class NotificarValidacionCuentaUseCase {
  private readonly logger = new Logger(NotificarValidacionCuentaUseCase.name);

  constructor(private readonly registrar: RegistrarNotificacionUseCase) {}

  async execute(usuarioId: string, decision: DecisionCuenta): Promise<void> {
    try {
      const contenido =
        decision === 'aprobada'
          ? contenidoCuentaAprobada()
          : contenidoCuentaRechazada();
      await this.registrar.execute({
        destinatarioId: usuarioId,
        tipo: 'validacion_cuenta',
        titulo: contenido.titulo,
        mensaje: contenido.mensaje,
        referenciaTipo: 'cuenta',
        referenciaId: usuarioId,
        claveEvento: `cuenta:${usuarioId}:${decision}`,
      });
    } catch (error) {
      this.logger.warn(
        `No se notificó la cuenta ${usuarioId}: ${(error as Error).message}`,
      );
    }
  }
}
