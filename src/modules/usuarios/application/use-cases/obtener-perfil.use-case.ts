import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  Perfil,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';

/** G02 — consulta el perfil propio (datos comunes + Paciente/Domiciliario si aplica). */
@Injectable()
export class ObtenerPerfilUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(usuarioId: string): Promise<Perfil> {
    const perfil = await this.perfiles.obtenerPerfil(usuarioId);
    if (!perfil) {
      throw new NoAutorizadoError();
    }
    return perfil;
  }
}
