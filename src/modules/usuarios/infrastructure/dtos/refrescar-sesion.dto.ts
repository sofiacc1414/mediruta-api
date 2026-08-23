import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefrescarSesionDto {
  // Opcional: el flujo Web lo manda por cookie HttpOnly, no en el body
  // (ver refresh-cookie.ts). El caso de uso valida que llegue por alguna
  // de las dos vías.
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  refreshToken?: string;
}
