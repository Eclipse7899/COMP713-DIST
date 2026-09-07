import { Hono } from 'hono';
import { db } from '../db';
import { FoodRepo } from '../repositories/food.repo';
import { FoodService } from '../services/food.service';
import type { Variables } from './variables';
import { z } from 'zod';
import { FoodCategory } from '../generated/prisma/enums';
import { zValidator } from '@hono/zod-validator';

const foodRepo = new FoodRepo(db);
const foodService = new FoodService(foodRepo);

const createFoodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum([
    'FRUIT',
    'VEGETABLE',
    'MEAT',
    'DAIRY',
    'GRAINS',
    'DRINKS',
    'SNACKS',
    'SAUCES',
    'FROZEN',
    'OTHER',
  ]),
});

const updateFoodSchema = z.object({
  name: z.string().min(1).optional(),
  category: z
    .enum([
      'FRUIT',
      'VEGETABLE',
      'MEAT',
      'DAIRY',
      'GRAINS',
      'DRINKS',
      'SNACKS',
      'SAUCES',
      'FROZEN',
      'OTHER',
    ])
    .optional(),
});

const foodIdParamSchema = z.object({
  id: z.cuid2(),
});

export const food = new Hono<{ Variables: Variables }>()
  .get('/', async (c) => {
    const userId = c.get('jwtPayload').sub;
    const category = c.req.query('category');
    const foods = await foodService.listAccessibleFoods(
      userId,
      category ? (category as FoodCategory) : undefined,
    );
    return c.json(foods);
  })
  .get('/created', async (c) => {
    const userId = c.get('jwtPayload').sub;
    const foods = await foodService.listCreatedByUser(userId);
    return c.json(foods);
  })
  .post('/', zValidator('json', createFoodSchema), async (c) => {
    const userId = c.get('jwtPayload').sub;
    const { name, category } = c.req.valid('json');
    const created = await foodService.createFood({
      name,
      category: category as FoodCategory,
      createdByUserId: userId,
    });
    return c.json(created, 201);
  })
  .get('/:id', zValidator('param', foodIdParamSchema), async (c) => {
    const id = c.req.valid('param').id;
    const food = await foodService.getFoodById(id);
    if (!food) {
      return c.json({ error: 'Food not found' }, 404);
    }
    return c.json(food);
  })
  .patch(
    '/:id',
    zValidator('param', foodIdParamSchema),
    zValidator('json', updateFoodSchema),
    async (c) => {
      const id = c.req.valid('param').id;
      const body = c.req.valid('json');
      const food = await foodService.getFoodById(id);
      if (!food) {
        return c.json({ error: 'Food not found' }, 404);
      }
      const updated = await foodService.updateFood(id, body as any);
      return c.json(updated);
    },
  )
  .delete('/:id', zValidator('param', foodIdParamSchema), async (c) => {
    const id = c.req.valid('param').id;
    const deleted = await foodService.deleteFood(id);
    return c.json(deleted);
  });
