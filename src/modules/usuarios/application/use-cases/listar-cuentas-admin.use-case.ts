import { Injectable } from '@nestjs/common';
import {
  CuentaAdminResumen,
  FiltrosCuentasAdmin,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';

/** Panel admin — "administrar usuarios" ampliado a cualquier rol.
 * Delegación fina. */
@Injectable()
export class ListarCuentasAdminUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  execute(
    adminId: string,
    filtros: FiltrosCuentasAdmin,
  ): Promise<CuentaAdminResumen[]> {
    return this.usuarios.listarCuentasAdmin(adminId, filtros);
  }
}
