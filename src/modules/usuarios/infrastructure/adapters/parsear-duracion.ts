const UNIDADES_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

/**
 * Convierte valores de configuración como `15m`, `1h` o `7d` a milisegundos.
 * Falla de forma explícita si el formato no es reconocido.
 */
export function parsearDuracion(valor: string, nombreVariable: string): number {
  const match = /^(\d+)([smhd])$/.exec(valor.trim());
  if (!match) {
    throw new Error(
      `${nombreVariable} no es válido. Usa un entero positivo seguido de s, m, h o d (por ejemplo 15m, 1h o 7d).`,
    );
  }

  const cantidad = Number(match[1]);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error(
      `${nombreVariable} no es válido. Usa un entero positivo seguido de s, m, h o d (por ejemplo 15m, 1h o 7d).`,
    );
  }

  const unidad = match[2] as keyof typeof UNIDADES_MS;
  return cantidad * UNIDADES_MS[unidad];
}
