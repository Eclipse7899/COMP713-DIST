import { type PrismaClient, type User } from '../generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Result } from '../util';

class UserRepo {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async createUser(
    email: string,
    hashed_password: string,
    username: string,
  ): Promise<Result<User, 'USERNAME_TAKEN' | 'EMAIL_TAKEN'>> {
    try {
      return {
        success: true,
        data: await this.prisma.user.create({
          data: {
            email,
            hashed_password,
            username,
          },
        }),
      };
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const fields =
            // @ts-ignore
            error.meta?.driverAdapterError?.cause?.constraint?.fields;
          if (fields?.includes('username')) {
            return {
              success: false,
              error: 'USERNAME_TAKEN',
            };
          }
          if (fields?.includes('email')) {
            return {
              success: false,
              error: 'EMAIL_TAKEN',
            };
          }
        }
      }
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }
}

export default UserRepo;
