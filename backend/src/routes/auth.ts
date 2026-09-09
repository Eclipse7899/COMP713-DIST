import { AuthService } from '../services/auth.service';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  username: z.string(),
});

async function createAccessToken(jwt_secret: string, user: {
  id: string;
  email: string
}) {
  return sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    jwt_secret,
  );
}

export function createAuthRoute(jwt_secret: string, authService: AuthService) {
  {
    return new Hono()
      .post('/login', zValidator('json', loginSchema), async (c) => {
        const { email, password } = c.req.valid('json');
        const result = await authService.validateUser(email, password);

        if (!result.success) {
          return c.json({ message: 'Invalid credentials' }, 401);
        }

        const token = await createAccessToken(jwt_secret, result.data);

        return c.json(
          {
            accessToken: token,
            user: {
              id: result.data.id,
              email: result.data.email,
              username: result.data.username,
            },
          },
          200,
        );
      })
      .post('/register', zValidator('json', registerSchema), async (c) => {
        const { email, password, username } = c.req.valid('json');
        const user = await authService.registerUser(email, password, username);
        if (!user) {
          return c.json({ message: 'User registration failed' }, 400);
        }
        return c.json(
          {
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
            },
          },
          201,
        );
      });
  }
}