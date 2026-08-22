export type AccessTokenClaims = {
  sub: string;
  sid: string;
};

export type AccessTokenPayload = {
  sub: string;
  sid: string;
};

export abstract class AccessTokenPort {
  abstract sign(claims: AccessTokenClaims): Promise<string>;
  abstract verify(token: string): Promise<AccessTokenPayload>;
}
