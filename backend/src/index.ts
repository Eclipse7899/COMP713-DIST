import { createDb } from './db';
import { getConfig } from './config';
import { createApp } from './app';
import { websocket } from '@hono/bun';

const config = getConfig();

const db = createDb(config.DATABASE_URL);

const { app, routes } = createApp(config.JWT_SECRET, db);

export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  websocket,
  port: config.PORT,
};
