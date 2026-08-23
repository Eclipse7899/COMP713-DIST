import { Elysia } from 'elysia';
import { UserService } from './user.service';

export const userController = new Elysia({ prefix: '/users' })
  .use(userSe)
  .decorate('userService', db => new UserService(db as Db))