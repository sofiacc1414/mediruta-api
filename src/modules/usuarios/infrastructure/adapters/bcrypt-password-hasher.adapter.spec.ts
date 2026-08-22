import { BcryptPasswordHasher } from './bcrypt-password-hasher.adapter';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hash y compare reconocen la misma contraseña', async () => {
    const hash = await hasher.hash('ClaveSegura1!');

    await expect(hasher.compare('ClaveSegura1!', hash)).resolves.toBe(true);
    await expect(hasher.compare('otraClave1!', hash)).resolves.toBe(false);
  });
});
