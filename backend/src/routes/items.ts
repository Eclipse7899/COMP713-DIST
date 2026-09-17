import { Hono } from 'hono';
import { ItemsService } from '../services/items.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FoodCategory, FoodUnit } from '../generated/prisma/enums';

const createItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive(),
  unit: z.enum(FoodUnit),
  expiryDate: z.iso.date().optional().nullable().transform((val => val ? new Date(val) : null)),
});

const updateItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive(),
  unit: z.enum(FoodUnit),
  expiryDate: z.iso.date().optional().nullable().transform((val => val ? new Date(val) : null)),
});

const filterSchema = z.object({
  contains: z.string().optional(),
  categories: z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(z.enum(FoodCategory)).optional()),
  sort: z.enum(['asc', 'desc']).optional(),
  expiryDate: z.iso.date().optional().nullable().transform((val => val ? new Date(val) : null)),
}).optional();

const idParamSchema = z.object({
  id: z.cuid2(),
});

export function createItemsRoute(itemsService: ItemsService) {
  return new Hono<{ Variables: Variables }>()
    .get('/', zValidator('query', filterSchema), async (c) => {
      const userId = c.get('jwtPayload').sub;
      const query = c.req.valid('query');
      const items = await itemsService.getItems(userId, {
        name_contains: query?.contains,
        categories: query?.categories,
        sort: query?.sort,
        expiresBefore: query?.expiryDate,
      });
      return c.json(items);
    })
    .post('/', zValidator('json', createItemSchema), async (c) => {
      const userId = c.get('jwtPayload').sub;
      const { foodId, quantity, unit, expiryDate } = c.req.valid('json');
      const item = await itemsService.createItem({
        userId,
        foodId,
        quantity,
        unit,
        expiryDate: expiryDate,
      });
      return c.json(item, 201);
    })
    .put(
      '/:id',
      zValidator('param', idParamSchema),
      zValidator('json', updateItemSchema),
      async (c) => {
        const id = c.req.valid('param').id;
        const userId = c.get('jwtPayload').sub;
        const body = c.req.valid('json');

        const updated = await itemsService.updateItem(id, userId, {
          foodId: body.foodId,
          quantity: body.quantity,
          unit: body.unit,
          expiryDate: body.expiryDate
        });
        if (!updated) {
          return c.json({ error: 'Item not found or not owned by user' }, 404);
        }
        return c.json(updated);
      },
    )
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
      const id = c.req.valid('param').id;
      const userId = c.get('jwtPayload').sub;

      const deleted = await itemsService.removeItem(id, userId);
      if (!deleted) {
        return c.json({ error: 'Item not found or not owned by user' }, 404);
      }
      return c.json({ success: true });
    });
}
