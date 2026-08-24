import { ItemsRepo } from '../repositories/items.repo';
import { FoodItem } from '../generated/prisma/client';
import type { FoodUnit, FoodCategory } from '../generated/prisma/enums';

/**
 * ItemsService handles business logic for FoodItem operations (user's inventory)
 */
export class ItemsService {
  constructor(private readonly itemsRepo: ItemsRepo) {}

  async createItem(data: {
    userId: string;
    foodId: string;
    quantity?: number;
    unit?: FoodUnit;
    expiryDate?: Date | null;
  }): Promise<FoodItem> {
    return this.itemsRepo.create(data);
  }

  async getItemById(id: string, userId: string): Promise<FoodItem | null> {
    return this.itemsRepo.findByIdAndUser(id, userId);
  }

  async listUserItems(userId: string): Promise<(FoodItem & { food: { id: string; name: string; category: any } })[]> {
    return this.itemsRepo.findAllByUser(userId);
  }

  async listUserItemsByCategory(userId: string, category: FoodCategory): Promise<FoodItem[]> {
    return this.itemsRepo.findByUserAndCategory(userId, category);
  }

  async listExpiredItems(userId: string): Promise<FoodItem[]> {
    return this.itemsRepo.findExpiredByUser(userId);
  }

  async upsertItem(
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

  async updateItem(
    id: string,
    data: Partial<{
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    }>,
  ): Promise<FoodItem> {
    return this.itemsRepo.update(id, data);
  }

  async incrementItemQuantity(id: string, amount: number): Promise<FoodItem> {
    return this.itemsRepo.incrementQuantity(id, amount);
  }

  async removeItem(id: string): Promise<FoodItem> {
    return this.itemsRepo.delete(id);
  }

  async removeItemByFoodId(userId: string, foodId: string): Promise<FoodItem> {
    return this.itemsRepo.deleteByUserAndFood(userId, foodId);
  }

  async clearUserInventory(userId: string): Promise<{ count: number }> {
    return this.itemsRepo.deleteAllByUser(userId);
  }
}

