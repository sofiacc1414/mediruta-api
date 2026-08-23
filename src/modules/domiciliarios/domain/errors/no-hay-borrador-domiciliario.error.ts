/** El usuario no tiene una solicitud de Domiciliario en `borrador` para
 * enviar — o nunca tuvo el rol, o ya la había enviado antes (pasó a
 * `pendiente_validacion`, `habilitado` o `rechazado`). */
export class NoHayBorradorDomiciliarioError extends Error {
  constructor() {
    super('No tenés una solicitud de Domiciliario en borrador para enviar.');
    this.name = 'NoHayBorradorDomiciliarioError';
  }
}
