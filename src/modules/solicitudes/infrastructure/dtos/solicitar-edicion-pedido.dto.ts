import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MedicamentoDto } from './medicamento.dto';

export class SolicitarEdicionPedidoDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccionEntrega?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccionFarmacia?: string;

  /** Ronda 4 — si viene, reemplaza la lista completa de medicamentos
   * (mismo criterio "todo el array" que ya usa `actualizar()` sobre un
   * Borrador, no un diff campo a campo). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoDto)
  medicamentos?: MedicamentoDto[];

  /** Ronda 4 — el paciente también va a adjuntar una foto de receta
   * nueva (llamada aparte, multipart, después de creada la novedad).
   * Sin esto, pedir *solo* cambiar la foto fallaría la validación de
   * "algún cambio propuesto" porque todavía no llegó ningún campo. */
  @IsOptional()
  @IsBoolean()
  incluyeReceta?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detalle?: string;
}
