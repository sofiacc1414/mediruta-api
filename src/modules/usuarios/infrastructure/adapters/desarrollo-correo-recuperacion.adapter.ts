import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorreoRecuperacionPort } from '../../domain/ports/correo-recuperacion.port';

@Injectable()
export class DesarrolloCorreoRecuperacionAdapter extends CorreoRecuperacionPort {
  private readonly nodeEnv: string;

  constructor(config: ConfigService) {
    super();
    this.nodeEnv = config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? '';
  }

  async enviarCodigoRecuperacion(
    correo: string,
    codigo: string,
  ): Promise<void> {
    // TODO: conectar proveedor real de correo (Resend/SMTP) antes de
    // considerar G05 completo. Este adaptador es solo para desarrollo local.
    if (this.nodeEnv === 'production') {
      throw new Error(
        'El proveedor de correo de recuperación no está configurado.',
      );
    }

    await Promise.resolve();
    process.stdout.write(
      `[mediruta-dev] código de recuperación para ${correo}: ${codigo}\n`,
    );
  }
}
