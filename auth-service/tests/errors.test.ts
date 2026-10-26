import { describe, expect, it } from 'bun:test';
import { status } from '@grpc/grpc-js';
import { toGrpcError } from '../src/errors.ts';

describe('toGrpcError', () => {
  it('maps database connection failures to UNAVAILABLE', () => {
    const error = Object.assign(new Error('Connection refused'), {
      code: 'P1001',
    });

    expect(toGrpcError(error)).toEqual({
      code: status.UNAVAILABLE,
      message: 'Authentication service unavailable',
    });
  });

  it('maps initialization errors to UNAVAILABLE', () => {
    const error = new Error('Failed to initialize');
    error.name = 'PrismaClientInitializationError';

    expect(toGrpcError(error).code).toBe(status.UNAVAILABLE);
  });

  it('maps network errors in the cause chain to UNAVAILABLE', () => {
    const error = new Error('Request failed', {
      cause: Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED',
      }),
    });

    expect(toGrpcError(error).code).toBe(status.UNAVAILABLE);
  });

  it('maps unexpected failures to INTERNAL', () => {
    expect(toGrpcError(new Error('Unexpected')).code).toBe(status.INTERNAL);
  });
});
