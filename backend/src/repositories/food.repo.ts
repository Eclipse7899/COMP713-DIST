import { type Food, PrismaClient } from '../generated/prisma/client';
import type { FoodCategory } from '../generated/prisma/enums';

export class FoodRepo {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    name: string;
    category: FoodCategory;
    createdByUserId?: string | null;
  }): Promise<Food> {
    return this.prisma.food.create({
      data: {
        name: data.name,
        category: data.category,
        createdByUserId: data.createdByUserId ?? null,
      },
    });
  }

  async findForUser(
    userId: string,
    category?: FoodCategory,
  ): Promise<Food[]> {
    return this.prisma.food.findMany({
      where: {
        category: category ? category : undefined,
        OR: [{ createdByUserId: userId }, { createdByUserId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateForUser(
    id: string,
    data: Partial<{
      name: string;
      category: FoodCategory;
    }>,
    userId: string,
  ): Promise<Food | null> {
    const result = await this.prisma.food.updateManyAndReturn({
      where: {
        id,
        createdByUserId: userId,
      },
      data: data,
    });

    return result[0] ?? null;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await this.prisma.food.deleteMany({
      where: {
        id,
        createdByUserId: userId
      }
    });
    return deleted.count !== 0;
  }

  async findById(id: string) {
    return this.prisma.food.findUnique({
      where: { id },
    });
  }
}
