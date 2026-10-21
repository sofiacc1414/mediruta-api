import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EliminarFarmaciaAliadaAdminUseCase } from './application/use-cases/eliminar-farmacia-aliada-admin.use-case';
import { GuardarFarmaciaAliadaAdminUseCase } from './application/use-cases/guardar-farmacia-aliada-admin.use-case';
import { ListarFarmaciasAliadasAdminUseCase } from './application/use-cases/listar-farmacias-aliadas-admin.use-case';
import { ListarFarmaciasAliadasPorEpsUseCase } from './application/use-cases/listar-farmacias-aliadas-por-eps.use-case';
import { ProcesarMensajeChatbotUseCase } from './application/use-cases/procesar-mensaje-chatbot.use-case';
import { FarmaciaAliadaRepositoryPort } from './domain/ports/farmacia-aliada.repository.port';
import { IntencionMatcherPort } from './domain/ports/intencion-matcher.port';
import { KeywordIntencionMatcherAdapter } from './infrastructure/adapters/keyword-intencion-matcher.adapter';
import { PostgresFarmaciaAliadaRepository } from './infrastructure/adapters/postgres-farmacia-aliada.repository';
import { ChatbotController } from './infrastructure/controllers/chatbot.controller';
import { FarmaciasAliadasAdminController } from './infrastructure/controllers/farmacias-aliadas-admin.controller';

/** Módulo 2 (Chatbot de preguntas frecuentes / EPS). El clasificador
 * de intenciones es por palabras clave, en el mismo proceso — ver
 * `IntencionMatcherPort`: deliberadamente no es otro microservicio. */
@Module({
  imports: [UsuariosModule],
  controllers: [FarmaciasAliadasAdminController, ChatbotController],
  providers: [
    ListarFarmaciasAliadasAdminUseCase,
    GuardarFarmaciaAliadaAdminUseCase,
    EliminarFarmaciaAliadaAdminUseCase,
    ListarFarmaciasAliadasPorEpsUseCase,
    ProcesarMensajeChatbotUseCase,
    {
      provide: FarmaciaAliadaRepositoryPort,
      useClass: PostgresFarmaciaAliadaRepository,
    },
    {
      provide: IntencionMatcherPort,
      useClass: KeywordIntencionMatcherAdapter,
    },
  ],
  exports: [ListarFarmaciasAliadasPorEpsUseCase],
})
export class ChatbotModule {}
