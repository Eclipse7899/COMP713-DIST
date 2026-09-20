import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createDb } from '../../src/db';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { sign } from 'hono/jwt';
import type { JwtFields } from '../../src/variables';
import { FoodCategory } from '../../src/generated/prisma/enums';

let app: ReturnType<typeof createApp>['app'];
let db: PrismaClient;
const jwtSecret = 'test-secret';

async function createTestUser(username: string, email: string) {
  const user = await db.user.create({
    data: {
      username,
      email,
      hashed_password: 'hashedpassword',
    },
  });

  const payload: JwtFields = {
    sub: user.id,
    email: user.email,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };

  const token = await sign(payload, jwtSecret);
  return { user, token };
}

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

describe('Food Endpoints', () => {
  describe('Authorization', () => {
    it('should reject GET /api/food without authorization header', async () => {
      const response = await app.request('/api/food', {
        method: 'GET',
      });
      expect(response.status).toBe(401);
    });

    it('should reject POST /api/food without authorization header', async () => {
      const response = await app.request('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', category: 'FRUIT' }),
      });
      expect(response.status).toBe(401);
    });

    it('should reject PUT /api/food/:id without authorization header', async () => {
      const response = await app.request(
        '/api/food/clh0000000000000000000000',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Apple' }),
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject DELETE /api/food/:id without authorization header', async () => {
      const response = await app.request(
        '/api/food/clh0000000000000000000000',
        {
          method: 'DELETE',
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await app.request('/api/food', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid.token.here' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 when creating food with empty body', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/food', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when creating food with empty name', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/food', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: '', category: 'FRUIT' }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when creating food with invalid category', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/food', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Apple', category: 'NOT_A_CATEGORY' }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when updating food with invalid param id', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/food/not-a-valid-cuid', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when updating food with invalid category', async () => {
      const { token, user } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const food = await db.food.create({
        data: { name: 'Apple', category: 'FRUIT', createdByUserId: user.id },
      });

      const response = await app.request(`/api/food/${food.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: 'INVALID_ENUM' }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when deleting food with invalid param id', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/food/invalid-id!', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/food', () => {
    it('should successfully create food and persist in database', async () => {
      const { user, token } = await createTestUser(
        'foodcreator',
        'foodcreator@example.com',
      );
      const response = await app.request('/api/food', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Banana',
          category: FoodCategory.FRUIT,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Banana');
      expect(data.category).toBe(FoodCategory.FRUIT);
      expect(data.createdByUserId).toBe(user.id);

      // Verify database changes
      const dbFood = await db.food.findUnique({
        where: { id: data.id },
      });
      expect(dbFood).not.toBeNull();
      expect(dbFood?.name).toBe('Banana');
      expect(dbFood?.category).toBe(FoodCategory.FRUIT);
      expect(dbFood?.createdByUserId).toBe(user.id);
    });
  });

  describe('GET /api/food', () => {
    it('should return global foods and own foods, but exclude other users foods', async () => {
      const { user: userA, token: tokenA } = await createTestUser(
        'userA',
        'usera@example.com',
      );
      const { user: userB } = await createTestUser(
        'userB',
        'userb@example.com',
      );

      // Global food (createdByUserId: null)
      const globalFood = await db.food.create({
        data: {
          name: 'Global Rice',
          category: FoodCategory.GRAINS,
          createdByUserId: null,
        },
      });

      // User A food
      const userAFood = await db.food.create({
        data: {
          name: 'Apple UserA',
          category: FoodCategory.FRUIT,
          createdByUserId: userA.id,
        },
      });

      // User B food
      const userBFood = await db.food.create({
        data: {
          name: 'Steak UserB',
          category: FoodCategory.MEAT,
          createdByUserId: userB.id,
        },
      });

      const response = await app.request('/api/food', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      const foodIds = data.map((f: { id: string }) => f.id);
      expect(foodIds).toContain(globalFood.id);
      expect(foodIds).toContain(userAFood.id);
      expect(foodIds).not.toContain(userBFood.id);
    });
  });

  describe('PUT /api/food/:id', () => {
    it('should successfully update own food name and category and verify database', async () => {
      const { user, token } = await createTestUser(
        'foodeditor',
        'editor@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Original Name',
          category: FoodCategory.SNACKS,
          createdByUserId: user.id,
        },
      });

      const response = await app.request(`/api/food/${food.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          category: FoodCategory.DAIRY,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Updated Name');
      expect(data.category).toBe(FoodCategory.DAIRY);

      // Verify in DB
      const updatedDbFood = await db.food.findUnique({
        where: { id: food.id },
      });
      expect(updatedDbFood?.name).toBe('Updated Name');
      expect(updatedDbFood?.category).toBe(FoodCategory.DAIRY);
    });

    it('should return 404 when updating non-existent food', async () => {
      const { token } = await createTestUser(
        'foodeditor2',
        'editor2@example.com',
      );
      const nonExistentId = 'clh0000000000000000000000';

      const response = await app.request(`/api/food/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Something' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 when updating another user food', async () => {
      const { user: userA } = await createTestUser(
        'userA2',
        'usera2@example.com',
      );
      const { token: tokenB } = await createTestUser(
        'userB2',
        'userb2@example.com',
      );

      const foodA = await db.food.create({
        data: {
          name: 'User A Food',
          category: FoodCategory.FRUIT,
          createdByUserId: userA.id,
        },
      });

      const response = await app.request(`/api/food/${foodA.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Hacked Name' }),
      });

      expect(response.status).toBe(403);

      // Verify DB unchanged
      const foodInDb = await db.food.findUnique({ where: { id: foodA.id } });
      expect(foodInDb?.name).toBe('User A Food');
    });

    it('should return 403 when updating global food', async () => {
      const { token } = await createTestUser(
        'userGlobal',
        'userglobal@example.com',
      );
      const globalFood = await db.food.create({
        data: {
          name: 'Global Bread',
          category: FoodCategory.GRAINS,
          createdByUserId: null,
        },
      });

      const response = await app.request(`/api/food/${globalFood.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Modified Global Bread' }),
      });

      expect(response.status).toBe(403);

      // Verify DB unchanged
      const foodInDb = await db.food.findUnique({
        where: { id: globalFood.id },
      });
      expect(foodInDb?.name).toBe('Global Bread');
    });
  });

  describe('DELETE /api/food/:id', () => {
    it('should successfully delete own food and remove from database', async () => {
      const { user, token } = await createTestUser(
        'fooddeleter',
        'deleter@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'To Delete',
          category: FoodCategory.OTHER,
          createdByUserId: user.id,
        },
      });

      const response = await app.request(`/api/food/${food.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(204);

      // Verify DB removal
      const foodInDb = await db.food.findUnique({ where: { id: food.id } });
      expect(foodInDb).toBeNull();
    });

    it('should return 404 when deleting non-existent food', async () => {
      const { token } = await createTestUser(
        'deleter2',
        'deleter2@example.com',
      );
      const nonExistentId = 'clh0000000000000000000000';

      const response = await app.request(`/api/food/${nonExistentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 when deleting another user food', async () => {
      const { user: userA } = await createTestUser(
        'userA3',
        'usera3@example.com',
      );
      const { token: tokenB } = await createTestUser(
        'userB3',
        'userb3@example.com',
      );

      const foodA = await db.food.create({
        data: {
          name: 'User A Protected Food',
          category: FoodCategory.MEAT,
          createdByUserId: userA.id,
        },
      });

      const response = await app.request(`/api/food/${foodA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(response.status).toBe(403);

      // Verify DB not deleted
      const foodInDb = await db.food.findUnique({ where: { id: foodA.id } });
      expect(foodInDb).not.toBeNull();
    });

    it('should return 403 when deleting a global food', async () => {
      const { token } = await createTestUser(
        'deleterGlobal',
        'deleterglobal@example.com',
      );
      const globalFood = await db.food.create({
        data: {
          name: 'Global Water',
          category: FoodCategory.DRINKS,
          createdByUserId: null,
        },
      });

      const response = await app.request(`/api/food/${globalFood.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(403);

      // Verify DB not deleted
      const foodInDb = await db.food.findUnique({
        where: { id: globalFood.id },
      });
      expect(foodInDb).not.toBeNull();
    });
  });
});
