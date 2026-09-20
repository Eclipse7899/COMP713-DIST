import type { ItemsRepository } from '../repositories/items.repo';
import type { FoodCategory, FoodUnit } from '../generated/prisma/enums';
import type { FoodRepository } from '../repositories/food.repo';
import type { Result } from '../util';
import type { FoodItemDto } from '../dtos';

export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepository, private readonly foodRepo: FoodRepository) {
  }

  async createItem(data: {
    userId: string;
    foodId: string;
    quantity: number;
    unit: FoodUnit;
    expiryDate: Date | null;
  }): Promise<Result<FoodItemDto, 'FOOD_NOT_FOUND' | 'UNAUTHORIZED_FOOD'>> {
    const food = await this.foodRepo.findById(data.foodId);
    if (!food) {
      return {
        success: false,
        error: 'FOOD_NOT_FOUND',
      };
    }
    if (food.createdByUserId !== null && food.createdByUserId !== data.userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED_FOOD',
      };
    }
    const result = await this.itemsRepo.create(data);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    const item = result.data;
    return {
      success: true,
      data: {
        id: item.id,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        addedAt: item.addedAt,
        food: {
          id: item.food.id,
          name: item.food.name,
          category: item.food.category,
          createdByUserId: item.food.createdByUserId,
        }
      },
    };
  }

  async getItems(
    userId: string,
    data: {
      categories?: FoodCategory[];
      expiresBefore?: Date | null;
      name_contains?: string;
      sort?: 'asc' | 'desc';
    },
  ): Promise<(FoodItemDto)[]> {
    if (data.categories || data.expiresBefore || data.name_contains || data.sort) {
      const items = await this.itemsRepo.filterByUser(
        userId,
        {
          categories: data.categories,
          expiresBefore: data.expiresBefore,
          name_contains: data.name_contains,
          sort: data.sort,
        },
      );
      return items.map(item => ({
        id: item.id,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        addedAt: item.addedAt,
        food: {
          id: item.food.id,
          name: item.food.name,
          category: item.food.category,
          createdByUserId: item.food.createdByUserId,
        }
      }));
    } else {
      const items = await this.itemsRepo.listByUser(userId);
      return items.map(item => ({
        id: item.id,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        addedAt: item.addedAt,
        food: {
          id: item.food.id,
          name: item.food.name,
          category: item.food.category,
          createdByUserId: item.food.createdByUserId,
        }
      }));
    }
  }

  async updateItem(
    id: string,
    userId: string,
    data: {
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    },
  ): Promise<Result<FoodItemDto, 'ITEM_NOT_FOUND' | 'FOOD_NOT_FOUND'>> {
    const food = await this.foodRepo.findById(data.foodId);
    if (!food) {
      return {
        success: false,
        error: 'FOOD_NOT_FOUND',
      };
    }
    if (food.createdByUserId !== null && food.createdByUserId !== userId) {
      return {
        success: false,
        error: 'FOOD_NOT_FOUND',
      };
    }
    const item = await this.itemsRepo.updateByUser(id, userId, data);
    if (!item.success) {
      return {
        success: false,
        error: item.error,
      };
    }
    const updatedItem = item.data;
    return {
      success: true,
      data: {
        id: updatedItem.id,
        foodId: updatedItem.foodId,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit,
        expiryDate: updatedItem.expiryDate,
        addedAt: updatedItem.addedAt,
        food: {
          id: updatedItem.food.id,
          name: updatedItem.food.name,
          category: updatedItem.food.category,
          createdByUserId: updatedItem.food.createdByUserId,
        }
      },
    };
  }

  removeItem(id: string, userId: string) {
    return this.itemsRepo.deleteByUser(id, userId);
  }
}
