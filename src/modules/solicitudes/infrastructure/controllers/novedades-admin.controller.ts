import {
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
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { AprobarEdicionPedidoAdminUseCase } from '../../application/use-cases/aprobar-edicion-pedido-admin.use-case';
import { ListarNovedadesAbiertasUseCase } from '../../application/use-cases/listar-novedades-abiertas.use-case';
import { RechazarEdicionPedidoAdminUseCase } from '../../application/use-cases/rechazar-edicion-pedido-admin.use-case';
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
    private readonly aprobarEdicionPedido: AprobarEdicionPedidoAdminUseCase,
    private readonly rechazarEdicionPedido: RechazarEdicionPedidoAdminUseCase,
  ) {}

  /** HU-07 (ronda 6) — `?estado=abierta|aprobada|rechazada|resuelta|todas`,
   * default 'abierta' (comportamiento histórico si no se manda nada). */
  @Get()
  @HttpCode(HttpStatus.OK)
  abiertas(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query('estado') estado?: string,
  ) {
    return this.listarNovedadesAbiertas.execute(identidad.usuarioId, estado);
  }

  @Post(':id/resolver')
  @HttpCode(HttpStatus.OK)
  resolver(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) novedadId: string,
  ) {
    return this.resolverNovedad.execute(identidad.usuarioId, novedadId);
  }

  /** HU-07 (ronda 3) — aplica los datos propuestos de una novedad tipo
   * 'edicion' al pedido y la cierra. */
  @Post(':id/aprobar-edicion')
  @HttpCode(HttpStatus.OK)
  aprobarEdicion(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) novedadId: string,
  ) {
    return this.aprobarEdicionPedido.execute(identidad.usuarioId, novedadId);
  }

  /** HU-07 (ronda 3) — cierra una novedad tipo 'edicion' sin tocar el
   * pedido. */
  @Post(':id/rechazar-edicion')
  @HttpCode(HttpStatus.OK)
  rechazarEdicion(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) novedadId: string,
  ) {
    return this.rechazarEdicionPedido.execute(identidad.usuarioId, novedadId);
  }
}
