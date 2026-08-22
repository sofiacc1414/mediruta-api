export abstract class PasswordHasherPort {
  abstract hash(password: string): Promise<string>;
}
