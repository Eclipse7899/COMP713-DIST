import type { FoodCategory } from '../generated/prisma/enums';
import type { RealtimeHub } from '../realtime/realtime-hub';
import type { FoodRepository } from '../repositories/food.repo';
import { type FoodDto, foodDtoSchema } from '../schemas';
import type { Result } from '../util';

export class FoodService {
  constructor(
    private readonly foodRepo: FoodRepository,
    private readonly realtime: RealtimeHub,
  ) {}

  async createFood(
    userId: string,
    data: {
      name: string;
      category: FoodCategory;
    },
  ): Promise<FoodDto> {
    const food = await this.foodRepo.create({
      name: data.name,
      category: data.category,
      createdByUserId: userId,
    });
    this.realtime.broadcast(userId, {
      type: 'food.created',
      data: foodDtoSchema.parse(food),
    });
    return foodDtoSchema.parse(food);
  }

  async getFood(userId: string, category?: FoodCategory): Promise<FoodDto[]> {
    const food = this.foodRepo.findForUser(userId, category);
    return (await food).map((f) => foodDtoSchema.parse(f));
  }

  async updateFood(
    id: string,
    data: Partial<{
      name: string;
      category: FoodCategory;
    }>,
    userId: string,
  ): Promise<Result<FoodDto, 'NOT_FOUND' | 'UNAUTHORIZED'>> {
    const result = await this.getFoodById(id);
    if (!result.success) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    const existing = result.data;
    if (existing.createdByUserId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    const updateResult = await this.foodRepo.updateForUser(id, data, userId);
    if (!updateResult.success) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    const updatedFood = updateResult.data;
    this.realtime.broadcast(userId, {
      type: 'food.updated',
      data: foodDtoSchema.parse(updatedFood),
    });
    return {
      success: true,
      data: foodDtoSchema.parse(updatedFood),
    };
  }

  async deleteFood(
    id: string,
    userId: string,
  ): Promise<Result<void, 'NOT_FOUND' | 'UNAUTHORIZED'>> {
    const result = await this.getFoodById(id);
    if (!result.success) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    const existing = result.data;
    if (existing.createdByUserId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    this.realtime.broadcast(userId, {
      type: 'food.deleted',
      data: existing,
    });
    return await this.foodRepo.deleteForUser(id, userId);
  }

  async getFoodById(id: string): Promise<Result<FoodDto, 'NOT_FOUND'>> {
    const food = await this.foodRepo.findById(id);
    if (!food) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    return {
      success: true,
      data: foodDtoSchema.parse(food),
    };
  }
}
