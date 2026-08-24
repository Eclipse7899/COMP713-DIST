import { comparePasswords, hashPassword, type Result } from '../util';
import type { User } from '../generated/prisma/client';
import UserRepo from '../repositories/users.repo';

export class AuthService {
  constructor(private readonly userRepo: UserRepo) {}

  async registerUser(email: string, password: string, username: string) {
    const hashedPassword = await hashPassword(password);
    return this.userRepo.createUser(email, hashedPassword, username);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Result<User, void>> {
    const user = await this.userRepo.findUserByEmail(email);
    if (!user) {
      return {
        success: false,
        error: undefined,
      };
    }
    const isMatch = await comparePasswords(password, user.hashed_password);
    if (!isMatch) {
      return {
        success: false,
        error: undefined,
      };
    }
    return {
      success: true,
      data: user,
    };
  }
}
