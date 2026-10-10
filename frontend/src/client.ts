import { hc, parseResponse } from 'hono/client';
import { getJwt } from './util';
import type { AppType } from '@stocked/backend/src';
import { getApiErrorMessage } from './apiError.ts';

export function getClient() {
  const token = getJwt();

  return hc<AppType>(window.location.origin, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
}

export async function getWebSocketClient(
  client: ReturnType<typeof getClient>,
): Promise<WebSocket | string> {
  const res = await parseResponse(client.api.ws.token.$get()).catch(
    (error: unknown) => {
      return getApiErrorMessage(error, 'ws token');
    },
  );

  if (typeof res === 'string') {
    return res;
  }

  const token = res.token;
  if (!token) {
    return 'No token received for websocket connection';
  }
  return new WebSocket(client.api.ws.$url() + `?token=${token}`);
}
