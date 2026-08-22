export abstract class CorreoRecuperacionPort {
  abstract enviarCodigoRecuperacion(
    correo: string,
    codigo: string,
  ): Promise<void>;
}
