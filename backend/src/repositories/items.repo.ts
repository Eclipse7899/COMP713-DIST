import {
  type FoodCategory,
  type FoodItem,
  PrismaClient,
} from '../generated/prisma/client';
import type { FoodUnit } from '../generated/prisma/enums';

export class ItemsRepo {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    userId: string;
    foodId: string;
    quantity?: number;
    unit?: FoodUnit;
    expiryDate?: Date | null;
  }): Promise<FoodItem> {
    return this.prisma.foodItem.create({
      data: {
        userId: data.userId,
        foodId: data.foodId,
        quantity: data.quantity ?? 1,
        unit: data.unit ?? 'ITEM',
        expiryDate: data.expiryDate ?? null,
      },
    });
  }

  findAllByUser(userId: string): Promise<
    (FoodItem & {
      food: { id: string; name: string; category: any };
    })[]
  > {
    return this.prisma.foodItem.findMany({
      where: { userId },
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    }) as any;
  }

  upsertByUserAndFood(
    userId: string,
    foodId: string,
    data: {
      quantity?: number;
      unit?: FoodUnit;
      expiryDate?: Date | null;
    },
  ): Promise<FoodItem> {
    return this.prisma.foodItem.upsert({
      where: { userId_foodId: { userId, foodId } },
      update: {
        quantity: data.quantity ?? undefined,
        unit: data.unit ?? undefined,
        expiryDate: data.expiryDate ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        foodId,
        quantity: data.quantity ?? 1,
        unit: data.unit ?? 'ITEM',
        expiryDate: data.expiryDate ?? null,
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    }>,
  ): Promise<FoodItem> {
    const updatePayload: any = {};
    if (data.quantity !== undefined) updatePayload.quantity = data.quantity;
    if (data.unit !== undefined) updatePayload.unit = data.unit;
    if (data.expiryDate !== undefined)
      updatePayload.expiryDate = data.expiryDate;

    return this.prisma.foodItem.update({ where: { id }, data: updatePayload });
  }

  incrementQuantity(id: string, amount: number): Promise<FoodItem> {
    return this.prisma.foodItem.update({
      where: { id },
      data: { quantity: { increment: amount } } as any,
    });
  }

  delete(id: string): Promise<FoodItem> {
    return this.prisma.foodItem.delete({ where: { id } });
  }

  deleteByUserAndFood(userId: string, foodId: string): Promise<FoodItem> {
    return this.prisma.foodItem.delete({
      where: { userId_foodId: { userId, foodId } },
    });
  }

  deleteAllByUser(userId: string): Promise<{ count: number }> {
    return this.prisma.foodItem.deleteMany({ where: { userId } });
  }

  filterByUser(
    userId: string,
    categories: FoodCategory[],
    expiresBefore: Date | null,
    name_contains: string | null,
    sort: 'asc' | 'desc',
  ) {
    const whereClause: any = { userId };
    if (categories.length > 0) {
      whereClause.food = { category: { in: categories } };
    }
    if (expiresBefore) {
      whereClause.expiryDate = { lt: expiresBefore };
    }
    if (name_contains) {
      whereClause.food = {
        ...whereClause.food,
        name: { contains: name_contains, mode: 'insensitive' },
      };
    }

    return this.prisma.foodItem.findMany({
      where: whereClause,
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { expiryDate: sort },
    }) as any;
  }
}
