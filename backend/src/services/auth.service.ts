import { Injectable } from '@nestjs/common';
import { AuthRepo } from '../repository/auth.repo';
import { User } from '../models/user.model';

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepo) {}

  async registerUser(email: string, password: string, username: string) {
    return this.authRepo.createUser(email, password, username);
  }

  async loginUser(email: string, password: string): Promise<User | null> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) {
      return null;
    }
    if (user.password !== password) {
    }
    return user;
  }
}
