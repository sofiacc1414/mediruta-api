import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { ObtenerWalletPeriodoUseCase } from '../../application/use-cases/obtener-wallet-periodo.use-case';
import { ObtenerWalletUseCase } from '../../application/use-cases/obtener-wallet.use-case';
import { RangoFechasDto } from '../dtos/rango-fechas.dto';

/** Módulo 3 — el Domiciliario ve su propio saldo (cobrado/pendiente/
 * deuda) y la deuda de efectivo que debe liquidar antes de que lo
 * bloqueen (o ya lo bloqueó, ver `bloqueadoPorTope`). */
@Controller('wallet')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('DOMICILIARIO')
export class WalletController {
  constructor(
    private readonly obtenerWallet: ObtenerWalletUseCase,
    private readonly obtenerWalletPeriodo: ObtenerWalletPeriodoUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  obtener(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerWallet.execute(identidad.usuarioId);
  }

  /** Balance recalculado para el rango de fechas elegido — no es el
   * acumulado histórico de arriba. */
  @Get('periodo')
  @HttpCode(HttpStatus.OK)
  periodo(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() query: RangoFechasDto,
  ) {
    return this.obtenerWalletPeriodo.execute(
      identidad.usuarioId,
      query.desde,
      query.hasta,
    );
  }
}
