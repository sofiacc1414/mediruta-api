/** El id de nivel de copago que mandó el Paciente no existe en el
 * catálogo (`niveles_copago`) — pudo cambiar entre que se cargó la
 * pantalla y se envió el formulario. */
export class NivelCopagoNoEncontradoError extends Error {
  constructor() {
    super('El nivel de copago elegido ya no existe.');
    this.name = 'NivelCopagoNoEncontradoError';
  }
}
