import type { InferRequestType, InferResponseType } from 'hono';
import { hc } from 'hono/client';
import type { AppType } from '@stocked/backend/src';

export const client = hc<AppType>('/');

export type FoodType = InferResponseType<typeof client.api.food.$get>[number];

export type AddFoodItem = InferRequestType<typeof client.api.items.$post>['json'];

export type StockedItem = InferResponseType<typeof client.api.items.$get, 200>[number];

export type FoodItemResp = InferResponseType<typeof client.api.items.$get, 200>[number];