import { Injectable } from '@nestjs/common';
import {
  DomiciliarioAdmin,
  EstadoDomiciliarioAdmin,
  ValidacionDomiciliarioRepositoryPort,
} from '../../domain/ports/validacion-domiciliario.repository.port';

const ESTADOS_VALIDOS: EstadoDomiciliarioAdmin[] = [
  'pendiente_validacion',
  'habilitado',
  'rechazado',
  'todos',
];

/** HU-08 (ronda 9) — listado general de domiciliarios con filtro de
 * estado (pendientes/aceptados/rechazados/todos); por defecto sigue
 * trayendo solo los pendientes, como antes. Complementa a
 * `ListarDomiciliariosPendientesUseCase` (no lo reemplaza — ese sigue
 * siendo el que alimenta el dashboard de "por atender"). Un valor
 * inesperado (query param mal formado) cae a 'pendiente_validacion' en
 * vez de fallar. */
@Injectable()
export class ListarDomiciliariosAdminUseCase {
  constructor(
    private readonly validaciones: ValidacionDomiciliarioRepositoryPort,
  ) {}

  execute(adminId: string, estado?: string): Promise<DomiciliarioAdmin[]> {
    const estadoValido = ESTADOS_VALIDOS.includes(
      estado as EstadoDomiciliarioAdmin,
    )
      ? (estado as EstadoDomiciliarioAdmin)
      : 'pendiente_validacion';
    return this.validaciones.listarAdmin(adminId, estadoValido);
  }
}
