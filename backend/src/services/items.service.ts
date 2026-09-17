import { ItemsRepo } from '../repositories/items.repo';
import type { FoodItem } from '../generated/prisma/client';
import type { FoodCategory, FoodUnit } from '../generated/prisma/enums';

export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepo) {}

  createItem(data: {
    userId: string;
    foodId: string;
    quantity?: number;
    unit?: FoodUnit;
    expiryDate?: Date | null;
  }): Promise<FoodItem> {
    return this.itemsRepo.create(data);
  }

  listUserItems(userId: string): Promise<
    (FoodItem & {
      food: { id: string; name: string; category: FoodCategory };
    })[]
  > {
    return this.itemsRepo.findAllByUser(userId);
  }

  filterItems(
    userId: string,
    categories: FoodCategory[],
    expiresBefore: Date | null,
    name_contains: string | null,
    sort: 'asc' | 'desc',
  ): Promise<FoodItem[]> {
    return this.itemsRepo.filterByUser(
      userId,
      categories,
      expiresBefore,
      name_contains,
      sort,
    );
  }

  upsertItem(
    userId: string,
    foodId: string,
    data: {
      quantity?: number;
      unit?: FoodUnit;
      expiryDate?: Date | null;
    },
  ): Promise<FoodItem> {
    return this.itemsRepo.upsertByUserAndFood(userId, foodId, data);
  }

  updateItem(
    id: string,
    data: Partial<{
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    }>,
  ): Promise<FoodItem> {
    return this.itemsRepo.update(id, data);
  }

  incrementItemQuantity(id: string, amount: number): Promise<FoodItem> {
    return this.itemsRepo.incrementQuantity(id, amount);
  }

  removeItem(id: string): Promise<FoodItem> {
    return this.itemsRepo.delete(id);
  }

  removeItemByFoodId(userId: string, foodId: string): Promise<FoodItem> {
    return this.itemsRepo.deleteByUserAndFood(userId, foodId);
  }

  clearUserInventory(userId: string): Promise<{ count: number }> {
    return this.itemsRepo.deleteAllByUser(userId);
  }
}
