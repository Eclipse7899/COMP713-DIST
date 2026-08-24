import { PrismaPg } from '@prisma/adapter-pg';
import { config } from './config';
import { PrismaClient } from './generated/prisma/client';

export const db = new PrismaClient({
  adapter: new PrismaPg(config.DATABASE_URL),
});
