import { Hono } from 'hono';
import { FoodService } from '../services/food.service';
import type { Variables } from '../variables';
import { z } from 'zod';
import { FoodCategory } from '../generated/prisma/enums';
import { zValidator } from '@hono/zod-validator';
import { describeRoute, resolver } from 'hono-openapi';
import {
  errorSchema,
  foodDtoSchema,
  idPathParameter,
  unauthorizedResponse,
  validationErrorResponse,
} from '../schemas';

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
    .get(
      '/',
      describeRoute({
        tags: ['Food'],
        summary: 'List foods available to the user',
        description:
          'Returns globally available foods plus the foods created by the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Foods visible to the authenticated user',
            content: {
              'application/json': {
                schema: resolver(z.array(foodDtoSchema)),
              },
            },
          },
          401: unauthorizedResponse,
        },
      }),
      async (c) => {
        const userId = c.get('jwtPayload').sub;
        const foods = await foodService.getFood(userId);
        return c.json(foods);
      },
    )
    .post(
      '/',
      describeRoute({
        tags: ['Food'],
        summary: 'Create a food',
        description: 'Creates a food owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(createFoodSchema) },
          },
        },
        responses: {
          201: {
            description: 'Food created',
            content: {
              'application/json': { schema: resolver(foodDtoSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
        },
      }),
      zValidator('json', createFoodSchema),
      async (c) => {
        const userId = c.get('jwtPayload').sub;
        const { name, category } = c.req.valid('json');
        const created = await foodService.createFood(userId, {
          name,
          category: category,
        });
        return c.json(created, 201);
      },
    )
    .put(
      '/:id',
      describeRoute({
        tags: ['Food'],
        summary: 'Update a food',
        description:
          'Updates the name and/or category of a food owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        parameters: [idPathParameter()],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: resolver(updateFoodSchema) },
          },
        },
        responses: {
          200: {
            description: 'Food updated',
            content: {
              'application/json': { schema: resolver(foodDtoSchema) },
            },
          },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: {
            description: "The food does not belong to the authenticated user",
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
          404: {
            description: 'Food not found',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
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
    .delete(
      '/:id',
      describeRoute({
        tags: ['Food'],
        summary: 'Delete a food',
        description: 'Deletes a food owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        parameters: [idPathParameter()],
        responses: {
          204: { description: 'Food deleted' },
          400: validationErrorResponse,
          401: unauthorizedResponse,
          403: {
            description: "The food does not belong to the authenticated user",
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
          404: {
            description: 'Food not found',
            content: {
              'application/json': { schema: resolver(errorSchema) },
            },
          },
        },
      }),
      zValidator('param', foodIdParamSchema),
      async (c) => {
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
        return c.body(null, 204);
      },
    );
}
