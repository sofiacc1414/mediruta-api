export abstract class CambioContrasenaRepositoryPort {
  abstract obtenerPasswordHash(
    usuarioId: string,
    sid: string,
  ): Promise<string | null>;

  abstract cambiar(
    usuarioId: string,
    sid: string,
    passwordHashActualEsperado: string,
    nuevoPasswordHash: string,
  ): Promise<boolean>;
}
