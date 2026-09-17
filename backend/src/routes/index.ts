import { Hono } from 'hono';
import { createUsersRoute } from './users';
import { createFoodRoute } from './food';
import { createItemsRoute } from './items';
import { createAuthRoute } from './auth';
import { getJwtMiddleware } from '../middleware/jwt.middleware';
import type { UserService } from '../services/user.service';
import type { FoodService } from '../services/food.service';
import type { ItemsService } from '../services/items.service';
import type { AuthService } from '../services/auth.service';

export function createApi(
  jwtSecret: string,
  deps: {
    userService: UserService;
    foodService: FoodService;
    itemsService: ItemsService;
    authService: AuthService;
  },
) {
  const users = createUsersRoute(deps.userService);
  const food = createFoodRoute(deps.foodService);
  const items = createItemsRoute(deps.itemsService);
  const auth = createAuthRoute(deps.authService);

  const jwtMiddleware = getJwtMiddleware(jwtSecret);

  return new Hono()
    .use('/users/*', jwtMiddleware)
    .route('/users', users)
    .use('/food/*', jwtMiddleware)
    .route('/food', food)
    .use('/items/*', jwtMiddleware)
    .route('/items', items)
    .route('/auth', auth);
}
