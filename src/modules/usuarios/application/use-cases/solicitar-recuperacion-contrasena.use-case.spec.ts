import { CodigoRecuperacionPort } from '../../domain/ports/codigo-recuperacion.port';
import { CorreoRecuperacionPort } from '../../domain/ports/correo-recuperacion.port';
import { RecuperacionContrasenaRepositoryPort } from '../../domain/ports/recuperacion-contrasena.repository.port';
import {
  MENSAJE_RECUPERACION_SOLICITADA,
  SolicitarRecuperacionContrasenaUseCase,
} from './solicitar-recuperacion-contrasena.use-case';

describe('SolicitarRecuperacionContrasenaUseCase', () => {
  const codigos: CodigoRecuperacionPort = {
    generarCodigo: jest.fn(),
    hashCodigo: jest.fn(),
  };
  const recuperaciones: RecuperacionContrasenaRepositoryPort = {
    crear: jest.fn(),
    restablecer: jest.fn(),
  };
  const correo: CorreoRecuperacionPort = {
    enviarCodigoRecuperacion: jest.fn(),
  };

  const useCase = new SolicitarRecuperacionContrasenaUseCase(
    codigos,
    recuperaciones,
    correo,
  );

  const ahora = new Date('2026-08-22T16:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(ahora);
    (codigos.generarCodigo as jest.Mock).mockReturnValue('000042');
    (codigos.hashCodigo as jest.Mock).mockReturnValue('hmac-del-otp');
    (recuperaciones.crear as jest.Mock).mockResolvedValue(true);
    (correo.enviarCodigoRecuperacion as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('genera OTP, calcula hash, fija 10 min y llama al repositorio', async () => {
    await useCase.execute({ correo: '  PERSONA@Mail.COM  ' });

    expect(codigos.generarCodigo).toHaveBeenCalled();
    expect(codigos.hashCodigo).toHaveBeenCalledWith('000042');
    expect(recuperaciones.crear).toHaveBeenCalledWith({
      correo: 'persona@mail.com',
      codigoHash: 'hmac-del-otp',
      expiraEn: new Date('2026-08-22T16:10:00.000Z'),
    });
    expect(recuperaciones.crear).not.toHaveBeenCalledWith(
      expect.objectContaining({ codigo: '000042' }),
    );
  });

  it('si el repositorio retorna true envía el correo con el OTP', async () => {
    const resultado = await useCase.execute({
      correo: 'persona@mail.com',
    });

    expect(correo.enviarCodigoRecuperacion).toHaveBeenCalledWith(
      'persona@mail.com',
      '000042',
    );
    expect(resultado).toEqual({ message: MENSAJE_RECUPERACION_SOLICITADA });
    expect(resultado).not.toHaveProperty('codigo');
    expect(JSON.stringify(resultado)).not.toContain('000042');
  });

  it('si el repositorio retorna false no envía correo y responde lo mismo', async () => {
    (recuperaciones.crear as jest.Mock).mockResolvedValue(false);

    const resultado = await useCase.execute({
      correo: 'nadie@mail.com',
    });

    expect(correo.enviarCodigoRecuperacion).not.toHaveBeenCalled();
    expect(resultado).toEqual({ message: MENSAJE_RECUPERACION_SOLICITADA });
  });

  it('si el envío de correo falla igual responde el mensaje genérico', async () => {
    (correo.enviarCodigoRecuperacion as jest.Mock).mockRejectedValue(
      new Error('smtp-caido'),
    );

    const resultado = await useCase.execute({ correo: 'persona@mail.com' });

    expect(resultado).toEqual({ message: MENSAJE_RECUPERACION_SOLICITADA });
    expect(JSON.stringify(resultado)).not.toContain('000042');
    expect(JSON.stringify(resultado)).not.toContain('smtp-caido');
  });
});
