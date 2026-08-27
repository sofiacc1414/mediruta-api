import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UseGuards } from '@nestjs/common';
import { CrearAdministradorUseCase } from '../../application/use-cases/crear-administrador.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CrearAdministradorDto } from '../dtos/crear-administrador.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';
import { AccessAuthGuard } from '../guards/access-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/** Panel admin — gestión de cuentas ADMINISTRADOR. Solo ROOT puede
 * crearlas (`@Roles('ROOT')` a nivel de método, pisa el `@Roles(...)` de
 * clase — `RolesGuard` usa `getAllAndOverride`, ver su comentario). */
@Controller('admin/usuarios')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class UsuariosAdminController {
  constructor(private readonly crearAdministrador: CrearAdministradorUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ROOT')
  crear(@Body() dto: CrearAdministradorDto) {
    return this.crearAdministrador.execute({
      correo: dto.correo,
      password: dto.password,
      nombreCompleto: dto.nombreCompleto,
      telefono: dto.telefono,
    });
  }
}
