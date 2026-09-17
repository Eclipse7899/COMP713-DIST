import { Hono } from 'hono';
import { FoodService } from '../services/food.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { FoodCategory } from '../generated/prisma/enums';
import { zValidator } from '@hono/zod-validator';

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

export function createFoodRoute(foodService: FoodService) {
  return new Hono<{ Variables: Variables }>()
    .get('/', async (c) => {
    const userId = c.get('jwtPayload').sub;
    const category = c.req.query('category');
    const foods = await foodService.getFood(
      userId,
      category ? (category as FoodCategory) : undefined,
    );
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
    .patch(
      '/:id',
      zValidator('param', foodIdParamSchema),
      zValidator('json', updateFoodSchema),
      async (c) => {
      const id = c.req.valid('param').id;
      const userId = c.get('jwtPayload').sub;
      const body = c.req.valid('json');
      const existing = await foodService.getFoodById(id);
      if (!existing) {
        return c.json({ error: 'Food not found' }, 404);
      }
      const updated = await foodService.updateFood(id, body, userId);
      if (!updated) {
        return c.json({ error: 'Food not found or not authorized' }, 404);
      }
      return c.json(updated);
      },
    )
    .delete('/:id', zValidator('param', foodIdParamSchema), async (c) => {
      const id = c.req.valid('param').id;
      const userId = c.get('jwtPayload').sub;
      const existing = await foodService.getFoodById(id);
      if (!existing) {
        return c.json({ error: 'Food not found' }, 404);
      }
      const deleted = await foodService.deleteFood(id, userId);
      if (!deleted) {
        return c.json({ error: 'Food not found or not authorized' }, 404);
      }
      return c.json(deleted);
    });
}
