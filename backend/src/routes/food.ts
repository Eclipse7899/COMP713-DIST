import { Hono } from 'hono';
import { db } from '../db';
import { FoodRepo } from '../repositories/food.repo';
import { FoodService } from '../services/food.service';
import { Variables } from './variables';
import { z } from 'zod';
import { FoodCategory } from '../generated/prisma/enums';
import { zValidator } from '@hono/zod-validator';

const foodRepo = new FoodRepo(db);
const foodService = new FoodService(foodRepo);

const createFoodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['FRUIT', 'VEGETABLE', 'MEAT', 'DAIRY', 'GRAINS', 'DRINKS', 'SNACKS', 'SAUCES', 'FROZEN', 'OTHER']),
});

const updateFoodSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(['FRUIT', 'VEGETABLE', 'MEAT', 'DAIRY', 'GRAINS', 'DRINKS', 'SNACKS', 'SAUCES', 'FROZEN', 'OTHER']).optional(),
});

const foodIdParamSchema = z.object({
  id: z.cuid2(),
});

export const food = new Hono<{ Variables: Variables }>()
  .get(
    '/',
    async (c) => {
      const userId = c.get('jwtPayload').sub;
      const category = c.req.query('category');
      try {
        const foods = await foodService.listAccessibleFoods(
          userId,
          category ? (category as any) : undefined,
        );
        return c.json(foods);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  )
  .get(
    '/created',
    async (c) => {
      const userId = c.get('jwtPayload').sub;
      try {
        const foods = await foodService.listCreatedByUser(userId);
        return c.json(foods);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  )
  .post(
    '/',
    zValidator('json', createFoodSchema),
    async (c) => {
      const userId = c.get('jwtPayload').sub;
      const { name, category } = c.req.valid('json');
      try {
        const created = await foodService.createFood({
          name,
          category: category as FoodCategory,
          createdByUserId: userId,
        });
        return c.json(created, 201);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  )
  .get(
    '/:id',
    zValidator('param', foodIdParamSchema),
    async (c) => {
      const id = c.req.valid('param').id;
      try {
        const food = await foodService.getFoodById(id);
        if (!food) {
          return c.json({ error: 'Food not found' }, 404);
        }
        return c.json(food);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  )
  .patch(
    '/:id',
    zValidator('param', foodIdParamSchema),
    zValidator('json', updateFoodSchema),
    async (c) => {
      const id = c.req.valid('param').id;
      const body = c.req.valid('json');
      try {
        const updated = await foodService.updateFood(id, body as any);
        return c.json(updated);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  )
  .delete(
    '/:id',
    zValidator('param', foodIdParamSchema),
    async (c) => {
      const id = c.req.valid('param').id;
      try {
        const deleted = await foodService.deleteFood(id);
        return c.json(deleted);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    }
  );
