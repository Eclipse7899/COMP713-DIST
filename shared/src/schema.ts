import z from 'zod';

export const jwtSchema = z.object({
  sub: z.string(),
  email: z.email(),
  username: z.string(),
});