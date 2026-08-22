export abstract class CodigoRecuperacionPort {
  abstract generarCodigo(): string;
  abstract hashCodigo(codigo: string): string;
}
