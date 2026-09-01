import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { ReportarCodigoNoGeneradoUseCase } from '../../application/use-cases/reportar-codigo-no-generado.use-case';
import { ReportarNovedadPacienteUseCase } from '../../application/use-cases/reportar-novedad-paciente.use-case';
import { SolicitarEdicionPedidoUseCase } from '../../application/use-cases/solicitar-edicion-pedido.use-case';
import { SubirRecetaUseCase } from '../../application/use-cases/subir-receta.use-case';
import { Medicamento } from '../../domain/ports/solicitud.repository.port';
import { DatosSolicitudDto } from '../dtos/datos-solicitud.dto';
import { MedicamentoDto } from '../dtos/medicamento.dto';
import { ReportarCodigoNoGeneradoDto } from '../dtos/reportar-codigo-no-generado.dto';
import { ReportarNovedadDto } from '../dtos/reportar-novedad.dto';
import { SolicitarEdicionPedidoDto } from '../dtos/solicitar-edicion-pedido.dto';

const VALIDADOR_ARCHIVO = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: /^(image\/jpeg|image\/png|application\/pdf)$/,
  })
  .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
  .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST });

function medicamentosDesde(dtos: MedicamentoDto[] | undefined): Medicamento[] {
  return (dtos ?? []).map((dto) => ({
    nombre: dto.nombre ?? null,
    concentracion: dto.concentracion ?? null,
    formaFarmaceutica: dto.formaFarmaceutica ?? null,
    cantidad: dto.cantidad ?? null,
    posologia: dto.posologia ?? null,
  }));
}

function extensionDesde(mimetype: string): string {
  switch (mimetype) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
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
    private readonly subirReceta: SubirRecetaUseCase,
    private readonly enviarSolicitud: EnviarSolicitudUseCase,
    private readonly cancelarSolicitud: CancelarSolicitudUseCase,
    private readonly reportarNovedadPaciente: ReportarNovedadPacienteUseCase,
    private readonly solicitarEdicionPedido: SolicitarEdicionPedidoUseCase,
    private readonly reportarCodigoNoGenerado: ReportarCodigoNoGeneradoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  crear(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: DatosSolicitudDto,
  ) {
    return this.crearSolicitud.execute({
      pacienteId: identidad.usuarioId,
      medicamentos: medicamentosDesde(dto.medicamentos),
      recetaFechaVencimiento: dto.recetaFechaVencimiento ?? null,
      direccionEntrega: dto.direccionEntrega ?? null,
      direccionFarmacia: dto.direccionFarmacia ?? null,
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
      medicamentos: medicamentosDesde(dto.medicamentos),
      recetaFechaVencimiento: dto.recetaFechaVencimiento ?? null,
      direccionEntrega: dto.direccionEntrega ?? null,
      direccionFarmacia: dto.direccionFarmacia ?? null,
    });
  }

  @Post(':id/receta')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo'))
  subirFotoReceta(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @UploadedFile(VALIDADOR_ARCHIVO) archivo: Express.Multer.File,
  ) {
    return this.subirReceta.execute({
      pacienteId: identidad.usuarioId,
      solicitudId,
      contenido: archivo.buffer,
      contentType: archivo.mimetype,
      extension: extensionDesde(archivo.mimetype),
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

  /** HU-07 (ronda 2) — el Paciente también puede reportar una novedad
   * sobre su propio pedido (antes solo el Domiciliario podía). */
  @Post(':id/novedad')
  @HttpCode(HttpStatus.OK)
  novedad(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: ReportarNovedadDto,
  ) {
    return this.reportarNovedadPaciente.execute(
      identidad.usuarioId,
      solicitudId,
      dto.detalle,
    );
  }

  /** HU-07 (ronda 3) — el Paciente pide corregir dirección de entrega
   * y/o de farmacia de un pedido ya enviado. Queda pendiente de
   * aprobación del admin, no se aplica al instante. */
  @Post(':id/solicitar-edicion')
  @HttpCode(HttpStatus.OK)
  solicitarEdicion(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: SolicitarEdicionPedidoDto,
  ) {
    return this.solicitarEdicionPedido.execute(
      identidad.usuarioId,
      solicitudId,
      dto.direccionEntrega ?? null,
      dto.direccionFarmacia ?? null,
      dto.detalle ?? null,
    );
  }

  /** HU-07 (ronda 3) — el Paciente reporta que el código de entrega no
   * se generó o no lo ve en su pantalla. */
  @Post(':id/reportar-codigo-no-generado')
  @HttpCode(HttpStatus.OK)
  reportarCodigoNoGeneradoAction(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('id', ParseUUIDPipe) solicitudId: string,
    @Body() dto: ReportarCodigoNoGeneradoDto,
  ) {
    return this.reportarCodigoNoGenerado.execute(
      identidad.usuarioId,
      solicitudId,
      dto.detalle ?? null,
    );
  }
}
