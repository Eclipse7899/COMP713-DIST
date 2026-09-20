import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createDb } from '../../src/db';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { verify } from 'hono/jwt';
import bcrypt from 'bcrypt';

let app: ReturnType<typeof createApp>['app'];
let db: PrismaClient;
const jwtSecret = 'test-secret';

beforeAll(async () => {
  const dbUrl = await setupTestDatabase();
  db = createDb(dbUrl);
  app = createApp(jwtSecret, db).app;
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await db.foodItem.deleteMany();
  await db.food.deleteMany();
  await db.user.deleteMany();
});

describe('Auth Endpoints', () => {
  describe('Registration', () => {
    describe('Validation', () => {
      it('should reject registration with empty body', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect(response.status).toBe(400);
      });

      it('should reject registration with missing password', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'validuser',
            email: 'valid@example.com',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject registration with missing username', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'valid@example.com',
            password: 'validpassword123',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject registration with missing email', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'validuser',
            password: 'validpassword123',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should not register a user with invalid email format', async () => {
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

      it('should not register a user with short password (< 8 chars)', async () => {
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

      it('should reject registration with short username (< 3 chars)', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'ab',
            password: 'validpassword123',
            email: 'shortuser@example.com',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject registration with overly long username (> 20 chars)', async () => {
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'a'.repeat(21),
            password: 'validpassword123',
            email: 'longuser@example.com',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject registration with invalid characters in username', async () => {
        const invalidUsernames = [
          'user name',
          'user@name',
          'user!name',
          'user.name',
          'user$name',
        ];

        for (const username of invalidUsernames) {
          const response = await app.request('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password: 'validpassword123',
              email: `user_${Date.now()}@example.com`,
            }),
          });

          expect(response.status).toBe(400);
        }
      });
    });

    describe('Conflict & Error Handling', () => {
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

        const repeatedRegisterResponse = await app.request(
          '/api/auth/register',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: 'newtestuser3',
              password: 'testpassword',
              email: 'testuser3@example.com',
            }),
          },
        );

        expect(repeatedRegisterResponse.status).toBe(409);
        const data = await repeatedRegisterResponse.json();
        expect(data).toHaveProperty('message', 'Email is already taken');
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

        const repeatedRegisterResponse = await app.request(
          '/api/auth/register',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: 'testuser4',
              password: 'testpassword',
              email: 'newtestuser4@example.com',
            }),
          },
        );

        expect(repeatedRegisterResponse.status).toBe(409);
        const data = await repeatedRegisterResponse.json();
        expect(data).toHaveProperty('message', 'Username is already taken');
      });
    });

    describe('Success & Database State', () => {
      it('should register a new user, return access token, and persist hashed password in database', async () => {
        const rawPassword = 'testpassword123';
        const response = await app.request('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'testuser',
            password: rawPassword,
            email: 'testuser@example.com',
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data).toHaveProperty('accessToken');
        expect(typeof data.accessToken).toBe('string');

        // Verify token payload
        const decoded = await verify(data.accessToken, jwtSecret, 'HS256');
        expect(decoded.email).toBe('testuser@example.com');
        expect(decoded.username).toBe('testuser');
        expect(decoded).toHaveProperty('sub');

        // Verify database state
        const dbUser = await db.user.findUnique({
          where: { email: 'testuser@example.com' },
        });
        expect(dbUser).not.toBeNull();
        expect(dbUser?.username).toBe('testuser');
        expect(dbUser?.email).toBe('testuser@example.com');
        expect(dbUser?.id).toBe(decoded.sub);
        // Ensure raw password is NOT stored in plain text
        expect(dbUser?.hashed_password).not.toBe(rawPassword);
        // Ensure password is correctly hashed
        const isPasswordMatch = await bcrypt.compare(
          rawPassword,
          dbUser!.hashed_password,
        );
        expect(isPasswordMatch).toBe(true);
      });

      it('should allow valid usernames with alphanumeric characters, underscores, and dashes', async () => {
        const validUsernames = ['user_123', 'user-name', 'User_99', 'a-b_c'];

        for (const username of validUsernames) {
          const response = await app.request('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password: 'validpassword123',
              email: `${username}@example.com`,
            }),
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data).toHaveProperty('accessToken');
        }
      });
    });
  });

  describe('Login', () => {
    describe('Validation', () => {
      it('should reject login with empty body', async () => {
        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect(response.status).toBe(400);
      });

      it('should reject login with missing email', async () => {
        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'testpassword',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject login with missing password', async () => {
        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject login with invalid email format', async () => {
        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'not-an-email',
            password: 'testpassword',
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Authentication Failure', () => {
      it('should not login with non-existent user email', async () => {
        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: 'somepassword',
          }),
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toHaveProperty('message', 'Invalid credentials');
      });

      it('should not login with incorrect password', async () => {
        await app.request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser2',
            email: 'testuser2@example.com',
            password: 'correctpassword',
          }),
        });

        const response = await app.request('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'testuser2@example.com',
            password: 'wrongpassword',
          }),
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toHaveProperty('message', 'Invalid credentials');
      });
    });

    describe('Success', () => {
      it('should login an existing user and return valid access token', async () => {
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
        expect(typeof data.accessToken).toBe('string');

        // Verify token payload
        const decoded = await verify(data.accessToken, jwtSecret, 'HS256');
        expect(decoded.email).toBe('testuser2@example.com');
        expect(decoded.username).toBe('testuser2');
      });
    });
  });
});
