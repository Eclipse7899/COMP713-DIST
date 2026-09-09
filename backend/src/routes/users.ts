import { UserService } from '../services/user.service';
import { Hono } from 'hono';
import type { Variables } from './variables';

export function createUsersRoute(userService: UserService) {
  return new Hono<{ Variables: Variables }>().get('/me', (c) => {
    const userId = c.get('jwtPayload').sub;
    return c.json(userService.getCurrentUser(userId));
  });
}
