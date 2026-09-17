import { Hono } from 'hono';
import { FoodService } from '../services/food.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { FoodCategory } from '../generated/prisma/enums';
import { zValidator } from '@hono/zod-validator';

const createFoodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(FoodCategory),
});

const updateFoodSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(FoodCategory).optional(),
});

const foodIdParamSchema = z.object({
  id: z.cuid2(),
});

export function createFoodRoute(foodService: FoodService) {
  return new Hono<{ Variables: Variables }>()
    .get('/', async (c) => {
      const userId = c.get('jwtPayload').sub;
      const foods = await foodService.getFood(userId);
      return c.json(foods);
    })
    .post('/', zValidator('json', createFoodSchema), async (c) => {
      const userId = c.get('jwtPayload').sub;
      const { name, category } = c.req.valid('json');
      const created = await foodService.createFood(
        userId,
        {
          name,
          category: category, }
        );
      return c.json(created, 201);
    })
    .put(
      '/:id',
      zValidator('param', foodIdParamSchema),
      zValidator('json', updateFoodSchema),
      async (c) => {
        const id = c.req.valid('param').id;
        const userId = c.get('jwtPayload').sub;
        const body = c.req.valid('json');

        const result = await foodService.updateFood(id, body, userId);
        if (!result.success) {
          switch (result.error) {
            case 'NOT_FOUND':
              return c.json({ error: 'Food not found' }, 404);
            case 'UNAUTHORIZED':
              return c.json({ error: 'Unauthorized' }, 403);
          }
        }
        return c.json(result.data);
      },
    )
    .delete('/:id', zValidator('param', foodIdParamSchema), async (c) => {
      const id = c.req.valid('param').id;
      const userId = c.get('jwtPayload').sub;

      const deleted = await foodService.deleteFood(id, userId);
      if (!deleted.success) {
        if (deleted.error === 'NOT_FOUND') {
          return c.json({ error: 'Food not found' }, 404);
        } else if (deleted.error === 'UNAUTHORIZED') {
          return c.json({ error: 'Unauthorized' }, 403);
        }
      }
      return c.status(204);
    });
}
