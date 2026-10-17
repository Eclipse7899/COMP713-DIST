import { Hono } from 'hono';
import { ItemsService } from '../services/items.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { describeRoute, resolver } from 'hono-openapi';
import {
  createdItemResponseSchema,
  createdShareResponseSchema,
  errorSchema,
  foodItemDtoSchema,
  idPathParameter,
  itemQueryParameters,
  successSchema,
  unauthorizedResponse,
  userShareDtoSchema,
  validationErrorResponse,
} from '../schemas';
import { FoodCategory, FoodUnit } from '../generated/prisma/enums';

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

const createShareSchema = z.object({
  sharedWithUserId: z.cuid2(),
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

const userIdParamSchema = z.object({
  userId: z.cuid2(),
});

const itemParamSchema = z.object({
  userId: z.cuid2(),
  id: z.cuid2(),
});

const shareParamSchema = z.object({
  userId: z.cuid2(),
  sharedWithUserId: z.cuid2(),
});

const userIdPathParameter = {
  name: 'userId',
  in: 'path' as const,
  required: true,
  description: 'CUID2 identifier of the inventory owner',
  schema: { type: 'string' as const, example: 'clh0000000000000000000000' },
};

const sharedWithUserIdPathParameter = {
  name: 'sharedWithUserId',
  in: 'path' as const,
  required: true,
  description: 'CUID2 identifier of the user the inventory is shared with',
  schema: { type: 'string' as const, example: 'clh0000000000000000000000' },
};

const forbiddenResponse = {
  description: 'The authenticated user may not access this inventory',
  content: {
    'application/json': { schema: resolver(errorSchema) },
  },
};

export function createItemsRoute(itemsService: ItemsService) {
  return new Hono<{ Variables: Variables }>()
    .get(
      '/:userId/shared',
      describeRoute({
        tags: ['Items'],
        summary: 'List users an inventory is shared with',
        description:
          'Returns the inventory shares owned by the user in the path. Only the authenticated owner may list their shares. The user identity is taken from the JWT, never from the path.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter],
        responses: {
          200: {
            description: 'Inventory shares owned by the authenticated user',
            content: {
              'application/json': {
                schema: resolver(z.array(userShareDtoSchema)),
              },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
        },
      }),
      zValidator('param', userIdParamSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const ownerId = c.req.valid('param').userId;

        const shares = await itemsService.listShares(actorId, ownerId);
        if (!shares.success) {
          return c.json({ error: 'Forbidden' }, 403);
        }
        return c.json(shares.data);
      },
    )
    .post(
      '/:userId/shared',
      describeRoute({
        tags: ['Items'],
        summary: 'Share an inventory with another user',
        description:
          "Shares the authenticated owner's inventory with another user. Only the owner may share their inventory. The user identity is taken from the JWT, never from the path.",
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(createShareSchema) },
          },
        },
        responses: {
          201: {
            description: 'Inventory shared',
            content: {
              'application/json': {
                schema: resolver(createdShareResponseSchema),
              },
            },
          },
          400: {
            description:
              'Request validation failed, or the owner cannot share with themselves',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: {
            description: 'The user to share with does not exist',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
          409: {
            description: 'The inventory is already shared with that user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', userIdParamSchema),
      zValidator('json', createShareSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const ownerId = c.req.valid('param').userId;
        const { sharedWithUserId } = c.req.valid('json');

        const share = await itemsService.shareItems(
          actorId,
          ownerId,
          sharedWithUserId,
        );
        if (!share.success) {
          switch (share.error) {
            case 'FORBIDDEN':
              return c.json({ error: 'Forbidden' }, 403);
            case 'CANNOT_SHARE_WITH_SELF':
              return c.json(
                { error: 'Cannot share inventory with yourself' },
                400,
              );
            case 'USER_NOT_FOUND':
              return c.json({ error: 'User not found' }, 404);
            case 'ALREADY_SHARED':
              return c.json(
                { error: 'Inventory already shared with user' },
                409,
              );
          }
        }
        return c.json({ success: true, data: share.data }, 201);
      },
    )
    .delete(
      '/:userId/shared/:sharedWithUserId',
      describeRoute({
        tags: ['Items'],
        summary: 'Stop sharing an inventory with a user',
        description:
          'Removes the share between the authenticated owner and the user in the path. Only the owner may change their shares. The user identity is taken from the JWT, never from the path.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter, sharedWithUserIdPathParameter],
        responses: {
          200: {
            description: 'Share removed',
            content: {
              'application/json': { schema: resolver(successSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: {
            description: 'The share does not exist',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', shareParamSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const { userId: ownerId, sharedWithUserId } = c.req.valid('param');

        const unshared = await itemsService.unshareItems(
          actorId,
          ownerId,
          sharedWithUserId,
        );
        if (!unshared.success) {
          switch (unshared.error) {
            case 'FORBIDDEN':
              return c.json({ error: 'Forbidden' }, 403);
            case 'SHARE_NOT_FOUND':
              return c.json({ error: 'Share not found' }, 404);
          }
        }
        return c.json({ success: true });
      },
    )
    .get(
      '/:userId',
      describeRoute({
        tags: ['Items'],
        summary: 'List a user food items',
        description:
          'Returns the food items owned by the user in the path. The authenticated user may list their own items or the items another user has shared with them, optionally filtered by name, category, and expiry date, and sorted by expiry date. The user identity is taken from the JWT, never from the path.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter, ...itemQueryParameters()],
        responses: {
          200: {
            description: 'Food items the authenticated user may access',
            content: {
              'application/json': {
                schema: resolver(z.array(foodItemDtoSchema)),
              },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
        },
      }),
      zValidator('param', userIdParamSchema),
      zValidator('query', filterSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const ownerId = c.req.valid('param').userId;
        const query = c.req.valid('query');

        const items = await itemsService.getItems(actorId, ownerId, {
          name_contains: query?.contains,
          categories: query?.categories,
          sort: query?.sort,
          expiresBefore: query?.expiryDate,
        });
        if (!items.success) {
          return c.json({ error: 'Forbidden' }, 403);
        }
        return c.json(items.data);
      },
    )
    .post(
      '/:userId',
      describeRoute({
        tags: ['Items'],
        summary: 'Create a food item',
        description:
          "Adds a food item to the authenticated user's inventory. Only the owner may add items. The referenced food must be global or owned by the user. The user identity is taken from the JWT, never from the path.",
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter],
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
            description:
              'The authenticated user is not the owner, or the referenced food belongs to another user',
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
      zValidator('param', userIdParamSchema),
      zValidator('json', createItemSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const ownerId = c.req.valid('param').userId;
        const { foodId, quantity, unit, expiryDate } = c.req.valid('json');
        const item = await itemsService.createItem(actorId, ownerId, {
          foodId,
          quantity,
          unit,
          expiryDate: expiryDate,
        });
        if (!item.success) {
          switch (item.error) {
            case 'FORBIDDEN':
              return c.json({ error: 'Forbidden' }, 403);
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
      '/:userId/:id',
      describeRoute({
        tags: ['Items'],
        summary: 'Update a food item',
        description:
          'Updates a food item owned by the authenticated user. Only the owner may update items. The referenced food must be global or owned by the user. The user identity is taken from the JWT, never from the path.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter, idPathParameter()],
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
          403: forbiddenResponse,
          404: {
            description:
              'The item or the referenced food was not found, or the food does not belong to the user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', itemParamSchema),
      zValidator('json', updateItemSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const { userId: ownerId, id } = c.req.valid('param');
        const body = c.req.valid('json');

        const updated = await itemsService.updateItem(actorId, ownerId, id, {
          foodId: body.foodId,
          quantity: body.quantity,
          unit: body.unit,
          expiryDate: body.expiryDate,
        });
        if (!updated.success) {
          switch (updated.error) {
            case 'FORBIDDEN':
              return c.json({ error: 'Forbidden' }, 403);
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
      '/:userId/:id',
      describeRoute({
        tags: ['Items'],
        summary: 'Delete a food item',
        description:
          'Deletes a food item owned by the authenticated user. Only the owner may delete items. The user identity is taken from the JWT, never from the path.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdPathParameter, idPathParameter()],
        responses: {
          200: {
            description: 'Food item deleted',
            content: {
              'application/json': { schema: resolver(successSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: {
            description: 'Item not found or not owned by the user',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', itemParamSchema),
      async (c) => {
        const actorId = c.get('jwtPayload').sub;
        const { userId: ownerId, id } = c.req.valid('param');

        const deleted = await itemsService.removeItem(actorId, ownerId, id);
        if (!deleted.success) {
          switch (deleted.error) {
            case 'FORBIDDEN':
              return c.json({ error: 'Forbidden' }, 403);
            case 'ITEM_NOT_FOUND':
              return c.json(
                { error: 'Item not found or not owned by user' },
                404,
              );
          }
        }
        return c.json({ success: true });
      },
    );
}
