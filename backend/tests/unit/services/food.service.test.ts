import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mocked } from '../../mocked';
import type {
  FoodRepository,
} from '@stocked/shared/src/repositories/food.repo';
import { FoodService } from '../../../src/services/food.service';
import type { RealtimeHub } from '../../../src/realtime/realtime-hub';
import { FoodCategory } from '@stocked/shared/src/generated/prisma/enums';
import type { Food } from '@stocked/shared/src/generated/prisma/client';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'other-user';
const MISSING_FOOD_ID = 'missing-food';
const FOOD_ID = 'food-1';
const FOOD_NAME = 'Apple';
const UPDATED_FOOD_NAME = 'Pear';
const NOT_FOUND_ERROR = 'NOT_FOUND';
const UNAUTHORIZED_ERROR = 'UNAUTHORIZED';

const food = {
  id: FOOD_ID,
  name: FOOD_NAME,
  category: FoodCategory.FRUIT,
  createdByUserId: USER_ID,
  createdAt: new Date('2026-01-01'),
} satisfies Food;

describe('FoodService', () => {
  let foodRepo: FoodRepository;
  let service: FoodService;
  let realtime: RealtimeHub;

  beforeEach(() => {
    foodRepo = {
      create: vi.fn(),
      findForUser: vi.fn(),
      updateForUser: vi.fn(),
      deleteForUser: vi.fn(),
      findById: vi.fn(),
    };
    realtime = {
      broadcast: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as RealtimeHub;
    service = new FoodService(foodRepo, realtime);
  });

  it('creates food owned by the current user', async () => {
    mocked(foodRepo.create).mockResolvedValue(food);

    await expect(
      service.createFood(USER_ID, {
        name: food.name,
        category: food.category,
      }),
    ).resolves.toEqual({
      id: food.id,
      name: food.name,
      category: food.category,
      createdByUserId: food.createdByUserId,
    });
    expect(foodRepo.create).toHaveBeenCalledWith({
      name: food.name,
      category: food.category,
      createdByUserId: USER_ID,
    });
  });

  it('maps food visible to a user', async () => {
    mocked(foodRepo.findForUser).mockResolvedValue([food]);

    await expect(service.getFood(USER_ID, FoodCategory.FRUIT)).resolves.toEqual(
      [
        {
          id: food.id,
          name: food.name,
          category: food.category,
          createdByUserId: food.createdByUserId,
        },
      ],
    );
    expect(foodRepo.findForUser).toHaveBeenCalledWith(
      USER_ID,
      FoodCategory.FRUIT,
    );
  });

  it('does not update food owned by another user', async () => {
    mocked(foodRepo.findById).mockResolvedValue(food);

    await expect(
      service.updateFood(food.id, { name: UPDATED_FOOD_NAME }, OTHER_USER_ID),
    ).resolves.toEqual({
      success: false,
      error: UNAUTHORIZED_ERROR,
    });
    expect(foodRepo.updateForUser).not.toHaveBeenCalled();
  });

  it('updates owned food', async () => {
    const updatedFood = { ...food, name: UPDATED_FOOD_NAME };
    mocked(foodRepo.findById).mockResolvedValue(food);
    mocked(foodRepo.updateForUser).mockResolvedValue({
      success: true,
      data: updatedFood,
    });

    await expect(
      service.updateFood(
        food.id,
        { name: UPDATED_FOOD_NAME },
        food.createdByUserId!,
      ),
    ).resolves.toEqual({
      success: true,
      data: {
        id: food.id,
        name: UPDATED_FOOD_NAME,
        category: food.category,
        createdByUserId: food.createdByUserId,
      },
    });
  });

  it('does not delete food owned by another user', async () => {
    mocked(foodRepo.findById).mockResolvedValue(food);

    await expect(service.deleteFood(food.id, OTHER_USER_ID)).resolves.toEqual({
      success: false,
      error: UNAUTHORIZED_ERROR,
    });
    expect(foodRepo.deleteForUser).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND for an unknown food id', async () => {
    mocked(foodRepo.findById).mockResolvedValue(null);

    await expect(service.getFoodById(MISSING_FOOD_ID)).resolves.toEqual({
      success: false,
      error: NOT_FOUND_ERROR,
    });
  });
});
