import { Context, Hono } from 'hono';
import type { Variables } from '../variables';
import { upgradeWebSocket } from '@hono/bun';
import type { RealtimeHub } from '../realtime/realtime-hub';
import { describeRoute, resolver } from 'hono-openapi';
import { unauthorizedResponse, wsTokenResponseSchema } from '../schemas';
import { verify } from 'hono/jwt';
import type { AuthService } from '../services/auth.service';

const wsTokenQueryParameter = {
  name: 'token',
  in: 'query' as const,
  required: true,
  description: 'Connection token previously issued by GET /ws/token',
  schema: { type: 'string' as const },
};

export function createWsRoute(realtime: RealtimeHub, jwtToken: string, authService: AuthService) {
  return new Hono<{ Variables: Variables }>().get(
    '/',
    describeRoute({
      tags: ['WebSocket'],
      summary: 'Open a realtime WebSocket connection',
      description:
        'Upgrades the request to a WebSocket connection and streams realtime inventory events to the client as JSON messages. Authenticate by passing a connection token (obtained from GET /ws/token) as the token query parameter rather than an Authorization header.',
      parameters: [wsTokenQueryParameter],
      responses: {
        101: {
          description:
            'Switching Protocols: the WebSocket connection was established',
        },
        400: {
          description: 'The token query parameter is missing',
          content: {
            'text/plain': { schema: { type: 'string' as const } },
          },
        },
        401: {
          description: 'The provided connection token is invalid or expired',
          content: {
            'text/plain': { schema: { type: 'string' as const } },
          },
        },
      },
    }),
    upgradeWebSocket(async (c) => {
      const token = c.req.query('token');
      if (!token) {
        throw new Error('Token is required');
      }
      const payload = await verify(token, jwtToken, 'HS256');
      const userId = payload.sub;
      if (!userId) {
        throw new Error('Invalid token');
      }
      if (typeof userId !== 'string') {
        throw new Error('Token user ID does not match');
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
    describeRoute({
      tags: ['WebSocket'],
      summary: 'Issue a WebSocket connection token',
      description:
        'Generates a single-use connection token for the authenticated user, to be supplied as the token query parameter when opening the WebSocket connection at GET /ws.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Connection token issued',
          content: {
            'application/json': { schema: resolver(wsTokenResponseSchema) },
          },
        },
        401: unauthorizedResponse,
      },
    }),
    async (c: Context<{ Variables: Variables }>) => {
      const userId = c.get('jwtPayload').sub;
      const { token } = await authService.getWsToken(userId);
      return c.json({ token });
    }
  )
}