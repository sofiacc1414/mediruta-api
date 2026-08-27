import { Injectable } from '@nestjs/common';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';

export type CrearAdministradorCommand = {
  correo: string;
  password: string;
  nombreCompleto?: string;
  telefono?: string;
};

export type CrearAdministradorResultado = {
  usuarioId: string;
  correo: string;
};

/**
 * Panel admin — solo ROOT (`@Roles('ROOT')` en el controller). Crea una
 * cuenta ADMINISTRADOR directa: habilitada de una, sin pasar por
 * registro público (`RegistrarUsuarioUseCase` solo acepta PACIENTE/
 * DOMICILIARIO) ni por ningún flujo de validación.
 */
@Injectable()
export class CrearAdministradorUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasherPort,
    private readonly usuarios: UsuarioRepositoryPort,
  ) {}

  async execute(command: CrearAdministradorCommand): Promise<CrearAdministradorResultado> {
    const correo = command.correo.trim().toLowerCase();
    const passwordHash = await this.passwordHasher.hash(command.password);

    const usuarioId = await this.usuarios.crearAdministrador({
      correo,
      passwordHash,
      nombreCompleto: command.nombreCompleto?.trim() || undefined,
      telefono: command.telefono?.trim() || undefined,
    });

    return { usuarioId, correo };
  }
}
