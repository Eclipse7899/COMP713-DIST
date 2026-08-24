import { Hono } from 'hono';
import { users } from './users';
import { food } from './food';
import { items } from './items';
import { auth } from './auth';
import { jwtMiddleware } from '../middleware/jwt.middleware';

export const api = new Hono()
  .use('/users/*', jwtMiddleware)
  .route('/users', users)
  .use('/food/*', jwtMiddleware)
  .route('/food', food)
  .use('/items/*', jwtMiddleware)
  .route('/items', items)
  .route('/auth', auth);
