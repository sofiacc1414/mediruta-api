import { Injectable } from '@nestjs/common';
import { DocumentacionIncompletaError } from '../../../domiciliarios/domain/errors/documentacion-incompleta.error';
import { NoHayBorradorDomiciliarioError } from '../../../domiciliarios/domain/errors/no-hay-borrador-domiciliario.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_SOLICITUD_DOMICILIARIO_ENVIADA =
  'Tu solicitud fue enviada para validación.';

/**
 * G01 — envía la solicitud de validación de Domiciliario: `borrador` ->
 * `pendiente_validacion`. Hasta este punto la solicitud no era visible
 * para el admin (HU-08) aunque el rol ya existiera — completar el
 * perfil/documentos (HU-02) no la envía sola, hace falta este paso
 * explícito, mismo criterio que `EnviarSolicitudUseCase` de HU-03.
 */
@Injectable()
export class EnviarSolicitudDomiciliarioUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(usuarioId: string): Promise<{ message: string }> {
    const resultado = await this.usuarios.enviarSolicitudDomiciliario(usuarioId);

    switch (resultado.resultado) {
      case 'enviada':
        return { message: MENSAJE_SOLICITUD_DOMICILIARIO_ENVIADA };
      case 'incompleta':
        throw new DocumentacionIncompletaError(resultado.faltantes);
      case 'no_encontrada':
        throw new NoHayBorradorDomiciliarioError();
    }
  }
}
