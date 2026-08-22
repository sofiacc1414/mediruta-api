export class CorreoYaRegistradoError extends Error {
  constructor() {
    super('Ya existe una cuenta registrada con este correo.');
    this.name = 'CorreoYaRegistradoError';
  }
}
