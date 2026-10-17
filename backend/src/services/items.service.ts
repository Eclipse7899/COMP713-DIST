import type { FoodCategory, FoodUnit } from "../generated/prisma/enums";
import type { RealtimeHub } from "../realtime/realtime-hub";
import type { FoodRepository } from "../repositories/food.repo";
import type { ItemsRepository } from "../repositories/items.repo";
import type { AuthService } from "./auth.service";
import {
  type FoodItemDto,
  type SharedInventoryDto,
  type UserShareDto,
  foodItemDtoSchema,
  sharedInventoryDtoSchema,
  userShareDtoSchema,
} from "../schemas";
import type { Result } from "../util";

export class ItemsService {
  constructor(
    private readonly itemsRepo: ItemsRepository,
    private readonly foodRepo: FoodRepository,
    private readonly authService: AuthService,
    private realtime: RealtimeHub,
  ) {}

  async createItem(
    actorId: string,
    ownerId: string,
    data: {
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    },
  ): Promise<
    Result<FoodItemDto, "FORBIDDEN" | "FOOD_NOT_FOUND" | "UNAUTHORIZED_FOOD">
  > {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const food = await this.foodRepo.findById(data.foodId);
    if (!food) {
      return {
        success: false,
        error: "FOOD_NOT_FOUND",
      };
    }
    if (food.createdByUserId !== null && food.createdByUserId !== ownerId) {
      return {
        success: false,
        error: "UNAUTHORIZED_FOOD",
      };
    }
    const result = await this.itemsRepo.create({
      userId: ownerId,
      foodId: data.foodId,
      quantity: data.quantity,
      unit: data.unit,
      expiryDate: data.expiryDate,
    });
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    const item = result.data;
    const dto = foodItemDtoSchema.parse(item);
    this.realtime.broadcast(ownerId, {
      type: "item.created",
      data: dto,
    });
    return {
      success: true,
      data: dto,
    };
  }

  async hasSharedAccess(ownerId: string, viewerId: string): Promise<boolean> {
    if (ownerId === viewerId) {
      return true;
    }
    return (await this.itemsRepo.findShare(ownerId, viewerId)) !== null;
  }

  async getItems(
    viewerId: string,
    ownerId: string,
    data: {
      categories?: FoodCategory[];
      expiresBefore?: Date | null;
      name_contains?: string;
      sort?: "asc" | "desc";
    },
  ): Promise<Result<FoodItemDto[], "FORBIDDEN">> {
    const hasAccess = await this.hasSharedAccess(ownerId, viewerId);
    if (!hasAccess) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }

    const items =
      data.categories || data.expiresBefore || data.name_contains || data.sort
        ? await this.itemsRepo.filterByUser(ownerId, {
            categories: data.categories,
            expiresBefore: data.expiresBefore,
            name_contains: data.name_contains,
            sort: data.sort,
          })
        : await this.itemsRepo.listByUser(ownerId);

    return {
      success: true,
      data: items.map((item) => foodItemDtoSchema.parse(item)),
    };
  }

  async updateItem(
    actorId: string,
    ownerId: string,
    id: string,
    data: {
      foodId: string;
      quantity: number;
      unit: FoodUnit;
      expiryDate: Date | null;
    },
  ): Promise<
    Result<FoodItemDto, "FORBIDDEN" | "ITEM_NOT_FOUND" | "FOOD_NOT_FOUND">
  > {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const food = await this.foodRepo.findById(data.foodId);
    if (!food) {
      return {
        success: false,
        error: "FOOD_NOT_FOUND",
      };
    }
    if (food.createdByUserId !== null && food.createdByUserId !== ownerId) {
      return {
        success: false,
        error: "FOOD_NOT_FOUND",
      };
    }
    const item = await this.itemsRepo.updateByUser(id, ownerId, data);
    if (!item.success) {
      return {
        success: false,
        error: item.error,
      };
    }
    const updatedItem = item.data;
    const dto = foodItemDtoSchema.parse(updatedItem);
    this.realtime.broadcast(ownerId, {
      type: "item.updated",
      data: dto,
    });
    return {
      success: true,
      data: dto,
    };
  }

  async removeItem(
    actorId: string,
    ownerId: string,
    id: string,
  ): Promise<Result<boolean, "FORBIDDEN" | "ITEM_NOT_FOUND">> {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const item = await this.itemsRepo.findById(id);
    if (!item || item.userId !== ownerId) {
      return {
        success: false,
        error: "ITEM_NOT_FOUND",
      };
    }
    const deleted = await this.itemsRepo.deleteByUser(id, ownerId);
    if (!deleted) {
      return {
        success: false,
        error: "ITEM_NOT_FOUND",
      };
    }
    this.realtime.broadcast(ownerId, {
      type: "item.deleted",
      data: item,
    });
    return {
      success: true,
      data: true,
    };
  }

  async listShares(
    actorId: string,
    ownerId: string,
  ): Promise<Result<UserShareDto[], "FORBIDDEN">> {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const shares = await this.itemsRepo.listSharesByOwner(ownerId);
    return {
      success: true,
      data: shares.map((share) => userShareDtoSchema.parse(share)),
    };
  }

  async listSharedWithMe(actorId: string): Promise<SharedInventoryDto[]> {
    const shares = await this.itemsRepo.listSharesForUser(actorId);
    const inventories = await Promise.all(
      shares.map(async (share) => {
        const owner = await this.authService.getUser(share.userId);
        if (!owner.success) {
          return null;
        }
        return sharedInventoryDtoSchema.parse({
          userId: share.userId,
          username: owner.data.username,
          sharedAt: share.sharedAt,
        });
      }),
    );
    return inventories.filter(
      (inventory): inventory is SharedInventoryDto => inventory !== null,
    );
  }

  async shareItems(
    actorId: string,
    ownerId: string,
    sharedWithEmail: string,
  ): Promise<
    Result<
      UserShareDto,
      | "FORBIDDEN"
      | "CANNOT_SHARE_WITH_SELF"
      | "USER_NOT_FOUND"
      | "ALREADY_SHARED"
    >
  > {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const recipient = await this.authService.getUserByEmail(sharedWithEmail);
    if (!recipient.success) {
      return {
        success: false,
        error: "USER_NOT_FOUND",
      };
    }
    const sharedWithUserId = recipient.data.id;
    if (sharedWithUserId === ownerId) {
      return {
        success: false,
        error: "CANNOT_SHARE_WITH_SELF",
      };
    }
    if (await this.itemsRepo.findShare(ownerId, sharedWithUserId)) {
      return {
        success: false,
        error: "ALREADY_SHARED",
      };
    }
    const share = await this.itemsRepo.createShare(ownerId, sharedWithUserId);
    if (!share.success) {
      return {
        success: false,
        error: share.error,
      };
    }
    return {
      success: true,
      data: userShareDtoSchema.parse(share.data),
    };
  }

  async unshareItems(
    actorId: string,
    ownerId: string,
    sharedWithUserId: string,
  ): Promise<Result<boolean, "FORBIDDEN" | "SHARE_NOT_FOUND">> {
    if (actorId !== ownerId) {
      return {
        success: false,
        error: "FORBIDDEN",
      };
    }
    const deleted = await this.itemsRepo.deleteShare(ownerId, sharedWithUserId);
    if (!deleted) {
      return {
        success: false,
        error: "SHARE_NOT_FOUND",
      };
    }
    return {
      success: true,
      data: true,
    };
  }
}
