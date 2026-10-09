import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import z from 'zod';


export function createHealthRoute() {
  const app = new Hono();
  app.get(
    '/',
    describeRoute({
      tags: ['Health'],
      summary: 'Health check',
      description:
        'Returns a static status payload. Does not touch the database or require authentication.',
      responses: {
        200: {
          description: 'Service is running',
          content: {
            'application/json': {
              schema: resolver(z.object({ status: z.literal('ok') })),
            },
          },
        },
      },
    }),
    (context) => context.json({ status: 'ok' }),
  );
  return app;
}

