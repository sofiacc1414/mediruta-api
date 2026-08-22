import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenClaims,
  AccessTokenPort,
} from '../../domain/ports/access-token.port';

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
}
