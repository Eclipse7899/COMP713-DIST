import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { mocked } from '../../mocked';
import type { RealtimeHub } from '../../../src/realtime/realtime-hub';
import { ItemsService } from '../../../src/services/items.service';
import type { ItemsRepository } from '../../../src/repositories/items.repo';
import type { FoodRepository } from '../../../src/repositories/food.repo';
import type { AuthService } from '../../../src/services/auth.service';
import { FoodCategory, FoodUnit } from '../../../src/generated/prisma/enums';
import {
  foodItemDtoSchema,
  sharedInventoryDtoSchema,
  userDtoSchema,
  userShareDtoSchema,
} from '../../../src/schemas';
import type {
  Food,
  FoodItem,
  UserShare,
} from '../../../src/generated/prisma/client';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'other-user';
const OTHER_USER_EMAIL = 'other@example.com';
const FOOD_ID = 'food-1';
const ITEM_ID = 'item-1';
const FOOD_NAME = 'Apple';
const UNAUTHORIZED_FOOD_ERROR = 'UNAUTHORIZED_FOOD';
const FOOD_NOT_FOUND_ERROR = 'FOOD_NOT_FOUND';
const FORBIDDEN_ERROR = 'FORBIDDEN';

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

const share = {
  userId: USER_ID,
  sharedWithUserId: OTHER_USER_ID,
  sharedAt: new Date('2026-01-01'),
} satisfies UserShare;

const expectedItem = foodItemDtoSchema.parse(item);
const expectedShare = userShareDtoSchema.parse(share);
const expectedSharedInventory = sharedInventoryDtoSchema.parse({
  userId: USER_ID,
  username: 'owner',
  sharedAt: share.sharedAt,
});

