import { Injectable } from '@nestjs/common';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  DUMMY_PASSWORD_HASH,
  IniciarSesionResultado,
  IniciarSesionUseCase,
} from './iniciar-sesion.use-case';

export type ReactivarCuentaPropiaCommand = {
  correo: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
};

/**
 * HU-05 (ronda 9) — reactiva una cuenta que su propio dueño había
 * desactivado (`estado_cuenta = 'desactivada'`), a partir del pop-up
 * que la App muestra cuando el login devuelve `CuentaDesactivadaError`.
 * Vuelve a pedir correo/contraseña (no hay sesión válida a esta
 * altura) con el mismo criterio de `IniciarSesionUseCase` — mismo
 * mensaje genérico si algo no da, timing constante con el hash dummy —
 * y, si reactiva, delega en `IniciarSesionUseCase` para no duplicar la
 * emisión de tokens/sesión: la cuenta ya quedó 'activa', así que el
 * login normal sigue su curso.
 */
@Injectable()
export class ReactivarCuentaPropiaUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasherPort,
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly iniciarSesion: IniciarSesionUseCase,
  ) {}

  async execute(
    command: ReactivarCuentaPropiaCommand,
  ): Promise<IniciarSesionResultado> {
    const correo = command.correo.trim().toLowerCase();
    const credenciales = await this.usuarios.obtenerCredencialesLogin(correo);

    if (!credenciales) {
      await this.passwordHasher.compare(command.password, DUMMY_PASSWORD_HASH);
      throw new CredencialesInvalidasError();
    }

    const passwordCorrecta = await this.passwordHasher.compare(
      command.password,
      credenciales.passwordHash,
    );
    if (!passwordCorrecta || credenciales.estadoCuenta !== 'desactivada') {
      throw new CredencialesInvalidasError();
    }

    await this.usuarios.reactivarCuentaPropia(credenciales.usuarioId);

    return this.iniciarSesion.execute({
      correo: command.correo,
      password: command.password,
      userAgent: command.userAgent,
      ip: command.ip,
    });
  }
}
