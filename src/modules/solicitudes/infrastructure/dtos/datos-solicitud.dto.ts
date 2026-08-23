import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { EsFechaPasada } from '../../../usuarios/infrastructure/dtos/es-fecha-pasada.validator';

/** Se usa tanto para crear (G01) como para editar (G04) una solicitud —
 * mismos 10 campos en los dos casos. Todos opcionales a propósito: un
 * Borrador puede estar incompleto (se completa de a poco); la
 * obligatoriedad recién se exige al enviar (G05, del lado de la BD). */
export class DatosSolicitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  medicamentoNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicamentoConcentracion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicamentoFormaFarmaceutica?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicamentoCantidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  medicamentoPosologia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recetaMedicoNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recetaMedicoRegistro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recetaIps?: string;

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
