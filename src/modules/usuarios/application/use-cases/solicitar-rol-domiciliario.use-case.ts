import { Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export const MENSAJE_ROL_DOMICILIARIO_AGREGADO =
  'Listo — completá tus datos de Domiciliario para que un administrador te valide.';
export const MENSAJE_ROL_DOMICILIARIO_YA_LO_TENIA =
  'Ya tenías el rol Domiciliario.';

/**
 * Agrega el rol DOMICILIARIO en `pendiente_validacion` a una cuenta que
 * todavía no lo tiene — mismo estado inicial que un registro directo
 * como DOMICILIARIO. De ahí en más usa el flujo ya existente de HU-02
 * (completar perfil/documentos) y HU-08 (aprobación del admin) sin
 * ningún cambio: ambos solo exigen que la fila en `usuario_roles`
 * exista, no que esté habilitada. Idempotente: si ya lo tenía, no es un
 * error.
 */
@Injectable()
export class SolicitarRolDomiciliarioUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(usuarioId: string): Promise<{ message: string }> {
    const resultado = await this.usuarios.solicitarRolDomiciliario(usuarioId);
    return {
      message:
        resultado === 'agregado'
          ? MENSAJE_ROL_DOMICILIARIO_AGREGADO
          : MENSAJE_ROL_DOMICILIARIO_YA_LO_TENIA,
    };
  }
}
