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
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { ActualizarCalificacionUseCase } from '../../application/use-cases/actualizar-calificacion.use-case';
import { ConsultarCalificacionUseCase } from '../../application/use-cases/consultar-calificacion.use-case';
import { CrearCalificacionUseCase } from '../../application/use-cases/crear-calificacion.use-case';
import { RetirarCalificacionUseCase } from '../../application/use-cases/retirar-calificacion.use-case';
import { GuardarCalificacionDto } from '../dtos/guardar-calificacion.dto';
import { CalificacionHttpFilter } from '../filters/calificacion-http.filter';

@Controller('pedidos')
@UseFilters(DominioHttpFilter, CalificacionHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('PACIENTE')
export class CalificacionesController {
  constructor(
    private readonly crear: CrearCalificacionUseCase,
    private readonly consultar: ConsultarCalificacionUseCase,
    private readonly actualizar: ActualizarCalificacionUseCase,
    private readonly retirar: RetirarCalificacionUseCase,
  ) {}

  @Get(':id/calificacion')
  @HttpCode(HttpStatus.OK)
  consultarPropia(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consultar.execute(identidad.usuarioId, id);
  }

  @Post(':id/calificacion')
  @HttpCode(HttpStatus.CREATED)
  crearPropia(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarCalificacionDto,
  ) {
    return this.crear.execute({
      usuarioId: identidad.usuarioId,
      solicitudId: id,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() ? dto.comentario.trim() : null,
    });
  }

  @Patch(':id/calificacion')
  @HttpCode(HttpStatus.OK)
  actualizarPropia(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarCalificacionDto,
  ) {
    return this.actualizar.execute({
      usuarioId: identidad.usuarioId,
      solicitudId: id,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() ? dto.comentario.trim() : null,
    });
  }

  @Delete(':id/calificacion')
  @HttpCode(HttpStatus.OK)
  async retirarPropia(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.retirar.execute(identidad.usuarioId, id);
    return { retirada: true };
  }
}
