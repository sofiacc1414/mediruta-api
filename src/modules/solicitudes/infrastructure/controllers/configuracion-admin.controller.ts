import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ActualizarConfiguracionAdminUseCase } from '../../application/use-cases/actualizar-configuracion-admin.use-case';
import { EliminarNivelCopagoAdminUseCase } from '../../application/use-cases/eliminar-nivel-copago-admin.use-case';
import { GuardarNivelCopagoAdminUseCase } from '../../application/use-cases/guardar-nivel-copago-admin.use-case';
import { ListarNivelesCopagoAdminUseCase } from '../../application/use-cases/listar-niveles-copago-admin.use-case';
import { ObtenerConfiguracionAdminUseCase } from '../../application/use-cases/obtener-configuracion-admin.use-case';
import { ActualizarConfiguracionAdminDto } from '../dtos/actualizar-configuracion-admin.dto';
import { GuardarNivelCopagoAdminDto } from '../dtos/guardar-nivel-copago-admin.dto';

/** Panel admin — umbral (en minutos) que dispara la alarma de "pedido
 * demorado sin domiciliario" en `PedidosAdminController`, parámetros
 * del costo de domicilio, y el catálogo de niveles de copago propio de
 * MediRuta (no el copago real de EPS) — todo configurable, no fijo en
 * código. Ver `CalcularPrecioPedidoUseCase` para la fórmula. */
@Controller('admin/configuracion')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class ConfiguracionAdminController {
  constructor(
    private readonly obtenerConfiguracion: ObtenerConfiguracionAdminUseCase,
    private readonly actualizarConfiguracion: ActualizarConfiguracionAdminUseCase,
    private readonly listarNivelesCopago: ListarNivelesCopagoAdminUseCase,
    private readonly guardarNivelCopago: GuardarNivelCopagoAdminUseCase,
    private readonly eliminarNivelCopago: EliminarNivelCopagoAdminUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  obtener(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerConfiguracion.execute(identidad.usuarioId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  actualizar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: ActualizarConfiguracionAdminDto,
  ) {
    return this.actualizarConfiguracion.execute(
      identidad.usuarioId,
      dto.umbralMinutos,
      {
        tarifaBaseDomicilio: dto.tarifaBaseDomicilio,
        tarifaPorKm: dto.tarifaPorKm,
        tarifaPorMinuto: dto.tarifaPorMinuto,
        tiempoBaseFarmaciaMin: dto.tiempoBaseFarmaciaMin,
        velocidadPromedioKmh: dto.velocidadPromedioKmh,
        distanciaIncluidaKm: dto.distanciaIncluidaKm,
        tarifaPorKmExcedente: dto.tarifaPorKmExcedente,
      },
    );
  }

  @Get('niveles-copago')
  @HttpCode(HttpStatus.OK)
  nivelesCopago(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarNivelesCopago.execute(identidad.usuarioId);
  }

  @Post('niveles-copago')
  @HttpCode(HttpStatus.CREATED)
  crearNivelCopago(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: GuardarNivelCopagoAdminDto,
  ) {
    return this.guardarNivelCopago.execute(
      identidad.usuarioId,
      null,
      dto.nombre,
      dto.copago,
      dto.orden ?? 0,
    );
  }

  @Put('niveles-copago/:id')
  @HttpCode(HttpStatus.OK)
  actualizarNivelCopago(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarNivelCopagoAdminDto,
  ) {
    return this.guardarNivelCopago.execute(
      identidad.usuarioId,
      id,
      dto.nombre,
      dto.copago,
      dto.orden ?? 0,
    );
  }

  @Delete('niveles-copago/:id')
  @HttpCode(HttpStatus.OK)
  eliminarNivelCopagoAction(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eliminarNivelCopago.execute(identidad.usuarioId, id);
  }
}
