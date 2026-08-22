export class CambioContrasenaInvalidoError extends Error {
  constructor() {
    super(
      'No fue posible cambiar la contraseña con las credenciales proporcionadas.',
    );
    this.name = 'CambioContrasenaInvalidoError';
  }
}
