/** Caso real reportado: el OCR de la fórmula a veces no trae
 * `cantidad` explícita, pero si la posología trae frecuencia y
 * duración ("Tomar 1 tableta (s) cada 6 horas durante 3 dia(s)"), la
 * cantidad total es calculable — sin esto, el paciente se topaba con
 * un campo obligatorio vacío sin ningún aviso de por qué.
 *
 * Solo cubre el patrón "tomar N <unidad> cada H horas durante D
 * días" (el único que trae las tres señales en un solo texto libre).
 * Casos como "a libre demanda" no tienen una cantidad determinística
 * — se devuelve `null` a propósito, nunca un número inventado, para
 * que ese caso se siga marcando como pendiente de completar a mano. */
export function calcularCantidadDesdePosologia(
  posologia: string | null,
): string | null {
  if (!posologia) return null;
  const normalizado = posologia.toLowerCase();

  const matchDosis = normalizado.match(/tomar\s+(\d+)\s*([a-záéíóúñ]+)/);
  const matchFrecuencia = normalizado.match(/cada\s+(\d+)\s*horas?/);
  const matchDuracion = normalizado.match(/durante\s+(\d+)\s*d[ií]as?/);

  if (!matchDosis || !matchFrecuencia || !matchDuracion) return null;

  const dosisPorToma = Number(matchDosis[1]);
  const unidad = matchDosis[2];
  const horas = Number(matchFrecuencia[1]);
  const dias = Number(matchDuracion[1]);

  if (!dosisPorToma || !horas || !dias) return null;

  const tomasPorDia = 24 / horas;
  const total = Math.ceil(tomasPorDia * dias * dosisPorToma);

  return `${total} ${unidad}(s) (calculado)`;
}
