import { Injectable } from '@nestjs/common';
import { type User } from '../models/user.model';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class AuthRepo {
  constructor(private readonly prisma: PrismaClient) {}

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
