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
}
