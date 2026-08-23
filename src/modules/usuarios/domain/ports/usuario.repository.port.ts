import { TipoRegistro } from '../value-objects/tipo-registro';

export type RegistrarUsuarioInput = {
  correo: string;
  passwordHash: string;
  tipoRegistro: TipoRegistro;
  /** Solo aplica si `tipoRegistro === DOMICILIARIO` — si el registro es
   * como PACIENTE, ese rol se otorga siempre (es el propio rol
   * elegido). Default `true` a nivel SQL, pero la API siempre lo manda
   * explícito (default `false` en el DTO — opt-in, no automático). */
  altaPaciente?: boolean;
};

export type ResultadoSolicitarRol = 'agregado' | 'ya_lo_tenia';

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

  /** Agrega el rol PACIENTE a una cuenta que todavía no lo tiene — sin
   * validación (mismo criterio que un registro directo como PACIENTE). */
  abstract solicitarRolPaciente(usuarioId: string): Promise<ResultadoSolicitarRol>;

  /** Agrega el rol DOMICILIARIO en `pendiente_validacion` a una cuenta
   * que todavía no lo tiene. De ahí en más usa el flujo ya existente de
   * completar perfil (HU-02) y aprobación del admin (HU-08). */
  abstract solicitarRolDomiciliario(
    usuarioId: string,
  ): Promise<ResultadoSolicitarRol>;
}
