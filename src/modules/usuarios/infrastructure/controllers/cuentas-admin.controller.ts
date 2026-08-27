import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { BloquearCuentaUseCase } from '../../application/use-cases/bloquear-cuenta.use-case';
import { DesbloquearCuentaUseCase } from '../../application/use-cases/desbloquear-cuenta.use-case';
import { ListarCuentasAdminUseCase } from '../../application/use-cases/listar-cuentas-admin.use-case';
import { ObtenerCuentaAdminUseCase } from '../../application/use-cases/obtener-cuenta-admin.use-case';
import type { IdentidadAutenticada } from '../../domain/identidad-autenticada';
import { Roles } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../decorators/usuario-autenticado.decorator';
import { BloquearCuentaDto } from '../dtos/bloquear-cuenta.dto';
import { FiltrarCuentasAdminDto } from '../dtos/filtrar-cuentas-admin.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';
import { AccessAuthGuard } from '../guards/access-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/** Panel admin — "administrar usuarios" ampliado a cualquier rol
 * (Paciente/Domiciliario/Administrador), distinto de `admin/usuarios`
 * (que sigue siendo el flujo específico de crear/ver cuentas
 * ADMINISTRADOR). Bloquear/desbloquear una cuenta ADMINISTRADOR/ROOT
 * exige ROOT — lo valida la propia función SQL (defensa en
 * profundidad), no el guard de acá. */
@Controller('admin/cuentas')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class CuentasAdminController {
  constructor(
    private readonly listarCuentas: ListarCuentasAdminUseCase,
    private readonly obtenerCuenta: ObtenerCuentaAdminUseCase,
    private readonly bloquearCuenta: BloquearCuentaUseCase,
    private readonly desbloquearCuenta: DesbloquearCuentaUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() filtros: FiltrarCuentasAdminDto,
  ) {
    return this.listarCuentas.execute(identidad.usuarioId, filtros);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.obtenerCuenta.execute(identidad.usuarioId, usuarioId);
  }

  @Post(':id/bloquear')
  @HttpCode(HttpStatus.OK)
  bloquear(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) usuarioId: string,
    @Body() dto: BloquearCuentaDto,
  ) {
    return this.bloquearCuenta.execute(
      identidad.usuarioId,
      usuarioId,
      dto.motivo,
    );
  }

  @Post(':id/desbloquear')
  @HttpCode(HttpStatus.OK)
  desbloquear(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.desbloquearCuenta.execute(identidad.usuarioId, usuarioId);
  }
}
