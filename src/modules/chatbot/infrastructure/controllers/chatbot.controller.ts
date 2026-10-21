import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UseGuards } from '@nestjs/common';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { UsuarioAutenticadoOpcional } from '../../../usuarios/infrastructure/decorators/usuario-autenticado-opcional.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { OptionalAuthGuard } from '../../../usuarios/infrastructure/guards/optional-auth.guard';
import { ProcesarMensajeChatbotUseCase } from '../../application/use-cases/procesar-mensaje-chatbot.use-case';
import { MensajeChatbotDto } from '../dtos/mensaje-chatbot.dto';

/** Módulo 2 — abierto a cualquiera, CON o SIN sesión: dudas de
 * registro/contraseña son justo para gente que todavía no tiene
 * cuenta o no puede entrar. `OptionalAuthGuard` adjunta la identidad
 * si hay una sesión válida, sin bloquear si no la hay — el caso de
 * uso decide qué intenciones necesitan usuario real (ej. farmacias
 * por EPS) y cuáles no (FAQs estáticas, copago).
 *
 * `@UseFilters` es obligatorio acá — sin él, cualquier error de
 * dominio cae al manejador genérico de Nest en vez del código HTTP
 * que la app espera (mismo bug real ya encontrado una vez con
 * `FueraDeUbicacionAutorizadaError`, esta vez por controlador
 * completo sin el filtro en vez de un error sin cablear). */
@Controller('chatbot')
@UseFilters(DominioHttpFilter)
@UseGuards(OptionalAuthGuard)
export class ChatbotController {
  constructor(private readonly procesarMensaje: ProcesarMensajeChatbotUseCase) {}

  @Post('mensaje')
  @HttpCode(HttpStatus.OK)
  mensaje(
    @UsuarioAutenticadoOpcional() identidad: IdentidadAutenticada | null,
    @Body() dto: MensajeChatbotDto,
  ) {
    return this.procesarMensaje.execute({
      usuarioId: identidad?.usuarioId ?? null,
      mensaje: dto.mensaje,
      eps: dto.eps,
      regimen: dto.regimen,
      rangoIngresos: dto.rangoIngresos,
      intentosSinExitoSeguidos: dto.intentosSinExitoSeguidos,
    });
  }
}
