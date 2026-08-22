import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CerrarSesionUseCase } from './application/use-cases/cerrar-sesion.use-case';
import { IniciarSesionUseCase } from './application/use-cases/iniciar-sesion.use-case';
import { ObtenerSesionActualUseCase } from './application/use-cases/obtener-sesion-actual.use-case';
import { RefrescarSesionUseCase } from './application/use-cases/refrescar-sesion.use-case';
import { RegistrarUsuarioUseCase } from './application/use-cases/registrar-usuario.use-case';
import { AccessTokenPort } from './domain/ports/access-token.port';
import { PasswordHasherPort } from './domain/ports/password-hasher.port';
import { RefreshTokenPort } from './domain/ports/refresh-token.port';
import { SesionRepositoryPort } from './domain/ports/sesion.repository.port';
import { UsuarioRepositoryPort } from './domain/ports/usuario.repository.port';
import { BcryptPasswordHasher } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { CryptoRefreshTokenAdapter } from './infrastructure/adapters/crypto-refresh-token.adapter';
import { JwtAccessTokenAdapter } from './infrastructure/adapters/jwt-access-token.adapter';
import { PostgresSesionRepository } from './infrastructure/adapters/postgres-sesion.repository';
import { PostgresUsuarioRepository } from './infrastructure/adapters/postgres-usuario.repository';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { AccessAuthGuard } from './infrastructure/guards/access-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('Falta la variable de entorno JWT_SECRET.');
        }

        const expiresIn = config.get<string>('JWT_EXPIRES_IN');
        if (!expiresIn) {
          throw new Error('Falta la variable de entorno JWT_EXPIRES_IN.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegistrarUsuarioUseCase,
    IniciarSesionUseCase,
    RefrescarSesionUseCase,
    ObtenerSesionActualUseCase,
    CerrarSesionUseCase,
    AccessAuthGuard,
    {
      provide: PasswordHasherPort,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: UsuarioRepositoryPort,
      useClass: PostgresUsuarioRepository,
    },
    {
      provide: SesionRepositoryPort,
      useClass: PostgresSesionRepository,
    },
    {
      provide: RefreshTokenPort,
      useClass: CryptoRefreshTokenAdapter,
    },
    {
      provide: AccessTokenPort,
      useClass: JwtAccessTokenAdapter,
    },
  ],
})
export class UsuariosModule {}
