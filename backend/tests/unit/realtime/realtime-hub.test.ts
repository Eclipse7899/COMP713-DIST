import { beforeEach, describe, expect, it, vi } from 'bun:test';
import {
  RealtimeHub,
  type ServerEvent,
} from '../../../src/realtime/realtime-hub';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'other-user';

const event: ServerEvent = {
  type: 'item.deleted',
  data: { id: 'item-1' },
};

const otherEvent: ServerEvent = {
  type: 'food.deleted',
  data: { id: 'food-1' },
};

/**
 * RealtimeHub keeps its subscriptions in a private map. Casting lets the tests
 * assert that empty user entries are removed instead of leaking forever.
 */
function subscriptions(hub: RealtimeHub): Map<string, Set<unknown>> {
  return (hub as unknown as { userCallbacks: Map<string, Set<unknown>> })
    .userCallbacks;
}

describe('RealtimeHub', () => {
  let hub: RealtimeHub;

  beforeEach(() => {
    hub = new RealtimeHub();
  });

  it('delivers an event to a subscribed callback', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);

    hub.broadcast(USER_ID, event);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('delivers an event to every callback subscribed for the user', () => {
    const first = vi.fn();
    const second = vi.fn();
    hub.subscribe(USER_ID, first);
    hub.subscribe(USER_ID, second);

    hub.broadcast(USER_ID, event);

    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
  });

  it('does not deliver events to other users', () => {
    const ownCallback = vi.fn();
    const otherCallback = vi.fn();
    hub.subscribe(USER_ID, ownCallback);
    hub.subscribe(OTHER_USER_ID, otherCallback);

    hub.broadcast(USER_ID, event);

    expect(ownCallback).toHaveBeenCalledWith(event);
    expect(otherCallback).not.toHaveBeenCalled();
  });

  it('stops delivering events after unsubscribe', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);
    hub.unsubscribe(USER_ID, callback);

    hub.broadcast(USER_ID, event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps the other callbacks subscribed when one unsubscribes', () => {
    const removed = vi.fn();
    const remaining = vi.fn();
    hub.subscribe(USER_ID, removed);
    hub.subscribe(USER_ID, remaining);

    hub.unsubscribe(USER_ID, removed);
    hub.broadcast(USER_ID, event);

    expect(removed).not.toHaveBeenCalled();
    expect(remaining).toHaveBeenCalledWith(event);
  });

  it('removes the user entry after the last callback unsubscribes', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);

    hub.unsubscribe(USER_ID, callback);

    expect(subscriptions(hub).has(USER_ID)).toBe(false);
  });

  it('keeps the user entry while other callbacks remain', () => {
    const first = vi.fn();
    const second = vi.fn();
    hub.subscribe(USER_ID, first);
    hub.subscribe(USER_ID, second);

    hub.unsubscribe(USER_ID, first);

    expect(subscriptions(hub).get(USER_ID)?.size).toBe(1);
  });

  it('ignores an unsubscribe for a callback that was never subscribed', () => {
    const subscribed = vi.fn();
    const unknown = vi.fn();
    hub.subscribe(USER_ID, subscribed);

    hub.unsubscribe(USER_ID, unknown);
    hub.broadcast(USER_ID, event);

    expect(subscribed).toHaveBeenCalledWith(event);
  });

  it('ignores an unsubscribe for an unknown user', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);

    expect(() => hub.unsubscribe(OTHER_USER_ID, callback)).not.toThrow();

    hub.broadcast(USER_ID, event);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('subscribes the same callback only once', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);
    hub.subscribe(USER_ID, callback);

    hub.broadcast(USER_ID, event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does nothing when broadcasting to a user without subscribers', () => {
    expect(() => hub.broadcast(USER_ID, event)).not.toThrow();
    expect(subscriptions(hub).size).toBe(0);
  });

  it('continues delivering to a callback after it is unsubscribed and resubscribed', () => {
    const callback = vi.fn();
    hub.subscribe(USER_ID, callback);
    hub.unsubscribe(USER_ID, callback);
    hub.broadcast(USER_ID, event);

    hub.subscribe(USER_ID, callback);
    hub.broadcast(USER_ID, otherEvent);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(otherEvent);
  });
});
