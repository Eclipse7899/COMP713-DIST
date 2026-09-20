import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export function createDb(databaseUrl: string) {
  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
  });
}
