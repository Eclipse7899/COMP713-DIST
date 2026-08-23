import { PrismaClient } from '@prisma/client/extension';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from './config';

export const db = new PrismaClient({
  adapter: new PrismaPg(config.databaseUrl)
})