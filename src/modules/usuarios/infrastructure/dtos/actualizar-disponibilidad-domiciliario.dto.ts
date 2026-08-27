import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
} from 'class-validator';

export class ActualizarDisponibilidadDomiciliarioDto {
  @IsBoolean()
  disponible: boolean;

  /** Obligatorio solo cuando `disponible = true` — el caso de uso
   * valida esa combinación, no el DTO (acá ambos son opcionales para
   * no bloquear el "apagar" sin ubicación). */
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
