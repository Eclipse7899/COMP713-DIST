import { PrismaClient } from '@prisma/client/extension';
import { User } from '../generated/prisma/client';

export class UserRepo {
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
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        hashed_password,
        username,
      },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }
}
