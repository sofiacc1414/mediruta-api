/** G01 — el paciente intentó crear una solicitud sin tener la foto de
 * cédula cargada en su perfil (HU-02). No se puede ni empezar una
 * solicitud sin eso — se lo manda primero a completar el perfil. */
export class PerfilIncompletoError extends Error {
  constructor() {
    super(
      'Completa tu foto de cédula en tu perfil antes de crear una solicitud.',
    );
    this.name = 'PerfilIncompletoError';
  }
}
