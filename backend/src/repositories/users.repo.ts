import type { PrismaClient, User } from '../generated/prisma/client';

export interface UserRepository {
  ensureUser(id: string): Promise<User>;
}

export class UsersRepo implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureUser(id: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
}
