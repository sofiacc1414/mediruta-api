import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { EstadoSolicitud } from '../../domain/ports/solicitud.repository.port';

const ESTADOS_VALIDOS: EstadoSolicitud[] = [
  'borrador',
  'pendiente_revision',
  'en_asignacion',
  'asignado_en_camino_farmacia',
  'medicamentos_recogidos',
  'en_camino_entrega',
  'en_sitio',
  'entregado',
  'cancelada',
];

/** Panel admin — GET /admin/pedidos?estado=&desde=&hasta=&busqueda=,
 * todos opcionales (sin filtro = todos los pedidos). */
export class FiltrarPedidosAdminDto {
  @IsOptional()
  @IsIn(ESTADOS_VALIDOS, {
    message: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`,
  })
  estado?: EstadoSolicitud;

  @IsOptional()
  @IsISO8601({}, { message: 'desde debe ser una fecha ISO 8601 válida.' })
  desde?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'hasta debe ser una fecha ISO 8601 válida.' })
  hasta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  busqueda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pacienteBusqueda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  domiciliarioBusqueda?: string;
}
