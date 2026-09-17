import { hc } from 'hono/client';
import { getJwt } from './util';
import type { AppType } from '@stocked/backend/src';

export function getClient() {
  const token = getJwt();

  return hc<AppType>('/', {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
}

