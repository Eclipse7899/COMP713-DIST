import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './setup';
import { createDb } from '../src/db';
import { createApp } from '../src/app';

let app: ReturnType<typeof createApp>['app'];

beforeAll(async () => {
  const dbUrl = await setupTestDatabase();
  const jwtSecret = 'test-secret';
  const db = createDb(dbUrl);

  app = createApp(jwtSecret, db).app;
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Authentication', () => {
  it('should register a new user', async () => {
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpassword',
        email: 'testuser@example.com',
      }),
    });

    expect(response.status).toBe(201);
  });

  it('should login an existing user', async () => {
    const registerResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'testpassword',
      }),
    });

    expect(registerResponse.status).toBe(201);

    const response = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'testpassword',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('token');
  });
});