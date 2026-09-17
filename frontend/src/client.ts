import { hc } from 'hono/client';
import { getJwt } from '../util.ts';
import type { AppType } from '@stocked/backend/src';


export function getClient() {
  const token = getJwt();

  return hc<AppType>(
    '/',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}
