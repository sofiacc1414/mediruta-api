import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SolicitarEdicionPedidoDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccionEntrega?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccionFarmacia?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detalle?: string;
}
