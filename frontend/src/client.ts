import type { AppType } from '@stocked/backend/src/index.ts';
import { hc } from 'hono/client';

export const client = hc<AppType>('/')