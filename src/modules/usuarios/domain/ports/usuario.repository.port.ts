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

export type CrearAdministradorInput = {
  correo: string;
  passwordHash: string;
  nombreCompleto?: string;
  telefono?: string;
};

/** Panel admin — "administrar usuarios creados": fila de la lista. */
export type AdministradorResumen = {
  id: string;
  correo: string;
  nombreCompleto: string | null;
  telefono: string | null;
  estadoCuenta: EstadoCuenta;
  creadoEn: string;
};

/** Panel admin — ficha de un administrador puntual. */
export type AdministradorDetalle = AdministradorResumen & {
  fotoPerfilPath: string | null;
};

export type ResultadoEnviarSolicitudDomiciliario =
  | { resultado: 'enviada' }
  | { resultado: 'incompleta'; faltantes: string[] }
  | { resultado: 'no_encontrada' };

export type EstadoCuenta = 'activa' | 'bloqueada' | 'desactivada';

export type CredencialesLogin = {
  usuarioId: string;
  correo: string;
  passwordHash: string;
  estadoCuenta: EstadoCuenta;
};

export type CodigoRol = 'PACIENTE' | 'DOMICILIARIO' | 'ADMINISTRADOR' | 'ROOT';

/** `borrador` — solo DOMICILIARIO: rol ya otorgado pero la solicitud de
 * validación todavía no se envió (invisible para el admin hasta
 * `enviar_solicitud_domiciliario`). PACIENTE nunca pasa por `borrador`
 * ni por `pendiente_validacion` — se otorga directo en `habilitado`. */
export type EstadoRol =
  | 'borrador'
  | 'habilitado'
  | 'pendiente_validacion'
  | 'rechazado';

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

  /** Agrega el rol DOMICILIARIO en `borrador` a una cuenta que todavía
   * no lo tiene — invisible para el admin hasta que se envíe la
   * solicitud con `enviarSolicitudDomiciliario`. */
  abstract solicitarRolDomiciliario(
    usuarioId: string,
  ): Promise<ResultadoSolicitarRol>;

  /** G01 — envía la solicitud de validación: `borrador` ->
   * `pendiente_validacion`. Exige los mismos 7 campos obligatorios que
   * ya exigía `aprobar_domiciliario` (HU-08) — ahora se piden antes, al
   * enviar, no recién cuando el admin intenta aprobar. */
  abstract enviarSolicitudDomiciliario(
    usuarioId: string,
  ): Promise<ResultadoEnviarSolicitudDomiciliario>;

  /** Solo ROOT — crea una cuenta ADMINISTRADOR directa (habilitada de
   * una, sin pasar por registro público ni validación). */
  abstract crearAdministrador(input: CrearAdministradorInput): Promise<string>;

  /** Panel admin — "administrar usuarios creados", más recientes
   * primero. Visible para Administrador/Root (crear sigue siendo solo
   * ROOT). */
  abstract listarAdministradores(adminId: string): Promise<AdministradorResumen[]>;

  abstract obtenerAdministrador(
    adminId: string,
    usuarioId: string,
  ): Promise<AdministradorDetalle | null>;
}
