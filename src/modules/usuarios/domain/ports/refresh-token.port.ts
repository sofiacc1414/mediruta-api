export type RefreshTokenGenerado = {
  token: string;
  hash: string;
  expiraEn: Date;
};

export abstract class RefreshTokenPort {
  abstract generar(): RefreshTokenGenerado;
}
