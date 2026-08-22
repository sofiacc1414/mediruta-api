const CORREO_UNIQUE_CONSTRAINT = 'usuarios_correo_key';

export function esViolacionCorreoUnico(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === '23505' && pgError.constraint === CORREO_UNIQUE_CONSTRAINT;
}
