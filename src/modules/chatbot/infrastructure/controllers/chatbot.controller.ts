import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UseGuards } from '@nestjs/common';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { ProcesarMensajeChatbotUseCase } from '../../application/use-cases/procesar-mensaje-chatbot.use-case';
import { MensajeChatbotDto } from '../dtos/mensaje-chatbot.dto';

/** Módulo 2 — cualquier usuario autenticado (Paciente o Domiciliario)
 * puede preguntarle al chatbot, no está restringido por rol.
 * `@UseFilters` es obligatorio acá — sin él, `NoAutorizadoError` (y
 * cualquier otro error de dominio) cae al manejador genérico de Nest
 * en vez del 401/403 que la app espera (mismo bug real ya encontrado
 * una vez con `FueraDeUbicacionAutorizadaError`, esta vez por
 * controlador completo sin el filtro en vez de un error sin cablear). */
@Controller('chatbot')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard)
export class ChatbotController {
  constructor(private readonly procesarMensaje: ProcesarMensajeChatbotUseCase) {}

  @Post('mensaje')
  @HttpCode(HttpStatus.OK)
  mensaje(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Body() dto: MensajeChatbotDto,
  ) {
    return this.procesarMensaje.execute({
      usuarioId: identidad.usuarioId,
      mensaje: dto.mensaje,
      eps: dto.eps,
      regimen: dto.regimen,
      rangoIngresos: dto.rangoIngresos,
      intentosSinExitoSeguidos: dto.intentosSinExitoSeguidos,
    });
  }
}
