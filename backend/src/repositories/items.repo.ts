import { FoodItem, PrismaClient } from '../generated/prisma/client';
import type { FoodUnit } from '../generated/prisma/enums';

export class ItemsRepo {
  constructor(private readonly prisma: PrismaClient) {
  }

  async create(data: {
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

  async findById(id: string): Promise<FoodItem | null> {
    return this.prisma.foodItem.findUnique({ where: { id } });
  }

  async findByIdAndUser(id: string, userId: string): Promise<FoodItem | null> {
    return this.prisma.foodItem.findFirst({
      where: { id, userId },
    });
  }

  async findByUserAndFood(userId: string, foodId: string): Promise<FoodItem | null> {
    return this.prisma.foodItem.findUnique({
      where: { userId_foodId: { userId, foodId } },
    });
  }

  async findAllByUser(userId: string): Promise<(FoodItem & {
    food: { id: string; name: string; category: any }
  })[]> {
    return this.prisma.foodItem.findMany({
      where: { userId },
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    }) as any;
  }

  async findByUserAndCategory(userId: string, category: string): Promise<FoodItem[]> {
    return this.prisma.foodItem.findMany({
      where: {
        userId,
        food: { category: category as any },
      },
      orderBy: { expiryDate: 'asc' },
    }) as any;
  }

  async findExpiredByUser(userId: string): Promise<FoodItem[]> {
    return this.prisma.foodItem.findMany({
      where: {
        userId,
        expiryDate: {
          lt: new Date(),
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async upsertByUserAndFood(
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

  async update(
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
    if (data.expiryDate !== undefined) updatePayload.expiryDate = data.expiryDate;

    return this.prisma.foodItem.update({ where: { id }, data: updatePayload });
  }

  async incrementQuantity(id: string, amount: number): Promise<FoodItem> {
    return this.prisma.foodItem.update({
      where: { id },
      data: { quantity: { increment: amount } } as any,
    });
  }

  async delete(id: string): Promise<FoodItem> {
    return this.prisma.foodItem.delete({ where: { id } });
  }

  async deleteByUserAndFood(userId: string, foodId: string): Promise<FoodItem> {
    return this.prisma.foodItem.delete({
      where: { userId_foodId: { userId, foodId } },
    });
  }

  async deleteAllByUser(userId: string): Promise<{ count: number }> {
    return this.prisma.foodItem.deleteMany({ where: { userId } });
  }
}

