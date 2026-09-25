import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import { NotificarValidacionCuentaUseCase } from '../../../notificaciones/application/use-cases/notificar-validacion-cuenta.use-case';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';

export const MENSAJE_DOMICILIARIO_RECHAZADO = 'El domiciliario fue rechazado.';

export type RechazarDomiciliarioResultado = { message: string };

/** G04/G06 — rechaza a un domiciliario pendiente, con motivo
 * obligatorio (lo valida el DTO antes de llegar acá). */
@Injectable()
export class RechazarDomiciliarioUseCase {
  constructor(
    private readonly validaciones: ValidacionDomiciliarioRepositoryPort,
    private readonly notificarCuenta: NotificarValidacionCuentaUseCase,
  ) {}

  async execute(
    adminId: string,
    domiciliarioId: string,
    motivo: string,
  ): Promise<RechazarDomiciliarioResultado> {
    const resultado = await this.validaciones.rechazar(
      adminId,
      domiciliarioId,
      motivo,
    );

    switch (resultado) {
      case 'rechazado':
        await this.notificarCuenta.execute(domiciliarioId, 'rechazada');
        return { message: MENSAJE_DOMICILIARIO_RECHAZADO };
      case 'no_encontrado':
        throw new DomiciliarioNoEncontradoError();
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
    }
  }
}
