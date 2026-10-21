import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class GuardarFarmaciaAliadaAdminDto {
  @IsString()
  @MinLength(1)
  eps: string;

  @IsString()
  @MinLength(1)
  nombreFarmacia: string;

  @IsString()
  @MinLength(1)
  ciudad: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
