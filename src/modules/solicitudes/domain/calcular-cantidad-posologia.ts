function calcularTotal(
  dosisPorToma: number,
  unidad: string,
  horas: number,
  dias: number,
): string | null {
  if (!dosisPorToma || !horas || !dias) return null;
  const tomasPorDia = 24 / horas;
  const total = Math.ceil(tomasPorDia * dias * dosisPorToma);
  return `${total} ${unidad.toLowerCase()}(s) (calculado)`;
}

/** Caso real reportado: el OCR de la fórmula a veces no trae
 * `cantidad` explícita, pero si se conoce la dosis por toma más la
 * frecuencia y duración ("Tomar 1 tableta cada 6 horas durante 3
 * días"), la cantidad total es calculable — sin esto, el paciente se
 * topaba con un campo obligatorio vacío sin ningún aviso de por qué.
 *
 * `dosisToma`/`frecuencia`/`duracion` llegan como tres campos
 * separados del microservicio OCR (`mediruta-ocr-service`, ver
 * `PATRON_DOSIS_TOMA`) — más confiable que regexear un solo texto
 * libre combinado, porque cada uno ya viene limpio de ruido.
 * Casos como "a libre demanda" no tienen una cantidad determinística
 * — se devuelve `null` a propósito, nunca un número inventado, para
 * que ese caso se siga marcando como pendiente de completar a mano. */
export function calcularCantidadDesdeEstructura(
  dosisToma: string | null,
  frecuencia: string | null,
  duracion: string | null,
): string | null {
  if (!dosisToma || !frecuencia || !duracion) return null;

  const matchDosis = dosisToma.match(/(\d+)\s*([a-záéíóúñ]+)/i);
  const matchHoras = frecuencia.match(/(\d+)\s*horas?/i);
  const matchDias = duracion.match(/(\d+)\s*d[ií]as?/i);

  if (!matchDosis || !matchHoras || !matchDias) return null;

  return calcularTotal(
    Number(matchDosis[1]),
    matchDosis[2],
    Number(matchHoras[1]),
    Number(matchDias[1]),
  );
}

/** Variante de respaldo para cuando las tres señales vienen juntas en
 * un solo texto libre (ej. la posología ya reconstruida) en vez de
 * como campos separados — mismo patrón, una sola frase. */
export function calcularCantidadDesdePosologia(
  posologia: string | null,
): string | null {
  if (!posologia) return null;
  const normalizado = posologia.toLowerCase();

  const matchDosis = normalizado.match(/tomar\s+(\d+)\s*([a-záéíóúñ]+)/);
  const matchFrecuencia = normalizado.match(/cada\s+(\d+)\s*horas?/);
  const matchDuracion = normalizado.match(/durante\s+(\d+)\s*d[ií]as?/);

  if (!matchDosis || !matchFrecuencia || !matchDuracion) return null;

  return calcularTotal(
    Number(matchDosis[1]),
    matchDosis[2],
    Number(matchFrecuencia[1]),
    Number(matchDuracion[1]),
  );
}
