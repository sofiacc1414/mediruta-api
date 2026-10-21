import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { EliminarFarmaciaAliadaAdminUseCase } from '../../application/use-cases/eliminar-farmacia-aliada-admin.use-case';
import { GuardarFarmaciaAliadaAdminUseCase } from '../../application/use-cases/guardar-farmacia-aliada-admin.use-case';
import { ListarFarmaciasAliadasAdminUseCase } from '../../application/use-cases/listar-farmacias-aliadas-admin.use-case';
import { GuardarFarmaciaAliadaAdminDto } from '../dtos/guardar-farmacia-aliada-admin.dto';

/** Módulo 2 (Chatbot) — panel admin, catálogo de farmacias aliadas por
 * EPS (CA1: "¿cuáles son las farmacias de mi EPS?"). Editable porque,
 * a diferencia de los copagos (regulados por el Gobierno), esta
 * información cambia seguido en la vida real. */
@Controller('admin/farmacias-aliadas')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class FarmaciasAliadasAdminController {
  constructor(
    private readonly listarFarmaciasAliadas: ListarFarmaciasAliadasAdminUseCase,
    private readonly guardarFarmaciaAliada: GuardarFarmaciaAliadaAdminUseCase,
    private readonly eliminarFarmaciaAliada: EliminarFarmaciaAliadaAdminUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarFarmaciasAliadas.execute(identidad.usuarioId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  crear(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: GuardarFarmaciaAliadaAdminDto,
  ) {
    return this.guardarFarmaciaAliada.execute(
      identidad.usuarioId,
      null,
      dto.eps,
      dto.nombreFarmacia,
      dto.ciudad,
      dto.departamento ?? null,
      dto.direccion ?? null,
      dto.telefono ?? null,
      dto.activo ?? true,
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarFarmaciaAliadaAdminDto,
  ) {
    return this.guardarFarmaciaAliada.execute(
      identidad.usuarioId,
      id,
      dto.eps,
      dto.nombreFarmacia,
      dto.ciudad,
      dto.departamento ?? null,
      dto.direccion ?? null,
      dto.telefono ?? null,
      dto.activo ?? true,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  eliminar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eliminarFarmaciaAliada.execute(identidad.usuarioId, id);
  }
}
