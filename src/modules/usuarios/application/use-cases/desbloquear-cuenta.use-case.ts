import { Injectable } from '@nestjs/common';
import { AccionCuentaNoAutorizadaError } from '../../domain/errors/accion-cuenta-no-autorizada.error';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_CUENTA_DESBLOQUEADA = 'La cuenta fue desbloqueada.';
export const MENSAJE_CUENTA_REACTIVADA = 'La cuenta fue reactivada.';
export const MENSAJE_CUENTA_NO_ESTABA_BLOQUEADA =
  'La cuenta no estaba bloqueada ni desactivada.';

export type DesbloquearCuentaResultado = { message: string };

/** Vuelve una cuenta a 'activa' — sirve tanto para desbloquear una que
 * el admin había bloqueado como para reactivar una que el propio dueño
 * había desactivado (HU-05, autoservicio); el resultado del SQL ya
 * distingue de cuál de las dos venía (ver `app.desbloquear_cuenta`). */
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
      case 'reactivada':
        return { message: MENSAJE_CUENTA_REACTIVADA };
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
