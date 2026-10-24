import { RangoIngresos } from './intencion-chatbot';

/** Cuotas moderadoras y copagos en Colombia NO son por EPS — los fija
 * el Gobierno por rango de ingresos (en salarios mínimos) y régimen,
 * igual para todas las EPS. Valores vigentes desde el 1/1/2025
 * (Circular Externa 023 del 31/12/2024, Ministerio de Salud). A
 * diferencia de las farmacias aliadas, esto casi no cambia (ajuste
 * anual) — por eso queda como constante de código, no tabla editable;
 * si el Ministerio publica nuevos valores, se actualiza este archivo.
 *
 * Fuente: https://www.xataka.com.co/otros/atencion-estos-nuevos-valores-cuotas-moderadoras-copagos-eps-para-2025
 */
export const CUOTA_MODERADORA_CONTRIBUTIVO: Record<RangoIngresos, number> = {
  menos_2_smlv: 4700,
  entre_2_y_5_smlv: 19200,
  mas_5_smlv: 50300,
};

export const COPAGO_PORCENTAJE_CONTRIBUTIVO: Record<RangoIngresos, number> = {
  menos_2_smlv: 0.11,
  entre_2_y_5_smlv: 0.173,
  mas_5_smlv: 0.23,
};

export const COPAGO_TOPE_EVENTO_CONTRIBUTIVO: Record<RangoIngresos, number> = {
  menos_2_smlv: 356_548,
  entre_2_y_5_smlv: 1_428_678,
  mas_5_smlv: 2_857_356,
};

/** Régimen subsidiado no paga cuota moderadora, solo copago — igual
 * para cualquier rango de ingresos. */
export const COPAGO_PORCENTAJE_SUBSIDIADO = 0.1;
export const COPAGO_TOPE_EVENTO_SUBSIDIADO = 621_164;
export const COPAGO_TOPE_ANUAL_SUBSIDIADO = 1_242_329;

export const ETIQUETAS_RANGO_INGRESOS: Record<RangoIngresos, string> = {
  menos_2_smlv: 'menos de 2 salarios mínimos',
  entre_2_y_5_smlv: 'entre 2 y 5 salarios mínimos',
  mas_5_smlv: 'más de 5 salarios mínimos',
};

function formatearCop(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export function describirCopagoContributivo(rango: RangoIngresos): string {
  const cuota = formatearCop(CUOTA_MODERADORA_CONTRIBUTIVO[rango]);
  const porcentaje = (COPAGO_PORCENTAJE_CONTRIBUTIVO[rango] * 100)
    .toFixed(1)
    .replace('.0', '');
  const tope = formatearCop(COPAGO_TOPE_EVENTO_CONTRIBUTIVO[rango]);
  return (
    `Para ${ETIQUETAS_RANGO_INGRESOS[rango]} (régimen contributivo): cuota moderadora de ` +
    `${cuota} por consulta/examen, y copago de ${porcentaje}% del valor de procedimientos/ ` +
    `cirugías (hasta un tope de ${tope} por evento). Esto lo fija el Gobierno — es igual en ` +
    `cualquier EPS, no varía entre ellas.`
  );
}

export function describirCopagoSubsidiado(): string {
  return (
    `En el régimen subsidiado no se paga cuota moderadora, solo copago del ` +
    `${COPAGO_PORCENTAJE_SUBSIDIADO * 100}% del valor del servicio (tope de ` +
    `${formatearCop(COPAGO_TOPE_EVENTO_SUBSIDIADO)} por evento y ` +
    `${formatearCop(COPAGO_TOPE_ANUAL_SUBSIDIADO)} al año). Igual en cualquier EPS subsidiada.`
  );
}
