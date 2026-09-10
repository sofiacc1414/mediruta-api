import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class GuardarNivelCopagoAdminDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsNumber()
  @Min(0)
  copago: number;

  @IsOptional()
  @IsInt()
  orden?: number;
}
