export type CrearSesionInput = {
  usuarioId: string;
  refreshTokenHash: string;
  expiraEn: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export type RotarSesionInput = {
  refreshTokenHashActual: string;
  nuevoRefreshTokenHash: string;
  nuevaExpiraEn: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export type RotarSesionResultado = {
  usuarioId: string;
  sid: string;
};

export abstract class SesionRepositoryPort {
  abstract crear(input: CrearSesionInput): Promise<string>;
  abstract rotar(input: RotarSesionInput): Promise<RotarSesionResultado | null>;
}
