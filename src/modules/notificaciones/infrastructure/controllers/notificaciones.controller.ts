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
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { ListarNotificacionesUseCase } from '../../application/use-cases/listar-notificaciones.use-case';
import { MarcarNotificacionLeidaUseCase } from '../../application/use-cases/marcar-notificacion-leida.use-case';
import { RegistrarDispositivoPushUseCase } from '../../application/use-cases/registrar-dispositivo-push.use-case';

class RegistrarDispositivoDto {
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  token!: string;

  @IsIn(['android', 'ios'])
  plataforma!: string;
}

@Controller('notificaciones')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard)
export class NotificacionesController {
  constructor(
    private readonly listar: ListarNotificacionesUseCase,
    private readonly marcarLeida: MarcarNotificacionLeidaUseCase,
    private readonly registrarDispositivo: RegistrarDispositivoPushUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  listarPropias(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listar.execute(identidad.usuarioId);
  }

  @Post('dispositivo')
  @HttpCode(HttpStatus.OK)
  async dispositivo(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: RegistrarDispositivoDto,
  ) {
    await this.registrarDispositivo.execute(
      identidad.usuarioId,
      dto.token,
      dto.plataforma,
    );
    return { registrado: true };
  }

  @Post(':id/leida')
  @HttpCode(HttpStatus.OK)
  async marcar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const marcada = await this.marcarLeida.execute(identidad.usuarioId, id);
    return { marcada };
  }
}
