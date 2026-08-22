import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import type { Request } from 'express';
import { IniciarSesionUseCase } from '../../application/use-cases/iniciar-sesion.use-case';
import { RefrescarSesionUseCase } from '../../application/use-cases/refrescar-sesion.use-case';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case';
import { IniciarSesionDto } from '../dtos/iniciar-sesion.dto';
import { RefrescarSesionDto } from '../dtos/refrescar-sesion.dto';
import { RegistrarUsuarioDto } from '../dtos/registrar-usuario.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';

@Controller('auth')
@UseFilters(DominioHttpFilter)
export class AuthController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly iniciarSesion: IniciarSesionUseCase,
    private readonly refrescarSesion: RefrescarSesionUseCase,
  ) {}

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  registro(@Body() dto: RegistrarUsuarioDto) {
    return this.registrarUsuario.execute({
      correo: dto.correo,
      password: dto.password,
      tipoRegistro: dto.tipoRegistro,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: IniciarSesionDto, @Req() req: Request) {
    // TODO: Antes de integrar el Web administrativo, el refresh token del
    // flujo Web debe entregarse mediante cookie HttpOnly y no exponerse al
    // JavaScript del navegador. Esta respuesta JSON es solo para probar la
    // API y preparar Flutter (flutter_secure_storage).
    return this.iniciarSesion.execute({
      correo: dto.correo,
      password: dto.password,
      userAgent: headerTexto(req.headers['user-agent']),
      ip: req.ip ?? null,
    });
  }

  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  refrescar(@Body() dto: RefrescarSesionDto, @Req() req: Request) {
    // TODO: Antes de integrar el Web administrativo, el refresh token del
    // flujo Web debe entregarse y recibirse mediante cookie HttpOnly, Secure
    // y SameSite apropiado, y no exponerse al JavaScript del navegador.
    // Esta respuesta JSON es solo para probar la API y preparar Flutter
    // (flutter_secure_storage).
    return this.refrescarSesion.execute({
      refreshToken: dto.refreshToken,
      userAgent: headerTexto(req.headers['user-agent']),
      ip: req.ip ?? null,
    });
  }
}

function headerTexto(valor: string | string[] | undefined): string | null {
  if (typeof valor === 'string') {
    return valor;
  }
  return null;
}
