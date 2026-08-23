import { registerDecorator, ValidationOptions } from 'class-validator';

/** G04 — valida que una fecha (string ISO) sea anterior a hoy, sin
 * depender de que el error suba desde el CHECK de la BD (que existe
 * igual, como última línea de defensa — DOCS/context.md sección 4). */
export function EsFechaPasada(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esFechaPasada',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const fecha = new Date(value);
          if (Number.isNaN(fecha.getTime())) {
            return false;
          }
          return fecha.getTime() < Date.now();
        },
        defaultMessage(): string {
          return 'La fecha de nacimiento debe ser anterior a hoy.';
        },
      },
    });
  };
}
