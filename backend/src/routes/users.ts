import { UserService } from '../services/user.service';
import { Hono } from 'hono';
import type { Variables } from '../variables';

export function createUsersRoute(userService: UserService) {
  return new Hono<{ Variables: Variables }>().get('/me', async (c) => {
    const userId = c.get('jwtPayload').sub;
    const user = await userService.getCurrentUser(userId);
    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }
    return c.json(user);
  });
}
