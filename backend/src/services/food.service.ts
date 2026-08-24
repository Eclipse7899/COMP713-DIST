import { FoodRepo } from '../repositories/food.repo';
import { Food } from '../generated/prisma/client';
import type { FoodCategory } from '../generated/prisma/enums';

/**
 * FoodService handles business logic for Food operations
 */
export class FoodService {
  constructor(private readonly foodRepo: FoodRepo) {}

  async createFood(data: {
    name: string;
    category: FoodCategory;
    createdByUserId?: string | null;
  }): Promise<Food> {
    return this.foodRepo.create(data);
  }

  async listAllFoods(): Promise<Food[]> {
    return this.foodRepo.findAll();
  }

  async getFoodById(id: string): Promise<Food | null> {
    return this.foodRepo.findById(id);
  }

  async listByCategory(category: FoodCategory): Promise<Food[]> {
    return this.foodRepo.findByCategory(category);
  }

  async listCreatedByUser(userId: string): Promise<Food[]> {
    return this.foodRepo.findByCreator(userId);
  }

  async listAccessibleFoods(userId: string, category?: FoodCategory): Promise<Food[]> {
    return this.foodRepo.findAccessible(userId, category);
  }

  async updateFood(
    id: string,
    data: Partial<{
      name: string;
      category: FoodCategory;
    }>,
  ): Promise<Food> {
    return this.foodRepo.update(id, data);
  }

  async deleteFood(id: string): Promise<Food> {
    return this.foodRepo.delete(id);
  }
}


