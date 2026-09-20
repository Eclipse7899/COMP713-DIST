import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { createApp } from '../../src/app';

describe('Application health check', () => {
  it('returns a healthy response without authentication or database access', async () => {
    const app = createApp('test-secret', {} as PrismaClient).app;

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
