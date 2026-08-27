import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import { ObtenerConfiguracionAdminUseCase } from '../../application/use-cases/obtener-configuracion-admin.use-case';
import { ActualizarConfiguracionAdminDto } from '../dtos/actualizar-configuracion-admin.dto';

/** Panel admin — umbral (en minutos) que dispara la alarma de "pedido
 * demorado sin domiciliario" en `PedidosAdminController`. Configurable
 * por el admin, no fijo en código. */
@Controller('admin/configuracion')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class ConfiguracionAdminController {
  constructor(
    private readonly obtenerConfiguracion: ObtenerConfiguracionAdminUseCase,
    private readonly actualizarConfiguracion: ActualizarConfiguracionAdminUseCase,
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
    );
  }
}
