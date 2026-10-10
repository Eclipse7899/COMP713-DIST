import { describe, expect, it } from 'bun:test';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';

describe('Application health check', () => {
  it('returns a healthy response without authentication or database access', async () => {
    const app = createApp('test-secret', '10.0.0.1', {} as PrismaClient).app;

    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
