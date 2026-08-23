export type EstadoSolicitud = 'borrador' | 'pendiente_revision' | 'cancelada';

export type DatosSolicitud = {
  medicamentoNombre: string | null;
  medicamentoConcentracion: string | null;
  medicamentoFormaFarmaceutica: string | null;
  medicamentoCantidad: string | null;
  medicamentoPosologia: string | null;
  recetaMedicoNombre: string | null;
  recetaMedicoRegistro: string | null;
  recetaIps: string | null;
  recetaFechaExpedicion: string | null;
  direccionEntrega: string | null;
};

export type SolicitudResumen = {
  id: string;
  medicamentoNombre: string | null;
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type SolicitudDetalle = DatosSolicitud & {
  id: string;
  estado: EstadoSolicitud;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
};

export type EventoHistorial = {
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type ResultadoEnviar =
  | { resultado: 'enviada' }
  | { resultado: 'incompleta'; faltantes: string[] }
  | { resultado: 'no_encontrada' };

export type ResultadoCancelar = 'cancelada' | 'no_encontrada';

/** G01-G06 de HU-03 — el Paciente crea y gestiona sus propias
 * solicitudes. Todas las operaciones están acotadas al dueño (nunca se
 * expone la de otro paciente) — ver comentarios de las funciones app.*
 * en la migración. */
export abstract class SolicitudRepositoryPort {
  /** G01. `null` si la cuenta no tiene rol PACIENTE. */
  abstract crear(
    pacienteId: string,
    datos: DatosSolicitud,
  ): Promise<string | null>;

  /** G02. */
  abstract listar(pacienteId: string): Promise<SolicitudResumen[]>;

  /** G03. `null` si no existe o no es del dueño. */
  abstract obtener(
    pacienteId: string,
    solicitudId: string,
  ): Promise<SolicitudDetalle | null>;

  /** G03 — historial de estados, más antiguo primero. */
  abstract listarHistorial(
    pacienteId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]>;

  /** G04 — solo si está en Borrador y es del dueño. */
  abstract actualizar(
    pacienteId: string,
    solicitudId: string,
    datos: DatosSolicitud,
  ): Promise<boolean>;

  /** G05. */
  abstract enviar(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ResultadoEnviar>;

  /** G06. */
  abstract cancelar(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ResultadoCancelar>;
}
