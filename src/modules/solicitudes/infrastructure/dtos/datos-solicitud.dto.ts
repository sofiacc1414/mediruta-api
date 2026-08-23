import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EsFechaPasada } from '../../../usuarios/infrastructure/dtos/es-fecha-pasada.validator';
import { MedicamentoDto } from './medicamento.dto';

/** Se usa tanto para crear (G01) como para editar (G04) una solicitud.
 * La foto de la receta NO va acá — tiene su propio endpoint multipart
 * (POST /solicitudes/:id/receta), mismo patrón que las fotos de HU-02.
 * Todo opcional a propósito: un Borrador puede estar incompleto. */
export class DatosSolicitudDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoDto)
  medicamentos?: MedicamentoDto[];

  @IsOptional()
  @IsDateString()
  @EsFechaPasada({
    message: 'La fecha de expedición de la receta debe ser anterior a hoy.',
  })
  recetaFechaExpedicion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccionEntrega?: string;
}
