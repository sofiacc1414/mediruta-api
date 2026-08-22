import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefrescarSesionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  refreshToken: string;
}
