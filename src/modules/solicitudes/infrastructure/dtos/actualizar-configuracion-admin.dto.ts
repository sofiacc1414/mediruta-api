import { IsInt, Max, Min } from 'class-validator';

export class ActualizarConfiguracionAdminDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  umbralMinutos: number;
}
