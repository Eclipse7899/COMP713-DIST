import { UserService } from '../services/user.service';
import UserRepo from '../repositories/users.repo';
import { db } from '../db';
import { Hono } from 'hono';
import type { Variables } from './variables';

const userRepository = new UserRepo(db);
const userService = new UserService(userRepository);

export const users = new Hono<{ Variables: Variables }>().get('/me', (c) => {
  const userId = c.get('jwtPayload').sub;
  return c.json(userService.getCurrentUser(userId));
});
