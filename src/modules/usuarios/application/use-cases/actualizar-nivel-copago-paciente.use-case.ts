import { Injectable } from '@nestjs/common';
import { NivelCopagoNoEncontradoError } from '../../domain/errors/nivel-copago-no-encontrado.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_NIVEL_COPAGO_ACTUALIZADO = 'Nivel de copago actualizado.';

export type ActualizarNivelCopagoPacienteResultado = { message: string };

/** El Paciente autodeclara su nivel de copago en su perfil — sin
 * aprobación de un admin (decisión de negocio, no una HU formal). */
@Injectable()
export class ActualizarNivelCopagoPacienteUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(
    pacienteId: string,
    nivelCopagoId: string,
  ): Promise<ActualizarNivelCopagoPacienteResultado> {
    const resultado = await this.perfiles.actualizarNivelCopagoPaciente(
      pacienteId,
      nivelCopagoId,
    );

    switch (resultado) {
      case 'actualizado':
        return { message: MENSAJE_NIVEL_COPAGO_ACTUALIZADO };
      case 'nivel_no_encontrado':
        throw new NivelCopagoNoEncontradoError();
      case 'perfil_no_encontrado':
        throw new RolNoAutorizadoError();
    }
  }
}
