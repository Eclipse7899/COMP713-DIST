import { Hono } from 'hono';
import { api } from './routes';

const app = new Hono();

const routes = app.route('/api', api);

export type AppType = typeof routes

export default app;
