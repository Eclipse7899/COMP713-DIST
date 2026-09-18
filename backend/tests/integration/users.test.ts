import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createDb } from '../../src/db';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { sign } from 'hono/jwt';

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
  // Ensure idempotent clean state between tests
  await db.foodItem.deleteMany();
  await db.food.deleteMany();
  await db.user.deleteMany();
});

async function registerUser(username: string, email: string, password = 'password123') {
  const response = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json();
  return { status: response.status, token: data.accessToken };
}

describe('Users Endpoints (/api/users)', () => {
  describe('GET /api/users/me', () => {
    describe('Authentication & Authorization', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const response = await app.request('/api/users/me', {
          method: 'GET',
        });

        expect(response.status).toBe(401);
      });

      it('should return 401 when Authorization header is malformed', async () => {
        const response = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: 'NotBearer token123',
          },
        });

        expect(response.status).toBe(401);
      });

      it('should return 401 when JWT token is invalid', async () => {
        const response = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid.token.value',
          },
        });

        expect(response.status).toBe(401);
      });

      it('should return 401 when JWT token is signed with wrong secret', async () => {
        const invalidToken = await sign(
          { sub: 'some-user-id', email: 'test@example.com', username: 'testuser' },
          'wrong-secret',
          'HS256',
        );

        const response = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${invalidToken}`,
          },
        });

        expect(response.status).toBe(401);
      });

      it('should return 404 when user in valid JWT does not exist in database', async () => {
        const nonExistentUserId = 'non-existent-user-id';
        const token = await sign(
          { sub: nonExistentUserId, email: 'ghost@example.com', username: 'ghost' },
          jwtSecret,
          'HS256',
        );

        const response = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toEqual({ message: 'User not found' });
      });
    });

    describe('Success & Data Retrieval', () => {
      it('should return the authenticated user profile with correct details', async () => {
        const { token } = await registerUser('alice', 'alice@example.com');

        const response = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('email', 'alice@example.com');
        expect(data).toHaveProperty('username', 'alice');

        // Ensure sensitive fields like password hashes are NOT returned
        expect(data).not.toHaveProperty('hashed_password');
        expect(data).not.toHaveProperty('password');

        // Verify against database
        const dbUser = await db.user.findUnique({
          where: { id: data.id },
        });
        expect(dbUser).not.toBeNull();
        expect(dbUser?.email).toBe('alice@example.com');
        expect(dbUser?.username).toBe('alice');
      });

      it('should isolate profiles between different authenticated users', async () => {
        const user1 = await registerUser('userone', 'user1@example.com');
        const user2 = await registerUser('usertwo', 'user2@example.com');

        const res1 = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user1.token}`,
          },
        });
        const res2 = await app.request('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user2.token}`,
          },
        });

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        const profile1 = await res1.json();
        const profile2 = await res2.json();

        expect(profile1.id).not.toBe(profile2.id);
        expect(profile1.username).toBe('userone');
        expect(profile1.email).toBe('user1@example.com');
        expect(profile2.username).toBe('usertwo');
        expect(profile2.email).toBe('user2@example.com');
      });

      it('should reflect current database state if user profile was updated', async () => {
        const { token } = await registerUser('initialname', 'initial@example.com');

        // Fetch initial profile
        const initialRes = await app.request('/api/users/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(initialRes.status).toBe(200);
        const initialData = await initialRes.json();
        expect(initialData.username).toBe('initialname');

        // Update user in database directly
        await db.user.update({
          where: { id: initialData.id },
          data: { username: 'updatedname', email: 'updated@example.com' },
        });

        // Request profile again with existing token
        const updatedRes = await app.request('/api/users/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(updatedRes.status).toBe(200);
        const updatedData = await updatedRes.json();
        expect(updatedData.id).toBe(initialData.id);
        expect(updatedData.username).toBe('updatedname');
        expect(updatedData.email).toBe('updated@example.com');
      });
    });
  });
});
