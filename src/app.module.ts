import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CalificacionesModule } from './modules/calificaciones/calificaciones.module';
import { ChatModule } from './modules/chat/chat.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ComportamientoDomiciliariosModule } from './modules/comportamiento-domiciliarios/comportamiento-domiciliarios.module';
import { DomiciliariosModule } from './modules/domiciliarios/domiciliarios.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { SolicitudesModule } from './modules/solicitudes/solicitudes.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { WalletModule } from './modules/wallet/wallet.module';
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
    ChatModule,
    ChatbotModule,
    TrackingModule,
    WalletModule,
    ComportamientoDomiciliariosModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
