export abstract class PasswordHasherPort {
  abstract hash(password: string): Promise<string>;
  abstract compare(plainPassword: string, hash: string): Promise<boolean>;
}
