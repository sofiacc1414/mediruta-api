import { IsIn } from 'class-validator';
import type { TipoDocumentoDomiciliario } from '../../domain/ports/perfil.repository.port';

const TIPOS_VALIDOS: TipoDocumentoDomiciliario[] = [
  'cedula',
  'licencia',
  'soat',
  'tecnicomecanica',
];

export class SubirDocumentoDomiciliarioDto {
  @IsIn(TIPOS_VALIDOS, {
    message: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.`,
  })
  tipo: TipoDocumentoDomiciliario;
}
