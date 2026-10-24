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
import { ListarPagadoPeriodoAdminUseCase } from '../../application/use-cases/listar-pagado-periodo-admin.use-case';
import { ListarWalletsAdminUseCase } from '../../application/use-cases/listar-wallets-admin.use-case';
import { LiquidarDeudaAdminUseCase } from '../../application/use-cases/liquidar-deuda-admin.use-case';
import { LiquidarLoteAdminUseCase } from '../../application/use-cases/liquidar-lote-admin.use-case';
import { LiquidarSaldoAdminUseCase } from '../../application/use-cases/liquidar-saldo-admin.use-case';
import { ObtenerInformePagosAdminUseCase } from '../../application/use-cases/obtener-informe-pagos-admin.use-case';
import { LiquidarLoteAdminDto } from '../dtos/liquidar-lote-admin.dto';
import { RangoFechasDto } from '../dtos/rango-fechas.dto';

/** Módulo 3 — panel admin: ver la billetera de cada Domiciliario (lo
 * que debe en efectivo, lo que la empresa le debe en tarjeta/
 * transferencia) y liquidar una u otra cosa, individual o en lote, más
 * el informe global tipo "Z". */
@Controller('admin/wallets')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class WalletAdminController {
  constructor(
    private readonly listarWallets: ListarWalletsAdminUseCase,
    private readonly liquidarDeuda: LiquidarDeudaAdminUseCase,
    private readonly liquidarSaldo: LiquidarSaldoAdminUseCase,
    private readonly liquidarLote: LiquidarLoteAdminUseCase,
    private readonly obtenerInformePagos: ObtenerInformePagosAdminUseCase,
    private readonly listarPagadoPeriodo: ListarPagadoPeriodoAdminUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarWallets.execute(identidad.usuarioId);
  }

  /** Informe global tipo "Z" — ruta literal declarada antes de
   * `:domiciliarioId/...` para que no la intercepte ese parámetro. */
  @Get('informe')
  @HttpCode(HttpStatus.OK)
  informe(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() query: RangoFechasDto,
  ) {
    return this.obtenerInformePagos.execute(
      identidad.usuarioId,
      query.desde,
      query.hasta,
    );
  }

  /** Columna "Pagado en el periodo" de la tabla de billeteras —
   * también ruta literal, mismo motivo que `informe`. */
  @Get('pagado-periodo')
  @HttpCode(HttpStatus.OK)
  pagadoPeriodo(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Query() query: RangoFechasDto,
  ) {
    return this.listarPagadoPeriodo.execute(
      identidad.usuarioId,
      query.desde,
      query.hasta,
    );
  }

  @Post(':domiciliarioId/liquidar-deuda')
  @HttpCode(HttpStatus.OK)
  liquidar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('domiciliarioId', ParseUUIDPipe) domiciliarioId: string,
  ) {
    return this.liquidarDeuda.execute(identidad.usuarioId, domiciliarioId);
  }

  /** La empresa le paga al Domiciliario el saldo pendiente de tarjeta/
   * transferencia. */
  @Post(':domiciliarioId/liquidar-saldo')
  @HttpCode(HttpStatus.OK)
  liquidarSaldoAction(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('domiciliarioId', ParseUUIDPipe) domiciliarioId: string,
  ) {
    return this.liquidarSaldo.execute(identidad.usuarioId, domiciliarioId);
  }

  /** Deuda o saldo, para varios Domiciliarios de una. */
  @Post('liquidar-lote')
  @HttpCode(HttpStatus.OK)
  liquidarLoteAction(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: LiquidarLoteAdminDto,
  ) {
    return this.liquidarLote.execute(
      identidad.usuarioId,
      dto.tipo,
      dto.domiciliarioIds,
    );
  }
}
