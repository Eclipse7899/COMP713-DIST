import { Injectable } from '@nestjs/common';
import { AuthRepo } from '../repository/auth.repo';
import { User } from '../models/user.model';
import { comparePasswords, hashPassword } from '../util';

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepo) {}

  async registerUser(email: string, password: string, username: string) {
    const hashedPassword = await hashPassword(password);
    return this.authRepo.createUser(email, hashedPassword, username);
  }

  async loginUser(email: string, password: string): Promise<User | null> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      return null;
    }
    const isMatch = await comparePasswords(password, user.hashed_password);
    if (!isMatch) {
      return null;
    }
    return user;
  }
}
