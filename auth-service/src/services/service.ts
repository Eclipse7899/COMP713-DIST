import type {
  UserRepository,
} from '@stocked/shared/src/repositories/users.repo.ts';
import {
  comparePasswords,
  hashPassword,
  type Result,
} from '@stocked/shared/src/util.ts';
import { SignJWT } from 'jose';
import { jwtSchema } from '@stocked/shared/src/schema.ts';

export class AuthService {
  constructor(private readonly jwtSecret: string, private readonly userRepo: UserRepository) {
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async registerUser(email: string, password: string, username: string,
  ): Promise<Result<{
    user: {
      id: string
      email: string
      username: string
    }
    token: string
  }, 'USERNAME_TAKEN' | 'EMAIL_TAKEN'>> {
    const hashedPassword = await hashPassword(password);
    const normalizedEmail = this.normalizeEmail(email);
    const result = await this.userRepo.createUser(normalizedEmail, hashedPassword, username);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    const { token } = await this.createAccessToken(result.data);
    return {
      success: true,
      data: {
        user: {
          id: result.data.id,
          email: result.data.email,
          username: result.data.username,
        },
        token: token,
      },
    };
  }

  async createAccessToken(
    user_data: { id: string; email: string; username: string },
  ): Promise<{ token: string }> {
    const data = jwtSchema.parse({
      sub: user_data.id,
      email: user_data.email,
      username: user_data.username,
    });
    const token = await new SignJWT(data)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(this.jwtSecret));
    return { token };
  }

  async createWsToken(
    id: string,
  ): Promise<{ wsToken: string }> {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .setSubject(id)
      .sign(new TextEncoder().encode(this.jwtSecret));
    return {
      wsToken: token,
    };
  }

  async signInUser(
    email: string,
    password: string,
  ): Promise<Result<{
    token: string,
    user: { id: string; email: string; username: string }
  }, void>> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userRepo.findUserByEmail(normalizedEmail);
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

    const { token } = await this.createAccessToken(
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
        token,
      },
    };
  }
}
