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
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { AprobarDomiciliarioUseCase } from '../../application/use-cases/aprobar-domiciliario.use-case';
import { ListarDomiciliariosPendientesUseCase } from '../../application/use-cases/listar-domiciliarios-pendientes.use-case';
import { ObtenerDetalleDomiciliarioUseCase } from '../../application/use-cases/obtener-detalle-domiciliario.use-case';
import { RechazarDomiciliarioUseCase } from '../../application/use-cases/rechazar-domiciliario.use-case';
import { RechazarDomiciliarioDto } from '../dtos/rechazar-domiciliario.dto';

/** HU-08 — solo Administrador/Root. `RolesGuard` corre después de
 * `AccessAuthGuard` (necesita `identidad.usuarioId` ya resuelto). */
@Controller('admin/domiciliarios')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class DomiciliariosAdminController {
  constructor(
    private readonly listarPendientes: ListarDomiciliariosPendientesUseCase,
    private readonly obtenerDetalle: ObtenerDetalleDomiciliarioUseCase,
    private readonly aprobarDomiciliario: AprobarDomiciliarioUseCase,
    private readonly rechazarDomiciliario: RechazarDomiciliarioUseCase,
  ) {}

  @Get('pendientes')
  @HttpCode(HttpStatus.OK)
  pendientes(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarPendientes.execute(identidad.usuarioId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) domiciliarioId: string,
  ) {
    return this.obtenerDetalle.execute(identidad.usuarioId, domiciliarioId);
  }

  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  aprobar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) domiciliarioId: string,
  ) {
    return this.aprobarDomiciliario.execute(
      identidad.usuarioId,
      domiciliarioId,
    );
  }

  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  rechazar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) domiciliarioId: string,
    @Body() dto: RechazarDomiciliarioDto,
  ) {
    return this.rechazarDomiciliario.execute(
      identidad.usuarioId,
      domiciliarioId,
      dto.motivo,
    );
  }
}
