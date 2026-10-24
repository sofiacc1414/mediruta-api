import { ConfigService } from '@nestjs/config';
import * as firebaseApp from 'firebase-admin/app';
import * as firebaseMessaging from 'firebase-admin/messaging';
import { FcmPushAdapter } from './fcm-push.adapter';

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn((cuenta: unknown) => cuenta),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(),
}));

describe('FcmPushAdapter', () => {
  const aviso = {
    tokens: ['token-1'],
    titulo: 'Título',
    mensaje: 'Mensaje',
    referenciaTipo: 'pedido',
    referenciaId: 'sol-1',
  };

  afterEach(() => jest.clearAllMocks());

  function crearAdapter(valorEnv?: string): FcmPushAdapter {
    const config = {
      get: jest.fn().mockReturnValue(valorEnv),
    } as unknown as ConfigService;
    return new FcmPushAdapter(config);
  }

  it('no hace nada si no hay tokens', async () => {
    const adapter = crearAdapter('{"a":1}');
    await adapter.enviar({ ...aviso, tokens: [] });
    expect(firebaseApp.getApps).not.toHaveBeenCalled();
  });

  it('no lanza ni intenta inicializar Firebase sin FIREBASE_SERVICE_ACCOUNT_JSON', async () => {
    const adapter = crearAdapter(undefined);
    await expect(adapter.enviar(aviso)).resolves.toBeUndefined();
    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
    expect(firebaseMessaging.getMessaging).not.toHaveBeenCalled();
  });

  it('no lanza si el JSON de la cuenta de servicio es inválido', async () => {
    const adapter = crearAdapter('{json-invalido');
    await expect(adapter.enviar(aviso)).resolves.toBeUndefined();
    expect(firebaseMessaging.getMessaging).not.toHaveBeenCalled();
  });

  it('inicializa la app una sola vez y envía vía sendEachForMulticast', async () => {
    (firebaseApp.getApps as jest.Mock).mockReturnValue([]);
    const appFalsa = { name: 'app-falsa' };
    (firebaseApp.initializeApp as jest.Mock).mockReturnValue(appFalsa);
    const sendEachForMulticast = jest
      .fn()
      .mockResolvedValue({ responses: [{ success: true }] });
    (firebaseMessaging.getMessaging as jest.Mock).mockReturnValue({
      sendEachForMulticast,
    });

    const adapter = crearAdapter('{"project_id":"demo"}');
    await adapter.enviar(aviso);

    expect(firebaseApp.initializeApp).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-1'],
        notification: { title: 'Título', body: 'Mensaje' },
        data: { referenciaTipo: 'pedido', referenciaId: 'sol-1' },
      }),
    );
  });

  it('reutiliza la app existente en vez de reinicializarla', async () => {
    const appExistente = { name: 'app-existente' };
    (firebaseApp.getApps as jest.Mock).mockReturnValue([appExistente]);
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      responses: [{ success: false, error: new Error('token inválido') }],
    });
    (firebaseMessaging.getMessaging as jest.Mock).mockReturnValue({
      sendEachForMulticast,
    });

    const adapter = crearAdapter('{"project_id":"demo"}');
    await expect(adapter.enviar(aviso)).resolves.toBeUndefined();

    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
    expect(firebaseMessaging.getMessaging).toHaveBeenCalledWith(appExistente);
  });
});
