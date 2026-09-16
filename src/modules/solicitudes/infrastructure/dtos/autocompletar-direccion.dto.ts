import { IsString, MaxLength, MinLength } from 'class-validator';

export class AutocompletarDireccionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  texto!: string;
}
