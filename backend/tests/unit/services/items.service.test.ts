import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Food, FoodItem } from '../../../src/generated/prisma/client';
import { FoodCategory, FoodUnit } from '../../../src/generated/prisma/enums';
import type { FoodRepository } from '../../../src/repositories/food.repo';
import type { ItemsRepository } from '../../../src/repositories/items.repo';
import { ItemsService } from '../../../src/services/items.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'other-user';
const FOOD_ID = 'food-1';
const ITEM_ID = 'item-1';
const FOOD_NAME = 'Apple';
const UNAUTHORIZED_FOOD_ERROR = 'UNAUTHORIZED_FOOD';
const FOOD_NOT_FOUND_ERROR = 'FOOD_NOT_FOUND';

const food = {
  id: FOOD_ID,
  name: FOOD_NAME,
  category: FoodCategory.FRUIT,
  createdByUserId: null,
  createdAt: new Date('2026-01-01'),
} satisfies Food;

const item = {
  id: ITEM_ID,
  userId: USER_ID,
  foodId: food.id,
  quantity: 2,
  unit: FoodUnit.ITEM,
  expiryDate: new Date('2026-02-01'),
  addedAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  food,
} satisfies FoodItem & { food: Food };

describe('ItemsService', () => {
  let itemsRepo: ItemsRepository;
  let foodRepo: FoodRepository;
  let service: ItemsService;

  beforeEach(() => {
    itemsRepo = {
      create: vi.fn(),
      listByUser: vi.fn(),
      updateByUser: vi.fn(),
      deleteByUser: vi.fn(),
      filterByUser: vi.fn(),
    };
    foodRepo = {
      create: vi.fn(),
      findForUser: vi.fn(),
      updateForUser: vi.fn(),
      deleteForUser: vi.fn(),
      findById: vi.fn(),
    };
    service = new ItemsService(itemsRepo, foodRepo);
  });

  it('creates an item for accessible food', async () => {
    vi.mocked(foodRepo.findById).mockResolvedValue(food);
    vi.mocked(itemsRepo.create).mockResolvedValue({
      success: true,
      data: item,
    });

    await expect(
      service.createItem({
        userId: item.userId,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        id: item.id,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        addedAt: item.addedAt,
        food: {
          id: food.id,
          name: food.name,
          category: food.category,
          createdByUserId: food.createdByUserId,
        },
      },
    });
  });

  it('rejects creating an item for another user’s food', async () => {
    vi.mocked(foodRepo.findById).mockResolvedValue({
      ...food,
      createdByUserId: OTHER_USER_ID,
    });

    await expect(
      service.createItem({
        userId: item.userId,
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: false,
      error: UNAUTHORIZED_FOOD_ERROR,
    });
    expect(itemsRepo.create).not.toHaveBeenCalled();
  });

  it('uses listByUser when no filters are supplied', async () => {
    vi.mocked(itemsRepo.listByUser).mockResolvedValue([item]);

    await expect(service.getItems(item.userId, {})).resolves.toHaveLength(1);
    expect(itemsRepo.listByUser).toHaveBeenCalledWith(item.userId);
    expect(itemsRepo.filterByUser).not.toHaveBeenCalled();
  });

  it('uses filterByUser when filters are supplied', async () => {
    vi.mocked(itemsRepo.filterByUser).mockResolvedValue([item]);

    await expect(
      service.getItems(item.userId, {
        categories: [FoodCategory.FRUIT],
        sort: 'desc',
      }),
    ).resolves.toHaveLength(1);
    expect(itemsRepo.filterByUser).toHaveBeenCalledWith(item.userId, {
      categories: [FoodCategory.FRUIT],
      expiresBefore: undefined,
      name_contains: undefined,
      sort: 'desc',
    });
  });

  it('rejects updating an item when its food is missing', async () => {
    vi.mocked(foodRepo.findById).mockResolvedValue(null);

    await expect(
      service.updateItem(item.id, item.userId, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: false,
      error: FOOD_NOT_FOUND_ERROR,
    });
  });

  it('delegates item deletion to the repository', async () => {
    vi.mocked(itemsRepo.deleteByUser).mockResolvedValue(true);

    await expect(service.removeItem(item.id, item.userId)).resolves.toBe(true);
    expect(itemsRepo.deleteByUser).toHaveBeenCalledWith(item.id, item.userId);
  });
});
