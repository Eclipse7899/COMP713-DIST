import { comparePasswords, hashPassword, type Result } from '../util';
import UserRepo from '../repositories/users.repo';
import type { JwtFields } from '../variables';
import { sign } from 'hono/jwt';

export class AuthService {
  constructor(private readonly jwtSecret: string, private readonly userRepo: UserRepo) {
  }

  async registerUser(email: string, password: string, username: string,
  ): Promise<Result<{
    user: {
      id: string
      email: string
      username: string
    }
    accessToken: string
  }, 'USERNAME_TAKEN' | 'EMAIL_TAKEN'>> {
    const hashedPassword = await hashPassword(password);
    const result = await this.userRepo.createUser(email, hashedPassword, username);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    const accessToken = await this.createAccessToken(result.data);
    return {
      success: true,
      data: {
        user: {
          id: result.data.id,
          email: result.data.email,
          username: result.data.username,
        },
        accessToken: accessToken.accessToken,
      },
    };
  }

  async createAccessToken(
    user_data: { id: string; email: string; username: string },
  ): Promise<{ accessToken: string }> {
    const payload: JwtFields = {
      sub: user_data.id,
      email: user_data.email,
      username: user_data.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    return {
      accessToken: await sign(payload, this.jwtSecret),
    };
  }

  async signInUser(
    email: string,
    password: string,
  ): Promise<Result<{ accessToken: string, user: { id: string; email: string; username: string } }, void>> {
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

    const { accessToken } = await this.createAccessToken(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    );
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        accessToken: accessToken,
      },
    };
  }
}
