import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AutocompletarDireccionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  texto: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;
}
