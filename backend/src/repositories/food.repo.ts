import { Food, PrismaClient } from '../generated/prisma/client';
import type { FoodCategory } from '../generated/prisma/enums';

/**
 * FoodRepo handles Food model operations (food definitions/catalog)
 * Foods can be global (createdByUserId = null) or user-created
 */
export class FoodRepo {
  constructor(private readonly prisma: PrismaClient) {
  }

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

  async findById(id: string): Promise<Food | null> {
    return this.prisma.food.findUnique({ where: { id } });
  }

  async findAll(): Promise<Food[]> {
    return this.prisma.food.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByCategory(category: FoodCategory): Promise<Food[]> {
    return this.prisma.food.findMany({
      where: { category },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCreator(createdByUserId: string): Promise<Food[]> {
    return this.prisma.food.findMany({
      where: { createdByUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAccessible(userId: string, category?: FoodCategory): Promise<Food[]> {
    return this.prisma.food.findMany({
      where: {
        category: category ? category : undefined,
        OR: [
          { createdByUserId: userId },
          { createdByUserId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      category: FoodCategory;
    }>,
  ): Promise<Food> {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.category !== undefined) updatePayload.category = data.category;

    return this.prisma.food.update({ where: { id }, data: updatePayload });
  }

  async delete(id: string): Promise<Food> {
    return this.prisma.food.delete({ where: { id } });
  }
}