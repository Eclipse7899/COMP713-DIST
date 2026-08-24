import { config } from '../config';
import { jwt } from 'hono/jwt';

export const jwtMiddleware = jwt({
  secret: config.JWT_SECRET,
  alg: 'HS256',
});
