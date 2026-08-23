import { Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_ROL_PACIENTE_AGREGADO = 'Ahora también sos Paciente.';
export const MENSAJE_ROL_PACIENTE_YA_LO_TENIA = 'Ya tenías el rol Paciente.';

/**
 * Agrega el rol PACIENTE a una cuenta que todavía no lo tiene — sin
 * validación, mismo criterio que un registro directo como PACIENTE (el
 * perfil paciente en sí, dirección/fecha de nacimiento, se completa
 * después vía HU-02). Idempotente: si ya lo tenía, no es un error.
 */
@Injectable()
export class SolicitarRolPacienteUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(usuarioId: string): Promise<{ message: string }> {
    const resultado = await this.usuarios.solicitarRolPaciente(usuarioId);
    return {
      message:
        resultado === 'agregado'
          ? MENSAJE_ROL_PACIENTE_AGREGADO
          : MENSAJE_ROL_PACIENTE_YA_LO_TENIA,
    };
  }
}
