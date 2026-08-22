import { Injectable } from '@nestjs/common';
import { CodigoRecuperacionPort } from '../../domain/ports/codigo-recuperacion.port';
import { CorreoRecuperacionPort } from '../../domain/ports/correo-recuperacion.port';
import { RecuperacionContrasenaRepositoryPort } from '../../domain/ports/recuperacion-contrasena.repository.port';

export const MENSAJE_RECUPERACION_SOLICITADA =
  'Si el correo está registrado, recibirás un código de recuperación.';

const OTP_TTL_MS = 10 * 60 * 1000;

export type SolicitarRecuperacionCommand = {
  correo: string;
};

export type SolicitarRecuperacionResultado = {
  message: string;
};

@Injectable()
export class SolicitarRecuperacionContrasenaUseCase {
  constructor(
    private readonly codigos: CodigoRecuperacionPort,
    private readonly recuperaciones: RecuperacionContrasenaRepositoryPort,
    private readonly correo: CorreoRecuperacionPort,
  ) {}

  async execute(
    command: SolicitarRecuperacionCommand,
  ): Promise<SolicitarRecuperacionResultado> {
    const correo = command.correo.trim().toLowerCase();
    const codigo = this.codigos.generarCodigo();
    const codigoHash = this.codigos.hashCodigo(codigo);
    const expiraEn = new Date(Date.now() + OTP_TTL_MS);

    const creada = await this.recuperaciones.crear({
      correo,
      codigoHash,
      expiraEn,
    });

    if (creada) {
      try {
        await this.correo.enviarCodigoRecuperacion(correo, codigo);
      } catch {
        // Un fallo de envío no debe distinguir si el correo existe.
      }
    }

    return { message: MENSAJE_RECUPERACION_SOLICITADA };
  }
}
