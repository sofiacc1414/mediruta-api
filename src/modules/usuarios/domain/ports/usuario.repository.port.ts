import { TipoRegistro } from '../value-objects/tipo-registro';

export type RegistrarUsuarioInput = {
  correo: string;
  passwordHash: string;
  tipoRegistro: TipoRegistro;
};

export abstract class UsuarioRepositoryPort {
  abstract registrar(input: RegistrarUsuarioInput): Promise<string>;
}
