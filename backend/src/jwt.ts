import { Elysia } from 'elysia';
import jwt from '@elysia/jwt';
import { config } from './config';

export const jwtPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwtSecret,
      schema: {
        sub: String,
        email: String,
      },
    })
  );