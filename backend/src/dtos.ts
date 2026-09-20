import type { FoodCategory, FoodUnit } from './generated/prisma/enums';

export type FoodDto = {
  id: string;
  name: string;
  category: FoodCategory;
  createdByUserId: string | null;
}

export type FoodItemDto = {
  id: string;
  foodId: string;
  quantity: number;
  unit: FoodUnit;
  expiryDate: Date | null;
  addedAt: Date;
  food: FoodDto;
}