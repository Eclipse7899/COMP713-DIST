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
  expiryDate: z.iso.datetime().nullable(),
});

const updateItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive(),
  unit: z.enum(FoodUnit),
  expiryDate: z.iso.datetime().nullable(),
});

const filterSchema = z.object({
  contains: z.string().optional(),
  categories: z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(z.enum(FoodCategory)).optional()),
  sort: z.enum(['asc', 'desc']).optional(),
  expiryDate: z.iso.datetime().optional().nullable(),
}).optional();

const idParamSchema = z.object({
  id: z.cuid2(),
});

export function createItemsRoute(itemsService: ItemsService) {
  return new Hono<{ Variables: Variables }>()
    .get('/', zValidator('query', filterSchema), async (c) => {
      const userId = c.get('jwtPayload').sub;
      const query = c.req.valid('query');
      if (query != undefined && Object.keys(query).length > 0) {
        const { contains, categories, sort, expiryDate } = query;
        try {
          const items = await itemsService.filterItems(
            userId,
            {
              categories,
              expiresBefore: expiryDate ? new Date(expiryDate) : null,
              name_contains: contains,
              sort,
            },
          );
          return c.json(items);
        } catch (e: any) {
          return c.json({ error: e.message ?? String(e) }, 400);
        }
      }
      try {
        const items = await itemsService.listUserItems(userId);
        return c.json(items);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    })
    .post('/', zValidator('json', createItemSchema), async (c) => {
      const userId = c.get('jwtPayload').sub;
      const { foodId, quantity, unit, expiryDate } = c.req.valid('json');
      try {
        const item = await itemsService.createItem({
          userId,
          foodId,
          quantity,
          unit,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        });
        return c.json(item, 201);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    })
    .put(
      '/:id',
      zValidator('param', idParamSchema),
      zValidator('json', updateItemSchema),
      async (c) => {
        const id = c.req.valid('param').id;
        const userId = c.get('jwtPayload').sub;
        const body = c.req.valid('json');
        try {
          const updated = await itemsService.updateItem(id, userId, {
            foodId: body.foodId,
            quantity: body.quantity,
            unit: body.unit,
            expiryDate: body.expiryDate
              ? new Date(body.expiryDate)
              : body.expiryDate,
          } as any);
          return c.json(updated);
        } catch (e: any) {
          return c.json({ error: e.message ?? String(e) }, 400);
        }
      },
    )
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
      const id = c.req.valid('param').id;
      const userId = c.get('jwtPayload').sub;
      try {
        const deleted = await itemsService.removeItem(id, userId);
        if (!deleted) {
          return c.json({ error: 'Item not found or not owned by user' }, 404);
        }
        return c.json({ success: true });
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
    });
}
