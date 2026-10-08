import type { PrismaClient } from '@prisma/client/extension';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import UserRepo from './repositories/users.repo';
import { FoodRepo } from './repositories/food.repo';
import { ItemsRepo } from './repositories/items.repo';
import { createApi } from './routes';
import { AuthService } from './services/auth.service';
import { ItemsService } from './services/items.service';
import { FoodService } from './services/food.service';
import { UserService } from './services/user.service';
import { RealtimeHub } from './realtime/realtime-hub';

export function createApp(jwt_secret: string, database: PrismaClient) {
  const app = new Hono();

  app.get(
    '/health',
    describeRoute({
      tags: ['Health'],
      summary: 'Health check',
      description:
        'Returns a static status payload. Does not touch the database or require authentication.',
      responses: {
        200: {
          description: 'Service is running',
          content: {
            'application/json': {
              schema: resolver(z.object({ status: z.literal('ok') })),
            },
          },
        },
      },
    }),
    (context) => context.json({ status: 'ok' }),
  );

  const realtime = new RealtimeHub();

  const userRepo = new UserRepo(database);
  const foodRepo = new FoodRepo(database);
  const itemsRepo = new ItemsRepo(database);

  const userService = new UserService(userRepo);
  const foodService = new FoodService(foodRepo, realtime);
  const itemsService = new ItemsService(itemsRepo, foodRepo, realtime);
  const authService = new AuthService(jwt_secret, userRepo);

  const api = createApi(jwt_secret, {
    realtime,
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
