import type { InferRequestType, InferResponseType } from 'hono';
import { hc } from 'hono/client';
import type { AppType } from '@stocked/backend/src';

const typeClient = hc<AppType>('/');

export type FoodType = InferResponseType<
  typeof typeClient.api.food.$get,
  200
>[number];
export type FoodItem = InferResponseType<
  typeof typeClient.api.items.$get,
  200
>[number];

export type AddFoodType = InferRequestType<
  typeof typeClient.api.food.$post
>['json'];
export type AddFoodItem = InferRequestType<
  typeof typeClient.api.items.$post
>['json'];

const itemsById = typeClient.api.items[':id'];
const foodById = typeClient.api.food[':id'];

export type EditFoodItem = InferRequestType<typeof itemsById.$put>['json'];
export type EditFoodType = InferRequestType<typeof foodById.$put>['json'];
export type FoodCategory = FoodType['category'];

export const FOOD_CATEGORIES = [
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
] as const satisfies readonly FoodCategory[];

type Missing = Exclude<FoodCategory, (typeof FOOD_CATEGORIES)[number]>;

const _: Missing extends never ? true : never = true;

export type FoodUnit = FoodItem['unit'];

export const FOOD_UNITS = [
  'ITEM',
  'KG',
  'G',
  'L',
  'ML',
  'PACK',
] as const satisfies readonly FoodUnit[];

type MissingUnit = Exclude<FoodItem['unit'], (typeof FOOD_UNITS)[number]>;

const __: MissingUnit extends never ? true : never = true;
