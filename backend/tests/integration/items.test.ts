import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createDb } from '../../src/db';
import { createApp } from '../../src/app';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { sign } from 'hono/jwt';
import type { JwtFields } from '../../src/variables';
import { FoodCategory, FoodUnit } from '../../src/generated/prisma/enums';

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

describe('Items Endpoints', () => {
  describe('Authorization', () => {
    it('should reject GET /api/items without authorization header', async () => {
      const response = await app.request('/api/items', {
        method: 'GET',
      });
      expect(response.status).toBe(401);
    });

    it('should reject POST /api/items without authorization header', async () => {
      const response = await app.request('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 2,
          unit: 'ITEM',
        }),
      });
      expect(response.status).toBe(401);
    });

    it('should reject PUT /api/items/:id without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodId: 'clh0000000000000000000000',
            quantity: 3,
            unit: 'KG',
          }),
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject DELETE /api/items/:id without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000',
        {
          method: 'DELETE',
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await app.request('/api/items', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid.token.payload' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 when creating item with invalid foodId', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'invalid-cuid2',
          quantity: 2,
          unit: 'ITEM',
        }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when creating item with non-positive quantity', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 0,
          unit: 'ITEM',
        }),
      });
      expect(response.status).toBe(400);

      const responseNegative = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: -5,
          unit: 'ITEM',
        }),
      });
      expect(responseNegative.status).toBe(400);
    });

    it('should return 400 when creating item with invalid unit', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 2,
          unit: 'INVALID_UNIT',
        }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when creating item with invalid expiryDate format', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 2,
          unit: 'ITEM',
          expiryDate: 'invalid-date-string',
        }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when updating item with invalid param id', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items/invalid-id!', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 2,
          unit: 'ITEM',
        }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when deleting item with invalid param id', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const response = await app.request('/api/items/invalid-id!', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when querying items with invalid sort or category', async () => {
      const { token } = await createTestUser('user1', 'user1@example.com');
      const invalidSortResponse = await app.request(
        '/api/items?sort=invalid_sort',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(invalidSortResponse.status).toBe(400);

      const invalidCategoryResponse = await app.request(
        '/api/items?categories=NOT_A_CATEGORY',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(invalidCategoryResponse.status).toBe(400);
    });
  });

  describe('POST /api/items', () => {
    it('should successfully create an item with global food and persist to database', async () => {
      const { user, token } = await createTestUser(
        'itemuser1',
        'itemuser1@example.com',
      );
      const globalFood = await db.food.create({
        data: {
          name: 'Milk',
          category: FoodCategory.DAIRY,
          createdByUserId: null,
        },
      });

      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: globalFood.id,
          quantity: 2.5,
          unit: FoodUnit.L,
          expiryDate: '2026-12-31',
        }),
      });

      expect(response.status).toBe(201);
      const res = await response.json();
      expect(res.success).toBe(true);
      expect(res.data.foodId).toBe(globalFood.id);
      expect(res.data.quantity).toBe(2.5);
      expect(res.data.unit).toBe(FoodUnit.L);
      expect(res.data.food.name).toBe('Milk');

      // Verify database changes
      const dbItem = await db.foodItem.findUnique({
        where: { id: res.data.id },
      });
      expect(dbItem).not.toBeNull();
      expect(dbItem?.userId).toBe(user.id);
      expect(dbItem?.foodId).toBe(globalFood.id);
      expect(dbItem?.quantity).toBe(2.5);
      expect(dbItem?.unit).toBe(FoodUnit.L);
    });

    it('should successfully create an item with user own custom food', async () => {
      const { user, token } = await createTestUser(
        'itemuser2',
        'itemuser2@example.com',
      );
      const customFood = await db.food.create({
        data: {
          name: 'Custom Homemade Sauce',
          category: FoodCategory.SAUCES,
          createdByUserId: user.id,
        },
      });

      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: customFood.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
          expiryDate: null,
        }),
      });

      expect(response.status).toBe(201);
      const res = await response.json();
      expect(res.success).toBe(true);
      expect(res.data.foodId).toBe(customFood.id);
    });

    it('should return 404 if foodId does not exist', async () => {
      const { token } = await createTestUser(
        'itemuser3',
        'itemuser3@example.com',
      );
      const nonExistentFoodId = 'clh0000000000000000000000';

      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: nonExistentFoodId,
          quantity: 1,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(response.status).toBe(404);
      const res = await response.json();
      expect(res.error).toBe('Food not found');
    });

    it('should return 403 if foodId belongs to another user', async () => {
      const { user: userA } = await createTestUser(
        'userA',
        'usera@example.com',
      );
      const { token: tokenB } = await createTestUser(
        'userB',
        'userb@example.com',
      );

      const userAFood = await db.food.create({
        data: {
          name: 'User A Secret Bread',
          category: FoodCategory.GRAINS,
          createdByUserId: userA.id,
        },
      });

      const response = await app.request('/api/items', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: userAFood.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(response.status).toBe(403);
      const res = await response.json();
      expect(res.error).toBe('Unauthorized food');

      // Verify no DB item was created
      const count = await db.foodItem.count();
      expect(count).toBe(0);
    });
  });

  describe('GET /api/items', () => {
    it('should only return items belonging to current user', async () => {
      const { user: userA, token: tokenA } = await createTestUser(
        'userA',
        'usera@example.com',
      );
      const { user: userB } = await createTestUser(
        'userB',
        'userb@example.com',
      );

      const food = await db.food.create({
        data: {
          name: 'Apples',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });

      const itemA = await db.foodItem.create({
        data: {
          userId: userA.id,
          foodId: food.id,
          quantity: 5,
          unit: FoodUnit.ITEM,
        },
      });

      await db.foodItem.create({
        data: {
          userId: userB.id,
          foodId: food.id,
          quantity: 10,
          unit: FoodUnit.ITEM,
        },
      });

      const response = await app.request('/api/items', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(itemA.id);
      expect(data[0].quantity).toBe(5);
    });

    it('should filter items by name_contains (case-insensitive)', async () => {
      const { user, token } = await createTestUser(
        'searchuser',
        'search@example.com',
      );

      const food1 = await db.food.create({
        data: {
          name: 'Organic Strawberry Yogurt',
          category: FoodCategory.DAIRY,
          createdByUserId: null,
        },
      });
      const food2 = await db.food.create({
        data: {
          name: 'Fresh Blueberries',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });

      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food1.id,
          quantity: 1,
          unit: FoodUnit.PACK,
        },
      });
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food2.id,
          quantity: 2,
          unit: FoodUnit.PACK,
        },
      });

      const response = await app.request('/api/items?contains=STRAWBERRY', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].food.name).toBe('Organic Strawberry Yogurt');
    });

    it('should filter items by categories', async () => {
      const { user, token } = await createTestUser(
        'catuser',
        'cat@example.com',
      );

      const fruit = await db.food.create({
        data: {
          name: 'Orange',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });
      const meat = await db.food.create({
        data: {
          name: 'Chicken Breast',
          category: FoodCategory.MEAT,
          createdByUserId: null,
        },
      });
      const drink = await db.food.create({
        data: {
          name: 'Cola',
          category: FoodCategory.DRINKS,
          createdByUserId: null,
        },
      });

      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: fruit.id,
          quantity: 3,
          unit: FoodUnit.ITEM,
        },
      });
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: meat.id,
          quantity: 1,
          unit: FoodUnit.KG,
        },
      });
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: drink.id,
          quantity: 6,
          unit: FoodUnit.ITEM,
        },
      });

      // Filter by single category
      const resFruit = await app.request('/api/items?categories=FRUIT', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resFruit.status).toBe(200);
      const dataFruit = await resFruit.json();
      expect(dataFruit).toHaveLength(1);
      expect(dataFruit[0].food.category).toBe(FoodCategory.FRUIT);

      // Filter by multiple categories
      const resMulti = await app.request(
        '/api/items?categories=FRUIT&categories=MEAT',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(resMulti.status).toBe(200);
      const dataMulti = await resMulti.json();
      expect(dataMulti).toHaveLength(2);
    });

    it('should filter items by expiresBefore and sort asc/desc', async () => {
      const { user, token } = await createTestUser(
        'filteruser',
        'filter@example.com',
      );

      const food1 = await db.food.create({
        data: {
          name: 'Item 1',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });
      const food2 = await db.food.create({
        data: {
          name: 'Item 2',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });
      const food3 = await db.food.create({
        data: {
          name: 'Item 3',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });

      // item 1: expires 2026-06-01
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food1.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
          expiryDate: new Date('2026-06-01T00:00:00.000Z'),
        },
      });
      // item 2: expires 2026-07-01
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food2.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
          expiryDate: new Date('2026-07-01T00:00:00.000Z'),
        },
      });
      // item 3: expires 2026-09-01
      await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food3.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
          expiryDate: new Date('2026-09-01T00:00:00.000Z'),
        },
      });

      // Filter items expiring before 2026-08-01
      const resExpiry = await app.request('/api/items?expiryDate=2026-08-01', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resExpiry.status).toBe(200);
      const dataExpiry = await resExpiry.json();
      expect(dataExpiry).toHaveLength(2);

      // Sort descending
      const resDesc = await app.request('/api/items?sort=desc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resDesc.status).toBe(200);
      const dataDesc = await resDesc.json();
      expect(dataDesc).toHaveLength(3);
      expect(new Date(dataDesc[0].expiryDate).getTime()).toBeGreaterThan(
        new Date(dataDesc[2].expiryDate).getTime(),
      );
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should successfully update item quantity, unit, and expiryDate and verify database', async () => {
      const { user, token } = await createTestUser(
        'updateuser',
        'update@example.com',
      );
      const food1 = await db.food.create({
        data: {
          name: 'Initial Food',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });
      const food2 = await db.food.create({
        data: {
          name: 'Replacement Food',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });

      const item = await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food1.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
          expiryDate: new Date('2026-05-01T00:00:00.000Z'),
        },
      });

      const response = await app.request(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food2.id,
          quantity: 4.5,
          unit: FoodUnit.KG,
          expiryDate: '2026-11-20',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.foodId).toBe(food2.id);
      expect(data.quantity).toBe(4.5);
      expect(data.unit).toBe(FoodUnit.KG);

      // Verify DB persistence
      const dbItem = await db.foodItem.findUnique({
        where: { id: item.id },
      });
      expect(dbItem?.foodId).toBe(food2.id);
      expect(dbItem?.quantity).toBe(4.5);
      expect(dbItem?.unit).toBe(FoodUnit.KG);
      expect(dbItem?.expiryDate).toEqual(new Date('2026-11-20T00:00:00.000Z'));
    });

    it('should return 404 when updating non-existent item', async () => {
      const { token } = await createTestUser(
        'updateuser2',
        'update2@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Some Food',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });
      const nonExistentItemId = 'clh0000000000000000000000';

      const response = await app.request(`/api/items/${nonExistentItemId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food.id,
          quantity: 2,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 when updating another user item', async () => {
      const { user: userA } = await createTestUser(
        'userA',
        'usera4@example.com',
      );
      const { token: tokenB } = await createTestUser(
        'userB',
        'userb4@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Food',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });

      const itemA = await db.foodItem.create({
        data: {
          userId: userA.id,
          foodId: food.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        },
      });

      const response = await app.request(`/api/items/${itemA.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food.id,
          quantity: 99,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(response.status).toBe(404);

      // Verify DB unchanged
      const dbItem = await db.foodItem.findUnique({ where: { id: itemA.id } });
      expect(dbItem?.quantity).toBe(1);
    });

    it('should return 404 when updating item with non-existent foodId or food belonging to another user', async () => {
      const { user: userA, token: tokenA } = await createTestUser(
        'userA5',
        'usera5@example.com',
      );
      const { user: userB } = await createTestUser(
        'userB5',
        'userb5@example.com',
      );

      const foodA = await db.food.create({
        data: {
          name: 'Food A',
          category: FoodCategory.OTHER,
          createdByUserId: userA.id,
        },
      });
      const foodB = await db.food.create({
        data: {
          name: 'Private Food B',
          category: FoodCategory.OTHER,
          createdByUserId: userB.id,
        },
      });

      const itemA = await db.foodItem.create({
        data: {
          userId: userA.id,
          foodId: foodA.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        },
      });

      // Update with foodId belonging to user B
      const response = await app.request(`/api/items/${itemA.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: foodB.id,
          quantity: 2,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(response.status).toBe(404);

      // Update with non-existent foodId
      const resNonExistent = await app.request(`/api/items/${itemA.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: 'clh0000000000000000000000',
          quantity: 2,
          unit: FoodUnit.ITEM,
        }),
      });

      expect(resNonExistent.status).toBe(404);
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should successfully delete own item and verify database removal', async () => {
      const { user, token } = await createTestUser(
        'deluser',
        'del@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'To Delete Item Food',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });

      const item = await db.foodItem.create({
        data: {
          userId: user.id,
          foodId: food.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        },
      });

      const response = await app.request(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify DB removal
      const dbItem = await db.foodItem.findUnique({ where: { id: item.id } });
      expect(dbItem).toBeNull();
    });

    it('should return 404 when deleting non-existent item', async () => {
      const { token } = await createTestUser('deluser2', 'del2@example.com');
      const nonExistentId = 'clh0000000000000000000000';

      const response = await app.request(`/api/items/${nonExistentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting item belonging to another user', async () => {
      const { user: userA } = await createTestUser(
        'userA6',
        'usera6@example.com',
      );
      const { token: tokenB } = await createTestUser(
        'userB6',
        'userb6@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Food Protected',
          category: FoodCategory.OTHER,
          createdByUserId: null,
        },
      });

      const itemA = await db.foodItem.create({
        data: {
          userId: userA.id,
          foodId: food.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        },
      });

      const response = await app.request(`/api/items/${itemA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(response.status).toBe(404);

      // Verify DB unchanged
      const dbItem = await db.foodItem.findUnique({ where: { id: itemA.id } });
      expect(dbItem).not.toBeNull();
    });
  });
});
