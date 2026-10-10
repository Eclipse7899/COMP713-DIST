import { getConfig } from './config';
import { createApp } from './app';
import { websocket } from '@hono/bun';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const config = getConfig();

const db = new PrismaClient({
  adapter: new PrismaPg(config.DATABASE_URL),
});

const { app, routes } = createApp(
  config.JWT_SECRET,
  `${config.AUTH_HOST}:${config.AUTH_PORT}`,
  db,
);

export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  websocket,
  port: config.PORT,
};
