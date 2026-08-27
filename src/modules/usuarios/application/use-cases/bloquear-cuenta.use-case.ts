import { Injectable } from '@nestjs/common';
import { AccionCuentaNoAutorizadaError } from '../../domain/errors/accion-cuenta-no-autorizada.error';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_CUENTA_BLOQUEADA = 'La cuenta fue bloqueada.';
export const MENSAJE_CUENTA_YA_BLOQUEADA = 'La cuenta ya estaba bloqueada.';

export type BloquearCuentaResultado = { message: string };

/** Panel admin — bloqueo administrativo (distinto de la
 * autodesactivación): un Administrador puede bloquear cuentas Paciente/
 * Domiciliario; solo ROOT puede bloquear una cuenta Administrador/ROOT. */
@Injectable()
export class BloquearCuentaUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(
    adminId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<BloquearCuentaResultado> {
    const resultado = await this.usuarios.bloquearCuenta(
      adminId,
      usuarioId,
      motivo,
    );

    switch (resultado) {
      case 'bloqueada':
        return { message: MENSAJE_CUENTA_BLOQUEADA };
      case 'ya_en_ese_estado':
        return { message: MENSAJE_CUENTA_YA_BLOQUEADA };
      case 'no_encontrado':
        throw new CuentaNoEncontradaError();
      case 'no_autorizado':
        throw new AccionCuentaNoAutorizadaError();
      default:
        throw new Error('Resultado inesperado de bloquearCuenta.');
    }
  }
}
