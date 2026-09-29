import { CalificacionActivaExistenteError } from '../../domain/errors/calificacion.errors';
import { PedidoAjenoError } from '../../domain/errors/calificacion.errors';
import { PedidoNoEntregadoError } from '../../domain/errors/calificacion.errors';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';
import { ActualizarCalificacionUseCase } from './actualizar-calificacion.use-case';
import { CrearCalificacionUseCase } from './crear-calificacion.use-case';
import { RetirarCalificacionUseCase } from './retirar-calificacion.use-case';

const calificacion = {
  id: 'cal-1',
  solicitudId: 'ped-1',
  puntuacion: 5,
  comentario: 'Excelente',
  estado: 'activa' as const,
  creadoEn: '2026-03-12T00:00:00.000Z',
  actualizadoEn: '2026-03-12T00:00:00.000Z',
};

describe('Calificaciones HU-18', () => {
  const repositorio: CalificacionRepositoryPort = {
    listarPedidos: jest.fn(),
    obtener: jest.fn(),
    crear: jest.fn(),
    actualizar: jest.fn(),
    retirar: jest.fn(),
  };

  const crear = new CrearCalificacionUseCase(repositorio);
  const actualizar = new ActualizarCalificacionUseCase(repositorio);
  const retirar = new RetirarCalificacionUseCase(repositorio);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01 — crea una calificación válida', async () => {
    (repositorio.crear as jest.Mock).mockResolvedValue({
      codigo: 'ok',
      calificacion,
    });

    const resultado = await crear.execute({
      usuarioId: 'pac-1',
      solicitudId: 'ped-1',
      puntuacion: 5,
      comentario: 'Excelente',
    });

    expect(resultado).toEqual(calificacion);
    expect(repositorio.crear).toHaveBeenCalledWith({
      usuarioId: 'pac-1',
      solicitudId: 'ped-1',
      puntuacion: 5,
      comentario: 'Excelente',
    });
  });

  it('G01 — impide calificar un pedido que no está entregado', async () => {
    (repositorio.crear as jest.Mock).mockResolvedValue({
      codigo: 'pedido_no_entregado',
      calificacion: null,
    });

    await expect(
      crear.execute({
        usuarioId: 'pac-1',
        solicitudId: 'ped-1',
        puntuacion: 4,
        comentario: null,
      }),
    ).rejects.toBeInstanceOf(PedidoNoEntregadoError);
  });

  it('G05 — impide que otro paciente califique el pedido', async () => {
    (repositorio.crear as jest.Mock).mockResolvedValue({
      codigo: 'pedido_ajeno',
      calificacion: null,
    });

    await expect(
      crear.execute({
        usuarioId: 'otro',
        solicitudId: 'ped-1',
        puntuacion: 4,
        comentario: null,
      }),
    ).rejects.toBeInstanceOf(PedidoAjenoError);
  });

  it('G01 — impide una segunda calificación activa', async () => {
    (repositorio.crear as jest.Mock).mockResolvedValue({
      codigo: 'calificacion_activa',
      calificacion: null,
    });

    await expect(
      crear.execute({
        usuarioId: 'pac-1',
        solicitudId: 'ped-1',
        puntuacion: 3,
        comentario: null,
      }),
    ).rejects.toBeInstanceOf(CalificacionActivaExistenteError);
  });

  it('G03 — actualiza la calificación del dueño', async () => {
    const editada = { ...calificacion, puntuacion: 4, comentario: 'Muy buena' };
    (repositorio.actualizar as jest.Mock).mockResolvedValue({
      codigo: 'ok',
      calificacion: editada,
    });

    const resultado = await actualizar.execute({
      usuarioId: 'pac-1',
      solicitudId: 'ped-1',
      puntuacion: 4,
      comentario: 'Muy buena',
    });

    expect(resultado.puntuacion).toBe(4);
  });

  it('G04 — retira la calificación sin borrarla en el caso de uso', async () => {
    (repositorio.retirar as jest.Mock).mockResolvedValue('ok');

    await expect(retirar.execute('pac-1', 'ped-1')).resolves.toBeUndefined();
    expect(repositorio.retirar).toHaveBeenCalledWith('pac-1', 'ped-1');
  });
});
