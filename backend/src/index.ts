import { createDb } from '@stocked/shared/src/db';
import { getConfig } from './config';
import { createApp } from './app';
import { websocket } from '@hono/bun';

const config = getConfig();

const db = createDb(config.DATABASE_URL);

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
