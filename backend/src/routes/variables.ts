import { z } from 'zod';
import type { JwtVariables } from 'hono/jwt';

const jwtSchema = z.object({
  sub: z.string(),
  email: z.email(),
  username: z.string(),
});

type JwtPayload = z.infer<typeof jwtSchema>;

export type Variables = JwtVariables<JwtPayload>;
