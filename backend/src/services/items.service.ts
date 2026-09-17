import { ItemsRepo } from '../repositories/items.repo';
import type { FoodItem } from '../generated/prisma/client';
import type { FoodCategory, FoodUnit } from '../generated/prisma/enums';

export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepo) {}

  createItem(data: {
    userId: string;
    foodId: string;
    quantity: number;
    unit: FoodUnit;
    expiryDate: Date | null;
  }): Promise<FoodItem> {
    return this.itemsRepo.create(data);
  }

  listUserItems(userId: string) {
    return this.itemsRepo.findAllByUser(userId);
  }

  filterItems(
    userId: string,
    data: {
      categories?: FoodCategory[];
      expiresBefore?: Date | null;
      name_contains?: string;
      sort?: 'asc' | 'desc';
    },
  ) {
    return this.itemsRepo.filterByUser(
      userId,
      data,
    );
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
