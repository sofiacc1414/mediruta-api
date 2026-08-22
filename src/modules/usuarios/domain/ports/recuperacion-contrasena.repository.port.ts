export type CrearRecuperacionInput = {
  correo: string;
  codigoHash: string;
  expiraEn: Date;
};

export type RestablecerRecuperacionInput = {
  correo: string;
  codigoHash: string;
  nuevoPasswordHash: string;
};

export abstract class RecuperacionContrasenaRepositoryPort {
  abstract crear(input: CrearRecuperacionInput): Promise<boolean>;
  abstract restablecer(input: RestablecerRecuperacionInput): Promise<boolean>;
}
