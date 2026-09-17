import { type Food, PrismaClient } from '../generated/prisma/client';
import type { FoodCategory } from '../generated/prisma/enums';
import type { Result } from '../util';

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

  async findForUser(userId: string, category?: FoodCategory): Promise<Food[]> {
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
  ): Promise<Result<Food, 'NOT_FOUND'>> {
    const result = await this.prisma.food.updateManyAndReturn({
      where: {
        id,
        createdByUserId: userId,
      },
      data: data,
    });

    if (result.length === 0) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  }

  async deleteForUser(id: string, userId: string): Promise<Result<void, 'NOT_FOUND' | 'UNAUTHORIZED'>> {
    const deleted = await this.prisma.food.deleteMany({
      where: {
        id,
        createdByUserId: userId,
      },
    });
    if (deleted.count === 0) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }
    return {
      success: true,
      data: undefined,
    };
  }

  async findById(id: string) {
    return this.prisma.food.findUnique({
      where: { id },
    });
  }
}
