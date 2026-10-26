import { describe, expect, it } from 'bun:test';
import { status } from '@grpc/grpc-js';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from '@prisma/client/runtime/client';
import { isServiceUnavailable } from '../../src/errors';

describe('isServiceUnavailable', () => {
  it('detects Prisma connection errors', () => {
    const error = new PrismaClientKnownRequestError(
      "Can't reach database server",
      {
        code: 'P1001',
        clientVersion: 'test',
      },
    );

    expect(isServiceUnavailable(error)).toBe(true);
  });

  it('detects Prisma initialization errors', () => {
    const error = new PrismaClientInitializationError(
      'Failed to initialize',
      'test',
    );

    expect(isServiceUnavailable(error)).toBe(true);
  });

  it('detects gRPC unavailable and deadline errors', () => {
    expect(isServiceUnavailable({ code: status.UNAVAILABLE })).toBe(true);
    expect(isServiceUnavailable({ code: status.DEADLINE_EXCEEDED })).toBe(true);
  });

  it('detects network errors through the cause chain', () => {
    const error = new Error('Request failed', {
      cause: Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED',
      }),
    });

    expect(isServiceUnavailable(error)).toBe(true);
  });

  it('does not treat request errors as unavailable', () => {
    const error = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );

    expect(isServiceUnavailable(error)).toBe(false);
    expect(isServiceUnavailable(new Error('Unexpected'))).toBe(false);
    expect(isServiceUnavailable(undefined)).toBe(false);
  });
});
