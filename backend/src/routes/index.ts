import { createUsersRoute } from './users';
import { createFoodRoute } from './food';
import { createItemsRoute } from './items';
import { createAuthRoute } from './auth';
import { getJwtMiddleware } from '../middleware/jwt.middleware';
import type { UserService } from '../services/user.service';
import type { FoodService } from '../services/food.service';
import type { ItemsService } from '../services/items.service';
import type { RealtimeHub } from '../realtime/realtime-hub';
import { createWsRoute } from './ws';
import { Hono } from 'hono';
import type { AuthService } from '../services/auth.service';
import { createHealthRoute } from './health';

export function createApi(
  jwtSecret: string,
  deps: {
    userService: UserService;
    foodService: FoodService;
    itemsService: ItemsService;
    authService: AuthService;
    realtime: RealtimeHub;
  },
) {
  const users = createUsersRoute(deps.userService);
  const food = createFoodRoute(deps.foodService);
  const items = createItemsRoute(deps.itemsService);
  const auth = createAuthRoute(deps.authService);
  const ws = createWsRoute(deps.realtime, jwtSecret, deps.authService);
  const health = createHealthRoute();

  const jwtMiddleware = getJwtMiddleware(jwtSecret);

  return new Hono()
    .use('/users/*', jwtMiddleware)
    .route('/users', users)
    .use('/food/*', jwtMiddleware)
    .route('/food', food)
    .use('/items/*', jwtMiddleware)
    .route('/items', items)
    .use('/ws/token', jwtMiddleware)
    .route('/ws', ws)
    .route('/auth', auth)
    .route('/health', health)
}
