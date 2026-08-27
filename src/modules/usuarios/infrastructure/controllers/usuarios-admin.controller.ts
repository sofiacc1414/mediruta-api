import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CrearAdministradorUseCase } from '../../application/use-cases/crear-administrador.use-case';
import { ListarAdministradoresUseCase } from '../../application/use-cases/listar-administradores.use-case';
import { ObtenerAdministradorUseCase } from '../../application/use-cases/obtener-administrador.use-case';
import type { IdentidadAutenticada } from '../../domain/identidad-autenticada';
import { Roles } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../decorators/usuario-autenticado.decorator';
import { CrearAdministradorDto } from '../dtos/crear-administrador.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';
import { AccessAuthGuard } from '../guards/access-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/** Panel admin — "administrar usuarios creados". Ver la lista y la
 * ficha de cada administrador es para Administrador/Root; crear uno
 * nuevo solo para ROOT (`@Roles('ROOT')` a nivel de método, pisa el
 * `@Roles(...)` de clase — `RolesGuard` usa `getAllAndOverride`, ver
 * su comentario). */
@Controller('admin/usuarios')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class UsuariosAdminController {
  constructor(
    private readonly crearAdministrador: CrearAdministradorUseCase,
    private readonly listarAdministradores: ListarAdministradoresUseCase,
    private readonly obtenerAdministrador: ObtenerAdministradorUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarAdministradores.execute(identidad.usuarioId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.obtenerAdministrador.execute(identidad.usuarioId, usuarioId);
  }

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
