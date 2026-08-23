import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { PerfilIncompletoError } from '../../domain/errors/perfil-incompleto.error';
import {
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type CrearSolicitudCommand = {
  pacienteId: string;
  medicamentos: Medicamento[];
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
};

export type CrearSolicitudResultado = { id: string };

/** G01 — crea la solicitud en estado Borrador. Acepta medicamentos
 * vacíos/incompletos a propósito: un Borrador puede estar incompleto,
 * se completa de a poco (G04) y recién se valida todo obligatorio al
 * enviar (G05). La receta (foto) se sube aparte, con
 * SubirRecetaUseCase, sobre una solicitud ya creada. */
@Injectable()
export class CrearSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    command: CrearSolicitudCommand,
  ): Promise<CrearSolicitudResultado> {
    const resultado = await this.solicitudes.crear(
      command.pacienteId,
      command.medicamentos,
      null,
      command.recetaFechaVencimiento,
      command.direccionEntrega,
    );

    switch (resultado.resultado) {
      case 'creada':
        return { id: resultado.id };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'sin_cedula':
        throw new PerfilIncompletoError();
    }
  }
}
