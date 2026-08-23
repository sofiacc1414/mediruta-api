export type EstadoSolicitud = 'borrador' | 'pendiente_revision' | 'cancelada';

export type Medicamento = {
  nombre: string | null;
  concentracion: string | null;
  formaFarmaceutica: string | null;
  cantidad: string | null;
  posologia: string | null;
};

export type DatosSolicitud = {
  medicamentos: Medicamento[];
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
};

export type SolicitudResumen = {
  id: string;
  /** Solo existe una vez enviada (G05) — nulo mientras está en
   * Borrador, todavía no es un "pedido". */
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type SolicitudDetalle = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  recetaPath: string | null;
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
  /** Referencia viva a `perfil_paciente.foto_cedula_path` (HU-02) —
   * nunca se copia a la solicitud. */
  cedulaPath: string | null;
};

export type EventoHistorial = {
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type ResultadoCrear =
  | { resultado: 'creada'; id: string }
  | { resultado: 'no_autorizado' }
  | { resultado: 'sin_cedula' };

export type ResultadoEnviar =
  | { resultado: 'enviada'; codigoPedido: string }
  | { resultado: 'incompleta'; faltantes: string[] }
  | { resultado: 'no_encontrada' };

export type ResultadoCancelar = 'cancelada' | 'no_encontrada';

/** G01-G06 de HU-03 — el Paciente crea y gestiona sus propias
 * solicitudes. Todas las operaciones están acotadas al dueño (nunca se
 * expone la de otro paciente) — ver comentarios de las funciones app.*
 * en la migración. */
export abstract class SolicitudRepositoryPort {
  /** G01. `sin_cedula` si el perfil del paciente no tiene foto de
   * cédula cargada todavía (HU-02) — no se puede crear sin eso. */
  abstract crear(
    pacienteId: string,
    medicamentos: Medicamento[],
    recetaPath: string | null,
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
  ): Promise<ResultadoCrear>;

  /** G02. */
  abstract listar(pacienteId: string): Promise<SolicitudResumen[]>;

  /** G03. `null` si no existe o no es del dueño. */
  abstract obtener(
    pacienteId: string,
    solicitudId: string,
  ): Promise<SolicitudDetalle | null>;

  /** G03 — medicamentos de la solicitud, en el orden en que se cargaron. */
  abstract listarMedicamentos(
    pacienteId: string,
    solicitudId: string,
  ): Promise<Medicamento[]>;

  /** G03 — historial de estados, más antiguo primero. */
  abstract listarHistorial(
    pacienteId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]>;

  /** G04 — solo si está en Borrador y es del dueño. Reemplaza todos los
   * medicamentos por los recibidos. */
  abstract actualizar(
    pacienteId: string,
    solicitudId: string,
    medicamentos: Medicamento[],
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
  ): Promise<boolean>;

  /** Sube/reemplaza la foto de la receta (ya subida a Storage). */
  abstract actualizarReceta(
    pacienteId: string,
    solicitudId: string,
    path: string,
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
