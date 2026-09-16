import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VerificarDireccionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  direccion: string;

  /** Mismo contexto que `ActualizarPerfilPacienteDto` — opcionales acá
   * porque el Paciente puede estar completando el perfil por primera
   * vez y todavía no eligió departamento/ciudad cuando escribe la
   * dirección. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;
}
