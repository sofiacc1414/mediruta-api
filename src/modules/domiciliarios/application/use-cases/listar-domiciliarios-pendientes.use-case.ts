import { Injectable } from '@nestjs/common';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';

export type DomiciliarioPendienteResultado = {
  usuarioId: string;
  nombreCompleto: string | null;
  telefono: string | null;
  solicitadoEn: string;
};

/** G01 — domiciliarios con validación pendiente, más antiguos primero. */
@Injectable()
export class ListarDomiciliariosPendientesUseCase {
  constructor(
    private readonly validaciones: ValidacionDomiciliarioRepositoryPort,
  ) {}

  execute(adminId: string): Promise<DomiciliarioPendienteResultado[]> {
    return this.validaciones.listarPendientes(adminId);
  }
}
