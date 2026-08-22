export class CredencialesInvalidasError extends Error {
  constructor() {
    super(
      'Correo o contraseña incorrectos, o la cuenta no está disponible.',
    );
    this.name = 'CredencialesInvalidasError';
  }
}
