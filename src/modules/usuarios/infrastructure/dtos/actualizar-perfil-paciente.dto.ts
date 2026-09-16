import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  /** Ronda 14 — `true` solo cuando la App ya confirmó ESTA dirección
   * exacta contra Nominatim en esta misma sesión (vía
   * /perfil/verificar-direccion o al elegir una sugerencia de
   * /perfil/autocompletar-direccion) y el paciente no la volvió a
   * editar después. Ver `ActualizarPerfilPacienteUseCase` — evita un
   * segundo geocode redundante al guardar, que puede fallar por una
   * inconsistencia de caché regional de Nominatim aunque la primera
   * consulta ya haya confirmado la dirección. */
  @IsOptional()
  @IsBoolean()
  direccionVerificada?: boolean;
}
