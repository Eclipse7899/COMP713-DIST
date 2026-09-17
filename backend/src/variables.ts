import { z } from 'zod';
import type { JwtVariables } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';

const jwtSchema = z.object({
  sub: z.string(),
  email: z.email(),
  username: z.string(),
});

export type JwtFields = z.infer<typeof jwtSchema> & JWTPayload;

export type Variables = JwtVariables<JwtFields>;
