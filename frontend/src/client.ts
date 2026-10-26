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
  const res = await parseResponse(client.api.ws.ticket.$get()).catch(
    (error: unknown) => {
      return getApiErrorMessage(error, 'ws ticket');
    },
  );

  if (typeof res === 'string') {
    return res;
  }

  const ticket = res.ticket;
  if (!ticket) {
    return 'No ticket received for websocket connection';
  }

  try {
    return new WebSocket(
      client.api.ws.$url() + `?ticket=${encodeURIComponent(ticket)}`,
    );
  } catch {
    return 'Live updates are temporarily unavailable. Reconnecting...';
  }
}
