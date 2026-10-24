import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { INTENCIONES_CHATBOT } from '../../domain/intencion-chatbot';

const INTENCIONES_FORZABLES = INTENCIONES_CHATBOT.filter(
  (i) => i !== 'desconocido',
);

export class MensajeChatbotDto {
  @IsString()
  @MinLength(1)
  mensaje: string;

  @IsOptional()
  @IsString()
  eps?: string;

  @IsOptional()
  @IsIn(['contributivo', 'subsidiado'])
  regimen?: 'contributivo' | 'subsidiado';

  @IsOptional()
  @IsIn(['menos_2_smlv', 'entre_2_y_5_smlv', 'mas_5_smlv'])
  rangoIngresos?: 'menos_2_smlv' | 'entre_2_y_5_smlv' | 'mas_5_smlv';

  @IsOptional()
  @IsInt()
  @Min(0)
  intentosSinExitoSeguidos?: number;

  /** La app lo manda al tocar un botón de sugerencia — ver
   * `EntradaMensajeChatbot.intencionForzada`. */
  @IsOptional()
  @IsIn(INTENCIONES_FORZABLES)
  intencionForzada?: Exclude<
    (typeof INTENCIONES_CHATBOT)[number],
    'desconocido'
  >;
}
