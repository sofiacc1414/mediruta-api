export type CrearSesionInput = {
  usuarioId: string;
  refreshTokenHash: string;
  expiraEn: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export abstract class SesionRepositoryPort {
  abstract crear(input: CrearSesionInput): Promise<string>;
}
