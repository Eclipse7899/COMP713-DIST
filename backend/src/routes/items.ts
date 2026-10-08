import { Hono } from 'hono';
import { ItemsService } from '../services/items.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { describeRoute, resolver } from 'hono-openapi';
import { FoodCategory, FoodUnit } from '../generated/prisma/enums';
import {
  createdItemResponseSchema,
  errorSchema,
  foodItemDtoSchema,
  idPathParameter,
  itemQueryParameters,
  successSchema,
  unauthorizedResponse,
  validationErrorResponse,
} from '../schemas';

const createItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive(),
  unit: z.enum(FoodUnit),
  expiryDate: z.iso
    .datetime()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
});

const updateItemSchema = z.object({
  foodId: z.cuid2(),
  quantity: z.number().positive(),
  unit: z.enum(FoodUnit),
  expiryDate: z.iso
    .datetime()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
});

const filterSchema = z
  .object({
    contains: z.string().optional(),
    categories: z.preprocess(
      (val) => (Array.isArray(val) ? val : [val]),
      z.array(z.enum(FoodCategory)).optional(),
    ),
    sort: z.enum(['asc', 'desc']).optional(),
    expiryDate: z.iso
      .datetime()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
  })
  .optional();

const idParamSchema = z.object({
  id: z.cuid2(),
});

export function createItemsRoute(itemsService: ItemsService) {
  return new Hono<{ Variables: Variables }>()
    .get(
      '/',
      describeRoute({
        tags: ['Items'],
        summary: 'List the authenticated user food items',
        description:
          'Returns the food items owned by the authenticated user, optionally filtered by name, category, and expiry date, and sorted by expiry date.',
        security: [{ bearerAuth: [] }],
        parameters: itemQueryParameters(),
        responses: {
          200: {
            description: 'Food items owned by the authenticated user',
            content: {
              'application/json': {
                schema: resolver(z.array(foodItemDtoSchema)),
              },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
        },
      }),
      zValidator('query', filterSchema),
      async (c) => {
        const userId = c.get('jwtPayload').sub;
        const query = c.req.valid('query');
        const items = await itemsService.getItems(userId, {
          name_contains: query?.contains,
          categories: query?.categories,
          sort: query?.sort,
          expiresBefore: query?.expiryDate,
        });
        return c.json(items);
      },
    )
    .post(
      '/',
      describeRoute({
        tags: ['Items'],
        summary: 'Create a food item',
        description:
          "Adds a food item to the authenticated user's inventory. The referenced food must be global or owned by the user.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(createItemSchema) },
          },
        },
        responses: {
          201: {
            description: 'Food item created',
            content: {
              'application/json': {
                schema: resolver(createdItemResponseSchema),
              },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: {
            description: 'The referenced food belongs to another user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
          404: {
            description: 'The referenced food does not exist',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('json', createItemSchema),
      async (c) => {
        const userId = c.get('jwtPayload').sub;
        const { foodId, quantity, unit, expiryDate } = c.req.valid('json');
        const item = await itemsService.createItem({
          userId,
          foodId,
          quantity,
          unit,
          expiryDate: expiryDate,
        });
        if (!item.success) {
          switch (item.error) {
            case 'FOOD_NOT_FOUND':
              return c.json({ error: 'Food not found' }, 404);
            case 'UNAUTHORIZED_FOOD':
              return c.json({ error: 'Unauthorized food' }, 403);
          }
        }
        return c.json(item, 201);
      },
    )
    .put(
      '/:id',
      describeRoute({
        tags: ['Items'],
        summary: 'Update a food item',
        description:
          "Updates a food item owned by the authenticated user. The referenced food must be global or owned by the user.",
        security: [{ bearerAuth: [] }],
        parameters: [idPathParameter()],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(updateItemSchema) },
          },
        },
        responses: {
          200: {
            description: 'Food item updated',
            content: {
              'application/json': { schema: resolver(foodItemDtoSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          404: {
            description:
              'The item or the referenced food was not found, or the food does not belong to the user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
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
          expiryDate: body.expiryDate,
        });
        if (!updated.success) {
          switch (updated.error) {
            case 'ITEM_NOT_FOUND':
              return c.json(
                { error: 'Item not found or not owned by user' },
                404,
              );
            case 'FOOD_NOT_FOUND':
              return c.json({ error: 'Food not found' }, 404);
          }
        }
        return c.json(updated.data);
      },
    )
    .delete(
      '/:id',
      describeRoute({
        tags: ['Items'],
        summary: 'Delete a food item',
        description:
          'Deletes a food item owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        parameters: [idPathParameter()],
        responses: {
          200: {
            description: 'Food item deleted',
            content: {
              'application/json': { schema: resolver(successSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          404: {
            description: 'Item not found or not owned by the user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', idParamSchema),
      async (c) => {
        const id = c.req.valid('param').id;
        const userId = c.get('jwtPayload').sub;

        const deleted = await itemsService.removeItem(id, userId);
        if (!deleted.success) {
          return c.json(
            { error: 'Item not found or not owned by user' },
            404,
          );
        }
        return c.json({ success: true });
      },
    );
}
