import { ItemsRepo } from '../repositories/items.repo';
import type { FoodItem } from '../generated/prisma/client';
import type { FoodCategory, FoodUnit } from '../generated/prisma/enums';

export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepo) {}

  async createItem(data: {
    userId: string;
    foodId: string;
    quantity: number;
    unit: FoodUnit;
    expiryDate: Date | null;
  }): Promise<FoodItem> {
    return await this.itemsRepo.create(data);
  }

  async getItems(
    userId: string,
    data: {
      categories?: FoodCategory[];
      expiresBefore?: Date | null;
      name_contains?: string;
      sort?: 'asc' | 'desc';
    },
  ) {
    if (data.categories || data.expiresBefore || data.name_contains || data.sort) {
      return await this.itemsRepo.filterByUser(
        userId,
        {
          categories: data.categories,
          expiresBefore: data.expiresBefore,
          name_contains: data.name_contains,
          sort: data.sort,
        },
      );
    } else {
      return await this.itemsRepo.listByUser(userId);
    }
  }

  updateItem(
    id: string,
    userId: string,
    data: {
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    },
  ) {
    return this.itemsRepo.updateByUser(id, userId, data);
  }

  removeItem(id: string, userId: string) {
    return this.itemsRepo.deleteByUser(id, userId);
  }
}
