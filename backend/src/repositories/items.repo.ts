import {
  type Food,
  type FoodCategory, type FoodItem,
  PrismaClient,
} from '../generated/prisma/client';
import { FoodUnit } from '../generated/prisma/enums';
import type { Result } from '../util';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

export class ItemsRepo {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: {
      userId: string;
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    }): Promise<Result<FoodItem & { food: Food }, 'FOOD_NOT_FOUND'>> {
    try {
      const foodItem = await this.prisma.foodItem.create({
        data: {
          userId: data.userId,
          foodId: data.foodId,
          quantity: data.quantity,
          unit: data.unit,
          expiryDate: data.expiryDate ?? null,
        },
        include: { food: true },
      });
      return {
        success: true,
        data: foodItem,
      };
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return {
            success: false,
            error: 'FOOD_NOT_FOUND',
          };
        }
      }
      throw error;
    }
  }

  async listByUser(userId: string, sort: 'asc' | 'desc' = 'asc'): Promise<(FoodItem & { food: Food })[]> {
    return await this.prisma.foodItem.findMany({
      where: { userId },
      include: { food: true },
      orderBy: { expiryDate: sort },
    })
  }

  async updateByUser(
    id: string,
    userId: string,
    data: {
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    },
  ): Promise<Result<FoodItem & { food: Food }, 'ITEM_NOT_FOUND' | 'FOOD_NOT_FOUND'>> {
    try {
      const batch = await this.prisma.foodItem.updateManyAndReturn({
        where: { id, userId },
        data: data,
        include: { food: true },
      });

      if (batch.length === 0) {
        return {
          success: false,
          error: 'ITEM_NOT_FOUND',
        };
      }
      return {
        success: true,
        data: batch[0],
      };
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return {
            success: false,
            error: 'FOOD_NOT_FOUND',
          };
        }
      }
      throw error;
    }
  }

  async deleteByUser(id: string, userId: string) {
    const batch = await this.prisma.foodItem.deleteMany({
      where: { id, userId },
    });
    return batch.count !== 0;
  }

  filterByUser(
    userId: string,
    data: {
      categories?: FoodCategory[];
      expiresBefore?: Date | null;
      name_contains?: string | null;
      sort?: 'asc' | 'desc';
    },
  ) {
    const whereClause: any = { userId };
    if (data.categories && data.categories?.length > 0) {
      whereClause.food = { category: { in: data.categories } };
    }
    if (data.expiresBefore) {
      whereClause.expiryDate = { lt: data.expiresBefore };
    }
    if (data.name_contains) {
      whereClause.food = {
        ...whereClause.food,
        name: { contains: data.name_contains, mode: 'insensitive' },
      };
    }

    return this.prisma.foodItem.findMany({
      where: whereClause,
      include: { food: true },
      orderBy: { expiryDate: data.sort ? data.sort : 'asc' },
    });
  }
}
