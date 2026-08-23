export type DomiciliarioPendiente = {
  usuarioId: string;
  nombreCompleto: string | null;
  telefono: string | null;
  solicitadoEn: string;
};

export type PerfilDomiciliarioValidacion = {
  nombreCompleto: string | null;
  telefono: string | null;
  estado: 'pendiente_validacion' | 'habilitado' | 'rechazado';
  solicitadoEn: string;
  direccion: string | null;
  vehiculoTipo: string | null;
  vehiculoPlaca: string | null;
  cedulaPath: string | null;
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
