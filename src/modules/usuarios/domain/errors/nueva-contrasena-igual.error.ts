export class NuevaContrasenaIgualError extends Error {
  constructor() {
    super('La nueva contraseña debe ser diferente de la contraseña actual.');
    this.name = 'NuevaContrasenaIgualError';
  }
}
