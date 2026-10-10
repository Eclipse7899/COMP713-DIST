import type { FoodDto, FoodItemDto } from '../schemas';

export type Event<T, K> = {
  type: T;
  data: K;
};

export type ServerEvent =
  | Event<'item.created', FoodItemDto>
  | Event<'item.updated', FoodItemDto>
  | Event<'item.deleted', { id: string }>
  | Event<'food.created', FoodDto>
  | Event<'food.updated', FoodDto>
  | Event<'food.deleted', { id: string }>;

export type ServerCallback = (event: ServerEvent) => void;

export class RealtimeHub {
  private userCallbacks: Map<string, Set<ServerCallback>> = new Map();

  public subscribe(userId: string, callback: ServerCallback) {
    if (!this.userCallbacks.has(userId)) {
      this.userCallbacks.set(userId, new Set());
    }
    this.userCallbacks.get(userId)?.add(callback);
  }

  public broadcast(userId: string, event: ServerEvent) {
    const callbacks = this.userCallbacks.get(userId);
    if (callbacks) {
      for (const ws of callbacks) {
        ws(event);
      }
    }
  }

  public unsubscribe(userId: string, callback: ServerCallback) {
    const callbacks = this.userCallbacks.get(userId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.userCallbacks.delete(userId);
      }
    }
  }
}
