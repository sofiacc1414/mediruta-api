import { Module } from '@nestjs/common';
import { RegistrarUsuarioUseCase } from './application/use-cases/registrar-usuario.use-case';
import { PasswordHasherPort } from './domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from './domain/ports/usuario.repository.port';
import { BcryptPasswordHasher } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { PostgresUsuarioRepository } from './infrastructure/adapters/postgres-usuario.repository';
import { AuthController } from './infrastructure/controllers/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    RegistrarUsuarioUseCase,
    {
      provide: PasswordHasherPort,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: UsuarioRepositoryPort,
      useClass: PostgresUsuarioRepository,
    },
  ],
})
export class UsuariosModule {}
