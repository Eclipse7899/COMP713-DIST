import { FoodRepo } from '../repositories/food.repo';
import type { Food } from '../generated/prisma/client';
import type { FoodCategory } from '../generated/prisma/enums';
import type { Result } from '../util';

export class FoodService {
  constructor(private readonly foodRepo: FoodRepo) {}

  async createFood(data: {
    name: string;
    category: FoodCategory;
    createdByUserId?: string | null;
  }): Promise<Food> {
    return this.foodRepo.create(data);
  }

  async getFood(userId: string, category?: FoodCategory): Promise<Food[]> {
    return this.foodRepo.findForUser(userId, category);
  }

  async updateFood(
    id: string,
    data: Partial<{
      name: string;
      category: FoodCategory;
    }>,
    userId: string,
  ): Promise<Result<Food, 'NOT_FOUND' | 'UNAUTHORIZED'>> {
    const existing = await this.getFoodById(id);
    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    if (existing.createdByUserId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    return this.foodRepo.updateForUser(id, data, userId);
  }

  async deleteFood(id: string, userId: string): Promise<Result<void, 'NOT_FOUND' | 'UNAUTHORIZED'>> {
    const existing = await this.getFoodById(id);
    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    if (existing.createdByUserId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    return await this.foodRepo.deleteForUser(id, userId);
  }

  async getFoodById(id: string): Promise<Food | null> {
    return this.foodRepo.findById(id);
  }
}
