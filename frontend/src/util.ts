import { hc } from 'hono/client';
import { getJwt } from '../util.ts';
import type { AppType } from '@stocked/backend/src';

export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


export function getClient() {
  const token = getJwt();

  return hc<AppType>('/', {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });
}