import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActualizarDatosComunesUseCase } from '../../application/use-cases/actualizar-datos-comunes.use-case';
import { ActualizarPerfilDomiciliarioUseCase } from '../../application/use-cases/actualizar-perfil-domiciliario.use-case';
import { ActualizarPerfilPacienteUseCase } from '../../application/use-cases/actualizar-perfil-paciente.use-case';
import { DesactivarCuentaUseCase } from '../../application/use-cases/desactivar-cuenta.use-case';
import { ObtenerPerfilUseCase } from '../../application/use-cases/obtener-perfil.use-case';
import { SolicitarRolDomiciliarioUseCase } from '../../application/use-cases/solicitar-rol-domiciliario.use-case';
import { SolicitarRolPacienteUseCase } from '../../application/use-cases/solicitar-rol-paciente.use-case';
import { SubirDocumentoDomiciliarioUseCase } from '../../application/use-cases/subir-documento-domiciliario.use-case';
import { SubirFotoCedulaPacienteUseCase } from '../../application/use-cases/subir-foto-cedula-paciente.use-case';
import { SubirFotoPerfilUseCase } from '../../application/use-cases/subir-foto-perfil.use-case';
import type { IdentidadAutenticada } from '../../domain/identidad-autenticada';
import { UsuarioAutenticado } from '../decorators/usuario-autenticado.decorator';
import { ActualizarDatosComunesDto } from '../dtos/actualizar-datos-comunes.dto';
import { ActualizarPerfilDomiciliarioDto } from '../dtos/actualizar-perfil-domiciliario.dto';
import { ActualizarPerfilPacienteDto } from '../dtos/actualizar-perfil-paciente.dto';
import { SubirDocumentoDomiciliarioDto } from '../dtos/subir-documento-domiciliario.dto';
import { DominioHttpFilter } from '../filters/dominio-http.filter';
import { AccessAuthGuard } from '../guards/access-auth.guard';

const VALIDADOR_ARCHIVO = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: /^(image\/jpeg|image\/png|application\/pdf)$/,
  })
  .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
  .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST });

@Controller('perfil')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard)
export class PerfilController {
  constructor(
    private readonly obtenerPerfil: ObtenerPerfilUseCase,
    private readonly actualizarDatosComunes: ActualizarDatosComunesUseCase,
    private readonly actualizarPerfilPaciente: ActualizarPerfilPacienteUseCase,
    private readonly subirFotoCedulaPaciente: SubirFotoCedulaPacienteUseCase,
    private readonly subirFotoPerfil: SubirFotoPerfilUseCase,
    private readonly actualizarPerfilDomiciliario: ActualizarPerfilDomiciliarioUseCase,
    private readonly subirDocumentoDomiciliario: SubirDocumentoDomiciliarioUseCase,
    private readonly desactivarCuenta: DesactivarCuentaUseCase,
    private readonly solicitarRolPaciente: SolicitarRolPacienteUseCase,
    private readonly solicitarRolDomiciliario: SolicitarRolDomiciliarioUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  obtener(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.obtenerPerfil.execute(identidad.usuarioId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  actualizarComunes(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: ActualizarDatosComunesDto,
  ) {
    return this.actualizarDatosComunes.execute({
      usuarioId: identidad.usuarioId,
      nombreCompleto: dto.nombreCompleto,
      telefono: dto.telefono,
    });
  }

  @Patch('paciente')
  @HttpCode(HttpStatus.OK)
  actualizarPaciente(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: ActualizarPerfilPacienteDto,
  ) {
    return this.actualizarPerfilPaciente.execute({
      usuarioId: identidad.usuarioId,
      direccion: dto.direccion,
      fechaNacimiento: dto.fechaNacimiento,
    });
  }

  @Post('paciente/foto-cedula')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo'))
  subirFotoCedula(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @UploadedFile(VALIDADOR_ARCHIVO) archivo: Express.Multer.File,
  ) {
    return this.subirFotoCedulaPaciente.execute({
      usuarioId: identidad.usuarioId,
      contenido: archivo.buffer,
      contentType: archivo.mimetype,
      extension: extensionDesde(archivo.mimetype),
    });
  }

  @Post('foto')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo'))
  subirFoto(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @UploadedFile(VALIDADOR_ARCHIVO) archivo: Express.Multer.File,
  ) {
    return this.subirFotoPerfil.execute({
      usuarioId: identidad.usuarioId,
      contenido: archivo.buffer,
      contentType: archivo.mimetype,
      extension: extensionDesde(archivo.mimetype),
    });
  }

  @Patch('domiciliario')
  @HttpCode(HttpStatus.OK)
  actualizarDomiciliario(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: ActualizarPerfilDomiciliarioDto,
  ) {
    return this.actualizarPerfilDomiciliario.execute({
      usuarioId: identidad.usuarioId,
      direccion: dto.direccion,
      vehiculoTipo: dto.vehiculoTipo,
      vehiculoPlaca: dto.vehiculoPlaca,
    });
  }

  @Post('domiciliario/documentos')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo'))
  subirDocumento(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: SubirDocumentoDomiciliarioDto,
    @UploadedFile(VALIDADOR_ARCHIVO) archivo: Express.Multer.File,
  ) {
    return this.subirDocumentoDomiciliario.execute({
      usuarioId: identidad.usuarioId,
      tipo: dto.tipo,
      contenido: archivo.buffer,
      contentType: archivo.mimetype,
      extension: extensionDesde(archivo.mimetype),
    });
  }

  @Post('paciente/solicitar')
  @HttpCode(HttpStatus.OK)
  solicitarPaciente(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.solicitarRolPaciente.execute(identidad.usuarioId);
  }

  @Post('domiciliario/solicitar')
  @HttpCode(HttpStatus.OK)
  solicitarDomiciliario(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    return this.solicitarRolDomiciliario.execute(identidad.usuarioId);
  }

  @Post('desactivar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async desactivar(@UsuarioAutenticado() identidad: IdentidadAutenticada) {
    await this.desactivarCuenta.execute({
      usuarioId: identidad.usuarioId,
      sid: identidad.sid,
    });
  }
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
