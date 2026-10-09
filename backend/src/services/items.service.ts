import type { RealtimeHub } from '../realtime/realtime-hub';
import { type FoodItemDto, foodItemDtoSchema } from '../schemas';
import type {
  ItemsRepository,
} from '@stocked/shared/src/repositories/items.repo';
import type {
  FoodRepository,
} from '@stocked/shared/src/repositories/food.repo';
import type {
  FoodCategory,
  FoodUnit,
} from '@stocked/shared/src/generated/prisma/enums';
import type { Result } from '@stocked/shared/src/util';

export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepository, private readonly foodRepo: FoodRepository, private realtime: RealtimeHub) {
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
    const dto = foodItemDtoSchema.parse(item);
    this.realtime.broadcast(data.userId, {
      type: 'item.created',
      data: dto,
    });
    return {
      success: true,
      data: dto,
    }
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
      return items.map(item => foodItemDtoSchema.parse(item));
    } else {
      const items = await this.itemsRepo.listByUser(userId);
      return items.map(item => (foodItemDtoSchema.parse(item)));
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
    const dto = foodItemDtoSchema.parse(updatedItem);
    this.realtime.broadcast(userId, {
      type: 'item.updated',
      data: dto,
    });
    return {
      success: true,
      data: dto
    };
  }

  async removeItem(
    id: string,
    userId: string,
  ): Promise<Result<boolean, 'ITEM_NOT_FOUND' | 'UNAUTHORIZED'>> {
    const item = await this.itemsRepo.findById(id);
    if (!item) {
      return {
        success: false,
        error: 'ITEM_NOT_FOUND',
      };
    }
    if (item.userId !== userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    const deleted = await this.itemsRepo.deleteByUser(id, userId);
    if (!deleted) {
      return {
        success: false,
        error: 'ITEM_NOT_FOUND',
      };
    }
    this.realtime.broadcast(userId, {
      type: 'item.deleted',
      data: item,
    });
    return {
      success: true,
      data: true,
    };
  }
}
