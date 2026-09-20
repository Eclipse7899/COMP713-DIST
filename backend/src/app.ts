import type { PrismaClient } from '@prisma/client/extension';
import { Hono } from 'hono';
import UserRepo from './repositories/users.repo';
import { FoodRepo } from './repositories/food.repo';
import { ItemsRepo } from './repositories/items.repo';
import { createApi } from './routes';
import { AuthService } from './services/auth.service';
import { ItemsService } from './services/items.service';
import { FoodService } from './services/food.service';
import { UserService } from './services/user.service';

export function createApp(jwt_secret: string, database: PrismaClient) {
  const app = new Hono();

  app.get('/health', (context) => context.json({ status: 'ok' }));

  const userRepo = new UserRepo(database);
  const foodRepo = new FoodRepo(database);
  const itemsRepo = new ItemsRepo(database);

  const userService = new UserService(userRepo);
  const foodService = new FoodService(foodRepo);
  const itemsService = new ItemsService(itemsRepo, foodRepo);
  const authService = new AuthService(jwt_secret, userRepo);

  const api = createApi(jwt_secret, {
    userService,
    foodService,
    itemsService,
    authService,
  });

  const routes = app.route('/api', api);

  return {
    app,
    routes,
  };
}
