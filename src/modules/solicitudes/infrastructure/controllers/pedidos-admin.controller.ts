import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { ListarPedidosAdminUseCase } from '../../application/use-cases/listar-pedidos-admin.use-case';
import { ObtenerDetallePedidoAdminUseCase } from '../../application/use-cases/obtener-detalle-pedido-admin.use-case';
import { FiltrarPedidosAdminDto } from '../dtos/filtrar-pedidos-admin.dto';

/** Panel admin — "ver y filtrar pedidos" + detalle de cada uno. Solo
 * Administrador/Root, mismo patrón que `NovedadesAdminController`/
 * `DomiciliariosAdminController`. */
@Controller('admin/pedidos')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class PedidosAdminController {
  constructor(
    private readonly listarPedidosAdmin: ListarPedidosAdminUseCase,
    private readonly obtenerDetallePedidoAdmin: ObtenerDetallePedidoAdminUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() filtros: FiltrarPedidosAdminDto,
  ) {
    return this.listarPedidosAdmin.execute(identidad.usuarioId, filtros);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.obtenerDetallePedidoAdmin.execute(identidad.usuarioId, solicitudId);
  }
}
