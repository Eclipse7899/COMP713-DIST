import { Hono } from 'hono';
import { ItemsService } from '../services/items.service';
import type { Variables } from './variables';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const createItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['ITEM', 'KG', 'G', 'L', 'ML', 'PACK']).optional(),
  expiryDate: z.iso.datetime().optional().nullable(),
});

const updateItemSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.enum(['ITEM', 'KG', 'G', 'L', 'ML', 'PACK']).optional(),
  expiryDate: z.iso.datetime().optional().nullable(),
});

const idParamSchema = z.object({
  id: z.cuid2(),
});

const foodIdParamSchema = z.object({
  foodId: z.cuid2(),
});

export function createItemsRoute(itemsService: ItemsService) {
  return new Hono<{ Variables: Variables }>()
    .get('/', async (c) => {
    const userId = c.get('jwtPayload').sub;
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
      const item = await itemsService.upsertItem(userId, foodId, {
        quantity: quantity ?? 1,
        unit: (unit ?? 'ITEM') as any,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      });
      return c.json(item, 201);
    } catch (e: any) {
      return c.json({ error: e.message ?? String(e) }, 400);
    }
    })
    .patch(
      '/:id',
      zValidator('param', idParamSchema),
      zValidator('json', updateItemSchema),
      async (c) => {
      const id = c.req.valid('param').id;
      const body = c.req.valid('json');
      try {
        const updated = await itemsService.updateItem(id, {
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
    try {
      const deleted = await itemsService.removeItem(id);
      return c.json(deleted);
    } catch (e: any) {
      return c.json({ error: e.message ?? String(e) }, 400);
    }
    })
    .post(
      '/food/:foodId',
      zValidator('param', foodIdParamSchema),
      zValidator('json', updateItemSchema),
      async (c) => {
      const userId = c.get('jwtPayload').sub;
      const foodId = c.req.valid('param').foodId;
      const body = c.req.valid('json');
      try {
        const item = await itemsService.upsertItem(userId, foodId, {
          quantity: body.quantity,
          unit: body.unit,
          expiryDate: body.expiryDate
            ? new Date(body.expiryDate)
            : body.expiryDate,
        } as any);
        return c.json(item, 201);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
      },
    )
    .delete(
      '/food/:foodId',
      zValidator('param', foodIdParamSchema),
      async (c) => {
      const userId = c.get('jwtPayload').sub;
      const foodId = c.req.valid('param').foodId;
      try {
        const deleted = await itemsService.removeItemByFoodId(userId, foodId);
        return c.json(deleted);
      } catch (e: any) {
        return c.json({ error: e.message ?? String(e) }, 400);
      }
      },
    );
}
