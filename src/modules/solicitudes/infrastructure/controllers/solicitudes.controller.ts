import {
  Body,
  Controller,
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
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ActualizarSolicitudUseCase } from '../../application/use-cases/actualizar-solicitud.use-case';
import { CancelarSolicitudUseCase } from '../../application/use-cases/cancelar-solicitud.use-case';
import { CrearSolicitudUseCase } from '../../application/use-cases/crear-solicitud.use-case';
import { EnviarSolicitudUseCase } from '../../application/use-cases/enviar-solicitud.use-case';
import { ListarSolicitudesUseCase } from '../../application/use-cases/listar-solicitudes.use-case';
import { ObtenerSolicitudUseCase } from '../../application/use-cases/obtener-solicitud.use-case';
import { DatosSolicitud } from '../../domain/ports/solicitud.repository.port';
import { DatosSolicitudDto } from '../dtos/datos-solicitud.dto';

function datosDesde(dto: DatosSolicitudDto): DatosSolicitud {
  return {
    medicamentoNombre: dto.medicamentoNombre ?? null,
    medicamentoConcentracion: dto.medicamentoConcentracion ?? null,
    medicamentoFormaFarmaceutica: dto.medicamentoFormaFarmaceutica ?? null,
    medicamentoCantidad: dto.medicamentoCantidad ?? null,
    medicamentoPosologia: dto.medicamentoPosologia ?? null,
    recetaMedicoNombre: dto.recetaMedicoNombre ?? null,
    recetaMedicoRegistro: dto.recetaMedicoRegistro ?? null,
    recetaIps: dto.recetaIps ?? null,
    recetaFechaExpedicion: dto.recetaFechaExpedicion ?? null,
    direccionEntrega: dto.direccionEntrega ?? null,
  };
}

/** HU-03 — solo Paciente. */
@Controller('solicitudes')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('PACIENTE')
export class SolicitudesController {
  constructor(
    private readonly crearSolicitud: CrearSolicitudUseCase,
    private readonly listarSolicitudes: ListarSolicitudesUseCase,
    private readonly obtenerSolicitud: ObtenerSolicitudUseCase,
    private readonly actualizarSolicitud: ActualizarSolicitudUseCase,
    private readonly enviarSolicitud: EnviarSolicitudUseCase,
    private readonly cancelarSolicitud: CancelarSolicitudUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  crear(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: DatosSolicitudDto,
  ) {
    return this.crearSolicitud.execute({
      pacienteId: identidad.usuarioId,
      ...datosDesde(dto),
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  listar(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.listarSolicitudes.execute(identidad.usuarioId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  detalle(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.obtenerSolicitud.execute(identidad.usuarioId, solicitudId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  actualizar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: DatosSolicitudDto,
  ) {
    return this.actualizarSolicitud.execute({
      pacienteId: identidad.usuarioId,
      solicitudId,
      ...datosDesde(dto),
    });
  }

  @Post(':id/enviar')
  @HttpCode(HttpStatus.OK)
  enviar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.enviarSolicitud.execute(identidad.usuarioId, solicitudId);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.cancelarSolicitud.execute(identidad.usuarioId, solicitudId);
  }
}
