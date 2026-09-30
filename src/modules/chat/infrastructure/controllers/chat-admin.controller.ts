import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { IdentidadAutenticada } from '../../../usuarios/domain/identidad-autenticada';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { UsuarioAutenticado } from '../../../usuarios/infrastructure/decorators/usuario-autenticado.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ListarMensajesChatAdminUseCase } from '../../application/use-cases/listar-mensajes-chat-admin.use-case';

/** Auditoría del Admin — solo lectura, mismo patrón/roles que
 * `PedidosAdminController`. Sin caja de envío (decisión tomada): el
 * Admin ve la conversación, no interviene en esta versión. */
@Controller('admin/chat')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR', 'ROOT')
export class ChatAdminController {
  constructor(private readonly listarMensajesAdmin: ListarMensajesChatAdminUseCase) {}

  @Get('pedido/:solicitudId')
  @HttpCode(HttpStatus.OK)
  listar(
    @UsuarioAutenticado() identidad: IdentidadAutenticada,
    @Param('solicitudId', ParseUUIDPipe) solicitudId: string,
  ) {
    return this.listarMensajesAdmin.execute(identidad.usuarioId, solicitudId);
  }
}
