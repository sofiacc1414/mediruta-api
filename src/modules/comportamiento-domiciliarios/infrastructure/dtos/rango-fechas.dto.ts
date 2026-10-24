import { IsISO8601 } from 'class-validator';

/** `?desde=&hasta=` — ambos obligatorios, fecha ISO 8601 (solo la
 * parte de fecha, ej. "2026-10-01"; la hora si viene se ignora del
 * lado SQL con `::date`). */
export class RangoFechasDto {
  @IsISO8601({}, { message: 'desde debe ser una fecha ISO 8601 válida.' })
  desde: string;

  @IsISO8601({}, { message: 'hasta debe ser una fecha ISO 8601 válida.' })
  hasta: string;
}
