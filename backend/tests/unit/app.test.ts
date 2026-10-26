import { describe, expect, it } from 'bun:test';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { sign } from 'hono/jwt';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';

const JWT_SECRET = 'test-secret';

async function accessToken() {
  return sign(
    {
      sub: 'user-1',
      email: 'user@example.com',
      username: 'user',
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    JWT_SECRET,
  );
}

describe('Application health check', () => {
  it('returns a healthy response without authentication or database access', async () => {
    const app = createApp(JWT_SECRET, '10.0.0.1', {} as PrismaClient).app;

    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});

describe('Service availability errors', () => {
  it('returns 503 when the database is unreachable', async () => {
    const database = {
      food: {
        findMany: () =>
          Promise.reject(
            new PrismaClientKnownRequestError("Can't reach database server", {
              code: 'P1001',
              clientVersion: 'test',
            }),
          ),
      },
    } as unknown as PrismaClient;
    const app = createApp(JWT_SECRET, '127.0.0.1:59998', database).app;

    const response = await app.request('/api/food', {
      headers: { Authorization: `Bearer ${await accessToken()}` },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Service Unavailable',
    });
  });

  it('returns 503 when the authentication service is unreachable', async () => {
    const app = createApp(
      JWT_SECRET,
      '127.0.0.1:59998',
      {} as PrismaClient,
    ).app;

    const response = await app.request('/api/users/me', {
      headers: { Authorization: `Bearer ${await accessToken()}` },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Service Unavailable',
    });
  });
});
