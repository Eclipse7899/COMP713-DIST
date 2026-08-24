import { Hono } from 'hono';
import { api } from './routes';
import { config } from './config';

const app = new Hono();

const routes = app.route('/api', api);

export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  port: config.PORT,
};
