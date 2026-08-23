import { AuthRepo } from './auth.repo';
import { comparePasswords, hashPassword } from '../../util';
import { Result } from '../../types';
import { User } from '../../models/user.model';

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
  ) {}

  async registerUser(email: string, password: string, username: string) {
    const hashedPassword = await hashPassword(password);
    return this.authRepo.createUser(email, hashedPassword, username);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Result<User, void>> {
    const user = await this.authRepo.findUserByEmail(email);
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
