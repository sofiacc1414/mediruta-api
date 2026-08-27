import { IsIn } from 'class-validator';
import type { LadoDocumento } from '../../domain/ports/perfil.repository.port';

const LADOS_VALIDOS: LadoDocumento[] = ['frente', 'reverso'];

export class SubirFotoCedulaPacienteDto {
  @IsIn(LADOS_VALIDOS, {
    message: `lado debe ser uno de: ${LADOS_VALIDOS.join(', ')}.`,
  })
  lado: LadoDocumento;
}
