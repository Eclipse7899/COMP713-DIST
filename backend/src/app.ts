import { Hono } from 'hono';

import { createApi } from './routes';
import { ItemsService } from './services/items.service';
import { FoodService } from './services/food.service';
import { UserService } from './services/user.service';
import UserRepo from '@stocked/shared/src/repositories/users.repo';
import { FoodRepo } from '@stocked/shared/src/repositories/food.repo';
import { ItemsRepo } from '@stocked/shared/src/repositories/items.repo';
import { AuthService } from './services/auth.service';
import { RealtimeHub } from './realtime/realtime-hub';
import type { PrismaClient } from '@stocked/shared/src/generated/prisma/client';

export function createApp(jwt_secret: string, auth_url: string, database: PrismaClient) {
  const app = new Hono();

  const realtime = new RealtimeHub();

  const userRepo = new UserRepo(database);
  const foodRepo = new FoodRepo(database);
  const itemsRepo = new ItemsRepo(database);

  const userService = new UserService(userRepo);
  const foodService = new FoodService(foodRepo, realtime);
  const itemsService = new ItemsService(itemsRepo, foodRepo, realtime);
  const authService = new AuthService(auth_url);

  const api = createApi(jwt_secret, {
    userService,
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
