/** HU-07 — el código de 6 caracteres que tipeó el domiciliario no
 * coincide con el que se generó al enviar la solicitud. */
export class CodigoEntregaIncorrectoError extends Error {
  constructor() {
    super('El código de entrega no coincide.');
    this.name = 'CodigoEntregaIncorrectoError';
  }
}
