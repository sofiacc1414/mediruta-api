import { Injectable } from '@nestjs/common';
import {
  NivelCopago,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';

/** Catálogo de niveles de copago propios de MediRuta — el Paciente lo
 * necesita para elegir el suyo en su perfil. */
@Injectable()
export class ListarNivelesCopagoUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  execute(usuarioId: string): Promise<NivelCopago[]> {
    return this.perfiles.listarNivelesCopago(usuarioId);
  }
}
