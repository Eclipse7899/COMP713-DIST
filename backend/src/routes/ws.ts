import { Hono } from 'hono';
import type { Variables } from '../variables';
import { upgradeWebSocket } from '@hono/bun';
import type { RealtimeHub } from '../realtime/realtime-hub';

export function createWsRoute(realtime: RealtimeHub) {
  return new Hono<{ Variables: Variables }>().get(
    '/ws',
    (c, next) => {
      const userId = c.get('jwtPayload').sub;
      const wsHandler = upgradeWebSocket(() => {
          {
            return {
              onOpen(_, ws) {
                realtime.subscribe(userId, (event) => {
                  ws.send(JSON.stringify(event));
                });
              },
              onClose(_, ws) {
                realtime.unsubscribe(userId, (event) => {
                  ws.send(JSON.stringify(event));
                });
              },
            };
          }
        },
      );
      return wsHandler(c, next);
    },
  );
}