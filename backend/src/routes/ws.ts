import { Context, Hono } from 'hono';
import type { Variables } from '../variables';
import { upgradeWebSocket } from '@hono/bun';
import type { RealtimeHub, ServerCallback } from '../realtime/realtime-hub';
import { describeRoute, resolver } from 'hono-openapi';
import { unauthorizedResponse, wsTicketResponseSchema } from '../schemas';
import type { WsTicketService } from '../services/ws-ticket.service';

const wsTicketQueryParameter = {
  name: 'ticket',
  in: 'query' as const,
  required: true,
  description: 'Single-use ticket previously issued by GET /ws/ticket',
  schema: { type: 'string' as const },
};

export function createWsRoute(realtime: RealtimeHub, tickets: WsTicketService) {
  return new Hono<{ Variables: Variables }>()
    .get(
      '/',
      describeRoute({
        tags: ['WebSocket'],
        summary: 'Open a realtime WebSocket connection',
        description:
          'Upgrades the request to a WebSocket connection and streams realtime inventory events to the client as JSON messages. Authenticate by passing a single-use ticket (obtained from GET /ws/ticket) as the ticket query parameter rather than an Authorization header.',
        parameters: [wsTicketQueryParameter],
        responses: {
          101: {
            description:
              'Switching Protocols: the WebSocket connection was established',
          },
          400: {
            description: 'The ticket query parameter is missing',
            content: {
              'text/plain': { schema: { type: 'string' as const } },
            },
          },
          401: {
            description:
              'The provided ticket is invalid, expired, or already used',
            content: {
              'text/plain': { schema: { type: 'string' as const } },
            },
          },
        },
      }),
      async (c, next) => {
        const ticket = c.req.query('ticket');
        if (!ticket) {
          return c.text('Ticket is required', 400);
        }

        const userId = await tickets.consume(ticket);
        if (!userId) {
          return c.text('Invalid or expired ticket', 401);
        }

        c.set('wsUserId', userId);
        await next();
      },
      upgradeWebSocket((c) => {
        const userId = c.get('wsUserId');
        let listener: ServerCallback | undefined;

        return {
          onOpen(_, ws) {
            listener = (event) => {
              ws.send(JSON.stringify(event));
            };
            realtime.subscribe(userId, listener);
          },
          onClose() {
            if (listener) {
              realtime.unsubscribe(userId, listener);
            }
          },
        };
      }),
    )
    .get(
      '/ticket',
      describeRoute({
        tags: ['WebSocket'],
        summary: 'Issue a WebSocket connection ticket',
        description:
          'Generates a single-use ticket for the authenticated user, valid for 30 seconds, to be supplied as the ticket query parameter when opening the WebSocket connection at GET /ws.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Connection ticket issued',
            content: {
              'application/json': { schema: resolver(wsTicketResponseSchema) },
            },
          },
          401: unauthorizedResponse,
        },
      }),
      async (c: Context<{ Variables: Variables }>) => {
        const userId = c.get('jwtPayload').sub;
        const { ticket } = await tickets.issue(userId);
        return c.json({ ticket });
      },
    );
}
