import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  AccessTokenClaims,
  AccessTokenPayload,
  AccessTokenPort,
} from '../../domain/ports/access-token.port';
import { esUuid } from '../auth/es-uuid';

@Injectable()
export class JwtAccessTokenAdapter extends AccessTokenPort {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync({
      sub: claims.sub,
      sid: claims.sid,
    });
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new NoAutorizadoError();
    }

    if (!esPayloadAccess(payload)) {
      throw new NoAutorizadoError();
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
    };
  }
}

function esPayloadAccess(payload: unknown): payload is AccessTokenPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidato = payload as Record<string, unknown>;
  return (
    typeof candidato.sub === 'string' &&
    typeof candidato.sid === 'string' &&
    esUuid(candidato.sub) &&
    esUuid(candidato.sid)
  );
}
