import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { ListarResumenComportamientoAdminUseCase } from '../../application/use-cases/listar-resumen-comportamiento-admin.use-case';
import { ObtenerDetalleComportamientoAdminUseCase } from '../../application/use-cases/obtener-detalle-comportamiento-admin.use-case';
import { RangoFechasDto } from '../dtos/rango-fechas.dto';

/** G01-G05 — panel admin: comportamiento operativo de los
 * domiciliarios (entregas, cancelaciones, incidentes, calificaciones),
 * para detectar patrones inusuales y, desde ahí, bloquear/reactivar la
 * cuenta en `UsuariosModule` (G04 — este módulo no gestiona permisos,
 * solo lee comportamiento; el link de acción vive en el panel). */
@Controller('admin/domiciliarios/comportamiento')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class ComportamientoDomiciliariosAdminController {
  constructor(
    private readonly listarResumen: ListarResumenComportamientoAdminUseCase,
    private readonly obtenerDetalle: ObtenerDetalleComportamientoAdminUseCase,
  ) {}

  /** G01/G03. */
  @Get()
  @HttpCode(HttpStatus.OK)
  listar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() query: RangoFechasDto,
  ) {
    return this.listarResumen.execute(
      identidad.usuarioId,
      query.desde,
      query.hasta,
    );
  }

  /** G02 — 404 si el id no corresponde a un domiciliario habilitado
   * (distinto de G05, que es un domiciliario real sin actividad: ese
   * caso llega con 200 y los contadores en cero). */
  @Get(':domiciliarioId')
  @HttpCode(HttpStatus.OK)
  async detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('domiciliarioId', ParseUUIDPipe) domiciliarioId: string,
    @Query() query: RangoFechasDto,
  ) {
    const detalle = await this.obtenerDetalle.execute(
      identidad.usuarioId,
      domiciliarioId,
      query.desde,
      query.hasta,
    );
    if (!detalle) {
      throw new NotFoundException('Domiciliario no encontrado.');
    }
    return detalle;
  }
}
