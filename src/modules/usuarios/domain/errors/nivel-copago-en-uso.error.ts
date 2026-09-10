/** El admin intentó borrar un nivel de copago que algún Paciente tiene
 * declarado en su perfil — hay que desvincularlo primero (no se hace
 * automático: es una decisión del admin, no algo para hacer en
 * cascada sin que se note). */
export class NivelCopagoEnUsoError extends Error {
  constructor() {
    super('No se puede eliminar: hay pacientes con este nivel declarado.');
    this.name = 'NivelCopagoEnUsoError';
  }
}
