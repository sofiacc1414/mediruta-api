import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  UsuarioRepositoryPort,
  UsuarioRol,
} from '../../domain/ports/usuario.repository.port';

export type ObtenerSesionActualResultado = {
  usuario: {
    id: string;
    correo: string;
    estadoCuenta: 'activa';
    roles: UsuarioRol[];
  };
};

@Injectable()
export class ObtenerSesionActualUseCase {
  constructor(private readonly usuarios: UsuarioRepositoryPort) {}

  async execute(usuarioId: string): Promise<ObtenerSesionActualResultado> {
    const cuenta = await this.usuarios.obtenerCuentaActual(usuarioId);
    if (!cuenta || cuenta.estadoCuenta !== 'activa') {
      throw new NoAutorizadoError();
    }

    const roles = await this.usuarios.obtenerRoles(usuarioId);

    return {
      usuario: {
        id: cuenta.id,
        correo: cuenta.correo,
        estadoCuenta: 'activa',
        roles,
      },
    };
  }
}
