import type { InferRequestType, InferResponseType } from 'hono';
import { hc } from 'hono/client';
import type { AppType } from '@stocked/backend/src';

const typeClient = hc<AppType>('/');

export type FoodType = InferResponseType<typeof typeClient.api.food.$get, 200>[number];
export type AddFoodType = InferRequestType<typeof typeClient.api.food.$post>['json'];

export type AddFoodItem = InferRequestType<typeof typeClient.api.items.$post>['json'];
export type StockedItem = InferResponseType<typeof typeClient.api.items.$get, 200>[number];

const itemsById = typeClient.api.items[':id'];
export type EditFoodItem = InferRequestType<typeof itemsById.$put>['json'];