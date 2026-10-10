import { Hono } from 'hono';

import { createApi } from './routes';
import { ItemsService } from './services/items.service';
import { FoodService } from './services/food.service';
import { AuthService } from './services/auth.service';
import { RealtimeHub } from './realtime/realtime-hub';
import type { PrismaClient } from './generated/prisma/client';
import { ItemsRepo } from './repositories/items.repo';
import { FoodRepo } from './repositories/food.repo';

export function createApp(
  jwt_secret: string,
  auth_url: string,
  database: PrismaClient,
) {
  const app = new Hono();

  const realtime = new RealtimeHub();

  const foodRepo = new FoodRepo(database);
  const itemsRepo = new ItemsRepo(database);

  const foodService = new FoodService(foodRepo, realtime);
  const itemsService = new ItemsService(itemsRepo, foodRepo, realtime);
  const authService = new AuthService(auth_url);

  const api = createApi(jwt_secret, {
    foodService,
    itemsService,
    realtime,
    authService,
  });

  const routes = app.route('/api', api);

  return {
    app,
    routes,
  };
}
