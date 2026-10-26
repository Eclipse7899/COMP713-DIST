import { describe, expect, it, vi } from 'bun:test';
import { status } from '@grpc/grpc-js';
import { createAuthHandlers } from '../src/handlers/handler.ts';
import type { AuthService } from '../src/services/service.ts';

describe('auth handlers', () => {
  it('returns UNAVAILABLE when a dependency fails', async () => {
    const service = {
      getUser: () =>
        Promise.reject(
          Object.assign(new Error('Connection refused'), { code: 'P1001' }),
        ),
    } as unknown as AuthService;
    const handlers = createAuthHandlers(service);
    const callback = vi.fn();

    handlers.getUser!(
      { request: { userId: 'user-1' } } as never,
      callback as never,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callback).toHaveBeenCalledWith({
      code: status.UNAVAILABLE,
      message: 'Authentication service unavailable',
    });
  });
});
