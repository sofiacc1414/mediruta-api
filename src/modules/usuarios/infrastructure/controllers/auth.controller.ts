import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters } from '@nestjs/common';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case';
import { RegistrarUsuarioDto } from '../dtos/registrar-usuario.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';

@Controller('auth')
@UseFilters(DominioHttpFilter)
export class AuthController {
  constructor(private readonly registrarUsuario: RegistrarUsuarioUseCase) {}

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  registro(@Body() dto: RegistrarUsuarioDto) {
    return this.registrarUsuario.execute({
      correo: dto.correo,
      password: dto.password,
      tipoRegistro: dto.tipoRegistro,
    });
  }
}
