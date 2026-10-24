import { ArrayMinSize, ArrayUnique, IsIn, IsUUID } from 'class-validator';
import type { TipoLiquidacion } from '../../domain/wallet';

const TIPOS_VALIDOS: TipoLiquidacion[] = ['deuda_efectivo', 'saldo_pendiente'];

export class LiquidarLoteAdminDto {
  @IsIn(TIPOS_VALIDOS, {
    message: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.`,
  })
  tipo: TipoLiquidacion;

  @ArrayMinSize(1, { message: 'domiciliarioIds no puede estar vacío.' })
  @ArrayUnique()
  @IsUUID('4', { each: true })
  domiciliarioIds: string[];
}
