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
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { AsignarDomiciliarioAdminUseCase } from '../../application/use-cases/asignar-domiciliario-admin.use-case';
import { ListarDomiciliariosCercanosAdminUseCase } from '../../application/use-cases/listar-domiciliarios-cercanos-admin.use-case';
import { ListarPedidosAdminUseCase } from '../../application/use-cases/listar-pedidos-admin.use-case';
import { ObtenerDetallePedidoAdminUseCase } from '../../application/use-cases/obtener-detalle-pedido-admin.use-case';
import { RegenerarCodigoEntregaAdminUseCase } from '../../application/use-cases/regenerar-codigo-entrega-admin.use-case';
import { ReenviarCodigoEntregaCorreoAdminUseCase } from '../../application/use-cases/reenviar-codigo-entrega-correo-admin.use-case';
import { AsignarDomiciliarioAdminDto } from '../dtos/asignar-domiciliario-admin.dto';
import { FiltrarPedidosAdminDto } from '../dtos/filtrar-pedidos-admin.dto';

/** Panel admin — "ver y filtrar pedidos" + detalle de cada uno +, para
 * un pedido demorado sin domiciliario, ver candidatos cercanos y
 * asignar uno a mano. Solo Administrador/Root, mismo patrón que
 * `NovedadesAdminController`/`DomiciliariosAdminController`. */
@Controller('admin/pedidos')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class PedidosAdminController {
  constructor(
    private readonly listarPedidosAdmin: ListarPedidosAdminUseCase,
    private readonly obtenerDetallePedidoAdmin: ObtenerDetallePedidoAdminUseCase,
    private readonly listarDomiciliariosCercanos: ListarDomiciliariosCercanosAdminUseCase,
    private readonly asignarDomiciliario: AsignarDomiciliarioAdminUseCase,
    private readonly regenerarCodigoEntrega: RegenerarCodigoEntregaAdminUseCase,
    private readonly reenviarCodigoEntregaCorreo: ReenviarCodigoEntregaCorreoAdminUseCase,
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
    return this.obtenerDetallePedidoAdmin.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  @Get(':id/domiciliarios-cercanos')
  @HttpCode(HttpStatus.OK)
  domiciliariosCercanos(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.listarDomiciliariosCercanos.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  @Post(':id/asignar')
  @HttpCode(HttpStatus.OK)
  asignar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: AsignarDomiciliarioAdminDto,
  ) {
    return this.asignarDomiciliario.execute(
      identidad.usuarioId,
      solicitudId,
      dto.domiciliarioId,
    );
  }

  /** HU-07 (ronda 3) — el paciente reportó no ver su código de entrega;
   * el admin genera uno nuevo. */
  @Post(':id/regenerar-codigo')
  @HttpCode(HttpStatus.OK)
  regenerarCodigo(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.regenerarCodigoEntrega.execute(identidad.usuarioId, solicitudId);
  }

  /** HU-07 (ronda 3) — reenvía por correo el código de entrega vigente
   * (sin regenerarlo). */
  @Post(':id/reenviar-codigo-correo')
  @HttpCode(HttpStatus.OK)
  reenviarCodigoCorreo(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.reenviarCodigoEntregaCorreo.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }
}
