import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DomiciliariosModule } from './modules/domiciliarios/domiciliarios.module';
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
    SolicitudesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
