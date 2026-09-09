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

  it('should not register a user with an existing email', async () => {
    const registerResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser3',
        password: 'testpassword',
        email: 'testuser3@example.com',
      }),
    });

    expect(registerResponse.status).toBe(201);

    const repeatedRegisterResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'newtestuser3',
        password: 'testpassword',
        email: 'testuser3@example.com',
      }),
    });

    expect(repeatedRegisterResponse.status).toBe(409);
  });

  it('should not register a user with an existing username', async () => {
    const registerResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser4',
        password: 'testpassword',
        email: 'testuser4@example.com',
      }),
    });

    expect(registerResponse.status).toBe(201);

    const repeatedRegisterResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser4',
        password: 'testpassword',
        email: 'newtestuser4@example.com',
      }),
    });

    expect(repeatedRegisterResponse.status).toBe(409);
  });

  it ('should not register a user with short password', async () => {
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser5',
        password: 'short',
        email: 'testuser5@example.com',
      }),
    });

    expect(response.status).toBe(400);
  });

  it ('should not register a user with invalid email', async () => {
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser6',
        password: 'testpassword',
        email: 'invalid-email',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should login an existing user', async () => {
    const registerResponse = await app.request('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser2',
        email: 'testuser2@example.com',
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
        email: 'testuser2@example.com',
        password: 'testpassword',
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('accessToken');
  });
});