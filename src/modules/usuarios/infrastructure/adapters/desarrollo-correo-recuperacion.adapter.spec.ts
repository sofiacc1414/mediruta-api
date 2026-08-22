import { ConfigService } from '@nestjs/config';
import { DesarrolloCorreoRecuperacionAdapter } from './desarrollo-correo-recuperacion.adapter';

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

describe('DesarrolloCorreoRecuperacionAdapter', () => {
  it('en desarrollo escribe el código solo en stdout y no lanza', async () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const adapter = new DesarrolloCorreoRecuperacionAdapter(
      configCon({ NODE_ENV: 'development' }),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).resolves.toBeUndefined();

    expect(write).toHaveBeenCalledWith(
      '[mediruta-dev] código de recuperación para persona@mail.com: 000042\n',
    );
    write.mockRestore();
  });

  it('en production no imprime el código y falla de forma clara', async () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const adapter = new DesarrolloCorreoRecuperacionAdapter(
      configCon({ NODE_ENV: 'production' }),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(
      'El proveedor de correo de recuperación no está configurado.',
    );
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});
