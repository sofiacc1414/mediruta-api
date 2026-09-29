import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CalificacionesModule } from './modules/calificaciones/calificaciones.module';
import { DomiciliariosModule } from './modules/domiciliarios/domiciliarios.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { SolicitudesModule } from './modules/solicitudes/solicitudes.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { GeocodificacionModule } from './shared/infrastructure/geocodificacion/geocodificacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GeocodificacionModule,
    UsuariosModule,
    DomiciliariosModule,
    NotificacionesModule,
    SolicitudesModule,
    CalificacionesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
