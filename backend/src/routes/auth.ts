import { AuthService } from '../services/auth.service';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Variables } from '../variables';

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
  {
    return new Hono<{ Variables: Variables }>()
      .post('/login', zValidator('json', loginSchema), async (c) => {
        const { email, password } = c.req.valid('json');
        const result = await authService.signInUser(email, password);
        if (!result.success) {
          return c.json({ message: 'Invalid credentials' }, 401);
        }
        return c.json(result.data, 200,
        );
      })
      .post('/register', zValidator('json', registerSchema), async (c) => {
        const { email, password, username } = c.req.valid('json');
        const result = await authService.registerUser(
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
        }
        return c.json(result.data, 201);
      });
  }
}
