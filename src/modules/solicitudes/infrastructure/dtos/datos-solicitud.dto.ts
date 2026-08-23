import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MedicamentoDto } from './medicamento.dto';

/** Se usa tanto para crear (G01) como para editar (G04) una solicitud.
 * La foto de la receta NO va acá — tiene su propio endpoint multipart
 * (POST /solicitudes/:id/receta), mismo patrón que las fotos de HU-02.
 * Todo opcional a propósito: un Borrador puede estar incompleto.
 *
 * `recetaFechaVencimiento` es la fecha de VENCIMIENTO de la fórmula (no la
 * de expedición) — es lo que permite detectar una receta vencida al
 * enviar (G05). A propósito sin `@EsFechaPasada` ni ningún chequeo de
 * rango acá: una fecha de vencimiento válida vive en el futuro, y una ya
 * vencida es justamente el caso que sí queremos poder capturar (se
 * bloquea recién en `enviar_solicitud`, no al tipear). */
export class DatosSolicitudDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoDto)
  medicamentos?: MedicamentoDto[];

  @IsOptional()
  @IsDateString()
  recetaFechaVencimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccionEntrega?: string;

  /** Dónde el domiciliario retira el medicamento (farmacia), distinta de
   * `direccionEntrega` (dónde se lo lleva al paciente). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccionFarmacia?: string;
}
