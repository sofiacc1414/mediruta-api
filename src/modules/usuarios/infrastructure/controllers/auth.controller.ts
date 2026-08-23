import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CambiarContrasenaUseCase } from '../../application/use-cases/cambiar-contrasena.use-case';
import { CerrarSesionUseCase } from '../../application/use-cases/cerrar-sesion.use-case';
import { IniciarSesionUseCase } from '../../application/use-cases/iniciar-sesion.use-case';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { RefrescarSesionUseCase } from '../../application/use-cases/refrescar-sesion.use-case';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case';
import { RestablecerContrasenaUseCase } from '../../application/use-cases/restablecer-contrasena.use-case';
import { SolicitarRecuperacionContrasenaUseCase } from '../../application/use-cases/solicitar-recuperacion-contrasena.use-case';
import type { IdentidadAutenticada } from '../../domain/identidad-autenticada';
import { UsuarioAutenticado } from '../decorators/usuario-autenticado.decorator';
import { CambiarContrasenaDto } from '../dtos/cambiar-contrasena.dto';
import { IniciarSesionDto } from '../dtos/iniciar-sesion.dto';
import { RefrescarSesionDto } from '../dtos/refrescar-sesion.dto';
import { RegistrarUsuarioDto } from '../dtos/registrar-usuario.dto';
import { RestablecerContrasenaDto } from '../dtos/restablecer-contrasena.dto';
import { SolicitarRecuperacionContrasenaDto } from '../dtos/solicitar-recuperacion-contrasena.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';
import { AccessAuthGuard } from '../guards/access-auth.guard';
import {
  REFRESH_COOKIE_NAME,
  esClienteWeb,
  opcionesCookieRefresh,
} from '../auth/refresh-cookie';

@Controller('auth')
@UseFilters(DominioHttpFilter)
export class AuthController {
  constructor(
    private readonly registrarUsuario: RegistrarUsuarioUseCase,
    private readonly iniciarSesion: IniciarSesionUseCase,
    private readonly refrescarSesion: RefrescarSesionUseCase,
    private readonly obtenerSesionActual: ObtenerSesionActualUseCase,
    private readonly cerrarSesion: CerrarSesionUseCase,
    private readonly solicitarRecuperacion: SolicitarRecuperacionContrasenaUseCase,
    private readonly restablecerContrasena: RestablecerContrasenaUseCase,
    private readonly cambiarContrasena: CambiarContrasenaUseCase,
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
  async login(
    @Body() dto: IniciarSesionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client-type') clientType?: string,
  ) {
    const resultado = await this.iniciarSesion.execute({
      correo: dto.correo,
      password: dto.password,
      userAgent: headerTexto(req.headers['user-agent']),
      ip: req.ip ?? null,
    });

    if (esClienteWeb(clientType)) {
      res.cookie(
        REFRESH_COOKIE_NAME,
        resultado.refreshToken,
        opcionesCookieRefresh(),
      );
      return { accessToken: resultado.accessToken, usuario: resultado.usuario };
    }

    // Flujo App (Flutter): el refresh token va en el body para que se
    // guarde en flutter_secure_storage.
    return resultado;
  }

  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  async refrescar(
    @Body() dto: RefrescarSesionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client-type') clientType?: string,
  ) {
    const refreshTokenDeCookie = req.cookies?.[REFRESH_COOKIE_NAME] as
      string | undefined;
    const refreshToken: string = refreshTokenDeCookie ?? dto.refreshToken ?? '';

    const resultado = await this.refrescarSesion.execute({
      refreshToken,
      userAgent: headerTexto(req.headers['user-agent']),
      ip: req.ip ?? null,
    });

    if (esClienteWeb(clientType)) {
      res.cookie(
        REFRESH_COOKIE_NAME,
        resultado.refreshToken,
        opcionesCookieRefresh(),
      );
      return { accessToken: resultado.accessToken };
    }

    return resultado;
  }

  @Get('me')
  @UseGuards(AccessAuthGuard)
  @HttpCode(HttpStatus.OK)
  me(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerSesionActual.execute(identidad.usuarioId);
  }

  @Post('logout')
  @UseGuards(AccessAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.cerrarSesion.execute({
      usuarioId: identidad.usuarioId,
      sid: identidad.sid,
    });
    // Limpia la cookie del flujo Web aunque este cliente no la haya usado
    // (clearCookie es inofensivo si nunca existió).
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
  }

  @Post('recuperar-contrasena')
  @HttpCode(HttpStatus.OK)
  recuperarContrasena(@Body() dto: SolicitarRecuperacionContrasenaDto) {
    return this.solicitarRecuperacion.execute({
      correo: dto.correo,
    });
  }

  @Post('restablecer-contrasena')
  @HttpCode(HttpStatus.OK)
  restablecer(@Body() dto: RestablecerContrasenaDto) {
    return this.restablecerContrasena.execute({
      correo: dto.correo,
      codigo: dto.codigo,
      nuevaPassword: dto.nuevaPassword,
    });
  }

  @Post('cambiar-contrasena')
  @UseGuards(AccessAuthGuard)
  @HttpCode(HttpStatus.OK)
  cambiar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.cambiarContrasena.execute({
      usuarioId: identidad.usuarioId,
      sid: identidad.sid,
      passwordActual: dto.passwordActual,
      nuevaPassword: dto.nuevaPassword,
    });
  }
}

function headerTexto(valor: string | string[] | undefined): string | null {
  if (typeof valor === 'string') {
    return valor;
  }
  return null;
}