describe('ItemsService', () => {
  let itemsRepo: ItemsRepository;
  let foodRepo: FoodRepository;
  let authService: AuthService;
  let realtime: RealtimeHub;
  let service: ItemsService;

  beforeEach(() => {
    itemsRepo = {
      create: vi.fn(),
      listByUser: vi.fn(),
      updateByUser: vi.fn(),
      deleteByUser: vi.fn(),
      filterByUser: vi.fn(),
      findById: vi.fn(),
      findShare: vi.fn(),
      listSharesByOwner: vi.fn(),
      listSharesForUser: vi.fn(),
      createShare: vi.fn(),
      deleteShare: vi.fn(),
    };
    foodRepo = {
      create: vi.fn(),
      findForUser: vi.fn(),
      updateForUser: vi.fn(),
      deleteForUser: vi.fn(),
      findById: vi.fn(),
    };
    authService = {
      getUser: vi.fn(),
      getUserByEmail: vi.fn(),
    } as unknown as AuthService;
    realtime = {
      broadcast: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as RealtimeHub;
    service = new ItemsService(itemsRepo, foodRepo, authService, realtime);
  });

  it('creates an item for accessible food', async () => {
    mocked(foodRepo.findById).mockResolvedValue(food);
    mocked(itemsRepo.create).mockResolvedValue({
      success: true,
      data: item,
    });

    await expect(
      service.createItem(USER_ID, USER_ID, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: true,
      data: expectedItem,
    });
    expect(realtime.broadcast).toHaveBeenCalledWith(USER_ID, {
      type: 'item.created',
      data: expectedItem,
    });
  });

  it('rejects creating an item for another user', async () => {
    await expect(
      service.createItem(USER_ID, OTHER_USER_ID, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(itemsRepo.create).not.toHaveBeenCalled();
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('rejects creating an item for another user’s food', async () => {
    mocked(foodRepo.findById).mockResolvedValue({
      ...food,
      createdByUserId: OTHER_USER_ID,
    });

    await expect(
      service.createItem(USER_ID, USER_ID, {
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
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('uses listByUser when no filters are supplied', async () => {
    mocked(itemsRepo.listByUser).mockResolvedValue([item]);

    await expect(service.getItems(USER_ID, USER_ID, {})).resolves.toEqual({
      success: true,
      data: [expectedItem],
    });
    expect(itemsRepo.listByUser).toHaveBeenCalledWith(USER_ID);
    expect(itemsRepo.filterByUser).not.toHaveBeenCalled();
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('uses filterByUser when filters are supplied', async () => {
    mocked(itemsRepo.filterByUser).mockResolvedValue([item]);

    await expect(
      service.getItems(USER_ID, USER_ID, {
        categories: [FoodCategory.FRUIT],
        sort: 'desc',
      }),
    ).resolves.toEqual({
      success: true,
      data: [expectedItem],
    });
    expect(itemsRepo.filterByUser).toHaveBeenCalledWith(USER_ID, {
      categories: [FoodCategory.FRUIT],
      expiresBefore: undefined,
      name_contains: undefined,
      sort: 'desc',
    });
  });

  it('lists another user’s items when they have shared access', async () => {
    mocked(itemsRepo.findShare).mockResolvedValue(share);
    mocked(itemsRepo.listByUser).mockResolvedValue([item]);

    const result = await service.getItems(OTHER_USER_ID, USER_ID, {});

    expect(result.success).toBe(true);
    expect(itemsRepo.findShare).toHaveBeenCalledWith(USER_ID, OTHER_USER_ID);
    expect(itemsRepo.listByUser).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects listing items when the user has no access', async () => {
    mocked(itemsRepo.findShare).mockResolvedValue(null);

    await expect(service.getItems(OTHER_USER_ID, USER_ID, {})).resolves.toEqual(
      {
        success: false,
        error: FORBIDDEN_ERROR,
      },
    );
    expect(itemsRepo.listByUser).not.toHaveBeenCalled();
    expect(itemsRepo.filterByUser).not.toHaveBeenCalled();
  });

  it('rejects updating an item when its food is missing', async () => {
    mocked(foodRepo.findById).mockResolvedValue(null);

    await expect(
      service.updateItem(USER_ID, USER_ID, item.id, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: false,
      error: FOOD_NOT_FOUND_ERROR,
    });
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('updates an owned item and broadcasts item.updated', async () => {
    const updatedItem = { ...item, quantity: 5 };
    mocked(foodRepo.findById).mockResolvedValue(food);
    mocked(itemsRepo.updateByUser).mockResolvedValue({
      success: true,
      data: updatedItem,
    });

    await expect(
      service.updateItem(USER_ID, USER_ID, item.id, {
        foodId: updatedItem.foodId,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit,
        expiryDate: updatedItem.expiryDate,
      }),
    ).resolves.toEqual({
      success: true,
      data: foodItemDtoSchema.parse(updatedItem),
    });
    expect(itemsRepo.updateByUser).toHaveBeenCalledWith(item.id, USER_ID, {
      foodId: updatedItem.foodId,
      quantity: updatedItem.quantity,
      unit: updatedItem.unit,
      expiryDate: updatedItem.expiryDate,
    });
    expect(realtime.broadcast).toHaveBeenCalledWith(USER_ID, {
      type: 'item.updated',
      data: foodItemDtoSchema.parse(updatedItem),
    });
  });

  it('rejects updating an item owned by another user', async () => {
    await expect(
      service.updateItem(USER_ID, OTHER_USER_ID, item.id, {
        foodId: item.foodId,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
      }),
    ).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(itemsRepo.updateByUser).not.toHaveBeenCalled();
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('delegates item deletion to the repository', async () => {
    mocked(itemsRepo.findById).mockResolvedValue(item);
    mocked(itemsRepo.deleteByUser).mockResolvedValue(true);

    await expect(
      service.removeItem(USER_ID, USER_ID, item.id),
    ).resolves.toEqual({
      success: true,
      data: true,
    });
    expect(itemsRepo.deleteByUser).toHaveBeenCalledWith(item.id, USER_ID);
    expect(realtime.broadcast).toHaveBeenCalledWith(USER_ID, {
      type: 'item.deleted',
      data: { id: item.id },
    });
  });

  it('does not broadcast when the repository refuses the delete', async () => {
    mocked(itemsRepo.findById).mockResolvedValue(item);
    mocked(itemsRepo.deleteByUser).mockResolvedValue(false);

    await expect(
      service.removeItem(USER_ID, USER_ID, item.id),
    ).resolves.toEqual({
      success: false,
      error: 'ITEM_NOT_FOUND',
    });
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('rejects deleting an item owned by another user', async () => {
    await expect(
      service.removeItem(USER_ID, OTHER_USER_ID, item.id),
    ).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(itemsRepo.deleteByUser).not.toHaveBeenCalled();
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('lists shares owned by the authenticated user', async () => {
    mocked(itemsRepo.listSharesByOwner).mockResolvedValue([share]);

    await expect(service.listShares(USER_ID, USER_ID)).resolves.toEqual({
      success: true,
      data: [expectedShare],
    });
    expect(itemsRepo.listSharesByOwner).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects listing shares owned by another user', async () => {
    await expect(service.listShares(USER_ID, OTHER_USER_ID)).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(itemsRepo.listSharesByOwner).not.toHaveBeenCalled();
  });

  it('lists inventories shared with the authenticated user', async () => {
    mocked(itemsRepo.listSharesForUser).mockResolvedValue([share]);
    mocked(authService.getUser).mockResolvedValue({
      success: true,
      data: userDtoSchema.parse({
        id: USER_ID,
        email: 'owner@example.com',
        username: 'owner',
      }),
    });

    const inventories = await service.listSharedWithMe(OTHER_USER_ID);
    expect(inventories).toHaveLength(1);
    expect(inventories[0]).toMatchObject({
      userId: USER_ID,
      username: 'owner',
      sharedAt: share.sharedAt,
    });
    expect(itemsRepo.listSharesForUser).toHaveBeenCalledWith(OTHER_USER_ID);
    expect(authService.getUser).toHaveBeenCalledWith(USER_ID);
  });

  it('omits shared inventories whose owner no longer exists', async () => {
    mocked(itemsRepo.listSharesForUser).mockResolvedValue([share]);
    mocked(authService.getUser).mockResolvedValue({
      success: false,
      error: 'NOT_FOUND',
    });

    await expect(service.listSharedWithMe(OTHER_USER_ID)).resolves.toEqual([]);
  });

  it('shares inventory with another user looked up by email', async () => {
    mocked(authService.getUserByEmail).mockResolvedValue({
      success: true,
      data: userDtoSchema.parse({
        id: OTHER_USER_ID,
        email: OTHER_USER_EMAIL,
        username: 'other',
      }),
    });
    mocked(authService.getUser).mockResolvedValue({
      success: true,
      data: userDtoSchema.parse({
        id: USER_ID,
        email: 'owner@example.com',
        username: 'owner',
      }),
    });
    mocked(itemsRepo.findShare).mockResolvedValue(null);
    mocked(itemsRepo.createShare).mockResolvedValue({
      success: true,
      data: userShareDtoSchema.parse(share),
    });

    await expect(
      service.shareItems(USER_ID, USER_ID, OTHER_USER_EMAIL),
    ).resolves.toEqual({
      success: true,
      data: expectedShare,
    });
    expect(authService.getUserByEmail).toHaveBeenCalledWith(OTHER_USER_EMAIL);
    expect(itemsRepo.createShare).toHaveBeenCalledWith(USER_ID, OTHER_USER_ID);
    expect(realtime.broadcast).toHaveBeenCalledWith(OTHER_USER_ID, {
      type: 'share.created',
      data: expectedSharedInventory,
    });
  });

  it('rejects sharing inventory with yourself', async () => {
    mocked(authService.getUserByEmail).mockResolvedValue({
      success: true,
      data: userDtoSchema.parse({
        id: USER_ID,
        email: 'user@example.com',
        username: 'user',
      }),
    });

    await expect(
      service.shareItems(USER_ID, USER_ID, 'user@example.com'),
    ).resolves.toEqual({
      success: false,
      error: 'CANNOT_SHARE_WITH_SELF',
    });
    expect(itemsRepo.createShare).not.toHaveBeenCalled();
  });

  it('rejects sharing with a user that does not exist', async () => {
    mocked(authService.getUserByEmail).mockResolvedValue({
      success: false,
      error: 'NOT_FOUND',
    });

    await expect(
      service.shareItems(USER_ID, USER_ID, OTHER_USER_EMAIL),
    ).resolves.toEqual({
      success: false,
      error: 'USER_NOT_FOUND',
    });
    expect(itemsRepo.createShare).not.toHaveBeenCalled();
  });

  it('rejects sharing inventory that is already shared', async () => {
    mocked(authService.getUserByEmail).mockResolvedValue({
      success: true,
      data: userDtoSchema.parse({
        id: OTHER_USER_ID,
        email: OTHER_USER_EMAIL,
        username: 'other',
      }),
    });
    mocked(itemsRepo.findShare).mockResolvedValue(share);

    await expect(
      service.shareItems(USER_ID, USER_ID, OTHER_USER_EMAIL),
    ).resolves.toEqual({
      success: false,
      error: 'ALREADY_SHARED',
    });
    expect(itemsRepo.createShare).not.toHaveBeenCalled();
  });

  it('rejects sharing another user’s inventory', async () => {
    await expect(
      service.shareItems(USER_ID, OTHER_USER_ID, OTHER_USER_EMAIL),
    ).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(authService.getUserByEmail).not.toHaveBeenCalled();
    expect(itemsRepo.createShare).not.toHaveBeenCalled();
  });

  it('removes an inventory share', async () => {
    mocked(itemsRepo.deleteShare).mockResolvedValue(true);

    await expect(
      service.unshareItems(USER_ID, USER_ID, OTHER_USER_ID),
    ).resolves.toEqual({
      success: true,
      data: true,
    });
    expect(itemsRepo.deleteShare).toHaveBeenCalledWith(USER_ID, OTHER_USER_ID);
    expect(realtime.broadcast).toHaveBeenCalledWith(OTHER_USER_ID, {
      type: 'share.deleted',
      data: { userId: USER_ID },
    });
  });

  it('rejects removing a share that does not exist', async () => {
    mocked(itemsRepo.deleteShare).mockResolvedValue(false);

    await expect(
      service.unshareItems(USER_ID, USER_ID, OTHER_USER_ID),
    ).resolves.toEqual({
      success: false,
      error: 'SHARE_NOT_FOUND',
    });
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });

  it('rejects removing another user’s share', async () => {
    await expect(
      service.unshareItems(USER_ID, OTHER_USER_ID, OTHER_USER_ID),
    ).resolves.toEqual({
      success: false,
      error: FORBIDDEN_ERROR,
    });
    expect(itemsRepo.deleteShare).not.toHaveBeenCalled();
    expect(realtime.broadcast).not.toHaveBeenCalled();
  });
});
