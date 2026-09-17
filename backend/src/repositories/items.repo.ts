import {
  type FoodCategory,
  type FoodItem,
  PrismaClient,
} from '../generated/prisma/client';
import { FoodUnit } from '../generated/prisma/enums';

export class ItemsRepo {
  constructor(private readonly prisma: PrismaClient) {}

  create(
    data: {
      userId: string;
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    }): Promise<FoodItem> {
    return this.prisma.foodItem.create({
      data: {
        userId: data.userId,
        foodId: data.foodId,
        quantity: data.quantity,
        unit: data.unit,
        expiryDate: data.expiryDate ?? null,
      },
      include: { food: { select: { id: true, name: true, category: true } } },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.foodItem.findMany({
      where: { userId },
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
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
  ) {
    const batch = await this.prisma.foodItem.updateMany({
      where: { id, userId },
      data: data,
    });
    if (batch.count === 0) {
      return null;
    }
    return this.prisma.foodItem.findUnique({
      where: { id },
      include: { food: { select: { id: true, name: true, category: true } } },
    });
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
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { expiryDate: data.sort },
    });
  }
}
