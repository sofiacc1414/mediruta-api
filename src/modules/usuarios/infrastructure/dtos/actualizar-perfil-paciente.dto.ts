import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { EsFechaPasada } from './es-fecha-pasada.validator';

export class ActualizarPerfilPacienteDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  direccion: string;

  @IsDateString()
  @EsFechaPasada()
  fechaNacimiento: string;

  /** HU-09 — contexto de geocodificación (dirección de entrega y de
   * farmacia de cada pedido). */
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  departamento: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  ciudad: string;
}
