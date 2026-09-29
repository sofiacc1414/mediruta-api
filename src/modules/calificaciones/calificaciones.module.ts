import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ActualizarCalificacionUseCase } from './application/use-cases/actualizar-calificacion.use-case';
import { ConsultarCalificacionUseCase } from './application/use-cases/consultar-calificacion.use-case';
import { CrearCalificacionUseCase } from './application/use-cases/crear-calificacion.use-case';
import { RetirarCalificacionUseCase } from './application/use-cases/retirar-calificacion.use-case';
import { CalificacionRepositoryPort } from './domain/ports/calificacion.repository.port';
import { PostgresCalificacionRepository } from './infrastructure/adapters/postgres-calificacion.repository';
import { CalificacionesController } from './infrastructure/controllers/calificaciones.controller';

@Module({
  imports: [UsuariosModule],
  controllers: [CalificacionesController],
  providers: [
    CrearCalificacionUseCase,
    ConsultarCalificacionUseCase,
    ActualizarCalificacionUseCase,
    RetirarCalificacionUseCase,
    {
      provide: CalificacionRepositoryPort,
      useClass: PostgresCalificacionRepository,
    },
  ],
})
export class CalificacionesModule {}
