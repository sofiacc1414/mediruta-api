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
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { AceptarPedidoUseCase } from '../../application/use-cases/aceptar-pedido.use-case';
import { EntregarPedidoUseCase } from '../../application/use-cases/entregar-pedido.use-case';
import { IniciarEntregaUseCase } from '../../application/use-cases/iniciar-entrega.use-case';
import { ListarHistorialPedidosUseCase } from '../../application/use-cases/listar-historial-pedidos.use-case';
import { ListarNovedadesSolicitudDomiciliarioUseCase } from '../../application/use-cases/listar-novedades-solicitud-domiciliario.use-case';
import { ObtenerDocumentosPacienteParaRecogerUseCase } from '../../application/use-cases/obtener-documentos-paciente-para-recoger.use-case';
import { ListarPedidosDisponiblesUseCase } from '../../application/use-cases/listar-pedidos-disponibles.use-case';
import { MarcarEnSitioUseCase } from '../../application/use-cases/marcar-en-sitio.use-case';
import { MarcarMedicamentosRecogidosUseCase } from '../../application/use-cases/marcar-medicamentos-recogidos.use-case';
import { ObtenerPedidoActivoUseCase } from '../../application/use-cases/obtener-pedido-activo.use-case';
import { ObtenerPedidoDomiciliarioUseCase } from '../../application/use-cases/obtener-pedido-domiciliario.use-case';
import { ReportarNovedadUseCase } from '../../application/use-cases/reportar-novedad.use-case';
import { EntregarPedidoDto } from '../dtos/entregar-pedido.dto';
import { ReportarNovedadDto } from '../dtos/reportar-novedad.dto';

/** HU-09/HU-07 — solo Domiciliario. Una vez que el paciente envía un
 * pedido (`SolicitudesController`, /solicitudes), de acá en más lo
 * recorre el Domiciliario asignado — mismo recurso (`solicitudes`),
 * distinto rol, por eso es un controller aparte con su propio
 * `@Roles`, no una sección más de `SolicitudesController`. */
@Controller('pedidos')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('DOMICILIARIO')
export class PedidosDomiciliarioController {
  constructor(
    private readonly listarPedidosDisponibles: ListarPedidosDisponiblesUseCase,
    private readonly aceptarPedido: AceptarPedidoUseCase,
    private readonly marcarMedicamentosRecogidos: MarcarMedicamentosRecogidosUseCase,
    private readonly iniciarEntrega: IniciarEntregaUseCase,
    private readonly marcarEnSitio: MarcarEnSitioUseCase,
    private readonly entregarPedido: EntregarPedidoUseCase,
    private readonly reportarNovedad: ReportarNovedadUseCase,
    private readonly obtenerPedidoActivo: ObtenerPedidoActivoUseCase,
    private readonly obtenerPedidoDomiciliario: ObtenerPedidoDomiciliarioUseCase,
    private readonly listarHistorialPedidos: ListarHistorialPedidosUseCase,
    private readonly obtenerDocumentosPacienteParaRecoger: ObtenerDocumentosPacienteParaRecogerUseCase,
    private readonly listarNovedadesSolicitudDomiciliario: ListarNovedadesSolicitudDomiciliarioUseCase,
  ) {}

  @Get('disponibles')
  @HttpCode(HttpStatus.OK)
  disponibles(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarPedidosDisponibles.execute(identidad.usuarioId);
  }

  /** "Mis pedidos" del Domiciliario — todos los que aceptó alguna vez. */
  @Get('historial')
  @HttpCode(HttpStatus.OK)
  historial(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarHistorialPedidos.execute(identidad.usuarioId);
  }

  /** "Mi pedido activo" — antes de `/disponibles`/rutas con `:id` para
   * que no haya ambigüedad, aunque acá no colisiona (Nest resuelve
   * rutas literales antes que las con parámetro de todas formas). */
  @Get('mi-activo')
  @HttpCode(HttpStatus.OK)
  miActivo(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerPedidoActivo.execute(identidad.usuarioId);
  }

  /** Detalle de solo lectura de un pedido puntual del Historial (tab
   * "Mis pedidos" — entregado o cancelado). Mismo shape que
   * "mi-activo", sin restricción de estado. */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  pedidoPorId(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.obtenerPedidoDomiciliario.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  /** HU-07/HU-09 — cédula del Paciente (ambos lados), para mostrar en
   * la farmacia al reclamar el medicamento. Solo devuelve algo mientras
   * el pedido está `asignado_en_camino_farmacia` — ver
   * `ObtenerDocumentosPacienteParaRecogerUseCase`. */
  @Get(':id/documentos-paciente')
  @HttpCode(HttpStatus.OK)
  documentosPaciente(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.obtenerDocumentosPacienteParaRecoger.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  @Post(':id/aceptar')
  @HttpCode(HttpStatus.OK)
  aceptar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.aceptarPedido.execute(identidad.usuarioId, solicitudId);
  }

  @Post(':id/recogido')
  @HttpCode(HttpStatus.OK)
  recogido(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.marcarMedicamentosRecogidos.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  @Post(':id/iniciar-entrega')
  @HttpCode(HttpStatus.OK)
  iniciarEntregaAction(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.iniciarEntrega.execute(identidad.usuarioId, solicitudId);
  }

  @Post(':id/en-sitio')
  @HttpCode(HttpStatus.OK)
  enSitio(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.marcarEnSitio.execute(identidad.usuarioId, solicitudId);
  }

  @Post(':id/entregar')
  @HttpCode(HttpStatus.OK)
  entregar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: EntregarPedidoDto,
  ) {
    return this.entregarPedido.execute(
      identidad.usuarioId,
      solicitudId,
      dto.codigo,
    );
  }

  /** HU-07/HU-09 (ronda 7) — tab "Novedades" del pedido activo: todas
   * las que hay sobre ese pedido, resueltas o no. */
  @Get(':id/novedades')
  @HttpCode(HttpStatus.OK)
  novedades(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.listarNovedadesSolicitudDomiciliario.execute(
      identidad.usuarioId,
      solicitudId,
    );
  }

  @Post(':id/novedad')
  @HttpCode(HttpStatus.OK)
  novedad(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: ReportarNovedadDto,
  ) {
    return this.reportarNovedad.execute(
      identidad.usuarioId,
      solicitudId,
      dto.detalle,
    );
  }
}
