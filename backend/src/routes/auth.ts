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
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
});

async function createAccessToken(jwt_secret: string, user: {
  id: string;
  email: string;
  username: string;
}) {
  return sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
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
        const result = await authService.registerUser(email, password, username);
        if (!result.success) {
          if (result.error === 'EMAIL_TAKEN') {
            return c.json({ message: 'Email is already taken' }, 409);
          } else if (result.error === 'USERNAME_TAKEN') {
            return c.json({ message: 'Username is already taken' }, 409);
          }
        }
        else{
          return c.json(
            {
              user: {
                id: result.data.id,
                email: result.data.email,
                username: result.data.username,
              },
            },
            201,
          );
        }
      });
  }
}