import { Context, Hono } from 'hono';
import type { Variables } from '../variables';
import { upgradeWebSocket } from '@hono/bun';
import type { RealtimeHub } from '../realtime/realtime-hub';

const tokens = new Map<string, string>();

export function createWsRoute(realtime: RealtimeHub) {
  return new Hono<{ Variables: Variables }>().get(
    '/',
    upgradeWebSocket((c) => {
      const token = c.req.query('token');
      if (!token) {
        throw new Error('Token is required');
      }
      const userId = tokens.get(token);
      if (!userId) {
        throw new Error('Invalid token');
      }
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
      },
    ),
  ).get(
    '/token',
    async (c: Context<{ Variables: Variables }>) => {
      const userId = c.get('jwtPayload').sub;
      const token = crypto.randomUUID();
      tokens.set(token, userId);
      return c.json({ token });
    }
  )
}