import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import {
  authResponseSchema,
  messageSchema,
  validationErrorResponse,
} from '../schemas';
import type { AuthService } from '../services/auth.service';

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export function createAuthRoute(authService: AuthService) {
  return new Hono()
    .post(
      '/login',
      describeRoute({
        tags: ['Auth'],
        summary: 'Log in with email and password',
        description: 'Exchanges valid credentials for a JWT access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(loginSchema) },
          },
        },
        responses: {
          200: {
            description: 'Authentication succeeded',
            content: {
              'application/json': { schema: resolver(authResponseSchema) },
            },
          },
          400: validationErrorResponse,
          401: {
            description: 'Invalid email or password',
            content: {
              'application/json': { schema: resolver(messageSchema) },
            },
          },
        },
      }),
      zValidator('json', loginSchema),
      async (c) => {
        const { email, password } = c.req.valid('json');
        const result = await authService.signIn(email, password);
        if (!result.success) {
          return c.json({ message: 'Invalid credentials' }, 401);
        }
        return c.json(result.data, 200);
      },
    )
    .post(
      '/register',
      describeRoute({
        tags: ['Auth'],
        summary: 'Register a new account',
        description:
          'Creates a user, hashes the password, and returns a JWT access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(registerSchema) },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: {
              'application/json': { schema: resolver(authResponseSchema) },
            },
          },
          400: validationErrorResponse,
          409: {
            description: 'The email or username is already taken',
            content: {
              'application/json': { schema: resolver(messageSchema) },
            },
          },
        },
      }),
      zValidator('json', registerSchema),
      async (c) => {
        const { email, password, username } = c.req.valid('json');
        const result = await authService.register(
          email,
          password,
          username,
        );
        if (!result.success) {
          switch (result.error) {
            case 'EMAIL_TAKEN':
              return c.json({ message: 'Email is already taken' }, 409);
            case 'USERNAME_TAKEN':
              return c.json({ message: 'Username is already taken' }, 409);
          }
        } else {
          return c.json(result.data, 201);
        }
      },
    );
}
