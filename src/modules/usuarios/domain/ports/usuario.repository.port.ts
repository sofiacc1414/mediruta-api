import { TipoRegistro } from '../value-objects/tipo-registro';

export type RegistrarUsuarioInput = {
  correo: string;
  passwordHash: string;
  tipoRegistro: TipoRegistro;
};

export type EstadoCuenta = 'activa' | 'bloqueada' | 'desactivada';

export type CredencialesLogin = {
  usuarioId: string;
  correo: string;
  passwordHash: string;
  estadoCuenta: EstadoCuenta;
};

export type CodigoRol = 'PACIENTE' | 'DOMICILIARIO' | 'ADMINISTRADOR' | 'ROOT';

export type EstadoRol = 'habilitado' | 'pendiente_validacion' | 'rechazado';

export type UsuarioRol = {
  codigo: CodigoRol;
  estado: EstadoRol;
};

export type CuentaActual = {
  id: string;
  correo: string;
  estadoCuenta: EstadoCuenta;
};

export abstract class UsuarioRepositoryPort {
  abstract registrar(input: RegistrarUsuarioInput): Promise<string>;
  abstract obtenerCredencialesLogin(
    correo: string,
  ): Promise<CredencialesLogin | null>;
  abstract obtenerCuentaActual(usuarioId: string): Promise<CuentaActual | null>;
  abstract obtenerRoles(usuarioId: string): Promise<UsuarioRol[]>;
}
