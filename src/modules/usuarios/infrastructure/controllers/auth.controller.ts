import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
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

  @Get('me')
  @UseGuards(AccessAuthGuard)
  @HttpCode(HttpStatus.OK)
  me(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerSesionActual.execute(identidad.usuarioId);
  }

  @Post('logout')
  @UseGuards(AccessAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    await this.cerrarSesion.execute({
      usuarioId: identidad.usuarioId,
      sid: identidad.sid,
    });
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
