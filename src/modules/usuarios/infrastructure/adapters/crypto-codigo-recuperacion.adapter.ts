import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'node:crypto';
import { CodigoRecuperacionPort } from '../../domain/ports/codigo-recuperacion.port';

const OTP_RANGO = 1_000_000;

@Injectable()
export class CryptoCodigoRecuperacionAdapter extends CodigoRecuperacionPort {
  private readonly pepper: string;

  constructor(config: ConfigService) {
    super();
    const pepper = config.get<string>('PASSWORD_RECOVERY_PEPPER');
    if (!pepper) {
      throw new Error('Falta la variable de entorno PASSWORD_RECOVERY_PEPPER.');
    }
    this.pepper = pepper;
  }

  generarCodigo(): string {
    return String(randomInt(0, OTP_RANGO)).padStart(6, '0');
  }

  hashCodigo(codigo: string): string {
    return createHmac('sha256', this.pepper).update(codigo).digest('hex');
  }
}
