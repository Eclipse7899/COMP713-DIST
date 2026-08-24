import { z } from 'zod';
import { JwtVariables } from 'hono/jwt';

const jwtSchema = z.object({
  sub: z.string(),
  email: z.email(),
});

type JwtPayload = z.infer<typeof jwtSchema>;

export type Variables = JwtVariables<JwtPayload>;
