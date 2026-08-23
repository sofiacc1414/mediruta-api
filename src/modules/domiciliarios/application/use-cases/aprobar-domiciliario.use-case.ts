import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DocumentacionIncompletaError } from '../../domain/errors/documentacion-incompleta.error';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';

export const MENSAJE_DOMICILIARIO_APROBADO = 'El domiciliario fue aprobado.';

export type AprobarDomiciliarioResultado = { message: string };

/** G03/G05/G06 — aprueba a un domiciliario pendiente. Si la
 * documentación está incompleta, no cambia nada y lanza
 * DocumentacionIncompletaError con el detalle de qué falta. */
@Injectable()
export class AprobarDomiciliarioUseCase {
  constructor(
    private readonly validaciones: ValidacionDomiciliarioRepositoryPort,
  ) {}

  async execute(
    adminId: string,
    domiciliarioId: string,
  ): Promise<AprobarDomiciliarioResultado> {
    const resultado = await this.validaciones.aprobar(adminId, domiciliarioId);

    switch (resultado.resultado) {
      case 'aprobado':
        return { message: MENSAJE_DOMICILIARIO_APROBADO };
      case 'incompleto':
        throw new DocumentacionIncompletaError(resultado.faltantes);
      case 'no_encontrado':
        throw new DomiciliarioNoEncontradoError();
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
    }
  }
}
