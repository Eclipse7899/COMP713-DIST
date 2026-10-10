import { z } from 'zod';
import type { JwtVariables } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';
import type { jwtSchema } from './schemas';

export type JwtFields = z.infer<typeof jwtSchema> & JWTPayload;

export type Variables = JwtVariables<JwtFields>;
