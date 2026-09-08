export type DomiciliarioPendiente = {
  usuarioId: string;
  nombreCompleto: string | null;
  telefono: string | null;
  solicitadoEn: string;
};

/** Ronda 9 — estado por el que se puede filtrar el listado de
 * domiciliarios del admin. 'todos' incluye pendientes/habilitados/
 * rechazados (nunca 'borrador' — el domiciliario ni siquiera envió su
 * solicitud, no es un caso que el admin deba ver). */
export type EstadoDomiciliarioAdmin =
  | 'pendiente_validacion'
  | 'habilitado'
  | 'rechazado'
  | 'todos';

/** Ronda 9 — una fila del listado general (a diferencia de
 * `DomiciliarioPendiente`, cualquier estado, no solo pendiente). */
export type DomiciliarioAdmin = {
  usuarioId: string;
  nombreCompleto: string | null;
  correo: string;
  telefono: string | null;
  estado: 'pendiente_validacion' | 'habilitado' | 'rechazado';
  solicitadoEn: string;
  actualizadoEn: string;
};

export type PerfilDomiciliarioValidacion = {
  nombreCompleto: string | null;
  telefono: string | null;
  estado: 'pendiente_validacion' | 'habilitado' | 'rechazado';
  solicitadoEn: string;
  direccion: string | null;
  vehiculoTipo: string | null;
  vehiculoPlaca: string | null;
  cedulaFrentePath: string | null;
  cedulaReversoPath: string | null;
  licenciaPath: string | null;
  soatPath: string | null;
  tecnicomecanicaPath: string | null;
};

export type ValidacionHistorial = {
  decision: 'aprobado' | 'rechazado';
  motivo: string | null;
  creadoEn: string;
  adminCorreo: string;
};

export type ResultadoAprobar =
  | { resultado: 'aprobado' }
  | { resultado: 'incompleto'; faltantes: string[] }
  | { resultado: 'no_encontrado' }
  | { resultado: 'no_autorizado' };

export type ResultadoRechazar = 'rechazado' | 'no_encontrado' | 'no_autorizado';

/** G01-G06 — el admin consulta y decide sobre domiciliarios pendientes
 * de validación. Los documentos siguen viviendo en perfil_domiciliario
 * (HU-02); este puerto no los duplica, solo agrega la decisión. */
export abstract class ValidacionDomiciliarioRepositoryPort {
  abstract listarPendientes(adminId: string): Promise<DomiciliarioPendiente[]>;

  /** Ronda 9 — listado general con filtro de estado (default:
   * pendientes, mismo comportamiento histórico si no se manda nada). */
  abstract listarAdmin(
    adminId: string,
    estado?: EstadoDomiciliarioAdmin,
  ): Promise<DomiciliarioAdmin[]>;

  abstract obtenerDetalle(
    adminId: string,
    domiciliarioId: string,
  ): Promise<PerfilDomiciliarioValidacion | null>;

  abstract listarHistorial(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ValidacionHistorial[]>;

  abstract aprobar(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ResultadoAprobar>;

  abstract rechazar(
    adminId: string,
    domiciliarioId: string,
    motivo: string,
  ): Promise<ResultadoRechazar>;
}
