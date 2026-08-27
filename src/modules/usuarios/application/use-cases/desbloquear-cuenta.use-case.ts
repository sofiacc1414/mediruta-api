import { Injectable } from '@nestjs/common';
import { AccionCuentaNoAutorizadaError } from '../../domain/errors/accion-cuenta-no-autorizada.error';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_CUENTA_DESBLOQUEADA = 'La cuenta fue desbloqueada.';
export const MENSAJE_CUENTA_NO_ESTABA_BLOQUEADA =
  'La cuenta no estaba bloqueada.';

export type DesbloquearCuentaResultado = { message: string };

@Injectable()
export class DesbloquearCuentaUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(
    adminId: string,
    usuarioId: string,
  ): Promise<DesbloquearCuentaResultado> {
    const resultado = await this.usuarios.desbloquearCuenta(adminId, usuarioId);

    switch (resultado) {
      case 'desbloqueada':
        return { message: MENSAJE_CUENTA_DESBLOQUEADA };
      case 'ya_en_ese_estado':
        return { message: MENSAJE_CUENTA_NO_ESTABA_BLOQUEADA };
      case 'no_encontrado':
        throw new CuentaNoEncontradaError();
      case 'no_autorizado':
        throw new AccionCuentaNoAutorizadaError();
      default:
        throw new Error('Resultado inesperado de desbloquearCuenta.');
    }
  }
}
