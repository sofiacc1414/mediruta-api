import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import {
  RefreshTokenGenerado,
  RefreshTokenPort,
} from '../../domain/ports/refresh-token.port';
import { parsearDuracion } from './parsear-duracion';

@Injectable()
export class CryptoRefreshTokenAdapter extends RefreshTokenPort {
  private readonly refreshSecret: string;
  private readonly ttlMs: number;

  constructor(config: ConfigService) {
    super();
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('Falta la variable de entorno JWT_REFRESH_SECRET.');
    }

    const expiraEn = config.get<string>('JWT_REFRESH_EXPIRES_IN');
    if (!expiraEn) {
      throw new Error('Falta la variable de entorno JWT_REFRESH_EXPIRES_IN.');
    }

    this.refreshSecret = secret;
    this.ttlMs = parsearDuracion(expiraEn, 'JWT_REFRESH_EXPIRES_IN');
  }

  generar(): RefreshTokenGenerado {
    const token = randomBytes(48).toString('base64url');
    const hash = createHmac('sha256', this.refreshSecret)
      .update(token)
      .digest('hex');

    return {
      token,
      hash,
      expiraEn: new Date(Date.now() + this.ttlMs),
    };
  }
}
