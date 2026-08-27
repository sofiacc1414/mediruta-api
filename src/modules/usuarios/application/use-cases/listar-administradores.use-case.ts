import { Injectable } from '@nestjs/common';
import { AdministradorResumen, UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

/** Panel admin — "administrar usuarios creados". Delegación fina. */
@Injectable()
export class ListarAdministradoresUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  execute(adminId: string): Promise<AdministradorResumen[]> {
    return this.usuarios.listarAdministradores(adminId);
  }
}
