import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './shared/infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    // Módulos de entidad se registran aquí conforme se implementen
    // (usuarios, solicitudes, documentos, domiciliarios, pedidos-entrega).
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
