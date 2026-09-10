import { IsUUID } from 'class-validator';

export class ActualizarNivelCopagoPacienteDto {
  @IsUUID()
  nivelCopagoId: string;
}
