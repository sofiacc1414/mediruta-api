import { Medicamento } from './solicitud.repository.port';

export type FormulaMedicaExtraida = {
  fechaEmision: string | null;
  /** Fecha explícita impresa en la fórmula ("Fecha de vencimiento: ...")
   * — distinta de `fechaEmision`, no se infiere ni se calcula; si el
   * documento no la trae, queda en null y el Paciente la completa a
   * mano, igual que siempre. */
  fechaVencimiento: string | null;
  farmaciaIpsOrigen: string | null;
  medicamentos: Medicamento[];
};

/** Módulo 1 — puerto hacia el microservicio Python de OCR
 * (mediruta-ocr-service). Nunca se llama desde App/Web directo, solo
 * desde `ExtraerDatosFormulaUseCase` (mismo criterio que
 * `GeocodificacionPort`/`CorreoCodigoEntregaPort`). */
export abstract class OcrFormulaPort {
  abstract extraer(
    contenido: Buffer,
    contentType: string,
  ): Promise<FormulaMedicaExtraida>;
}
