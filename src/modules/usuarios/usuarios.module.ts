import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ActualizarDatosComunesUseCase } from './application/use-cases/actualizar-datos-comunes.use-case';
import { ActualizarPerfilDomiciliarioUseCase } from './application/use-cases/actualizar-perfil-domiciliario.use-case';
import { ActualizarPerfilPacienteUseCase } from './application/use-cases/actualizar-perfil-paciente.use-case';
import { CambiarContrasenaUseCase } from './application/use-cases/cambiar-contrasena.use-case';
import { CerrarSesionUseCase } from './application/use-cases/cerrar-sesion.use-case';
import { DesactivarCuentaUseCase } from './application/use-cases/desactivar-cuenta.use-case';
import { IniciarSesionUseCase } from './application/use-cases/iniciar-sesion.use-case';
import { ObtenerPerfilUseCase } from './application/use-cases/obtener-perfil.use-case';
import { ObtenerSesionActualUseCase } from './application/use-cases/obtener-sesion-actual.use-case';
import { RefrescarSesionUseCase } from './application/use-cases/refrescar-sesion.use-case';
import { RegistrarUsuarioUseCase } from './application/use-cases/registrar-usuario.use-case';
import { RestablecerContrasenaUseCase } from './application/use-cases/restablecer-contrasena.use-case';
import { SolicitarRecuperacionContrasenaUseCase } from './application/use-cases/solicitar-recuperacion-contrasena.use-case';
import { SubirDocumentoDomiciliarioUseCase } from './application/use-cases/subir-documento-domiciliario.use-case';
import { SubirFotoCedulaPacienteUseCase } from './application/use-cases/subir-foto-cedula-paciente.use-case';
import { AccessTokenPort } from './domain/ports/access-token.port';
import { AlmacenamientoArchivosPort } from './domain/ports/almacenamiento-archivos.port';
import { CambioContrasenaRepositoryPort } from './domain/ports/cambio-contrasena.repository.port';
import { CodigoRecuperacionPort } from './domain/ports/codigo-recuperacion.port';
import { CorreoRecuperacionPort } from './domain/ports/correo-recuperacion.port';
import { PasswordHasherPort } from './domain/ports/password-hasher.port';
import { PerfilRepositoryPort } from './domain/ports/perfil.repository.port';
import { RecuperacionContrasenaRepositoryPort } from './domain/ports/recuperacion-contrasena.repository.port';
import { RefreshTokenPort } from './domain/ports/refresh-token.port';
import { SesionRepositoryPort } from './domain/ports/sesion.repository.port';
import { UsuarioRepositoryPort } from './domain/ports/usuario.repository.port';
import { BcryptPasswordHasher } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { PostgresCambioContrasenaRepository } from './infrastructure/adapters/postgres-cambio-contrasena.repository';
import { CryptoCodigoRecuperacionAdapter } from './infrastructure/adapters/crypto-codigo-recuperacion.adapter';
import { CryptoRefreshTokenAdapter } from './infrastructure/adapters/crypto-refresh-token.adapter';
import { JwtAccessTokenAdapter } from './infrastructure/adapters/jwt-access-token.adapter';
import { ResendCorreoRecuperacionAdapter } from './infrastructure/adapters/resend-correo-recuperacion.adapter';
import { PostgresPerfilRepository } from './infrastructure/adapters/postgres-perfil.repository';
import { PostgresRecuperacionContrasenaRepository } from './infrastructure/adapters/postgres-recuperacion-contrasena.repository';
import { PostgresSesionRepository } from './infrastructure/adapters/postgres-sesion.repository';
import { PostgresUsuarioRepository } from './infrastructure/adapters/postgres-usuario.repository';
import { SupabaseAlmacenamientoAdapter } from './infrastructure/adapters/supabase-almacenamiento.adapter';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { PerfilController } from './infrastructure/controllers/perfil.controller';
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
  controllers: [AuthController, PerfilController],
  providers: [
    RegistrarUsuarioUseCase,
    IniciarSesionUseCase,
    RefrescarSesionUseCase,
    ObtenerSesionActualUseCase,
    CerrarSesionUseCase,
    SolicitarRecuperacionContrasenaUseCase,
    RestablecerContrasenaUseCase,
    CambiarContrasenaUseCase,
    ObtenerPerfilUseCase,
    ActualizarDatosComunesUseCase,
    ActualizarPerfilPacienteUseCase,
    SubirFotoCedulaPacienteUseCase,
    ActualizarPerfilDomiciliarioUseCase,
    SubirDocumentoDomiciliarioUseCase,
    DesactivarCuentaUseCase,
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
    {
      provide: CodigoRecuperacionPort,
      useClass: CryptoCodigoRecuperacionAdapter,
    },
    {
      provide: RecuperacionContrasenaRepositoryPort,
      useClass: PostgresRecuperacionContrasenaRepository,
    },
    {
      provide: CorreoRecuperacionPort,
      useClass: ResendCorreoRecuperacionAdapter,
    },
    {
      provide: CambioContrasenaRepositoryPort,
      useClass: PostgresCambioContrasenaRepository,
    },
    {
      provide: PerfilRepositoryPort,
      useClass: PostgresPerfilRepository,
    },
    {
      provide: AlmacenamientoArchivosPort,
      useClass: SupabaseAlmacenamientoAdapter,
    },
  ],
})
export class UsuariosModule {}
