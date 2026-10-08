import { z } from 'zod';
import { FoodCategory, FoodUnit } from './generated/prisma/enums';


export const foodCategorySchema = z.enum(FoodCategory);

export const foodUnitSchema = z.enum(FoodUnit);

export const foodDtoSchema = z.object({
  id: z.string().describe('Food CUID2 identifier'),
  name: z.string().describe('Display name of the food'),
  category: foodCategorySchema.describe('Category the food belongs to'),
  createdByUserId: z
    .string()
    .nullable()
    .describe('Owner user id, or null for a globally available food'),
}).brand('FoodDto');

export type FoodDto = z.infer<typeof foodDtoSchema>;

export const foodItemDtoSchema = z.object({
  id: z.string().describe('Food item CUID2 identifier'),
  foodId: z.string().describe('Referenced food CUID2 identifier'),
  quantity: z.number().describe('Quantity currently on hand'),
  unit: foodUnitSchema.describe('Unit the quantity is expressed in'),
  expiryDate: z.date().nullable().describe('Expiry timestamp (ISO 8601)'),
  addedAt: z.date().describe('Timestamp the item was added (ISO 8601)'),
  food: foodDtoSchema.describe('Food this item refers to'),
}).brand('FoodItemDto');

export type FoodItemDto = z.infer<typeof foodItemDtoSchema>;

export const userSchema = z.object({
  id: z.string().describe('User CUID2 identifier'),
  email: z.string().describe('User email address'),
  username: z.string().describe('Unique username'),
});

export const authResponseSchema = z.object({
  user: userSchema.describe('The authenticated user'),
  accessToken: z.string().describe('JWT access token, valid for one hour'),
});

export const messageSchema = z.object({
  message: z.string().describe('Human readable message'),
});

export const errorSchema = z.object({
  error: z.string().describe('Human readable error code or message'),
});

export const successSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
});

export const createdItemResponseSchema = z.object({
  success: z.literal(true).describe('Always true when the item was created'),
  data: foodItemDtoSchema.describe('The newly created food item'),
});

export const validationErrorResponse = {
  description: 'Request validation failed',
  content: {
    'application/json': {
      schema: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const, enum: [false] },
          error: {
            type: 'object' as const,
            description: 'Zod validation issues',
          },
        },
        required: ['success', 'error'],
      },
    },
  },
};

export const unauthorizedResponse = {
  description: 'Missing, malformed, or invalid access token',
  content: {
    'text/plain': {
      schema: { type: 'string' as const, example: 'Unauthorized' },
    },
  },
};

export function idPathParameter() {
  return {
    name: 'id',
    in: 'path' as const,
    required: true,
    description: 'Resource CUID2 identifier',
    schema: { type: 'string' as const, example: 'clh0000000000000000000000' },
  };
}

export function itemQueryParameters() {
  return [
    {
      name: 'contains',
      in: 'query' as const,
      required: false,
      description: 'Case-insensitive substring match on the food name',
      schema: { type: 'string' as const },
    },
    {
      name: 'categories',
      in: 'query' as const,
      required: false,
      description: 'Only return items whose food is in one of these categories',
      style: 'form' as const,
      explode: true,
      schema: {
        type: 'array' as const,
        items: { type: 'string' as const, enum: Object.values(FoodCategory) },
      },
    },
    {
      name: 'sort',
      in: 'query' as const,
      required: false,
      description: 'Sort results by expiry date',
      schema: { type: 'string' as const, enum: ['asc', 'desc'] },
    },
    {
      name: 'expiryDate',
      in: 'query' as const,
      required: false,
      description:
        'Only return items whose expiry date is on or before this ISO 8601 timestamp',
      schema: { type: 'string' as const, format: 'date-time' },
    },
  ];
}
