/** G05 — el admin intentó aprobar un domiciliario cuya documentación
 * obligatoria (perfil_domiciliario, HU-02) está incompleta. `faltantes`
 * lista qué requisitos faltan, para que la Web los muestre tal cual. */
export class DocumentacionIncompletaError extends Error {
  constructor(public readonly faltantes: string[]) {
    super('La documentación del domiciliario está incompleta.');
    this.name = 'DocumentacionIncompletaError';
  }
}
