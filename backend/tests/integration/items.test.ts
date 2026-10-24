import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from 'bun:test';
import { createApp } from '../../src/app';
import { sign } from 'hono/jwt';
import type { JwtFields } from '../../src/variables';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaClient as AuthPrismaClient } from '../../../auth-service/src/generated/prisma/client';
import { setup, teardown } from '../setup';
import { PrismaPg } from '@prisma/adapter-pg';
import { FoodCategory, FoodUnit } from '../../src/generated/prisma/enums';

jest.setTimeout(30000);

let app: ReturnType<typeof createApp>['app'];
let db: PrismaClient;
let authDb: AuthPrismaClient;
const jwtSecret = 'test-secret';
const authPort = 5051;

async function createTestUser(username: string, email: string) {
  const user = await authDb.user.create({
    data: {
      username,
      email,
      hashed_password: 'hashedpassword',
    },
  });
  await db.user.create({ data: { id: user.id } });

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
  const { backendDatabaseUrl, authDatabaseUrl, auth } = await setup(
    jwtSecret,
    authPort,
  );
  db = new PrismaClient({
    adapter: new PrismaPg(backendDatabaseUrl),
  });
  authDb = new AuthPrismaClient({
    adapter: new PrismaPg(authDatabaseUrl),
  });
  app = createApp(jwtSecret, auth, db).app;
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await db.userShare.deleteMany();
  await db.foodItem.deleteMany();
  await db.food.deleteMany();
  await db.user.deleteMany();
  await authDb.user.deleteMany();
});

