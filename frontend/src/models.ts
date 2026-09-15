import type { InferRequestType, InferResponseType } from 'hono';
import { client } from './client.ts';

export type FoodType = InferResponseType<typeof client.api.food.$get>[number];

export type AddFoodItem = InferRequestType<typeof client.api.items.$post>['json'];

export type StockedItem = InferResponseType<typeof client.api.items.$get, 200>[number];
