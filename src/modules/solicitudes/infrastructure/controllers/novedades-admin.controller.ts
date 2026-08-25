import {
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
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ListarNovedadesAbiertasUseCase } from '../../application/use-cases/listar-novedades-abiertas.use-case';
import { ResolverNovedadUseCase } from '../../application/use-cases/resolver-novedad.use-case';

/** HU-07 — solo Administrador/Root. Mismo patrón que
 * `DomiciliariosAdminController` (HU-08). */
@Controller('admin/novedades')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class NovedadesAdminController {
  constructor(
    private readonly listarNovedadesAbiertas: ListarNovedadesAbiertasUseCase,
    private readonly resolverNovedad: ResolverNovedadUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  abiertas(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarNovedadesAbiertas.execute(identidad.usuarioId);
  }

  @Post(':id/resolver')
  @HttpCode(HttpStatus.OK)
  resolver(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) novedadId: string,
  ) {
    return this.resolverNovedad.execute(identidad.usuarioId, novedadId);
  }
}