describe('Items Endpoints', () => {
  describe('Authorization', () => {
    it('should reject GET /api/items/:userId without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000',
        {
          method: 'GET',
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject POST /api/items/:userId without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodId: 'clh0000000000000000000000',
            quantity: 2,
            unit: 'ITEM',
          }),
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject PUT /api/items/:userId/:id without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000/clh0000000000000000000000',
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

    it('should reject DELETE /api/items/:userId/:id without authorization header', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000/clh0000000000000000000000',
        {
          method: 'DELETE',
        },
      );
      expect(response.status).toBe(401);
    });

    it('should reject GET /api/items/shared-with-me without authorization header', async () => {
      const response = await app.request('/api/items/shared-with-me', {
        method: 'GET',
      });
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await app.request(
        '/api/items/clh0000000000000000000000',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer invalid.token.payload' },
        },
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 when creating item with invalid foodId', async () => {
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}`, {
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
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}`, {
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

      const responseNegative = await app.request(`/api/items/${user.id}`, {
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
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}`, {
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
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}`, {
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
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}/invalid-id!`, {
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
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const response = await app.request(`/api/items/${user.id}/invalid-id!`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when querying items with invalid sort or category', async () => {
      const { user, token } = await createTestUser(
        'user1',
        'user1@example.com',
      );
      const invalidSortResponse = await app.request(
        `/api/items/${user.id}?sort=invalid_sort`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(invalidSortResponse.status).toBe(400);

      const invalidCategoryResponse = await app.request(
        `/api/items/${user.id}?categories=NOT_A_CATEGORY`,
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

      const response = await app.request(`/api/items/${user.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: globalFood.id,
          quantity: 2.5,
          unit: FoodUnit.L,
          expiryDate: new Date('2026-12-31').toISOString(),
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

      const response = await app.request(`/api/items/${user.id}`, {
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
      const { user, token } = await createTestUser(
        'itemuser3',
        'itemuser3@example.com',
      );
      const nonExistentFoodId = 'clh0000000000000000000000';

      const response = await app.request(`/api/items/${user.id}`, {
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
      const { user: userB, token: tokenB } = await createTestUser(
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

      const response = await app.request(`/api/items/${userB.id}`, {
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

  describe('GET /api/items/:userId', () => {
    it('should only return items belonging to the requested user', async () => {
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

      const response = await app.request(`/api/items/${userA.id}`, {
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

      const response = await app.request(
        `/api/items/${user.id}?contains=STRAWBERRY`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

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
      const resFruit = await app.request(
        `/api/items/${user.id}?categories=FRUIT`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(resFruit.status).toBe(200);
      const dataFruit = await resFruit.json();
      expect(dataFruit).toHaveLength(1);
      expect(dataFruit[0].food.category).toBe(FoodCategory.FRUIT);

      // Filter by multiple categories
      const resMulti = await app.request(
        `/api/items/${user.id}?categories=FRUIT&categories=MEAT`,
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
      const resExpiry = await app.request(
        `/api/items/${user.id}?expiryDate=` +
          new Date('2026-08-01').toISOString(),
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(resExpiry.status).toBe(200);
      const dataExpiry = await resExpiry.json();
      expect(dataExpiry).toHaveLength(2);

      // Sort descending
      const resDesc = await app.request(`/api/items/${user.id}?sort=desc`, {
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

  describe('PUT /api/items/:userId/:id', () => {
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

      const response = await app.request(`/api/items/${user.id}/${item.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food2.id,
          quantity: 4.5,
          unit: FoodUnit.KG,
          expiryDate: new Date('2026-11-20').toISOString(),
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
      const { user, token } = await createTestUser(
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

      const response = await app.request(
        `/api/items/${user.id}/${nonExistentItemId}`,
        {
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
        },
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 when updating another user item', async () => {
      const { user: userA } = await createTestUser(
        'userA',
        'usera4@example.com',
      );
      const { user: userB, token: tokenB } = await createTestUser(
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

      const response = await app.request(`/api/items/${userB.id}/${itemA.id}`, {
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
      const response = await app.request(`/api/items/${userA.id}/${itemA.id}`, {
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
      const resNonExistent = await app.request(
        `/api/items/${userA.id}/${itemA.id}`,
        {
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
        },
      );

      expect(resNonExistent.status).toBe(404);
    });
  });

  describe('DELETE /api/items/:userId/:id', () => {
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

      const response = await app.request(`/api/items/${user.id}/${item.id}`, {
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
      const { user, token } = await createTestUser(
        'deluser2',
        'del2@example.com',
      );
      const nonExistentId = 'clh0000000000000000000000';

      const response = await app.request(
        `/api/items/${user.id}/${nonExistentId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting item belonging to another user', async () => {
      const { user: userA } = await createTestUser(
        'userA6',
        'usera6@example.com',
      );
      const { user: userB, token: tokenB } = await createTestUser(
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

      const response = await app.request(`/api/items/${userB.id}/${itemA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(response.status).toBe(404);

      // Verify DB unchanged
      const dbItem = await db.foodItem.findUnique({ where: { id: itemA.id } });
      expect(dbItem).not.toBeNull();
    });
  });

  describe('Item sharing', () => {
    it('should list only the shares owned by the requested user', async () => {
      const { user: owner, token: ownerToken } = await createTestUser(
        'shareowner',
        'shareowner@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'sharewith',
        'sharewith@example.com',
      );
      const { user: otherOwner } = await createTestUser(
        'othershareowner',
        'othershareowner@example.com',
      );

      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });
      await db.userShare.create({
        data: { userId: otherOwner.id, sharedWithUserId: owner.id },
      });

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].userId).toBe(owner.id);
      expect(data[0].sharedWithUserId).toBe(sharedUser.id);
      expect(data[0]).toHaveProperty('sharedAt');
    });

    it('should list inventories shared with the authenticated user', async () => {
      const { user: owner } = await createTestUser(
        'incomingowner',
        'incomingowner@example.com',
      );
      const { user: otherOwner } = await createTestUser(
        'incomingotherowner',
        'incomingotherowner@example.com',
      );
      const { user: recipient, token: recipientToken } = await createTestUser(
        'incomingrecipient',
        'incomingrecipient@example.com',
      );

      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: recipient.id },
      });
      await db.userShare.create({
        data: { userId: otherOwner.id, sharedWithUserId: recipient.id },
      });
      await db.userShare.create({
        data: { userId: recipient.id, sharedWithUserId: owner.id },
      });

      const response = await app.request('/api/items/shared-with-me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${recipientToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: owner.id,
            username: owner.username,
          }),
          expect.objectContaining({
            userId: otherOwner.id,
            username: otherOwner.username,
          }),
        ]),
      );
      expect(
        data.some((share: { userId: string }) => share.userId === recipient.id),
      ).toBe(false);
    });

    it('should reject listing another user shares', async () => {
      const { user: owner } = await createTestUser(
        'shareowner2',
        'shareowner2@example.com',
      );
      const { token: otherToken } = await createTestUser(
        'shareother2',
        'shareother2@example.com',
      );

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      expect(response.status).toBe(403);
    });

    it('should share inventory with another user', async () => {
      const { user: owner, token } = await createTestUser(
        'sharepost',
        'sharepost@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'sharepostwith',
        'sharepostwith@example.com',
      );

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharedWithEmail: sharedUser.email }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe(owner.id);
      expect(data.data.sharedWithUserId).toBe(sharedUser.id);

      const dbShare = await db.userShare.findFirst({
        where: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });
      expect(dbShare).not.toBeNull();
    });

    it('should look up the user by a case-insensitive email address', async () => {
      const { user: owner, token } = await createTestUser(
        'shareemailcase',
        'shareemailcase@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'shareemailcasewith',
        'shareemailcasewith@example.com',
      );

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sharedWithEmail: sharedUser.email.toUpperCase(),
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.sharedWithUserId).toBe(sharedUser.id);
    });

    it('should mirror an auth user that is missing from the backend database', async () => {
      const { user: owner, token } = await createTestUser(
        'shareemailmirror',
        'shareemailmirror@example.com',
      );
      const sharedUser = await authDb.user.create({
        data: {
          username: 'shareemailmirrorwith',
          email: 'shareemailmirrorwith@example.com',
          hashed_password: 'hashedpassword',
        },
      });
      expect(
        await db.user.findUnique({ where: { id: sharedUser.id } }),
      ).toBeNull();

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharedWithEmail: sharedUser.email }),
      });

      expect(response.status).toBe(201);
      expect(
        await db.user.findUnique({ where: { id: sharedUser.id } }),
      ).not.toBeNull();
    });

    it('should reject sharing another user inventory', async () => {
      const { user: owner } = await createTestUser(
        'sharepostowner3',
        'sharepostowner3@example.com',
      );
      const { user: other, token: otherToken } = await createTestUser(
        'sharepostother3',
        'sharepostother3@example.com',
      );

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${otherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharedWithEmail: other.email }),
      });

      expect(response.status).toBe(403);
      expect(await db.userShare.count()).toBe(0);
    });

    it('should reject sharing inventory with yourself', async () => {
      const { user, token } = await createTestUser(
        'shareself',
        'shareself@example.com',
      );

      const response = await app.request(`/api/items/${user.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharedWithEmail: user.email }),
      });

      expect(response.status).toBe(400);
      expect(await db.userShare.count()).toBe(0);
    });

    it('should reject sharing with a user that does not exist', async () => {
      const { user, token } = await createTestUser(
        'shareunknown',
        'shareunknown@example.com',
      );

      const response = await app.request(`/api/items/${user.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sharedWithEmail: 'missing@example.com',
        }),
      });

      expect(response.status).toBe(404);
      expect(await db.userShare.count()).toBe(0);
    });

    it('should reject sharing inventory that is already shared', async () => {
      const { user: owner, token } = await createTestUser(
        'sharedouble',
        'sharedouble@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'sharedoublewith',
        'sharedoublewith@example.com',
      );

      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });

      const response = await app.request(`/api/items/${owner.id}/shared`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sharedWithEmail: sharedUser.email }),
      });

      expect(response.status).toBe(409);
      expect(await db.userShare.count()).toBe(1);
    });

    it('should allow only one of two concurrent identical shares', async () => {
      const { user: owner, token } = await createTestUser(
        'shareconcurrent',
        'shareconcurrent@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'shareconcurrentwith',
        'shareconcurrentwith@example.com',
      );

      const share = () =>
        app.request(`/api/items/${owner.id}/shared`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sharedWithEmail: sharedUser.email }),
        });

      const responses = await Promise.all([share(), share()]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      expect(await db.userShare.count()).toBe(1);
    });

    it('should stop sharing inventory with a user', async () => {
      const { user: owner, token } = await createTestUser(
        'sharedelete',
        'sharedelete@example.com',
      );
      const { user: sharedUser } = await createTestUser(
        'sharedeletewith',
        'sharedeletewith@example.com',
      );

      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });

      const response = await app.request(
        `/api/items/${owner.id}/shared/${sharedUser.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(response.status).toBe(200);
      expect(await db.userShare.count()).toBe(0);
    });

    it('should reject removing another user share', async () => {
      const { user: owner } = await createTestUser(
        'sharedeleteowner2',
        'sharedeleteowner2@example.com',
      );
      const { user: other, token: otherToken } = await createTestUser(
        'sharedeleteother2',
        'sharedeleteother2@example.com',
      );

      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: other.id },
      });

      const response = await app.request(
        `/api/items/${owner.id}/shared/${other.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${otherToken}` },
        },
      );

      expect(response.status).toBe(403);
      expect(await db.userShare.count()).toBe(1);
    });

    it('should return 404 when removing a share that does not exist', async () => {
      const { user, token } = await createTestUser(
        'sharedeletenone',
        'sharedeletenone@example.com',
      );

      const response = await app.request(
        `/api/items/${user.id}/shared/clh0000000000000000000000`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(response.status).toBe(404);
    });

    it('should let a shared user read the owner inventory', async () => {
      const { user: owner } = await createTestUser(
        'sharedread',
        'sharedread@example.com',
      );
      const { user: sharedUser, token: sharedToken } = await createTestUser(
        'sharedreader',
        'sharedreader@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Shared Apples',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });
      const item = await db.foodItem.create({
        data: {
          userId: owner.id,
          foodId: food.id,
          quantity: 4,
          unit: FoodUnit.ITEM,
        },
      });
      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });

      const response = await app.request(`/api/items/${owner.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${sharedToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(item.id);
    });

    it('should reject reading inventory that has not been shared', async () => {
      const { user: owner } = await createTestUser(
        'shareddenied',
        'shareddenied@example.com',
      );
      const { token: otherToken } = await createTestUser(
        'shareddeniedother',
        'shareddeniedother@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Private Apples',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });
      await db.foodItem.create({
        data: {
          userId: owner.id,
          foodId: food.id,
          quantity: 4,
          unit: FoodUnit.ITEM,
        },
      });

      const response = await app.request(`/api/items/${owner.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      expect(response.status).toBe(403);
    });

    it('should keep a shared inventory read-only for the shared user', async () => {
      const { user: owner } = await createTestUser(
        'sharedreadonly',
        'sharedreadonly@example.com',
      );
      const { user: sharedUser, token: sharedToken } = await createTestUser(
        'sharedreadonlyuser',
        'sharedreadonlyuser@example.com',
      );
      const food = await db.food.create({
        data: {
          name: 'Read Only Apples',
          category: FoodCategory.FRUIT,
          createdByUserId: null,
        },
      });
      const item = await db.foodItem.create({
        data: {
          userId: owner.id,
          foodId: food.id,
          quantity: 4,
          unit: FoodUnit.ITEM,
        },
      });
      await db.userShare.create({
        data: { userId: owner.id, sharedWithUserId: sharedUser.id },
      });

      const createResponse = await app.request(`/api/items/${owner.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sharedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodId: food.id,
          quantity: 1,
          unit: FoodUnit.ITEM,
        }),
      });
      expect(createResponse.status).toBe(403);

      const updateResponse = await app.request(
        `/api/items/${owner.id}/${item.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${sharedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            foodId: food.id,
            quantity: 99,
            unit: FoodUnit.ITEM,
          }),
        },
      );
      expect(updateResponse.status).toBe(403);

      const deleteResponse = await app.request(
        `/api/items/${owner.id}/${item.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sharedToken}` },
        },
      );
      expect(deleteResponse.status).toBe(403);

      const dbItem = await db.foodItem.findUnique({ where: { id: item.id } });
      expect(dbItem?.quantity).toBe(4);
    });
  });
});
