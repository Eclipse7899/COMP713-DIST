import { jwt } from 'hono/jwt';

export function getJwtMiddleware(secret: string) {
  return jwt({
    secret,
    alg: 'HS256',
  });
}
