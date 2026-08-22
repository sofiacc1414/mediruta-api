import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptPasswordHasher extends PasswordHasherPort {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
