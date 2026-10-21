import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EliminarFarmaciaAliadaAdminUseCase } from './application/use-cases/eliminar-farmacia-aliada-admin.use-case';
import { GuardarFarmaciaAliadaAdminUseCase } from './application/use-cases/guardar-farmacia-aliada-admin.use-case';
import { ListarFarmaciasAliadasAdminUseCase } from './application/use-cases/listar-farmacias-aliadas-admin.use-case';
import { ListarFarmaciasAliadasPorEpsUseCase } from './application/use-cases/listar-farmacias-aliadas-por-eps.use-case';
import { FarmaciaAliadaRepositoryPort } from './domain/ports/farmacia-aliada.repository.port';
import { PostgresFarmaciaAliadaRepository } from './infrastructure/adapters/postgres-farmacia-aliada.repository';
import { FarmaciasAliadasAdminController } from './infrastructure/controllers/farmacias-aliadas-admin.controller';

/** Módulo 2 (Chatbot de preguntas frecuentes / EPS). Por ahora solo el
 * catálogo de farmacias aliadas (CRUD admin); el endpoint de mensajes
 * del chatbot en sí (hacia mediruta-chatbot-service) se agrega en una
 * etapa siguiente. */
@Module({
  imports: [UsuariosModule],
  controllers: [FarmaciasAliadasAdminController],
  providers: [
    ListarFarmaciasAliadasAdminUseCase,
    GuardarFarmaciaAliadaAdminUseCase,
    EliminarFarmaciaAliadaAdminUseCase,
    ListarFarmaciasAliadasPorEpsUseCase,
    {
      provide: FarmaciaAliadaRepositoryPort,
      useClass: PostgresFarmaciaAliadaRepository,
    },
  ],
  exports: [ListarFarmaciasAliadasPorEpsUseCase],
})
export class ChatbotModule {}
