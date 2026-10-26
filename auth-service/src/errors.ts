import { status } from '@grpc/grpc-js';
import type { ServerErrorResponse } from '@grpc/grpc-js';

const DATABASE_UNAVAILABLE_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1008',
  'P1010',
  'P1011',
  'P1017',
  'P2024',
  'P2037',
]);

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

function isUnavailable(error: unknown, seen = new Set<unknown>()): boolean {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return false;
  }
  seen.add(error);

  if (
    error instanceof Error &&
    error.name === 'PrismaClientInitializationError'
  ) {
    return true;
  }

  const candidate = error as { cause?: unknown; code?: unknown };

  if (typeof candidate.code === 'string') {
    if (
      DATABASE_UNAVAILABLE_CODES.has(candidate.code) ||
      NETWORK_ERROR_CODES.has(candidate.code)
    ) {
      return true;
    }
  }

  return isUnavailable(candidate.cause, seen);
}

/**
 * Converts an unexpected handler failure into a gRPC status the backend can
 * map to HTTP 503 when a dependency is unavailable, or 500 otherwise.
 */
export function toGrpcError(error: unknown): Partial<ServerErrorResponse> {
  if (isUnavailable(error)) {
    return {
      code: status.UNAVAILABLE,
      message: 'Authentication service unavailable',
    };
  }

  return {
    code: status.INTERNAL,
    message: 'Internal server error',
  };
}
